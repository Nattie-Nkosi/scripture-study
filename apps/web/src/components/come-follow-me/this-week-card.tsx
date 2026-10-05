import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getCurrentLesson } from "@/lib/come-follow-me/client";

/** Home-page entry for the current Come, Follow Me week. Fetches the lesson for
 *  today's week (cached) and links straight to it; renders nothing if the
 *  service is unavailable, so the home page never depends on it. */
export async function ThisWeekCard({ className }: { className?: string }) {
  let lesson;
  try {
    lesson = await getCurrentLesson();
  } catch {
    return null;
  }

  return (
    <Link
      href={`/come-follow-me/${lesson._id}`}
      className={`group block border-t border-border pt-5 ${className ?? ""}`}
    >
      <p className="eyebrow text-primary">
        This week · Come, Follow Me
      </p>
      <p className="mt-1.5 font-display text-xl leading-snug text-balance transition-colors group-hover:text-primary">
        {lesson.title}
      </p>
      <p className="mt-1 eyebrow text-muted-foreground">
        {lesson.dateRange.display}
      </p>
      <span className="mt-2.5 inline-flex items-center gap-1.5 font-serif text-primary italic">
        Study this week
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

/** Skeleton shown while the current lesson streams in. */
export function ThisWeekCardSkeleton() {
  return (
    <div className="border-t border-border pt-5">
      <div className="h-3 w-40 animate-pulse rounded bg-muted/70" />
      <div className="mt-2.5 h-5 w-52 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-3 w-24 animate-pulse rounded bg-muted/70" />
    </div>
  );
}
