"use client";

import * as React from "react";
import {
  Bookmark as BookmarkIcon,
  Check,
  Copy,
  Pencil,
  Share2,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { FootnoteReferences } from "@/components/reader/footnote-references";
import { HIGHLIGHTS, highlightClass } from "@/lib/study/highlight-colors";
import {
  deleteTalkBookmark,
  deleteTalkHighlight,
  deleteTalkNote,
  getTalkBookmarks,
  getTalkHighlights,
  getTalkNotes,
  saveTalkBookmark,
  saveTalkHighlight,
  saveTalkNote,
  type HighlightColor,
  type TalkBookmark,
  type TalkHighlight,
  type TalkNote,
} from "@/lib/study/storage";
import type { TalkFootNote, TalkParagraph } from "@/lib/conference/types";

/** Footnote marker letters: a–z, then aa, ab, … for paragraphs with many notes. */
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

/** Interleave paragraph text with superscript markers at each footnote's start
 *  offset. Markers are buttons that toggle the inline footnote panel. */
function renderParagraph(
  text: string,
  footNotes: TalkFootNote[],
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

export function TalkBody({
  paragraphs,
  talkId,
  conferenceId,
  title,
  speaker,
}: {
  paragraphs: TalkParagraph[];
  talkId: string;
  conferenceId: string;
  title: string;
  speaker: string;
}) {
  const [openFootnote, setOpenFootnote] = React.useState<{
    p: number;
    index: number;
  } | null>(null);
  const [openNote, setOpenNote] = React.useState<number | null>(null);
  // The paragraph whose action toolbar is open. Tapping a paragraph (when no
  // text is selected) toggles it.
  const [selection, setSelection] = React.useState<number | null>(null);
  const [noteDraft, setNoteDraft] = React.useState("");

  const [highlights, setHighlights] = React.useState<Record<number, TalkHighlight>>({});
  const [notes, setNotes] = React.useState<Record<number, TalkNote>>({});
  const [bookmarks, setBookmarks] = React.useState<Record<number, TalkBookmark>>({});

  // Paragraph arrived at via a #p{n} deep link (search result / "Continue talk")
  // — tint it until the reader taps elsewhere.
  const [targetPara, setTargetPara] = React.useState<number | null>(null);

  const meta = { talkId, conferenceId, title, speaker };

  React.useEffect(() => {
    getTalkHighlights(talkId)
      .then((rows) => {
        const next: Record<number, TalkHighlight> = {};
        for (const h of rows) next[h.paragraph] = h;
        setHighlights(next);
      })
      .catch(() => {});
    getTalkNotes(talkId)
      .then((rows) => {
        const next: Record<number, TalkNote> = {};
        for (const n of rows) next[n.paragraph] = n;
        setNotes(next);
      })
      .catch(() => {});
    getTalkBookmarks(talkId)
      .then((rows) => {
        const next: Record<number, TalkBookmark> = {};
        for (const b of rows) if (b.paragraph !== null) next[b.paragraph] = b;
        setBookmarks(next);
      })
      .catch(() => {});
  }, [talkId]);

  React.useEffect(() => {
    function readHash() {
      const m = /^#p(\d+)$/.exec(window.location.hash);
      setTargetPara(m ? Number(m[1]) : null);
    }
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, [talkId]);

  React.useEffect(() => {
    if (targetPara === null) return;
    function onPointerDown(e: PointerEvent) {
      const el = document.getElementById(`p${targetPara}`);
      if (el?.contains(e.target as Node)) return;
      setTargetPara(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [targetPara]);

  function applyColor(n: number, color: HighlightColor | null) {
    if (color === null) {
      const cur = highlights[n];
      if (!cur) return;
      void deleteTalkHighlight(cur.id);
      setHighlights((m) => {
        const next = { ...m };
        delete next[n];
        return next;
      });
      return;
    }
    void saveTalkHighlight({ ...meta, paragraph: n, color }).then((saved) =>
      setHighlights((m) => ({ ...m, [n]: saved })),
    );
  }

  function toggleBookmark(n: number) {
    const existing = bookmarks[n];
    if (existing) {
      void deleteTalkBookmark(existing.id);
      setBookmarks((m) => {
        const next = { ...m };
        delete next[n];
        return next;
      });
      return;
    }
    void saveTalkBookmark({ ...meta, paragraph: n }).then((saved) =>
      setBookmarks((m) => ({ ...m, [n]: saved })),
    );
  }

  function commitNote(n: number) {
    const text = noteDraft.trim();
    const existing = notes[n];
    if (!text) {
      if (existing) {
        void deleteTalkNote(existing.id);
        setNotes((m) => {
          const next = { ...m };
          delete next[n];
          return next;
        });
      }
      setSelection(null);
      return;
    }
    void saveTalkNote({ ...meta, paragraph: n, text }).then((saved) =>
      setNotes((m) => ({ ...m, [n]: saved })),
    );
    setSelection(null);
  }

  function removeNote(n: number) {
    const existing = notes[n];
    if (existing) {
      void deleteTalkNote(existing.id);
      setNotes((m) => {
        const next = { ...m };
        delete next[n];
        return next;
      });
    }
    setOpenNote(null);
  }

  function selectParagraph(n: number) {
    setOpenFootnote(null);
    setOpenNote(null);
    setSelection((cur) => (cur === n ? null : n));
    setNoteDraft(notes[n]?.text ?? "");
  }

  // Tap anywhere on a paragraph to open its toolbar — unless the tap landed on an
  // interactive child (footnote marker, note pencil, the toolbar itself) or the
  // reader is selecting text to copy by hand.
  function onParagraphClick(e: React.MouseEvent, n: number) {
    if ((e.target as HTMLElement).closest("button, a, textarea")) return;
    const sel = window.getSelection();
    if (sel && sel.toString().length > 0) return;
    selectParagraph(n);
  }

  function showFootnote(p: number, index: number) {
    setSelection(null);
    setOpenNote(null);
    setOpenFootnote((cur) =>
      cur?.p === p && cur.index === index ? null : { p, index },
    );
  }

  function showNote(n: number) {
    setSelection(null);
    setOpenFootnote(null);
    setOpenNote((cur) => (cur === n ? null : n));
  }

  return (
    <div className="reader-prose mx-auto mt-10 max-w-2xl space-y-1.5 font-serif animate-in fade-in duration-500">
      {paragraphs.map((para, i) => {
        const n = i + 1;
        const isFootnoteOpen = openFootnote?.p === n;
        const color = highlights[n]?.color ?? null;
        const note = notes[n];
        const selected = selection === n;
        return (
          <div
            key={i}
            id={`p${n}`}
            data-paragraph={n}
            onClick={(e) => onParagraphClick(e, n)}
            className={cn(
              "scroll-mt-24 rounded-md px-2 py-1.5 transition-[background-color,box-shadow] duration-700",
              "cursor-pointer hover:bg-accent/30",
              selected && "bg-primary/5 hover:bg-primary/5",
              targetPara === n && "bg-primary/10 ring-2 ring-primary/40",
            )}
          >
            <p className="text-foreground/90">
              <span
                className={cn(
                  "rounded px-0.5 transition-colors",
                  highlightClass(color),
                )}
              >
                {renderParagraph(
                  para.text,
                  para.footNotes,
                  (index) => showFootnote(n, index),
                  isFootnoteOpen ? openFootnote.index : null,
                )}
              </span>
              {note && (
                <button
                  type="button"
                  onClick={() => showNote(n)}
                  aria-label={`Note on paragraph ${n}`}
                  className={cn(
                    "ml-0.5 cursor-pointer align-super transition-colors",
                    openNote === n
                      ? "text-primary"
                      : "text-primary/55 hover:text-primary",
                  )}
                >
                  <Pencil className="inline size-3" />
                </button>
              )}
            </p>

            {selected && (
              <ParagraphToolbar
                color={color}
                bookmarked={!!bookmarks[n]}
                noteDraft={noteDraft}
                text={para.text}
                attribution={`${title} — ${speaker}`}
                anchor={`p${n}`}
                onColor={(c) => applyColor(n, c)}
                onToggleBookmark={() => toggleBookmark(n)}
                onNoteChange={setNoteDraft}
                onSave={() => commitNote(n)}
                onClose={() => setSelection(null)}
              />
            )}

            {openNote === n && note && (
              <NotePanel
                key={`note-${n}`}
                text={note.text}
                onEdit={() => selectParagraph(n)}
                onRemove={() => removeNote(n)}
                onClose={() => setOpenNote(null)}
              />
            )}

            {isFootnoteOpen && para.footNotes[openFootnote.index] && (
              <FootnoteNote
                letter={markerLetter(openFootnote.index)}
                text={para.footNotes[openFootnote.index].text}
                onClose={() => setOpenFootnote(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

const emptySubscribe = () => () => {};

function useCanShare(): boolean {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );
}

function ParagraphToolbar({
  color,
  bookmarked,
  noteDraft,
  text,
  attribution,
  anchor,
  onColor,
  onToggleBookmark,
  onNoteChange,
  onSave,
  onClose,
}: {
  color: HighlightColor | null;
  bookmarked: boolean;
  noteDraft: string;
  text: string;
  attribution: string;
  anchor: string;
  onColor: (color: HighlightColor | null) => void;
  onToggleBookmark: () => void;
  onNoteChange: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const canShare = useCanShare();

  // The quote, its attribution, and a deep link straight back to this paragraph.
  function quote(): string {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}#${anchor}`
        : "";
    return `“${text}”\n\n${attribution}\n${url}`;
  }

  function copy() {
    navigator.clipboard
      ?.writeText(quote())
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  function share() {
    navigator.share({ title: attribution, text: quote() }).catch(() => {});
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="my-2 max-w-md rounded-lg border border-border bg-card p-2.5 font-sans animate-in fade-in slide-in-from-top-1 duration-200"
    >
      <div className="flex flex-wrap items-center gap-1.5">
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
          aria-label={bookmarked ? "Remove bookmark" : "Bookmark paragraph"}
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
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy quote"}
          className="flex size-6 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? (
            <Check className="size-3.5 text-primary" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </button>
        {canShare && (
          <button
            type="button"
            onClick={share}
            aria-label="Share quote"
            className="flex size-6 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
          >
            <Share2 className="size-3.5" />
          </button>
        )}
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
        className="mt-2 w-full resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 sm:text-sm"
      />
      <div className="mt-1.5 flex justify-end">
        <button
          type="button"
          onClick={onSave}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Save note
        </button>
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
    <div
      onClick={(e) => e.stopPropagation()}
      className="my-2 max-w-md rounded-lg border border-border bg-card p-3 font-sans text-sm animate-in fade-in slide-in-from-top-1 duration-200"
    >
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

function FootnoteNote({
  letter,
  text,
  onClose,
}: {
  letter: string;
  text: string;
  onClose: () => void;
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="my-3 max-w-xl rounded-lg border border-border bg-card p-3 font-sans text-sm animate-in fade-in slide-in-from-top-1 duration-200"
    >
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
