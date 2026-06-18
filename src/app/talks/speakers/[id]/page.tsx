import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { getSpeaker, fetchConferenceOrNotFound } from "@/lib/conference/client";
import { conferenceShortTitle } from "@/lib/conference/format";
import { SpeakerAvatar } from "@/components/conference/speaker-avatar";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { buttonVariants } from "@/components/ui/button";

const PAGE_SIZE = 50;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await fetchConferenceOrNotFound(() => getSpeaker(id, 1));
  return { title: data.speaker.name };
}

export default async function SpeakerPage({ params, searchParams }: Props) {
  const { id } = await params;
  const page = Math.max(1, Number((await searchParams).page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const data = await fetchConferenceOrNotFound(() =>
    getSpeaker(id, PAGE_SIZE, offset),
  );
  const { speaker } = data;

  const shownUpTo = offset + data.talks.length;
  const hasPrev = page > 1;
  const hasNext = shownUpTo < data.total;
  const linkFor = (p: number) =>
    p > 1 ? `/talks/speakers/${id}?page=${p}` : `/talks/speakers/${id}`;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-14 sm:py-20">
        <Link
          href="/talks/speakers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Speakers
        </Link>

        <div className="mt-5 flex items-center gap-5">
          <SpeakerAvatar
            id={speaker._id}
            name={speaker.name}
            className="size-20 text-2xl sm:size-24"
            sizes="96px"
          />
          <div className="min-w-0">
            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              {speaker.name}
            </h1>
            <p className="mt-2 small-caps text-sm text-muted-foreground">
              {speaker.talkCount} talk{speaker.talkCount === 1 ? "" : "s"} ·{" "}
              {speaker.firstYear === speaker.lastYear
                ? speaker.firstYear
                : `${speaker.firstYear}–${speaker.lastYear}`}
            </p>
          </div>
        </div>

        <ol className="mt-10 border-y border-border">
          {data.talks.map((talk) => (
            <li key={talk._id} className="border-b border-border last:border-b-0">
              <Link
                href={`/talks/${talk.conferenceId}/${talk._id}`}
                className="group flex items-baseline gap-4 py-4"
              >
                <span className="flex-1">
                  <span className="block font-display text-lg font-medium leading-snug transition-colors group-hover:text-primary text-balance">
                    {talk.title}
                  </span>
                  <span className="mt-1 block small-caps text-xs text-muted-foreground">
                    {conferenceShortTitle(talk.year, talk.month)} · {talk.session}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 self-center text-muted-foreground opacity-0 transition-all group-hover:translate-x-1 group-hover:text-primary group-hover:opacity-100" />
              </Link>
            </li>
          ))}
        </ol>

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
            <span className="text-xs text-muted-foreground">Page {page}</span>
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
