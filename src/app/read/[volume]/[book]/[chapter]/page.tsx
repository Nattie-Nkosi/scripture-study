import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { getChapter } from "@/lib/scripture/client";
import { getBookIndexById } from "@/lib/scripture/reference-index";
import { fetchOrNotFound } from "@/lib/scripture/server-helpers";
import { ReaderHeader } from "@/components/reader/reader-header";
import { ChapterBody } from "@/components/reader/chapter-body";
import { AssistantPanel } from "@/components/reader/assistant-panel";
import { buttonVariants } from "@/components/ui/button";

type Props = {
  params: Promise<{ volume: string; book: string; chapter: string }>;
};

function parseChapter(raw: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) notFound();
  return n;
}

/** Split a chapter id like "1nephi2" into { bookId: "1nephi", chapter: 2 }. */
function parseChapterId(id: string): { bookId: string; chapter: number } | null {
  const m = /^(.+?)(\d+)$/.exec(id);
  if (!m) return null;
  return { bookId: m[1], chapter: Number(m[2]) };
}

/** Resolve a prev/next chapter id to its canonical reader URL so navigation is
 *  a single hop (no /read/c resolver redirect, which caused a double skeleton).
 *  Only looks up the volume when crossing into a different book. */
async function resolveChapterHref(
  currentVolume: string,
  currentBook: string,
  id: string | null,
): Promise<string | null> {
  if (!id) return null;
  const parsed = parseChapterId(id);
  if (!parsed) return `/read/c/${id}`; // fall back to the resolver
  if (parsed.bookId === currentBook) {
    return `/read/${currentVolume}/${parsed.bookId}/${parsed.chapter}`;
  }
  const index = await getBookIndexById();
  const volume = index.get(parsed.bookId)?.volumeId ?? currentVolume;
  return `/read/${volume}/${parsed.bookId}/${parsed.chapter}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { book, chapter } = await params;
  const data = await fetchOrNotFound(() => getChapter(book, parseChapter(chapter)));
  return { title: `${data.book.title} ${data.chapter.number}` };
}

export default async function ReaderPage({ params }: Props) {
  const { volume, book, chapter } = await params;
  const data = await fetchOrNotFound(() => getChapter(book, parseChapter(chapter)));
  const { chapter: body, book: bookRef, volume: volRef } = data;

  const [prevHref, nextHref] = await Promise.all([
    resolveChapterHref(volRef._id, bookRef._id, data.prevChapterId),
    resolveChapterHref(volRef._id, bookRef._id, data.nextChapterId),
  ]);

  return (
    <>
      <ReaderHeader volumeId={volume} bookId={book} bookTitle={bookRef.title} />

      <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
        <div className="text-center animate-in fade-in duration-500">
          <p className="font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {volRef.title}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            {bookRef.title} {body.number}
          </h1>
          {body.summary && (
            <p className="mx-auto mt-4 max-w-xl font-serif text-[0.95rem] leading-relaxed text-muted-foreground italic">
              {body.summary}
            </p>
          )}
        </div>

        <ChapterBody
          volume={volume}
          book={book}
          chapter={body.number}
          kjvVerses={body.verses.map((verse, i) => ({
            n: i + 1,
            text: verse.text,
            footNotes: verse.footNotes,
          }))}
        />

        <nav className="mx-auto mt-14 flex max-w-2xl items-center justify-between gap-3 border-t pt-6">
          {prevHref ? (
            <Link
              href={prevHref}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              <ArrowLeft /> Previous
            </Link>
          ) : (
            <span />
          )}
          {nextHref ? (
            <Link
              href={nextHref}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Next <ArrowRight />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </main>

      <AssistantPanel
        volume={volume}
        book={book}
        chapter={body.number}
        bookTitle={bookRef.title}
      />
    </>
  );
}
