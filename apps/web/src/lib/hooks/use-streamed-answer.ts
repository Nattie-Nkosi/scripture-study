"use client";

import * as React from "react";
import { NOTICE_PREFIX } from "@/lib/ai/stream-markers";

export type StreamStatus = "loading" | "streaming" | "done" | "notice" | "error";

export type StreamedAnswer = {
  content: string;
  status: StreamStatus;
  message: string;
  retry: () => void;
};

/** Fetches a `text/plain` streaming assistant endpoint on mount and exposes the
 *  revealed text + status for rendering (typically through AssistantAnswer).
 *
 *  All state updates happen inside promise callbacks — never synchronously in
 *  the effect body — to satisfy the repo's react-hooks/set-state-in-effect rule
 *  (see how footnote-references.tsx does the same). A recursive `pump` reads the
 *  stream chunk by chunk; retry re-runs by bumping an internal key. */
export function useStreamedAnswer(endpoint: string, body: unknown): StreamedAnswer {
  const [content, setContent] = React.useState("");
  const [status, setStatus] = React.useState<StreamStatus>("loading");
  const [message, setMessage] = React.useState("");
  const [reloadKey, setReloadKey] = React.useState(0);

  // Serialize so the effect dependency is stable by value, not identity.
  const bodyJson = React.useMemo(() => JSON.stringify(body), [body]);

  React.useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: bodyJson,
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok || !res.body) {
          return res
            .json()
            .catch(() => null)
            .then((data) => {
              if (!alive) return;
              setMessage(data?.error ?? "Something went wrong. Please try again.");
              setStatus(res.status === 429 ? "notice" : "error");
            });
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        let noticed = false;
        if (alive) setStatus("streaming");

        const pump = (): Promise<void> =>
          reader.read().then(({ done, value }) => {
            if (!alive) return;
            if (done) {
              if (!noticed) {
                setStatus(acc.trim() ? "done" : "error");
                if (!acc.trim()) setMessage("No response came back. Please try again.");
              }
              return;
            }
            acc += decoder.decode(value, { stream: true });
            // A mid-stream system notice (e.g. Groq rate limit) is flag-prefixed.
            if (acc.startsWith(NOTICE_PREFIX)) {
              noticed = true;
              setMessage(acc.slice(NOTICE_PREFIX.length).trim());
              setStatus("notice");
            } else {
              setContent(acc);
            }
            return pump();
          });

        return pump();
      })
      .catch((err) => {
        if (!alive || (err as Error).name === "AbortError") return;
        const offline = typeof navigator !== "undefined" && !navigator.onLine;
        setMessage(
          offline
            ? "You’re offline — this needs a connection."
            : "Something went wrong. Please try again.",
        );
        setStatus("error");
      });

    return () => {
      alive = false;
      controller.abort();
    };
  }, [endpoint, bodyJson, reloadKey]);

  const retry = React.useCallback(() => {
    setContent("");
    setMessage("");
    setStatus("loading");
    setReloadKey((k) => k + 1);
  }, []);

  return { content, status, message, retry };
}
