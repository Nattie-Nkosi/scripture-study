import Link from "next/link";

import { searchScriptures, ScriptureApiError } from "@/lib/scripture/client";
import { getBookIndexByTitle } from "@/lib/scripture/reference-index";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SearchBox } from "@/components/search/search-box";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Search" };

const PAGE_SIZE = 20;

type Props = {
  searchParams: Promise<{ q?: string; volume?: string; page?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const volume = sp.volume ?? "";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Search</h1>
        <p className="mt-2 mb-6 text-muted-foreground">
          Find verses across all the standard works.
        </p>

        <SearchBox initialQuery={q} initialVolume={volume} />

        {q ? (
          <Results q={q} volume={volume} page={page} offset={offset} />
        ) : (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Try searching for a word or an exact phrase like{" "}
            <span className="font-medium">&ldquo;plan of salvation&rdquo;</span>.
          </p>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

async function Results({
  q,
  volume,
  page,
  offset,
}: {
  q: string;
  volume: string;
  page: number;
  offset: number;
}) {
  let data;
  try {
    [data] = await Promise.all([
      searchScriptures(q, {
        limit: PAGE_SIZE,
        offset,
        volume: volume || undefined,
        highlight: true,
      }),
    ]);
  } catch (err) {
    const status = err instanceof ScriptureApiError ? err.status : undefined;
    return (
      <p className="mt-10 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Search is unavailable right now{status ? ` (HTTP ${status})` : ""}. Please
        try again.
      </p>
    );
  }

  const index = await getBookIndexByTitle();

  if (data.results.length === 0) {
    return (
      <p className="mt-10 text-center text-sm text-muted-foreground">
        No results for <span className="font-medium">“{q}”</span>.
      </p>
    );
  }

  const shownUpTo = offset + data.results.length;
  const hasPrev = page > 1;
  const hasNext = shownUpTo < data.total;
  const linkFor = (p: number) => {
    const params = new URLSearchParams({ q });
    if (volume) params.set("volume", volume);
    if (p > 1) params.set("page", String(p));
    return `/search?${params.toString()}`;
  };

  return (
    <div className="mt-8 animate-in fade-in duration-300">
      <p className="text-sm text-muted-foreground">
        {data.total.toLocaleString()} result{data.total === 1 ? "" : "s"} ·
        showing {offset + 1}–{shownUpTo}
      </p>

      <ul className="mt-4 divide-y divide-border">
        {data.results.map((r, i) => {
          const ref = index.get(r.book.toLowerCase());
          const href = ref
            ? `/read/${ref.volumeId}/${ref.bookId}/${r.chapter}#v${r.verse}`
            : null;
          const Inner = (
            <>
              <p className="font-serif text-sm font-semibold text-primary">
                {r.reference}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground/90">
                {r.highlight ?? r.text}
              </p>
            </>
          );
          return (
            <li key={`${r.reference}-${i}`} className="py-4">
              {href ? (
                <Link href={href} className="block rounded-md transition-colors hover:bg-accent/30">
                  {Inner}
                </Link>
              ) : (
                Inner
              )}
            </li>
          );
        })}
      </ul>

      {(hasPrev || hasNext) && (
        <div className="mt-8 flex items-center justify-between">
          {hasPrev ? (
            <Link href={linkFor(page - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted-foreground">Page {page}</span>
          {hasNext ? (
            <Link href={linkFor(page + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Next →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
