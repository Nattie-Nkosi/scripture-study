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

      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
        <Link
          href="/read"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Library
        </Link>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
          {data.title}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {data.books.length} books · choose one to see its chapters.
        </p>

        <ul className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {data.books.map((book) => (
            <li key={book._id}>
              <Link
                href={`/read/${volume}/${book._id}`}
                className="block rounded-lg border border-border bg-card px-4 py-3 font-serif transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent/40 hover:shadow-sm active:translate-y-0"
              >
                {book.title}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
