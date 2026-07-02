"use client";

import * as React from "react";
import { Loader2, Sparkles, X } from "lucide-react";

import { AssistantAnswer } from "@/components/chat/assistant-answer";
import { useStreamedAnswer } from "@/lib/hooks/use-streamed-answer";

/** On-demand AI overview of the current chapter. Collapsed to a small pill by
 *  default (generating on every page view would be needless cost); expands into
 *  a streaming, grounded summary. */
export function ChapterSummary({ book, chapter }: { book: string; chapter: number }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="mx-auto mt-5 max-w-2xl">
      {open ? (
        <SummaryCard book={book} chapter={chapter} onClose={() => setOpen(false)} />
      ) : (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3.5 py-1.5 font-sans text-xs font-medium text-primary transition-colors hover:bg-primary/10"
          >
            <Sparkles className="size-3.5" /> Summarize this chapter
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  book,
  chapter,
  onClose,
}: {
  book: string;
  chapter: number;
  onClose: () => void;
}) {
  const { content, status, message, retry } = useStreamedAnswer("/api/summarize", {
    book,
    chapter,
  });
  const showSpinner = status === "loading" || (status === "streaming" && !content);

  return (
    <div className="rounded-lg border border-primary/25 bg-primary/[0.03] p-3.5 font-sans text-sm animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary/70">
          <Sparkles className="size-3.5" /> Chapter summary
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close summary"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {showSpinner && (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Reading the chapter…
        </span>
      )}

      {content && (
        <div className="break-words text-foreground">
          <AssistantAnswer content={content} complete={status === "done"} />
        </div>
      )}

      {status === "notice" && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-foreground/90"
        >
          <p className="min-w-0 flex-1 break-words">{message}</p>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
          <span className="flex-1">{message}</span>
          <button
            type="button"
            onClick={retry}
            className="font-medium text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {status === "done" && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          AI overview — not an official source of Church doctrine. Read the chapter for yourself.
        </p>
      )}
    </div>
  );
}
