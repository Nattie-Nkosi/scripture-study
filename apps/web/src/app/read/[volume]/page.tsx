import Link from "next/link";
import type { Metadata } from "next";

import { getVolume } from "@/lib/scripture/client";
import { fetchOrNotFound } from "@/lib/scripture/server-helpers";
import { SiteHeader } from "@/components/site-header";

type Props = { params: Promise<{ volume: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { volume } = await params;
  const data = await fetchOrNotFound(() => getVolume(volume));
  return { title: data.title };
}

export default async function VolumePage({ params }: Props) {
  const { volume } = await params;
  const data = await fetchOrNotFound(() => getVolume(volume));

  return (
    <>
      <SiteHeader>
        <p className="truncate text-center font-serif text-sm text-muted-foreground">
          {data.title}
        </p>
      </SiteHeader>

      <main className="mx-auto w-full max-w-3xl px-5 py-14 sm:py-20">
        <Link
          href="/read"
          className="eyebrow text-muted-foreground transition-colors hover:text-primary"
        >
          ← Library
        </Link>
        <h1 className="mt-3 font-display text-5xl font-light tracking-tight">
          {data.title}
        </h1>
        <p className="mt-3 font-serif text-muted-foreground italic">
          {data.books.length} books
        </p>

        <ol className="mt-12 grid gap-x-10 border-t border-border sm:grid-cols-2">
          {data.books.map((book, i) => (
            <li key={book._id} className="border-b border-border">
              <Link
                href={`/read/${volume}/${book._id}`}
                className="group flex items-baseline gap-4 py-3.5"
              >
                <span className="w-6 shrink-0 font-serif text-sm text-muted-foreground/70 tabular-nums">
                  {i + 1}
                </span>
                <span className="font-serif text-lg transition-colors group-hover:text-primary">
                  {book.title}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </main>
    </>
  );
}
