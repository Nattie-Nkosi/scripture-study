import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { getTalk, fetchConferenceOrNotFound } from "@/lib/conference/client";
import { conferenceShortTitle, readingTimeMinutes } from "@/lib/conference/format";
import { TalkHeader } from "@/components/reader/talk-header";
import { TalkBody } from "@/components/reader/talk-body";
import { TalkAssistantPanel } from "@/components/reader/talk-assistant-panel";
import { RecordTalkPosition } from "@/components/reader/record-talk-position";
import { ReadingProgress } from "@/components/reader/reading-progress";
import { BackToTop } from "@/components/reader/back-to-top";
import { Ornament } from "@/components/ornament";
import { buttonVariants } from "@/components/ui/button";

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
          <p className="small-caps text-sm text-primary">{data.session}</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl text-balance">
            {data.title}
          </h1>
          <p className="mt-4 font-serif text-lg text-foreground/80">
            {data.speaker}
          </p>
          {data.role && (
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              {data.role}
            </p>
          )}
          <p className="mt-3 small-caps text-xs text-muted-foreground">
            {minutes} min read
          </p>
          <Ornament className="mt-7" />
        </div>

        <TalkBody
          paragraphs={content.paragraphs}
          talkId={data._id}
          conferenceId={data.conferenceId}
          title={data.title}
          speaker={data.speaker}
        />

        <nav className="mx-auto mt-14 flex max-w-2xl items-center justify-between gap-3 border-t pt-6">
          {prevHref ? (
            <Link
              href={prevHref}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              <ArrowLeft /> Previous
            </Link>
          ) : (
            <span />
          )}
          {nextHref ? (
            <Link
              href={nextHref}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Next <ArrowRight />
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
