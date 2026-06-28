"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { parseFootnoteReferences, previewVerse } from "@/lib/actions/footnotes";
import type { ParsedReference } from "@/lib/scripture/types";

type PreviewState = {
  status: "loading" | "done" | "error";
  reference?: string;
  text?: string;
};

// Parsed references are deterministic per footnote text, so remember them across
// opens within the session.
const REF_CACHE = new Map<string, ParsedReference[]>();

/** Parses a footnote's raw text for scripture cross references and renders them
 *  as chips that expand to an inline verse preview with an "Open" deep link.
 *  Renders nothing when the footnote contains no scripture references. */
export function FootnoteReferences({ text }: { text: string }) {
  const [refs, setRefs] = React.useState<ParsedReference[] | null>(
    REF_CACHE.get(text) ?? null,
  );
  const [activeKey, setActiveKey] = React.useState<string | null>(null);
  const [previews, setPreviews] = React.useState<Record<string, PreviewState>>(
    {},
  );

  React.useEffect(() => {
    if (REF_CACHE.has(text)) return;
    let alive = true;
    parseFootnoteReferences(text)
      .then((r) => {
        REF_CACHE.set(text, r);
        if (alive) setRefs(r);
      })
      .catch(() => {
        if (alive) setRefs([]);
      });
    return () => {
      alive = false;
    };
  }, [text]);

  const refKey = (r: ParsedReference) => `${r.book}-${r.chapter}-${r.verse}`;

  function fetchPreview(r: ParsedReference) {
    const key = refKey(r);
    setPreviews((p) => ({ ...p, [key]: { status: "loading" } }));
    previewVerse(r.book, r.chapter, r.verse)
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

  function selectRef(r: ParsedReference) {
    const key = refKey(r);
    if (activeKey === key) {
      setActiveKey(null);
      return;
    }
    setActiveKey(key);
    const cur = previews[key];
    if (!cur || cur.status === "error") fetchPreview(r);
  }

  if (refs === null) {
    return (
      <p className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" /> Finding cross references…
      </p>
    );
  }
  if (refs.length === 0) return null;

  const active = refs.find((r) => refKey(r) === activeKey) ?? null;
  const preview = activeKey ? previews[activeKey] : undefined;

  return (
    <div className="mt-3">
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Cross references
      </p>
      <div className="flex flex-wrap gap-1.5">
        {refs.map((r) => {
          const key = refKey(r);
          const isActive = activeKey === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => selectRef(r)}
              aria-expanded={isActive}
              className={cn(
                "rounded-md border px-2 py-0.5 text-xs transition-colors",
                isActive
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : "border-border bg-background text-foreground/80 hover:border-primary/40 hover:bg-accent/40",
              )}
            >
              {r.prettyString}
            </button>
          );
        })}
      </div>

      {active && (
        <div className="mt-2.5 rounded-md border border-border bg-background p-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {preview?.status === "loading" && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Loading{" "}
              {active.prettyString}…
            </p>
          )}
          {preview?.status === "error" && (
            <p className="text-xs text-destructive">
              Couldn’t load {active.prettyString}.{" "}
              <button
                type="button"
                onClick={() => fetchPreview(active)}
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
              {active.volume && (
                <Link
                  href={`/read/${active.volume}/${active.book}/${active.chapter}#v${active.verse}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Open <ArrowUpRight className="size-3.5" />
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
