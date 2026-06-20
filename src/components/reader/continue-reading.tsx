"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { getLastRead, type LastRead } from "@/lib/study/storage";

/** A calm "Continue reading" entry that links back to the last-read position,
 *  down to the verse. Renders nothing until a position has been read from local
 *  storage, so first-time visitors see no clutter and there is no hydration
 *  flash. */
export function ContinueReading({ className }: { className?: string }) {
  const [last, setLast] = React.useState<LastRead | null>(null);

  React.useEffect(() => {
    getLastRead()
      .then(setLast)
      .catch(() => {});
  }, []);

  if (!last) return null;

  const atVerse = last.verse != null && last.verse > 1;
  const label = atVerse ? `${last.chapter}:${last.verse}` : `${last.chapter}`;
  const hash = atVerse ? `#v${last.verse}` : "";

  return (
    <Link
      href={`/read/${last.volume}/${last.book}/${last.chapter}${hash}`}
      className={cn(
        "group flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:border-primary/40",
        className,
      )}
    >
      <BookOpen className="size-5 shrink-0 text-primary/70" />
      <span className="flex-1">
        <span className="block small-caps text-xs text-muted-foreground">
          Continue reading
        </span>
        <span className="block font-display text-lg font-medium transition-colors group-hover:text-primary">
          {last.bookTitle} {label}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
    </Link>
  );
}
