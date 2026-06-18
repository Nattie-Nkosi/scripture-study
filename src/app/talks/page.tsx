import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  getAllConferences,
  getLatestConference,
  ConferenceApiError,
} from "@/lib/conference/client";
import { conferenceShortTitle, monthName, talkCount } from "@/lib/conference/format";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Ornament } from "@/components/ornament";
import type { Conference } from "@/lib/conference/types";

export const metadata = {
  title: "General Conference",
};

function groupByYear(conferences: Conference[]): [number, Conference[]][] {
  const byYear = new Map<number, Conference[]>();
  for (const c of conferences) {
    const list = byYear.get(c.year) ?? [];
    list.push(c);
    byYear.set(c.year, list);
  }
  return [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, list]) => [year, list.sort((a, b) => a.month - b.month)]);
}

export default async function TalksPage() {
  let latest: Conference;
  let conferences: Conference[];
  try {
    [latest, conferences] = await Promise.all([
      getLatestConference(),
      getAllConferences(),
    ]);
  } catch (err) {
    const status = err instanceof ConferenceApiError ? err.status : undefined;
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
          <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Couldn’t load conference talks{status ? ` (HTTP ${status})` : ""}. The
            service may be temporarily unavailable — please try again.
          </p>
        </main>
        <SiteFooter />
      </>
    );
  }

  const years = groupByYear(conferences);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-14 sm:py-20">
        <p className="small-caps text-sm text-primary">General Conference</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Words of the prophets
        </h1>
        <p className="mt-4 max-w-xl font-serif text-lg leading-relaxed text-muted-foreground text-pretty">
          Semiannual addresses from the leaders of The Church of Jesus Christ of
          Latter-day Saints, from 1971 to today.
        </p>

        <Link
          href={`/talks/${latest._id}`}
          className="group mt-10 block rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
        >
          <span className="small-caps text-xs text-primary">
            Latest conference
          </span>
          <span className="mt-1 block font-display text-2xl font-medium transition-colors group-hover:text-primary">
            {latest.title}
          </span>
          <span className="mt-1.5 block small-caps text-xs text-muted-foreground">
            {latest.sessions.length} sessions · {talkCount(latest)} talks
          </span>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
            Browse talks
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>

        <Ornament className="my-12" />

        <p className="small-caps text-sm text-primary">The archive</p>
        <ol className="mt-5 border-y border-border">
          {years.map(([year, list]) => (
            <li
              key={year}
              className="flex items-center gap-4 border-b border-border py-3.5 last:border-b-0"
            >
              <span className="w-12 shrink-0 font-display text-lg text-foreground/80 tabular-nums">
                {year}
              </span>
              <span className="flex flex-wrap gap-2">
                {list.map((c) => (
                  <Link
                    key={c._id}
                    href={`/talks/${c._id}`}
                    className="rounded-full border border-border px-3 py-1 text-sm text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {monthName(c.month)}
                  </Link>
                ))}
              </span>
            </li>
          ))}
        </ol>
        <p className="sr-only">
          {conferences.length} conferences from{" "}
          {conferenceShortTitle(
            conferences[conferences.length - 1]?.year ?? 0,
            conferences[conferences.length - 1]?.month ?? 0,
          )}{" "}
          to {conferenceShortTitle(latest.year, latest.month)}.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
