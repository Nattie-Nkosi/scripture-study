"use client";

import * as React from "react";
import Link from "next/link";
import { Bookmark, Highlighter, Pencil } from "lucide-react";

import { cn } from "@/lib/utils";
import { conferenceShortTitle } from "@/lib/conference/format";
import {
  getBookmarks,
  getHighlights,
  getNotes,
  getTalkBookmarks,
  getTalkHighlights,
  getTalkNotes,
  type Bookmark as BookmarkRec,
  type Highlight,
  type Note,
  type TalkBookmark as TalkBookmarkRec,
  type TalkHighlight,
  type TalkNote,
} from "@/lib/study/storage";

const DOT: Record<string, string> = {
  yellow: "bg-yellow-300",
  green: "bg-green-300",
  blue: "bg-sky-300",
  pink: "bg-pink-300",
};

function verseHref(r: {
  volume: string;
  book: string;
  chapter: number;
  verse: number | null;
}): string {
  const base = `/read/${r.volume}/${r.book}/${r.chapter}`;
  return r.verse ? `${base}#v${r.verse}` : base;
}

function reference(bookTitle: string, chapter: number, verse: number | null): string {
  return verse ? `${bookTitle} ${chapter}:${verse}` : `${bookTitle} ${chapter}`;
}

function talkHref(r: {
  conferenceId: string;
  talkId: string;
  paragraph: number | null;
}): string {
  const base = `/talks/${r.conferenceId}/${r.talkId}`;
  return r.paragraph ? `${base}#p${r.paragraph}` : base;
}

/** "April 2024" from a "2024-04" conference id, or "" if unparseable. */
function conferenceLabel(conferenceId: string): string {
  const [y, m] = conferenceId.split("-").map(Number);
  return y && m ? conferenceShortTitle(y, m) : "";
}

// Scripture and talk records share the same three sections; a `source` tag keeps
// them apart at render time while they sort together by recency.
type BookmarkItem =
  | ({ source: "scripture" } & BookmarkRec)
  | ({ source: "talk" } & TalkBookmarkRec);
type HighlightItem =
  | ({ source: "scripture" } & Highlight)
  | ({ source: "talk" } & TalkHighlight);
type NoteItem =
  | ({ source: "scripture" } & Note)
  | ({ source: "talk" } & TalkNote);

export function StudyContent() {
  const [bookmarks, setBookmarks] = React.useState<BookmarkItem[]>([]);
  const [highlights, setHighlights] = React.useState<HighlightItem[]>([]);
  const [notes, setNotes] = React.useState<NoteItem[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    Promise.all([
      getBookmarks(),
      getHighlights(),
      getNotes(),
      getTalkBookmarks(),
      getTalkHighlights(),
      getTalkNotes(),
    ])
      .then(([b, h, n, tb, th, tn]) => {
        setBookmarks(
          [
            ...b.map((x) => ({ source: "scripture" as const, ...x })),
            ...tb.map((x) => ({ source: "talk" as const, ...x })),
          ].sort((a, c) => c.createdAt - a.createdAt),
        );
        setHighlights(
          [
            ...h.map((x) => ({ source: "scripture" as const, ...x })),
            ...th.map((x) => ({ source: "talk" as const, ...x })),
          ].sort((a, c) => c.updatedAt - a.updatedAt),
        );
        setNotes(
          [
            ...n.map((x) => ({ source: "scripture" as const, ...x })),
            ...tn.map((x) => ({ source: "talk" as const, ...x })),
          ].sort((a, c) => c.updatedAt - a.updatedAt),
        );
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  if (!bookmarks.length && !highlights.length && !notes.length) {
    return (
      <div className="mt-10 max-w-prose">
        <p className="font-serif leading-relaxed text-muted-foreground">
          Nothing saved yet. As you read scripture or a conference talk, highlight
          a passage, jot a note, or add a bookmark — it will gather here, ready
          when you return.
        </p>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
          <Link
            href="/read"
            className="text-sm font-medium text-primary hover:underline"
          >
            Open the library →
          </Link>
          <Link
            href="/talks"
            className="text-sm font-medium text-primary hover:underline"
          >
            Browse talks →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-12">
      {bookmarks.length > 0 && (
        <Section icon={<Bookmark className="size-4" />} title="Bookmarks" count={bookmarks.length}>
          {bookmarks.map((b) =>
            b.source === "scripture" ? (
              <Row key={b.id} href={verseHref(b)}>
                <span className="font-serif text-foreground/90">
                  {reference(b.bookTitle, b.chapter, b.verse)}
                </span>
                {b.verse === null && (
                  <span className="ml-2 small-caps text-xs text-muted-foreground">
                    Chapter
                  </span>
                )}
              </Row>
            ) : (
              <Row key={b.id} href={talkHref(b)}>
                <TalkLabel
                  title={b.title}
                  subtitle={joinMeta(b.speaker, conferenceLabel(b.conferenceId))}
                />
                {b.paragraph === null && (
                  <span className="ml-auto shrink-0 small-caps text-xs text-muted-foreground">
                    Talk
                  </span>
                )}
              </Row>
            ),
          )}
        </Section>
      )}

      {highlights.length > 0 && (
        <Section
          icon={<Highlighter className="size-4" />}
          title="Highlights"
          count={highlights.length}
        >
          {highlights.map((h) =>
            h.source === "scripture" ? (
              <Row key={h.id} href={verseHref(h)}>
                <span className={cn("size-3 shrink-0 rounded-full", DOT[h.color])} />
                <span className="font-serif text-foreground/90">
                  {reference(h.bookTitle || h.book, h.chapter, h.verse)}
                </span>
              </Row>
            ) : (
              <Row key={h.id} href={talkHref(h)}>
                <span className={cn("mt-1 size-3 shrink-0 self-start rounded-full", DOT[h.color])} />
                <TalkLabel
                  title={h.title}
                  subtitle={joinMeta(h.speaker, conferenceLabel(h.conferenceId))}
                />
              </Row>
            ),
          )}
        </Section>
      )}

      {notes.length > 0 && (
        <Section icon={<Pencil className="size-4" />} title="Notes" count={notes.length}>
          {notes.map((n) =>
            n.source === "scripture" ? (
              <Row key={n.id} href={verseHref(n)}>
                <span className="shrink-0 font-serif text-foreground/90">
                  {reference(n.bookTitle || n.book, n.chapter, n.verse)}
                </span>
                <span className="min-w-0 truncate text-sm text-muted-foreground">
                  {n.text}
                </span>
              </Row>
            ) : (
              <Row key={n.id} href={talkHref(n)}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-serif text-foreground/90">
                    {n.title}
                    {n.paragraph ? ` · ¶${n.paragraph}` : ""}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {n.text}
                  </span>
                </span>
              </Row>
            ),
          )}
        </Section>
      )}
    </div>
  );
}

function joinMeta(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(" · ");
}

/** Two-line label for a talk row: title over a muted speaker/conference line. */
function TalkLabel({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate font-serif text-foreground/90">{title}</span>
      {subtitle && (
        <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
      )}
    </span>
  );
}

function Section({
  icon,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="text-primary/70">{icon}</span>
        {title}
        <span className="font-normal text-muted-foreground/60">{count}</span>
      </h2>
      <div className="mt-3 border-t border-border">{children}</div>
    </section>
  );
}

function Row({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="-mx-2 flex items-center gap-3 rounded-md border-b border-border px-2 py-3 transition-colors last:border-b-0 hover:bg-muted/40"
    >
      {children}
    </Link>
  );
}
