"use client";

import * as React from "react";
import { Bookmark as BookmarkIcon, Loader2, Pencil, Sparkles, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { translateChapterAction } from "@/lib/actions/translate";
import {
  deleteBookmark,
  deleteHighlight,
  deleteNote,
  getBookmarks,
  getHighlights,
  getNotes,
  saveBookmark,
  saveHighlight,
  saveNote,
  type Bookmark,
  type Highlight,
  type HighlightColor,
  type Note,
} from "@/lib/study/storage";
import { FootnoteReferences } from "@/components/reader/footnote-references";
import { JumpToVerse } from "@/components/reader/jump-to-verse";
import type { FootNote } from "@/lib/scripture/types";

/** Above this many verses, offer a "Jump to verse" picker so readers of long
 *  chapters don't have to scroll to find a verse. */
const JUMP_THRESHOLD = 20;

type Verse = { n: number; text: string };
type KjvVerse = { n: number; text: string; footNotes: FootNote[] };

/** Footnote marker letters: a–z, then aa, ab, … for verses with many notes. */
function markerLetter(index: number): string {
  let i = index + 1;
  let s = "";
  while (i > 0) {
    i--;
    s = String.fromCharCode(97 + (i % 26)) + s;
    i = Math.floor(i / 26);
  }
  return s;
}

/** Interleave the verse text with subtle superscript markers placed at each
 *  footnote's start offset (immediately before the annotated word). Markers are
 *  buttons that open the footnote panel. */
function renderVerseText(
  text: string,
  footNotes: FootNote[],
  onMarkerClick: (index: number) => void,
  activeIndex: number | null,
): React.ReactNode {
  if (!footNotes || footNotes.length === 0) return text;

  const markers = footNotes
    .map((f, i) => ({ start: f.start, index: i, letter: markerLetter(i) }))
    .sort((a, b) => a.start - b.start);

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  markers.forEach((m) => {
    const at = Math.max(0, Math.min(m.start, text.length));
    if (at > cursor) nodes.push(text.slice(cursor, at));
    nodes.push(
      <button
        key={`fn-${m.index}`}
        type="button"
        onClick={() => onMarkerClick(m.index)}
        aria-label={`Footnote ${m.letter}`}
        className={cn(
          "cursor-pointer select-none px-0.5 align-super font-sans text-[0.58em] font-medium transition-colors",
          activeIndex === m.index
            ? "text-primary underline decoration-primary/40 underline-offset-2"
            : "text-primary/55 hover:text-primary",
        )}
      >
        {m.letter}
      </button>,
    );
    cursor = at;
  });
  nodes.push(text.slice(cursor));
  return nodes;
}

const HIGHLIGHTS: { key: HighlightColor; label: string; swatch: string; text: string }[] = [
  { key: "yellow", label: "Yellow", swatch: "bg-yellow-300", text: "bg-yellow-200/70 dark:bg-yellow-300/20" },
  { key: "green", label: "Green", swatch: "bg-green-300", text: "bg-green-200/70 dark:bg-green-300/20" },
  { key: "blue", label: "Blue", swatch: "bg-sky-300", text: "bg-sky-200/70 dark:bg-sky-300/20" },
  { key: "pink", label: "Pink", swatch: "bg-pink-300", text: "bg-pink-200/70 dark:bg-pink-300/20" },
];

function highlightClass(color: HighlightColor | null): string {
  return HIGHLIGHTS.find((h) => h.key === color)?.text ?? "";
}

export function ChapterBody({
  volume,
  book,
  chapter,
  bookTitle,
  kjvVerses,
}: {
  volume: string;
  book: string;
  chapter: number;
  bookTitle: string;
  kjvVerses: KjvVerse[];
}) {
  const [mode, setMode] = React.useState<"kjv" | "simple">("kjv");
  const [simple, setSimple] = React.useState<Verse[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [highlights, setHighlights] = React.useState<Record<number, Highlight>>({});
  const [notes, setNotes] = React.useState<Record<number, Note>>({});
  const [bookmarks, setBookmarks] = React.useState<Record<number, Bookmark>>({});
  const [selected, setSelected] = React.useState<number | null>(null);
  const [noteDraft, setNoteDraft] = React.useState("");

  const [openFootnote, setOpenFootnote] = React.useState<{
    verse: number;
    index: number;
  } | null>(null);
  const [openNote, setOpenNote] = React.useState<number | null>(null);

  React.useEffect(() => {
    getHighlights({ volume, book, chapter })
      .then((rows) => {
        const next: Record<number, Highlight> = {};
        for (const h of rows) next[h.verse] = h;
        setHighlights(next);
      })
      .catch(() => {});
  }, [volume, book, chapter]);

  React.useEffect(() => {
    getNotes({ volume, book, chapter })
      .then((rows) => {
        const next: Record<number, Note> = {};
        for (const n of rows) next[n.verse] = n;
        setNotes(next);
      })
      .catch(() => {});
  }, [volume, book, chapter]);

  React.useEffect(() => {
    getBookmarks()
      .then((all) => {
        const next: Record<number, Bookmark> = {};
        for (const b of all) {
          if (b.verse !== null && b.volume === volume && b.book === book && b.chapter === chapter) {
            next[b.verse] = b;
          }
        }
        setBookmarks(next);
      })
      .catch(() => {});
  }, [volume, book, chapter]);

  const loadSimple = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await translateChapterAction(volume, book, chapter);
      if (res.ok) setSimple(res.verses);
      else setError(res.error);
    } catch {
      // The server action's request itself failed — almost always offline.
      // Never leave the spinner hanging; explain that King James still works.
      setError(
        typeof navigator !== "undefined" && !navigator.onLine
          ? "Simple English needs a connection. The King James text is available offline."
          : "We couldn’t generate the Simple English version right now. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [volume, book, chapter]);

  function showSimple() {
    setMode("simple");
    setOpenFootnote(null); // markers/panel are KJV-only
    if (!simple && !loading) void loadSimple();
  }

  function applyColor(n: number, color: HighlightColor | null) {
    if (color === null) {
      const cur = highlights[n];
      if (!cur) return;
      void deleteHighlight(cur.id);
      setHighlights((m) => {
        const next = { ...m };
        delete next[n];
        return next;
      });
      return;
    }
    void saveHighlight({ volume, book, chapter, verse: n, color, bookTitle }).then((saved) => {
      setHighlights((m) => ({ ...m, [n]: saved }));
    });
  }

  function toggleBookmark(n: number) {
    const existing = bookmarks[n];
    if (existing) {
      void deleteBookmark(existing.id);
      setBookmarks((m) => {
        const next = { ...m };
        delete next[n];
        return next;
      });
      return;
    }
    void saveBookmark({ volume, book, chapter, verse: n, bookTitle }).then((saved) => {
      setBookmarks((m) => ({ ...m, [n]: saved }));
    });
  }

  function commitNote(n: number) {
    const text = noteDraft.trim();
    const existing = notes[n];
    if (!text) {
      if (existing) {
        void deleteNote(existing.id);
        setNotes((m) => {
          const next = { ...m };
          delete next[n];
          return next;
        });
      }
      setSelected(null);
      return;
    }
    void saveNote({ volume, book, chapter, verse: n, text, bookTitle }).then((saved) => {
      setNotes((m) => ({ ...m, [n]: saved }));
    });
    setSelected(null);
  }

  function removeNote(n: number) {
    const existing = notes[n];
    if (existing) {
      void deleteNote(existing.id);
      setNotes((m) => {
        const next = { ...m };
        delete next[n];
        return next;
      });
    }
    setOpenNote(null);
  }

  function selectVerse(n: number) {
    setOpenFootnote(null);
    setOpenNote(null);
    setSelected(n);
    setNoteDraft(notes[n]?.text ?? "");
  }

  function toggleSelect(n: number) {
    if (selected === n) {
      setSelected(null);
      return;
    }
    selectVerse(n);
  }

  function showFootnote(verse: number, index: number) {
    setSelected(null);
    setOpenNote(null);
    setOpenFootnote({ verse, index });
  }

  function showNote(n: number) {
    setSelected(null);
    setOpenFootnote(null);
    setOpenNote((cur) => (cur === n ? null : n));
  }

  const showingSimple = mode === "simple" && !!simple;
  const verses: Array<Verse | KjvVerse> = showingSimple ? simple! : kjvVerses;

  return (
    <div className="mt-8">
      <div className="flex flex-col items-center gap-3">
        <div className="flex w-fit items-center rounded-full border border-border bg-card p-0.5 text-sm">
          <button
            type="button"
            onClick={() => setMode("kjv")}
            aria-pressed={mode === "kjv"}
            className={cn(
              "rounded-full px-4 py-1.5 font-sans font-medium transition-colors",
              mode === "kjv"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            King James
          </button>
          <button
            type="button"
            onClick={showSimple}
            aria-pressed={mode === "simple"}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-4 py-1.5 font-sans font-medium transition-colors",
              mode === "simple"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Sparkles className="size-3.5" />
            Simple English
          </button>
        </div>

        {kjvVerses.length > JUMP_THRESHOLD && <JumpToVerse count={kjvVerses.length} />}
      </div>

      {mode === "simple" && loading ? (
        <TranslatingState />
      ) : mode === "simple" && error && !simple ? (
        <div className="mx-auto mt-10 max-w-2xl rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-5 text-center text-sm text-destructive">
          <p>{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={loadSimple}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <div
            key={showingSimple ? "simple" : "kjv"}
            className="reader-prose mx-auto mt-8 max-w-2xl space-y-3 font-serif animate-in fade-in duration-300"
          >
            {verses.map((v) => {
              const isSelected = selected === v.n;
              const color = highlights[v.n]?.color ?? null;
              const note = notes[v.n];
              return (
                <div key={v.n} id={`v${v.n}`} className="scroll-mt-24">
                  <p className="text-foreground/90">
                    <button
                      type="button"
                      onClick={() => toggleSelect(v.n)}
                      aria-label={`Verse ${v.n} options`}
                      className={cn(
                        "mr-1.5 cursor-pointer align-baseline font-sans text-[0.62em] font-semibold tabular-nums transition-colors",
                        isSelected
                          ? "text-primary"
                          : "text-primary/45 hover:text-primary",
                      )}
                    >
                      {v.n}
                    </button>
                    <span className={cn("rounded px-0.5 transition-colors", highlightClass(color))}>
                      {showingSimple
                        ? v.text
                        : renderVerseText(
                            v.text,
                            (v as KjvVerse).footNotes,
                            (index) => showFootnote(v.n, index),
                            openFootnote?.verse === v.n
                              ? openFootnote.index
                              : null,
                          )}
                    </span>
                    {note && (
                      <button
                        type="button"
                        onClick={() => showNote(v.n)}
                        aria-label={`Note on verse ${v.n}`}
                        className={cn(
                          "ml-0.5 cursor-pointer align-super transition-colors",
                          openNote === v.n
                            ? "text-primary"
                            : "text-primary/55 hover:text-primary",
                        )}
                      >
                        <Pencil className="inline size-3" />
                      </button>
                    )}
                  </p>

                  {isSelected && (
                    <VerseToolbar
                      color={color}
                      bookmarked={!!bookmarks[v.n]}
                      noteDraft={noteDraft}
                      onColor={(c) => applyColor(v.n, c)}
                      onToggleBookmark={() => toggleBookmark(v.n)}
                      onNoteChange={setNoteDraft}
                      onSave={() => commitNote(v.n)}
                      onClose={() => setSelected(null)}
                    />
                  )}

                  {openNote === v.n && note && (
                    <NotePanel
                      key={`note-${v.n}`}
                      text={note.text}
                      onEdit={() => selectVerse(v.n)}
                      onRemove={() => removeNote(v.n)}
                      onClose={() => setOpenNote(null)}
                    />
                  )}

                  {!showingSimple &&
                    openFootnote?.verse === v.n &&
                    (v as KjvVerse).footNotes[openFootnote.index] && (
                      <FootnotePanel
                        key={`fn-${v.n}-${openFootnote.index}`}
                        letter={markerLetter(openFootnote.index)}
                        text={(v as KjvVerse).footNotes[openFootnote.index].text}
                        onClose={() => setOpenFootnote(null)}
                      />
                    )}
                </div>
              );
            })}
          </div>

          {mode === "simple" && simple && (
            <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-muted-foreground">
              <Sparkles className="mr-1 inline size-3 align-[-0.1em]" />
              AI-simplified paraphrase for readability — compare with the King
              James text for study.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function VerseToolbar({
  color,
  bookmarked,
  noteDraft,
  onColor,
  onToggleBookmark,
  onNoteChange,
  onSave,
  onClose,
}: {
  color: HighlightColor | null;
  bookmarked: boolean;
  noteDraft: string;
  onColor: (color: HighlightColor | null) => void;
  onToggleBookmark: () => void;
  onNoteChange: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="my-2.5 ml-5 max-w-md rounded-lg border border-border bg-card p-2.5 font-sans animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-center gap-1.5">
        {HIGHLIGHTS.map((h) => (
          <button
            key={h.key}
            type="button"
            onClick={() => onColor(h.key)}
            aria-label={`Highlight ${h.label}`}
            className={cn(
              "size-6 rounded-full border border-black/10",
              h.swatch,
              color === h.key && "ring-2 ring-ring ring-offset-1",
            )}
          />
        ))}
        <button
          type="button"
          onClick={() => onColor(null)}
          aria-label="Remove highlight"
          className="flex size-6 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
        <span className="mx-0.5 h-5 w-px bg-border" />
        <button
          type="button"
          onClick={onToggleBookmark}
          aria-label={bookmarked ? "Remove bookmark" : "Bookmark verse"}
          aria-pressed={bookmarked}
          className={cn(
            "flex size-6 items-center justify-center rounded-full border transition-colors",
            bookmarked
              ? "border-primary/40 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          <BookmarkIcon className={cn("size-3.5", bookmarked && "fill-current")} />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground"
        >
          Done
        </button>
      </div>

      <textarea
        value={noteDraft}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder="Add a note…"
        rows={2}
        className="mt-2 w-full resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      <div className="mt-1.5 flex justify-end">
        <Button size="sm" onClick={onSave}>
          Save note
        </Button>
      </div>
    </div>
  );
}

function NotePanel({
  text,
  onEdit,
  onRemove,
  onClose,
}: {
  text: string;
  onEdit: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <div className="my-2.5 ml-5 max-w-md rounded-lg border border-border bg-card p-3 font-sans text-sm animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Note
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close note"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">{text}</p>

      <div className="mt-2.5 flex items-center gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-medium text-primary hover:underline"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function FootnotePanel({
  letter,
  text,
  onClose,
}: {
  letter: string;
  text: string;
  onClose: () => void;
}) {
  return (
    <div className="my-2.5 ml-5 max-w-md rounded-lg border border-border bg-card p-3 font-sans text-sm animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Footnote {letter}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close footnote"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <p className="leading-relaxed text-foreground/90">{text}</p>
      <FootnoteReferences text={text} />
    </div>
  );
}

function TranslatingState() {
  return (
    <div className="mx-auto mt-10 max-w-2xl">
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Simplifying this chapter…
      </div>
      <div className="mt-6 space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div
              className="h-4 animate-pulse rounded bg-muted"
              style={{ width: `${68 + ((i * 9) % 28)}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
