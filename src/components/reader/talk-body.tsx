"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
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

export function TalkBody({ paragraphs }: { paragraphs: TalkParagraph[] }) {
  const [open, setOpen] = React.useState<{ p: number; index: number } | null>(
    null,
  );

  return (
    <div className="reader-prose mx-auto mt-10 max-w-2xl space-y-5 font-serif animate-in fade-in duration-500">
      {paragraphs.map((para, i) => {
        const isOpen = open?.p === i;
        return (
          <div key={i}>
            <p className="text-foreground/90">
              {renderParagraph(
                para.text,
                para.footNotes,
                (index) =>
                  setOpen(
                    isOpen && open.index === index ? null : { p: i, index },
                  ),
                isOpen ? open.index : null,
              )}
            </p>

            {isOpen && para.footNotes[open.index] && (
              <FootnoteNote
                letter={markerLetter(open.index)}
                text={para.footNotes[open.index].text}
                onClose={() => setOpen(null)}
              />
            )}
          </div>
        );
      })}
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
    <div className="my-3 max-w-xl rounded-lg border border-border bg-card p-3 font-sans text-sm animate-in fade-in slide-in-from-top-1 duration-200">
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
    </div>
  );
}
