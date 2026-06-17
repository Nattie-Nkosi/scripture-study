import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { getChapter } from "@/lib/scripture/client";
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { book, chapter } = await params;
  const data = await fetchOrNotFound(() => getChapter(book, parseChapter(chapter)));
  return { title: `${data.book.title} ${data.chapter.number}` };
}

export default async function ReaderPage({ params }: Props) {
  const { volume, book, chapter } = await params;
  const data = await fetchOrNotFound(() => getChapter(book, parseChapter(chapter)));
  const { chapter: body, book: bookRef, volume: volRef } = data;

  return (
    <>
      <ReaderHeader volumeId={volume} bookId={book} bookTitle={bookRef.title} />

      <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
        <div className="text-center">
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
          }))}
        />

        <nav className="mx-auto mt-14 flex max-w-2xl items-center justify-between gap-3 border-t pt-6">
          {data.prevChapterId ? (
            <Link
              href={`/read/c/${data.prevChapterId}`}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              <ArrowLeft /> Previous
            </Link>
          ) : (
            <span />
          )}
          {data.nextChapterId ? (
            <Link
              href={`/read/c/${data.nextChapterId}`}
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
