"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { previewVerse } from "@/lib/actions/footnotes";
import type { LessonReference } from "@/lib/come-follow-me/references";

type PreviewState = {
  status: "loading" | "done" | "error";
  reference?: string;
  text?: string;
};

function readerUrl(t: NonNullable<LessonReference["target"]>): string {
  return `/read/${t.volume}/${t.book}/${t.chapter}${t.hasVerse ? `#v${t.verse}` : ""}`;
}

/** The scripture studied in a lesson, as chips. A chip with a locatable target
 *  expands to an inline preview of its opening verse (fetched lazily, once) with
 *  a link into the reader; unlocatable strings render as plain, quiet chips. */
export function LessonReferences({
  references,
}: {
  references: LessonReference[];
}) {
  const [activeKey, setActiveKey] = React.useState<string | null>(null);
  const [previews, setPreviews] = React.useState<Record<string, PreviewState>>(
    {},
  );

  function fetchPreview(key: string, t: NonNullable<LessonReference["target"]>) {
    setPreviews((p) => ({ ...p, [key]: { status: "loading" } }));
    previewVerse(t.book, t.chapter, t.verse)
      .then((res) =>
        setPreviews((p) => ({
          ...p,
          [key]: res.ok
            ? { status: "done", reference: res.reference, text: res.text }
            : { status: "error" },
        })),
      )
      .catch(() =>
        setPreviews((p) => ({ ...p, [key]: { status: "error" } })),
      );
  }

  function toggle(key: string, t: NonNullable<LessonReference["target"]>) {
    if (activeKey === key) {
      setActiveKey(null);
      return;
    }
    setActiveKey(key);
    const cur = previews[key];
    if (!cur || cur.status === "error") fetchPreview(key, t);
  }

  const active = references.find((r) => r.label === activeKey) ?? null;
  const activeTarget = active?.target ?? null;
  const preview = activeKey ? previews[activeKey] : undefined;

  return (
    <div>
      <p className="text-center eyebrow text-muted-foreground">
        Scripture for this week
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1.5">
        {references.map((ref) => {
          if (!ref.target) {
            return (
              <span
                key={ref.label}
                className="font-serif text-lg text-muted-foreground"
              >
                {ref.label}
              </span>
            );
          }
          const isActive = activeKey === ref.label;
          return (
            <button
              key={ref.label}
              type="button"
              onClick={() => toggle(ref.label, ref.target!)}
              aria-expanded={isActive}
              className={cn(
                "border-b pb-0.5 font-serif text-lg italic transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-foreground/85 hover:text-primary",
              )}
            >
              {ref.label}
            </button>
          );
        })}
      </div>

      {active && activeTarget && (
        <div className="mx-auto mt-5 max-w-md border-l-2 border-primary/40 py-1 pl-4 text-left animate-in fade-in slide-in-from-top-1 duration-200">
          {preview?.status === "loading" && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Loading {active.label}…
            </p>
          )}
          {preview?.status === "error" && (
            <p className="text-sm text-destructive">
              Couldn’t load {active.label}.{" "}
              <button
                type="button"
                onClick={() => fetchPreview(active.label, activeTarget)}
                className="underline"
              >
                Retry
              </button>
            </p>
          )}
          {preview?.status === "done" && (
            <>
              <p className="font-serif leading-relaxed text-foreground/90">
                <span className="font-semibold">{preview.reference} </span>
                {preview.text}
              </p>
              <Link
                href={readerUrl(activeTarget)}
                className="mt-2.5 inline-flex items-center gap-1.5 font-serif text-primary italic hover:underline"
              >
                Open {active.label} <ArrowUpRight className="size-3.5" />
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
