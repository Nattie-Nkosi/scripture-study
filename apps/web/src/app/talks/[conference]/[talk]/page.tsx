import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Headphones } from "lucide-react";

import { getTalk, fetchConferenceOrNotFound } from "@/lib/conference/client";
import {
  conferenceShortTitle,
  officialTalkUrl,
  readingTimeMinutes,
} from "@/lib/conference/format";
import { TalkHeader } from "@/components/reader/talk-header";
import { TalkBody } from "@/components/reader/talk-body";
import { TalkAssistantPanel } from "@/components/reader/talk-assistant-panel";
import { RecordTalkPosition } from "@/components/reader/record-talk-position";
import { ReadingProgress } from "@/components/reader/reading-progress";
import { BackToTop } from "@/components/reader/back-to-top";
import { Ornament } from "@/components/ornament";

type Props = {
  params: Promise<{ conference: string; talk: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { talk } = await params;
  const data = await fetchConferenceOrNotFound(() => getTalk(talk));
  return { title: `${data.title} — ${data.speaker}` };
}

export default async function TalkPage({ params }: Props) {
  const { talk } = await params;
  const data = await fetchConferenceOrNotFound(() => getTalk(talk));
  const { content } = data;
  const minutes = readingTimeMinutes(content.paragraphs);

  const prevHref = data.prevTalkId
    ? `/talks/${data.conferenceId}/${data.prevTalkId}`
    : null;
  const nextHref = data.nextTalkId
    ? `/talks/${data.conferenceId}/${data.nextTalkId}`
    : null;

  return (
    <>
      <RecordTalkPosition
        talkId={data._id}
        conferenceId={data.conferenceId}
        title={data.title}
        speaker={data.speaker}
      />
      <TalkHeader
        conferenceId={data.conferenceId}
        conferenceTitle={conferenceShortTitle(data.year, data.month)}
      />
      <ReadingProgress />

      <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
        <div className="text-center animate-in fade-in duration-500">
          <h1 className="mx-auto max-w-2xl font-display text-4xl leading-[1.08] font-light tracking-tight sm:text-[3.25rem]">
            {data.title}
          </h1>
          <p className="mt-4 font-serif text-base text-muted-foreground">{data.session}</p>
          <p className="mt-6 font-serif text-lg text-foreground/85 italic">
            {data.speaker}
          </p>
          {data.role && (
            <p className="mt-1 font-serif text-sm text-muted-foreground text-pretty">
              {data.role}
            </p>
          )}
          <div className="mt-5 flex items-center justify-center gap-4 eyebrow text-muted-foreground">
            <span>{minutes} min read</span>
            <span aria-hidden className="size-1 rotate-45 bg-border" />
            <a
              href={officialTalkUrl(data)}
              target="_blank"
              rel="noopener noreferrer"
              title="Opens the official recording on churchofjesuschrist.org"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-primary"
            >
              <Headphones className="size-3.5" /> Listen in the speaker&rsquo;s voice
            </a>
          </div>
          <Ornament className="mt-9" />
        </div>

        <TalkBody
          paragraphs={content.paragraphs}
          talkId={data._id}
          conferenceId={data.conferenceId}
          title={data.title}
          speaker={data.speaker}
        />

        <nav className="mx-auto mt-20 flex max-w-2xl items-center justify-between gap-3 border-t border-border pt-6">
          {prevHref ? (
            <Link
              href={prevHref}
              className="group inline-flex items-center gap-2 eyebrow text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
              Previous
            </Link>
          ) : (
            <span />
          )}
          {nextHref ? (
            <Link
              href={nextHref}
              className="group inline-flex items-center gap-2 eyebrow text-muted-foreground transition-colors hover:text-primary"
            >
              Next
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </main>

      <BackToTop />

      <TalkAssistantPanel
        talkId={data._id}
        title={data.title}
        speaker={data.speaker}
      />
    </>
  );
}
