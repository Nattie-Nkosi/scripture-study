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
        "group flex items-center gap-4 border-t border-border pt-6 pb-2",
        className,
      )}
    >
      <BookOpen
        aria-hidden
        strokeWidth={1.25}
        className="size-6 shrink-0 self-start text-primary"
      />
      <span className="min-w-0 flex-1">
        <span className="block font-display text-(length:--text-title) leading-snug transition-colors duration-(--dur-short) group-hover:text-primary">
          {last.bookTitle} {label}
        </span>
        <span className="mt-2 block font-serif text-base text-muted-foreground">
          Continue where you left off
        </span>
      </span>
      <ArrowRight
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground transition-[color,transform] duration-(--dur-short) group-hover:translate-x-1 group-hover:text-primary"
      />
    </Link>
  );
}
