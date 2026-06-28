import Link from "next/link";
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

      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
        <Link
          href={`/read/${volume}`}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back
        </Link>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {data.chapters.length} {delineation.toLowerCase()}
          {data.chapters.length === 1 ? "" : "s"}
        </p>

        <ul className="mt-8 grid grid-cols-5 gap-2 sm:grid-cols-8">
          {data.chapters.map((chapter, i) => {
            const number = i + 1;
            return (
              <li key={chapter._id}>
                <Link
                  href={`/read/${volume}/${book}/${number}`}
                  title={chapter.summary || undefined}
                  className="flex aspect-square items-center justify-center rounded-lg border border-border bg-card font-serif text-lg transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent/40 hover:shadow-sm active:translate-y-0 active:scale-95"
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
