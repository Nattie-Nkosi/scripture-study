import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { searchScriptures, ScriptureApiError } from "@/lib/scripture/client";
import { getBookIndexByTitle } from "@/lib/scripture/reference-index";
import {
  resolveReferenceQuery,
  type ReferenceJump,
} from "@/lib/scripture/reference-query";
import {
  searchConferenceTalks,
  ConferenceApiError,
} from "@/lib/conference/client";
import { conferenceShortTitle } from "@/lib/conference/format";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SearchBox } from "@/components/search/search-box";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Search" };

const PAGE_SIZE = 20;

type Props = {
  searchParams: Promise<{
    q?: string;
    volume?: string;
    scope?: string;
    page?: string;
  }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const volume = sp.volume ?? "";
  const scope = sp.scope === "talks" ? "talks" : "scripture";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Search</h1>
        <p className="mt-2 mb-6 text-muted-foreground">
          Find verses across the standard works and General Conference talks.
        </p>

        <SearchBox initialQuery={q} initialVolume={volume} initialScope={scope} />

        {q ? (
          scope === "talks" ? (
            <TalkResults q={q} page={page} offset={offset} />
          ) : (
            <ScriptureResults q={q} volume={volume} page={page} offset={offset} />
          )
        ) : (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            {scope === "talks" ? (
              <>
                Try a topic like{" "}
                <span className="font-medium">&ldquo;spiritual momentum&rdquo;</span>.
              </>
            ) : (
              <>
                Try searching for a word or an exact phrase like{" "}
                <span className="font-medium">&ldquo;plan of salvation&rdquo;</span>.
              </>
            )}
          </p>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function Pager({
  page,
  hasPrev,
  hasNext,
  linkFor,
}: {
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
  linkFor: (p: number) => string;
}) {
  if (!hasPrev && !hasNext) return null;
  return (
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
  );
}

function ReferenceJumpCard({ jump }: { jump: ReferenceJump }) {
  return (
    <div className="mt-8 animate-in fade-in duration-300">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Jump to reference
      </p>
      <Link
        href={jump.url}
        className="group block rounded-lg border border-primary/40 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="font-serif text-base font-semibold text-primary">
            {jump.label}
          </p>
          <ArrowRight className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
        </div>
        <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-foreground/90">
          {jump.text}
        </p>
      </Link>
    </div>
  );
}

async function ScriptureResults({
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
  if (page === 1) {
    const jump = await resolveReferenceQuery(q);
    if (jump) return <ReferenceJumpCard jump={jump} />;
  }

  let data;
  try {
    data = await searchScriptures(q, {
      limit: PAGE_SIZE,
      offset,
      volume: volume || undefined,
      highlight: true,
    });
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

      <Pager
        page={page}
        hasPrev={page > 1}
        hasNext={shownUpTo < data.total}
        linkFor={linkFor}
      />
    </div>
  );
}

async function TalkResults({
  q,
  page,
  offset,
}: {
  q: string;
  page: number;
  offset: number;
}) {
  let data;
  try {
    data = await searchConferenceTalks(q, {
      limit: PAGE_SIZE,
      offset,
      highlight: true,
    });
  } catch (err) {
    const status = err instanceof ConferenceApiError ? err.status : undefined;
    return (
      <p className="mt-10 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Search is unavailable right now{status ? ` (HTTP ${status})` : ""}. Please
        try again.
      </p>
    );
  }

  if (data.results.length === 0) {
    return (
      <p className="mt-10 text-center text-sm text-muted-foreground">
        No conference talks for <span className="font-medium">“{q}”</span>.
      </p>
    );
  }

  const shownUpTo = offset + data.results.length;
  const linkFor = (p: number) => {
    const params = new URLSearchParams({ q, scope: "talks" });
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
        {data.results.map((r, i) => (
          <li key={`${r.talkId}-${r.paragraph}-${i}`} className="py-4">
            <Link
              href={`/talks/${r.conferenceId}/${r.talkId}#p${r.paragraph}`}
              className="block rounded-md transition-colors hover:bg-accent/30"
            >
              <p className="font-serif text-sm font-semibold text-primary text-balance">
                {r.title}
              </p>
              <p className="mt-0.5 small-caps text-xs text-muted-foreground">
                {r.speaker} · {conferenceShortTitle(r.year, r.month)}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
                {r.highlight ?? r.text}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <Pager
        page={page}
        hasPrev={page > 1}
        hasNext={shownUpTo < data.total}
        linkFor={linkFor}
      />
    </div>
  );
}
