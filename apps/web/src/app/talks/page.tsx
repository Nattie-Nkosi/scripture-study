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
import { ContinueTalk } from "@/components/reader/continue-talk";
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
            service may be temporarily unavailable. Please try again.
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
        <h1 className="font-display text-5xl font-light tracking-tight sm:text-6xl">
          General Conference
          <span className="mt-2 block text-[0.5em] leading-tight">Words of the prophets</span>
        </h1>
        <p className="mt-4 max-w-xl font-serif text-lg leading-relaxed text-muted-foreground text-pretty">
          Semiannual addresses from the leaders of The Church of Jesus Christ of
          Latter-day Saints, from 1971 to today.
        </p>

        <Link
          href={`/talks/${latest._id}`}
          className="group mt-12 block border-y border-border py-7"
        >
          <span className="block font-display text-3xl font-light tracking-tight transition-colors group-hover:text-primary">
            {latest.title}
          </span>
          <span className="mt-2 block font-serif text-base text-muted-foreground">
            Latest conference, {latest.sessions.length} sessions and {talkCount(latest)} talks
          </span>
          <span className="mt-4 inline-flex items-center gap-1.5 font-serif text-primary italic">
            Browse talks
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>

        <ContinueTalk className="border-t-0" />

        <div className="mt-6 flex flex-wrap gap-6">
          <Link
            href="/talks/speakers"
            className="eyebrow text-muted-foreground transition-colors hover:text-primary"
          >
            Browse by speaker
          </Link>
          <Link
            href="/search?scope=talks"
            className="eyebrow text-muted-foreground transition-colors hover:text-primary"
          >
            Search talks
          </Link>
        </div>

        <Ornament className="my-16" />

        <h2 className="font-display text-3xl font-light tracking-tight">The archive</h2>
        <ol className="mt-5 border-y border-border">
          {years.map(([year, list]) => (
            <li
              key={year}
              className="flex items-baseline gap-6 border-b border-border py-3.5 last:border-b-0"
            >
              <span className="w-14 shrink-0 font-display text-xl font-light text-foreground/85 tabular-nums">
                {year}
              </span>
              <span className="flex flex-wrap gap-x-5 gap-y-1">
                {list.map((c) => (
                  <Link
                    key={c._id}
                    href={`/talks/${c._id}`}
                    className="font-serif text-foreground/75 italic transition-colors hover:text-primary"
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
