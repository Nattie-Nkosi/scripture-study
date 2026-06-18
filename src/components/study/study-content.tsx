"use client";

import * as React from "react";
import Link from "next/link";
import { Bookmark, Highlighter, Pencil } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getBookmarks,
  getHighlights,
  getNotes,
  type Bookmark as BookmarkRec,
  type Highlight,
  type Note,
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

export function StudyContent() {
  const [bookmarks, setBookmarks] = React.useState<BookmarkRec[]>([]);
  const [highlights, setHighlights] = React.useState<Highlight[]>([]);
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    Promise.all([getBookmarks(), getHighlights(), getNotes()])
      .then(([b, h, n]) => {
        setBookmarks(b);
        setHighlights([...h].sort((a, c) => c.updatedAt - a.updatedAt));
        setNotes([...n].sort((a, c) => c.updatedAt - a.updatedAt));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  if (!bookmarks.length && !highlights.length && !notes.length) {
    return (
      <div className="mt-10 max-w-prose">
        <p className="font-serif leading-relaxed text-muted-foreground">
          Nothing saved yet. As you read, highlight a verse, jot a note, or
          bookmark a chapter — it will gather here, ready when you return.
        </p>
        <Link
          href="/read"
          className="mt-5 inline-block text-sm font-medium text-primary hover:underline"
        >
          Open the library →
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-12">
      {bookmarks.length > 0 && (
        <Section icon={<Bookmark className="size-4" />} title="Bookmarks" count={bookmarks.length}>
          {bookmarks.map((b) => (
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
          ))}
        </Section>
      )}

      {highlights.length > 0 && (
        <Section
          icon={<Highlighter className="size-4" />}
          title="Highlights"
          count={highlights.length}
        >
          {highlights.map((h) => (
            <Row key={h.id} href={verseHref(h)}>
              <span className={cn("size-3 shrink-0 rounded-full", DOT[h.color])} />
              <span className="font-serif text-foreground/90">
                {reference(h.bookTitle || h.book, h.chapter, h.verse)}
              </span>
            </Row>
          ))}
        </Section>
      )}

      {notes.length > 0 && (
        <Section icon={<Pencil className="size-4" />} title="Notes" count={notes.length}>
          {notes.map((n) => (
            <Row key={n.id} href={verseHref(n)}>
              <span className="shrink-0 font-serif text-foreground/90">
                {reference(n.bookTitle || n.book, n.chapter, n.verse)}
              </span>
              <span className="min-w-0 truncate text-sm text-muted-foreground">
                {n.text}
              </span>
            </Row>
          ))}
        </Section>
      )}
    </div>
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
