import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, ChevronLeft } from "lucide-react";

import {
  getLesson,
  getLessonsForYear,
  fetchLessonOrNotFound,
} from "@/lib/come-follow-me/client";
import { manualName, readingTimeMinutes } from "@/lib/come-follow-me/format";
import { resolveLessonReferences } from "@/lib/come-follow-me/references";
import { buildLessonBody } from "@/lib/come-follow-me/body";
import { SiteHeader } from "@/components/site-header";
import { ReadingProgress } from "@/components/reader/reading-progress";
import { BackToTop } from "@/components/reader/back-to-top";
import { LessonBody } from "@/components/come-follow-me/lesson-body";
import { LessonReferences } from "@/components/come-follow-me/lesson-references";
import { Ornament } from "@/components/ornament";
import type { Lesson, LessonSummary } from "@/lib/come-follow-me/types";

type Props = {
  params: Promise<{ date: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  const lesson = await fetchLessonOrNotFound(() => getLesson(date));
  return { title: `${lesson.title} — Come, Follow Me` };
}

/** The lessons immediately before and after this one, for week-to-week nav.
 *  Best-effort: any failure just hides the navigation. */
async function lessonNeighbors(
  lesson: Lesson,
): Promise<{ prev: LessonSummary | null; next: LessonSummary | null }> {
  try {
    const all = await getLessonsForYear(lesson.year);
    const i = all.findIndex((l) => l._id === lesson._id);
    if (i < 0) return { prev: null, next: null };
    return { prev: all[i - 1] ?? null, next: all[i + 1] ?? null };
  } catch {
    return { prev: null, next: null };
  }
}

export default async function LessonPage({ params }: Props) {
  const { date } = await params;
  const lesson = await fetchLessonOrNotFound(() => getLesson(date));

  const [references, blocks, { prev, next }] = await Promise.all([
    resolveLessonReferences(lesson.scriptureReferences),
    buildLessonBody(lesson.content.text),
    lessonNeighbors(lesson),
  ]);

  const minutes = readingTimeMinutes(lesson.content.text);

  return (
    <>
      <SiteHeader />
      <ReadingProgress />

      <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
        <Link
          href="/come-follow-me"
          className="inline-flex items-center gap-1 eyebrow text-muted-foreground transition-colors hover:text-primary"
        >
          <ChevronLeft className="size-3.5" />
          Come, Follow Me
        </Link>

        <div className="mt-8 text-center animate-in fade-in duration-500">
          <h1 className="font-display text-5xl font-light tracking-tight sm:text-6xl">
            {lesson.title}
          </h1>
          <p className="mt-4 font-serif text-base text-muted-foreground">
            {manualName(lesson.manualId)}, {lesson.dateRange.display}
          </p>
          <p className="mt-1 font-serif text-base text-muted-foreground">{minutes} min read</p>
          <Ornament className="mt-9" />
        </div>

        {references.length > 0 && (
          <div className="mt-8">
            <LessonReferences references={references} />
          </div>
        )}

        <LessonBody blocks={blocks} />

        <nav className="mx-auto mt-20 flex max-w-2xl items-center justify-between gap-3 border-t border-border pt-6">
          {prev ? (
            <Link
              href={`/come-follow-me/${prev._id}`}
              className="group inline-flex items-center gap-2 eyebrow text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
              Previous week
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/come-follow-me/${next._id}`}
              className="group inline-flex items-center gap-2 eyebrow text-muted-foreground transition-colors hover:text-primary"
            >
              Next week
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </main>

      <BackToTop />
    </>
  );
}
