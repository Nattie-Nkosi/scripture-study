import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";

import { getBook, getVolume } from "@/lib/scripture/client";
import { fetchOrNotFound } from "@/lib/scripture/server-helpers";
import { SiteHeader } from "@/components/site-header";

type Props = { params: Promise<{ volume: string; book: string }> };

async function bookTitleFor(volume: string, book: string): Promise<string> {
  const vol = await fetchOrNotFound(() => getVolume(volume));
  return vol.books.find((b) => b._id === book)?.title ?? book;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { volume, book } = await params;
  return { title: await bookTitleFor(volume, book) };
}

export default async function BookPage({ params }: Props) {
  const { volume, book } = await params;
  const [title, data] = await Promise.all([
    bookTitleFor(volume, book),
    fetchOrNotFound(() => getBook(book)),
  ]);

  const delineation = data.chapterDelineation || "Chapter";

  return (
    <>
      <SiteHeader>
        <p className="truncate text-center font-serif text-sm text-muted-foreground">
          {title}
        </p>
      </SiteHeader>

      <main className="mx-auto w-full max-w-3xl px-5 py-14 sm:py-20">
        <Link
          href={`/read/${volume}`}
          className="inline-flex items-center gap-1 eyebrow text-muted-foreground transition-colors hover:text-primary"
        >
          <ChevronLeft aria-hidden className="size-3.5" />
          Back
        </Link>
        <h1 className="mt-3 font-display text-5xl font-light tracking-tight">
          {title}
        </h1>
        <p className="mt-3 font-serif text-muted-foreground italic">
          {data.chapters.length} {delineation.toLowerCase()}
          {data.chapters.length === 1 ? "" : "s"}
        </p>

        <ul className="mt-12 grid grid-cols-6 gap-y-1 border-t border-border pt-4 sm:grid-cols-10">
          {data.chapters.map((chapter, i) => {
            const number = i + 1;
            return (
              <li key={chapter._id}>
                <Link
                  href={`/read/${volume}/${book}/${number}`}
                  title={chapter.summary || undefined}
                  className="flex h-12 items-center justify-center font-serif text-xl font-light tabular-nums transition-colors hover:text-primary hover:italic"
                >
                  {number}
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
