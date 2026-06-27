// Phase 8 — the SINGLE source of truth for personal study data: highlights,
// notes, bookmarks, and reading position. Nothing else in the app may read or
// write this data from localStorage directly; every caller goes through the
// functions below. The interface is intentionally async even though
// localStorage is synchronous, so the internals can later be swapped for a
// server/Supabase backend in THIS ONE FILE without changing any caller.
//
// IMPORTANT: this data lives in the browser, per device. The browser can clear
// it (private mode, cache clears, storage eviction) and it does NOT sync across
// devices. Treat it as convenience data, not a permanent record — the UI says
// so honestly. Personal data stays local: it is never sent to the scripture
// API, the study assistant, or any other external service.

import type {
  Bookmark,
  ChapterRef,
  Highlight,
  HighlightColor,
  LastRead,
  Note,
  TalkBookmark,
  TalkHighlight,
  TalkLastRead,
  TalkNote,
  TalkParaRef,
  VerseRef,
} from "./types";

export type {
  Bookmark,
  ChapterRef,
  Highlight,
  HighlightColor,
  LastRead,
  Note,
  TalkBookmark,
  TalkHighlight,
  TalkLastRead,
  TalkNote,
  TalkParaRef,
  VerseRef,
};

const KEYS = {
  highlights: "study:highlights",
  notes: "study:notes",
  bookmarks: "study:bookmarks",
  lastRead: "study:last-read",
  talkHighlights: "study:talk-highlights",
  talkNotes: "study:talk-notes",
  talkBookmarks: "study:talk-bookmarks",
  talkLastRead: "study:talk-last-read",
} as const;

