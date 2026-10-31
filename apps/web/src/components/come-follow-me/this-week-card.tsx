import Link from "next/link";

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
      className={`group block border-t border-border pt-6 ${className ?? ""}`}
    >
      <p className="font-display text-(length:--text-title) leading-snug text-balance transition-colors duration-(--dur-short) group-hover:text-primary">
        {lesson.title}
      </p>
      <p className="mt-2 font-serif text-base text-muted-foreground">
        This week in Come, Follow Me, {lesson.dateRange.display}
      </p>
      <span className="mt-4 inline-block font-serif text-base text-primary underline decoration-primary/40 decoration-1 underline-offset-[0.3em] transition-colors duration-(--dur-short) group-hover:decoration-primary">
        Study this week
      </span>
    </Link>
  );
}

/** Skeleton shown while the current lesson streams in. */
export function ThisWeekCardSkeleton() {
  return (
    <div className="border-t border-border pt-6">
      <div className="h-6 w-56 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-4 w-64 animate-pulse rounded bg-muted/70" />
      <div className="mt-5 h-4 w-28 animate-pulse rounded bg-muted/70" />
    </div>
  );
}
