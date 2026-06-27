"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Mic } from "lucide-react";

import { cn } from "@/lib/utils";
import { getTalkLastRead, type TalkLastRead } from "@/lib/study/storage";

/** "Continue talk" entry that links back to the last-read talk, down to the
 *  paragraph. Renders nothing until a position is read from local storage, so
 *  first-time visitors see no clutter and there is no hydration flash. */
export function ContinueTalk({ className }: { className?: string }) {
  const [last, setLast] = React.useState<TalkLastRead | null>(null);

  React.useEffect(() => {
    getTalkLastRead()
      .then(setLast)
      .catch(() => {});
  }, []);

  if (!last) return null;

  const atPara = last.paragraph != null && last.paragraph > 1;
  const hash = atPara ? `#p${last.paragraph}` : "";

  return (
    <Link
      href={`/talks/${last.conferenceId}/${last.talkId}${hash}`}
      className={cn(
        "group flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:border-primary/40",
        className,
      )}
    >
      <Mic className="size-5 shrink-0 text-primary/70" />
      <span className="min-w-0 flex-1">
        <span className="block small-caps text-xs text-muted-foreground">
          Continue talk
        </span>
        <span className="block truncate font-display text-lg font-medium transition-colors group-hover:text-primary">
          {last.title}
        </span>
        <span className="block truncate text-sm text-muted-foreground">
          {last.speaker}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
    </Link>
  );
}
