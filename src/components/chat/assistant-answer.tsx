"use client";

import * as React from "react";

import { AssistantMarkdown } from "./assistant-markdown";
import { linkifyScriptureReferences } from "@/lib/actions/references";

// Resolved (reference-linkified) markdown, keyed by the original text. Persists
// across re-renders and message remounts so a finished answer is parsed once.
const CACHE = new Map<string, string>();

/** Renders an assistant answer, turning scripture references into clickable
 *  reader links once the message is complete. While streaming (`linkify` false)
 *  or until references resolve, it shows the plain text — links appear a beat
 *  after the answer finishes. */
export function AssistantAnswer({
  content,
  linkify,
}: {
  content: string;
  linkify: boolean;
}) {
  const [, force] = React.useReducer((n: number) => n + 1, 0);

  React.useEffect(() => {
    if (!linkify || !content.trim() || CACHE.has(content)) return;
    let alive = true;
    linkifyScriptureReferences(content)
      .then((linked) => {
        CACHE.set(content, linked);
        if (alive) force();
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [content, linkify]);

  const display = linkify ? CACHE.get(content) ?? content : content;
  return <AssistantMarkdown content={display} />;
}
