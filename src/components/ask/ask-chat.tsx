"use client";

import * as React from "react";
import {
  Check,
  CloudOff,
  Copy,
  Loader2,
  Plus,
  Send,
  Sparkles,
  Square,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AssistantAnswer } from "@/components/chat/assistant-answer";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Who was David’s father?",
  "What does the Book of Mormon teach about faith?",
  "Find conference talks about enduring to the end",
  "Explain the Atonement, with scriptures",
];

/** A single-thread, ChatGPT-style assistant for the whole library. The
 *  conversation lives only in memory — refreshing or "New chat" clears it,
 *  nothing is stored. */
export function AskChat() {
  const online = useOnlineStatus();

  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const atBottomRef = React.useRef(true);

  React.useEffect(() => {
    if (!atBottomRef.current) return;
    const el = scrollRef.current;
    el?.scrollTo({ top: el.scrollHeight });
  }, [messages]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  function resizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  function newChat() {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function updateLastAssistant(content: string) {
    setMessages((prev) => {
      const copy = prev.slice();
      copy[copy.length - 1] = { role: "assistant", content };
      return copy;
    });
  }

  function dropEmptyPlaceholder() {
    setMessages((prev) =>
      prev.filter(
        (m, i) =>
          !(i === prev.length - 1 && m.role === "assistant" && m.content === ""),
      ),
    );
  }

  async function send(text: string) {
    const question = text.trim();
    if (!question || streaming) return;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError("You’re offline. The assistant needs a connection to search and answer.");
      return;
    }

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setError(null);
    const prior = messages;
    setMessages([
      ...prior,
      { role: "user", content: question },
      { role: "assistant", content: "" },
    ]);
    atBottomRef.current = true;
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history: prior }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "The assistant couldn’t respond.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        updateLastAssistant(acc);
      }
      if (!acc.trim()) updateLastAssistant("(No response — please try again.)");
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        dropEmptyPlaceholder();
      } else {
        const offline = typeof navigator !== "undefined" && !navigator.onLine;
        setError(
          offline
            ? "Connection lost. The assistant needs a connection to search and answer."
            : (err as Error).message || "Something went wrong.",
        );
        dropEmptyPlaceholder();
      }
    } finally {
      abortRef.current = null;
      setStreaming(false);
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      {!empty && (
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="flex items-center gap-1.5 font-display text-sm font-semibold">
            <Sparkles className="size-4 text-primary" />
            Ask
          </span>
          <Button variant="ghost" size="sm" onClick={newChat} className="text-muted-foreground">
            <Plus className="size-4" /> New chat
          </Button>
        </div>
      )}

      {!online && (
        <div className="flex items-start gap-2 border-b border-border bg-amber-500/10 px-4 py-2 text-xs text-foreground/80">
          <CloudOff className="mt-0.5 size-3.5 shrink-0" />
          <p>You’re offline. Ask needs a connection to search the library and answer.</p>
        </div>
      )}

      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto">
        {empty ? (
          <EmptyState disabled={!online} onPick={(s) => send(s)} />
        ) : (
          <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
            {messages.map((m, i) => (
              <Bubble
                key={i}
                message={m}
                streaming={streaming && i === messages.length - 1}
              />
            ))}
            {error && (
              <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        )}
      </div>

      <div
        className="border-t border-border bg-background px-4 pt-3"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mx-auto max-w-3xl"
        >
          <div className="flex items-end gap-2 rounded-2xl border border-input bg-card p-2 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                resizeTextarea();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder={
                online
                  ? "Ask about the scriptures or General Conference…"
                  : "Offline — connect to ask"
              }
              disabled={!online}
              className="max-h-52 min-h-[2.25rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-base outline-none disabled:opacity-50 sm:text-sm"
            />
            {streaming ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Stop generating"
                onClick={stop}
              >
                <Square className="size-3.5 fill-current" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                aria-label="Send"
                disabled={!input.trim() || !online}
              >
                <Send />
              </Button>
            )}
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Answers are AI-generated from the app’s scriptures and talks — a study
            aid, not an official source of Church doctrine.
          </p>
        </form>
      </div>
    </div>
  );
}

function EmptyState({
  disabled,
  onPick,
}: {
  disabled: boolean;
  onPick: (s: string) => void;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-12 text-center sm:py-20">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="size-6" />
      </span>
      <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">
        Ask about the scriptures
      </h1>
      <p className="mt-2 max-w-md font-serif leading-relaxed text-muted-foreground text-pretty">
        Questions about the standard works or General Conference — answered from the
        text in this app, with references you can open.
      </p>
      <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            disabled={disabled}
            className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent/40 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Bubble({
  message,
  streaming,
}: {
  message: ChatMessage;
  streaming: boolean;
}) {
  const isUser = message.role === "user";
  const empty = !message.content;
  const [copied, setCopied] = React.useState(false);

  function copy() {
    navigator.clipboard
      .writeText(message.content)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  return (
    <div
      className={cn(
        "group flex flex-col animate-in fade-in slide-in-from-bottom-1 duration-200",
        isUser ? "items-end" : "items-start",
      )}
    >
      <div
        className={cn(
          "rounded-2xl text-sm break-words",
          isUser
            ? "max-w-[85%] bg-primary px-3.5 py-2 whitespace-pre-wrap text-primary-foreground"
            : "w-full text-foreground",
        )}
      >
        {empty && streaming ? (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Searching the library…
          </span>
        ) : isUser ? (
          message.content
        ) : (
          <AssistantAnswer content={message.content} linkify={!streaming} />
        )}
      </div>

      {!isUser && !empty && !streaming && (
        <button
          type="button"
          onClick={copy}
          aria-label="Copy answer"
          className="mt-1 flex items-center gap-1 text-xs text-muted-foreground opacity-100 transition-opacity hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
        >
          {copied ? (
            <>
              <Check className="size-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="size-3" /> Copy
            </>
          )}
        </button>
      )}
    </div>
  );
}
