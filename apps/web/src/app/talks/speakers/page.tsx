import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import { listSpeakers, ConferenceApiError } from "@/lib/conference/client";
import { SpeakerAvatar } from "@/components/conference/speaker-avatar";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Conference speakers" };

const PAGE_SIZE = 60;

type Props = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

export default async function SpeakersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  let data;
  try {
    data = await listSpeakers(PAGE_SIZE, offset, q);
  } catch (err) {
    const status = err instanceof ConferenceApiError ? err.status : undefined;
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
          <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Couldn’t load speakers{status ? ` (HTTP ${status})` : ""}. Please try
            again.
          </p>
        </main>
        <SiteFooter />
      </>
    );
  }

  const shownUpTo = offset + data.speakers.length;
  const hasPrev = page > 1;
  const hasNext = shownUpTo < data.total;
  const linkFor = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/talks/speakers?${qs}` : "/talks/speakers";
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-14 sm:py-20">
        <Link
          href="/talks"
          className="inline-flex items-center gap-1 eyebrow text-muted-foreground transition-colors hover:text-primary"
        >
          <ChevronLeft className="size-3.5" />
          General Conference
        </Link>

        <h1 className="mt-4 font-display text-5xl font-light tracking-tight sm:text-6xl">
          Speakers
        </h1>

        <form action="/talks/speakers" method="get" className="mt-8">
          <div className="relative">
            <Search strokeWidth={1.5} className="pointer-events-none absolute top-1/2 left-0.5 size-4.5 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Find a speaker by name…"
              className="w-full border-0 border-b border-border bg-transparent py-3 pr-3 pl-8 font-serif text-xl outline-none transition-colors placeholder:text-muted-foreground/60 placeholder:italic focus-visible:border-primary"
            />
          </div>
        </form>

        <p className="mt-6 font-serif text-muted-foreground italic">
          {data.total.toLocaleString()} speaker{data.total === 1 ? "" : "s"}
          {q ? (
            <>
              {" "}
              matching <span className="font-medium">“{q}”</span>
            </>
          ) : null}
        </p>

        {data.speakers.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            No speakers found{q ? <> for “{q}”</> : null}.
          </p>
        ) : (
          <ol className="mt-3 border-y border-border">
            {data.speakers.map((s) => (
              <li key={s._id} className="border-b border-border last:border-b-0">
                <Link
                  href={`/talks/speakers/${s._id}`}
                  className="group flex items-center gap-3.5 py-3.5"
                >
                  <SpeakerAvatar
                    id={s._id}
                    name={s.name}
                    className="size-10 text-sm"
                    sizes="40px"
                  />
                  <span className="flex-1">
                    <span className="block font-display text-xl transition-colors group-hover:text-primary">
                      {s.name}
                    </span>
                    <span className="mt-0.5 block eyebrow text-muted-foreground">
                      {s.talkCount} talk{s.talkCount === 1 ? "" : "s"} ·{" "}
                      {s.firstYear === s.lastYear
                        ? s.firstYear
                        : `${s.firstYear}–${s.lastYear}`}
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 self-center text-muted-foreground opacity-0 transition-all group-hover:translate-x-1 group-hover:text-primary group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ol>
        )}

        {(hasPrev || hasNext) && (
          <div className="mt-8 flex items-center justify-between">
            {hasPrev ? (
              <Link
                href={linkFor(page - 1)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="eyebrow text-muted-foreground">Page {page}</span>
            {hasNext ? (
              <Link
                href={linkFor(page + 1)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Next →
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
