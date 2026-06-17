"use client";

import * as React from "react";
import { Loader2, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { translateChapterAction } from "@/lib/actions/translate";

type Verse = { n: number; text: string };

export function ChapterBody({
  volume,
  book,
  chapter,
  kjvVerses,
}: {
  volume: string;
  book: string;
  chapter: number;
  kjvVerses: Verse[];
}) {
  const [mode, setMode] = React.useState<"kjv" | "simple">("kjv");
  const [simple, setSimple] = React.useState<Verse[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadSimple = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await translateChapterAction(volume, book, chapter);
    setLoading(false);
    if (res.ok) setSimple(res.verses);
    else setError(res.error);
  }, [volume, book, chapter]);

  function showSimple() {
    setMode("simple");
    if (!simple && !loading) void loadSimple();
  }

  const verses = mode === "simple" && simple ? simple : kjvVerses;

  return (
    <div className="mt-8">
      <div className="mx-auto flex w-fit items-center rounded-full border border-border bg-card p-0.5 text-sm">
        <button
          type="button"
          onClick={() => setMode("kjv")}
          aria-pressed={mode === "kjv"}
          className={cn(
            "rounded-full px-4 py-1.5 font-sans font-medium transition-colors",
            mode === "kjv"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          King James
        </button>
        <button
          type="button"
          onClick={showSimple}
          aria-pressed={mode === "simple"}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-4 py-1.5 font-sans font-medium transition-colors",
            mode === "simple"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Sparkles className="size-3.5" />
          Simple English
        </button>
      </div>

      {mode === "simple" && loading ? (
        <TranslatingState />
      ) : mode === "simple" && error && !simple ? (
        <div className="mx-auto mt-10 max-w-2xl rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-5 text-center text-sm text-destructive">
          <p>{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={loadSimple}
          >
            Try again
          </Button>
        </div>
      ) : (
        <>
          <div className="reader-prose mx-auto mt-8 max-w-2xl space-y-3 font-serif">
            {verses.map((v) => (
              <p key={v.n} className="text-foreground/90">
                <span className="mr-1.5 align-baseline font-sans text-[0.62em] font-semibold text-muted-foreground tabular-nums">
                  {v.n}
                </span>
                {v.text}
              </p>
            ))}
          </div>
          {mode === "simple" && simple && (
            <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-muted-foreground">
              <Sparkles className="mr-1 inline size-3 align-[-0.1em]" />
              AI-simplified paraphrase for readability — compare with the King
              James text for study.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function TranslatingState() {
  return (
    <div className="mx-auto mt-10 max-w-2xl">
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Simplifying this chapter…
      </div>
      <div className="mt-6 space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div
              className="h-4 animate-pulse rounded bg-muted"
              style={{ width: `${68 + ((i * 9) % 28)}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
