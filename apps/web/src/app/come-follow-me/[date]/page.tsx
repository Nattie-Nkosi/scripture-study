import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, ChevronLeft } from "lucide-react";

import {
  getLesson,
  getLessonsForYear,
  fetchLessonOrNotFound,
} from "@/lib/come-follow-me/client";
import {
  lessonParagraphs,
  manualName,
  readingTimeMinutes,
} from "@/lib/come-follow-me/format";
import { resolveLessonReferences } from "@/lib/come-follow-me/references";
import { SiteHeader } from "@/components/site-header";
import { ReadingProgress } from "@/components/reader/reading-progress";
import { BackToTop } from "@/components/reader/back-to-top";
import { Ornament } from "@/components/ornament";
import { buttonVariants } from "@/components/ui/button";
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

  const [references, { prev, next }] = await Promise.all([
    resolveLessonReferences(lesson.scriptureReferences),
    lessonNeighbors(lesson),
  ]);

  const paragraphs = lessonParagraphs(lesson.content.text);
  const minutes = readingTimeMinutes(lesson.content.text);

  return (
    <>
      <SiteHeader />
      <ReadingProgress />

      <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
        <Link
          href="/come-follow-me"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Come, Follow Me
        </Link>

        <div className="mt-6 text-center animate-in fade-in duration-500">
          <p className="small-caps text-sm text-primary">
            {manualName(lesson.manualId)} · {lesson.dateRange.display}
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl text-balance">
            {lesson.title}
          </h1>
          <p className="mt-3 small-caps text-xs text-muted-foreground">
            {minutes} min read
          </p>
          <Ornament className="mt-7" />
        </div>

        {references.length > 0 && (
          <div className="mt-8">
            <p className="text-center small-caps text-xs text-muted-foreground">
              Scripture for this week
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {references.map((ref) =>
                ref.url ? (
                  <Link
                    key={ref.label}
                    href={ref.url}
                    className="rounded-full border border-border px-3 py-1 text-sm text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {ref.label}
                  </Link>
                ) : (
                  <span
                    key={ref.label}
                    className="rounded-full border border-border/60 px-3 py-1 text-sm text-muted-foreground"
                  >
                    {ref.label}
                  </span>
                ),
              )}
            </div>
          </div>
        )}

        <div className="reader-prose mx-auto mt-10 max-w-2xl space-y-5 font-serif text-foreground/90 animate-in fade-in duration-500">
          {paragraphs.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        <nav className="mx-auto mt-14 flex max-w-2xl items-center justify-between gap-3 border-t pt-6">
          {prev ? (
            <Link
              href={`/come-follow-me/${prev._id}`}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              <ArrowLeft /> Previous week
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/come-follow-me/${next._id}`}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Next week <ArrowRight />
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
