"use client";

import * as React from "react";
import Link from "next/link";

import { AssistantMarkdown } from "./assistant-markdown";
import { useSmoothStream } from "@/lib/hooks/use-smooth-stream";
import {
  extractScriptureReferences,
  type ScriptureReference,
} from "@/lib/actions/references";

// A block caret appended to the text while it's still typing out.
const CARET = "▍";

// Resolved references, keyed by the original answer text. Persists across
// re-renders and message remounts so a finished answer is parsed once.
const CACHE = new Map<string, ScriptureReference[]>();

/** Renders an assistant answer as prose that types out smoothly (see
 *  `useSmoothStream`), then — once the text has fully landed and the message is
 *  complete — lists the scripture references it cites below as clickable reader
 *  links. References resolve a beat after the answer settles; while it's still
 *  typing, only the prose shows, trailed by a caret. */
export function AssistantAnswer({
  content,
  complete,
}: {
  content: string;
  complete: boolean;
}) {
  const [, force] = React.useReducer((n: number) => n + 1, 0);
  const displayed = useSmoothStream(content, complete);
  const settled = complete && displayed.length >= content.length;
  const typing = !settled && content.trim().length > 0;

  React.useEffect(() => {
    if (!settled || !content.trim() || CACHE.has(content)) return;
    let alive = true;
    extractScriptureReferences(content)
      .then((refs) => {
        CACHE.set(content, refs);
        if (alive) force();
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [content, settled]);

  const references = settled ? CACHE.get(content) : undefined;
  // Drop trailing blank lines before the caret so it hugs the last line of text
  // rather than dropping to a new paragraph between chunks.
  const text = typing ? `${displayed.replace(/\n+$/, "")}${CARET}` : displayed;

  return (
    <>
      <AssistantMarkdown content={text} />
      {references && references.length > 0 && (
        <ReferenceList references={references} />
      )}
    </>
  );
}

function ReferenceList({ references }: { references: ScriptureReference[] }) {
  return (
    <div className="mt-3 border-t border-border pt-2.5">
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        References
      </p>
      <div className="flex flex-wrap gap-1.5">
        {references.map((r) => (
          <Link
            key={r.url}
            href={r.url}
            className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-primary no-underline ring-1 ring-inset ring-primary/15 transition-colors hover:bg-primary/20 hover:ring-primary/30"
          >
            {r.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