function canStore(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

function readList<T>(key: string): T[] {
  if (!canStore()) return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, list: T[]): void {
  if (!canStore()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Quota or serialization failure — fail quietly; this is convenience data.
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function sameVerse(a: VerseRef, b: VerseRef): boolean {
  return (
    a.volume === b.volume &&
    a.book === b.book &&
    a.chapter === b.chapter &&
    a.verse === b.verse
  );
}

function inChapter(r: VerseRef, c: ChapterRef): boolean {
  return r.volume === c.volume && r.book === c.book && r.chapter === c.chapter;
}

function pickVerse(r: VerseRef): VerseRef {
  return { volume: r.volume, book: r.book, chapter: r.chapter, verse: r.verse };
}

// --- Highlights -------------------------------------------------------------
// One highlight per verse; saving a new color on an already-highlighted verse
// replaces it. Remove with deleteHighlight(id).

export async function getHighlights(chapter?: ChapterRef): Promise<Highlight[]> {
  const all = readList<Highlight>(KEYS.highlights);
  return chapter ? all.filter((h) => inChapter(h, chapter)) : all;
}

export async function saveHighlight(
  input: VerseRef & { color: HighlightColor; bookTitle: string },
): Promise<Highlight> {
  const list = readList<Highlight>(KEYS.highlights);
  const now = Date.now();
  const i = list.findIndex((h) => sameVerse(h, input));
  let record: Highlight;
  if (i >= 0) {
    record = { ...list[i], color: input.color, bookTitle: input.bookTitle, updatedAt: now };
    list[i] = record;
  } else {
    record = {
      id: newId(),
      ...pickVerse(input),
      color: input.color,
      bookTitle: input.bookTitle,
      createdAt: now,
      updatedAt: now,
    };
    list.push(record);
  }
  writeList(KEYS.highlights, list);
  return record;
}

export async function deleteHighlight(id: string): Promise<void> {
  writeList(
    KEYS.highlights,
    readList<Highlight>(KEYS.highlights).filter((h) => h.id !== id),
  );
}

// --- Notes ------------------------------------------------------------------
// One note per verse; saving again on the same verse updates its text.

export async function getNotes(chapter?: ChapterRef): Promise<Note[]> {
  const all = readList<Note>(KEYS.notes);
  return chapter ? all.filter((n) => inChapter(n, chapter)) : all;
}

export async function saveNote(
  input: VerseRef & { text: string; bookTitle: string },
): Promise<Note> {
  const list = readList<Note>(KEYS.notes);
  const now = Date.now();
  const i = list.findIndex((n) => sameVerse(n, input));
  let record: Note;
  if (i >= 0) {
    record = { ...list[i], text: input.text, bookTitle: input.bookTitle, updatedAt: now };
    list[i] = record;
  } else {
    record = {
      id: newId(),
      ...pickVerse(input),
      text: input.text,
      bookTitle: input.bookTitle,
      createdAt: now,
      updatedAt: now,
    };
    list.push(record);
  }
  writeList(KEYS.notes, list);
  return record;
}

export async function deleteNote(id: string): Promise<void> {
  writeList(KEYS.notes, readList<Note>(KEYS.notes).filter((n) => n.id !== id));
}

// --- Bookmarks --------------------------------------------------------------
// A bookmark targets a verse (verse: number) or a whole chapter (verse: null).
// Saving an identical target is a no-op that returns the existing bookmark, so
// callers can treat saveBookmark as idempotent and toggle with deleteBookmark.

export async function getBookmarks(): Promise<Bookmark[]> {
  return readList<Bookmark>(KEYS.bookmarks).sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveBookmark(input: {
  volume: string;
  book: string;
  chapter: number;
  verse: number | null;
  bookTitle: string;
}): Promise<Bookmark> {
  const list = readList<Bookmark>(KEYS.bookmarks);
  const existing = list.find(
    (b) =>
      b.volume === input.volume &&
      b.book === input.book &&
      b.chapter === input.chapter &&
      b.verse === input.verse,
  );
  if (existing) return existing;
  const record: Bookmark = { id: newId(), ...input, createdAt: Date.now() };
  list.push(record);
  writeList(KEYS.bookmarks, list);
  return record;
}

export async function deleteBookmark(id: string): Promise<void> {
  writeList(
    KEYS.bookmarks,
    readList<Bookmark>(KEYS.bookmarks).filter((b) => b.id !== id),
  );
}

// --- Reading position -------------------------------------------------------
// A single most-recent position powers "Continue reading".

export async function getLastRead(): Promise<LastRead | null> {
  if (!canStore()) return null;
  try {
    const raw = window.localStorage.getItem(KEYS.lastRead);
    return raw ? (JSON.parse(raw) as LastRead) : null;
  } catch {
    return null;
  }
}

export async function setLastRead(input: {
  volume: string;
  book: string;
  chapter: number;
  bookTitle: string;
  verse?: number;
}): Promise<void> {
  if (!canStore()) return;
  const record: LastRead = { ...input, updatedAt: Date.now() };
  try {
    window.localStorage.setItem(KEYS.lastRead, JSON.stringify(record));
  } catch {
    // Fail quietly — convenience data.
  }
}

// --- Talk highlights / notes / bookmarks ------------------------------------
// Mirror the scripture functions above, anchored by talkId + paragraph. Kept in
// separate localStorage keys so the two data sets never collide.

function sameTalkPara(a: TalkParaRef, b: TalkParaRef): boolean {
  return a.talkId === b.talkId && a.paragraph === b.paragraph;
}

export async function getTalkHighlights(talkId?: string): Promise<TalkHighlight[]> {
  const all = readList<TalkHighlight>(KEYS.talkHighlights);
  return talkId ? all.filter((h) => h.talkId === talkId) : all;
}

export async function saveTalkHighlight(
  input: TalkParaRef & { color: HighlightColor; title: string; speaker: string },
): Promise<TalkHighlight> {
  const list = readList<TalkHighlight>(KEYS.talkHighlights);
  const now = Date.now();
  const i = list.findIndex((h) => sameTalkPara(h, input));
  let record: TalkHighlight;
  if (i >= 0) {
    record = { ...list[i], color: input.color, title: input.title, speaker: input.speaker, updatedAt: now };
    list[i] = record;
  } else {
    record = { id: newId(), ...input, createdAt: now, updatedAt: now };
    list.push(record);
  }
  writeList(KEYS.talkHighlights, list);
  return record;
}

export async function deleteTalkHighlight(id: string): Promise<void> {
  writeList(
    KEYS.talkHighlights,
    readList<TalkHighlight>(KEYS.talkHighlights).filter((h) => h.id !== id),
  );
}

export async function getTalkNotes(talkId?: string): Promise<TalkNote[]> {
  const all = readList<TalkNote>(KEYS.talkNotes);
  return talkId ? all.filter((n) => n.talkId === talkId) : all;
}

export async function saveTalkNote(
  input: TalkParaRef & { text: string; title: string; speaker: string },
): Promise<TalkNote> {
  const list = readList<TalkNote>(KEYS.talkNotes);
  const now = Date.now();
  const i = list.findIndex((n) => sameTalkPara(n, input));
  let record: TalkNote;
  if (i >= 0) {
    record = { ...list[i], text: input.text, title: input.title, speaker: input.speaker, updatedAt: now };
    list[i] = record;
  } else {
    record = { id: newId(), ...input, createdAt: now, updatedAt: now };
    list.push(record);
  }
  writeList(KEYS.talkNotes, list);
  return record;
}

export async function deleteTalkNote(id: string): Promise<void> {
  writeList(
    KEYS.talkNotes,
    readList<TalkNote>(KEYS.talkNotes).filter((n) => n.id !== id),
  );
}

export async function getTalkBookmarks(talkId?: string): Promise<TalkBookmark[]> {
  const all = readList<TalkBookmark>(KEYS.talkBookmarks).sort(
    (a, b) => b.createdAt - a.createdAt,
  );
  return talkId ? all.filter((b) => b.talkId === talkId) : all;
}

export async function saveTalkBookmark(input: {
  talkId: string;
  conferenceId: string;
  paragraph: number | null;
  title: string;
  speaker: string;
}): Promise<TalkBookmark> {
  const list = readList<TalkBookmark>(KEYS.talkBookmarks);
  const existing = list.find(
    (b) => b.talkId === input.talkId && b.paragraph === input.paragraph,
  );
  if (existing) return existing;
  const record: TalkBookmark = { id: newId(), ...input, createdAt: Date.now() };
  list.push(record);
  writeList(KEYS.talkBookmarks, list);
  return record;
}

export async function deleteTalkBookmark(id: string): Promise<void> {
  writeList(
    KEYS.talkBookmarks,
    readList<TalkBookmark>(KEYS.talkBookmarks).filter((b) => b.id !== id),
  );
}

// --- Talk reading position --------------------------------------------------
// A single most-recent talk powers "Continue talk" on the conference page.

export async function getTalkLastRead(): Promise<TalkLastRead | null> {
  if (!canStore()) return null;
  try {
    const raw = window.localStorage.getItem(KEYS.talkLastRead);
    return raw ? (JSON.parse(raw) as TalkLastRead) : null;
  } catch {
    return null;
  }
}

export async function setTalkLastRead(input: {
  talkId: string;
  conferenceId: string;
  title: string;
  speaker: string;
  paragraph?: number;
}): Promise<void> {
  if (!canStore()) return;
  const record: TalkLastRead = { ...input, updatedAt: Date.now() };
  try {
    window.localStorage.setItem(KEYS.talkLastRead, JSON.stringify(record));
  } catch {
    // Fail quietly — convenience data.
  }
}

// --- Maintenance ------------------------------------------------------------

/** Wipe all personal study data on this device. Used by the temporary test
 *  page, and a sane building block for a future "reset on this device" control. */
export async function clearAllStudyData(): Promise<void> {
  if (!canStore()) return;
  for (const key of Object.values(KEYS)) window.localStorage.removeItem(key);
}
