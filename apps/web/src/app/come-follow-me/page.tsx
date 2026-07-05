import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";

import {
  getCurrentLesson,
  getLessonsForYear,
  ComeFollowMeApiError,
} from "@/lib/come-follow-me/client";
import { manualName } from "@/lib/come-follow-me/format";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Ornament } from "@/components/ornament";
import type { Lesson, LessonSummary } from "@/lib/come-follow-me/types";

export const metadata = {
  title: "Come, Follow Me",
};

export default async function ComeFollowMePage() {
  let current: Lesson;
  let lessons: LessonSummary[];
  try {
    current = await getCurrentLesson();
    lessons = await getLessonsForYear(current.year);
  } catch (err) {
    const status = err instanceof ComeFollowMeApiError ? err.status : undefined;
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
          <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Couldn’t load Come, Follow Me{status ? ` (HTTP ${status})` : ""}. The
            service may be temporarily unavailable — please try again.
          </p>
        </main>
        <SiteFooter />
      </>
    );
  }

  const manual = manualName(current.manualId);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-14 sm:py-20">
        <p className="small-caps text-sm text-primary">Come, Follow Me</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Study by the week
        </h1>
        <p className="mt-4 max-w-xl font-serif text-lg leading-relaxed text-muted-foreground text-pretty">
          The home- and church-study curriculum of The Church of Jesus Christ of
          Latter-day Saints — a lesson for every week of {current.year}, from the{" "}
          {manual}.
        </p>

        <Link
          href={`/come-follow-me/${current._id}`}
          className="group mt-10 block rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
        >
          <span className="small-caps text-xs text-primary">This week</span>
          <span className="mt-1 block small-caps text-xs text-muted-foreground">
            {current.dateRange.display}
          </span>
          <span className="mt-1.5 block font-display text-2xl font-medium transition-colors group-hover:text-primary text-balance">
            {current.title}
          </span>
          {current.scriptureReferences.length > 0 && (
            <span className="mt-1.5 block font-serif text-sm text-muted-foreground">
              {current.scriptureReferences.join(" · ")}
            </span>
          )}
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
            Read this week’s lesson
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>

        <Ornament className="my-12" />

        <p className="small-caps text-sm text-primary">{manual} · {current.year}</p>
        <ol className="mt-5 border-t border-border">
          {lessons.map((lesson) => {
            const isCurrent = lesson._id === current._id;
            return (
              <li
                key={lesson._id}
                className="border-b border-border last:border-b-0"
              >
                <Link
                  href={`/come-follow-me/${lesson._id}`}
                  className="group flex items-baseline gap-4 py-4"
                >
                  <span className="w-28 shrink-0 small-caps text-xs text-muted-foreground tabular-nums">
                    {lesson.dateRange.display}
                  </span>
                  <span className="flex-1">
                    <span className="block font-display text-lg font-medium leading-snug transition-colors group-hover:text-primary text-balance">
                      {lesson.title}
                      {isCurrent && (
                        <span className="ml-2 align-middle rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-medium tracking-wide text-primary uppercase">
                          This week
                        </span>
                      )}
                    </span>
                    {lesson.scriptureReferences.length > 0 && (
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {lesson.scriptureReferences.join(" · ")}
                      </span>
                    )}
                  </span>
                  <ChevronRight className="size-5 shrink-0 translate-x-0 self-center text-muted-foreground opacity-0 transition-all group-hover:translate-x-1 group-hover:text-primary group-hover:opacity-100" />
                </Link>
              </li>
            );
          })}
        </ol>
      </main>
      <SiteFooter />
    </>
  );
}
