"use client";

import * as React from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  CloudOff,
  Copy,
  HelpCircle,
  Loader2,
  Mic,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { AssistantAnswer } from "@/components/chat/assistant-answer";
import { NOTICE_PREFIX } from "@/lib/ai/stream-markers";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SUGGESTIONS: { text: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { text: "Who was David’s father?", icon: HelpCircle },
  { text: "What does the Book of Mormon teach about faith?", icon: BookOpen },
  { text: "Find conference talks about enduring to the end", icon: Mic },
  { text: "Explain the Atonement, with scriptures", icon: Sparkles },
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
  const [showJump, setShowJump] = React.useState(false);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const atBottomRef = React.useRef(true);

  // Focus the composer on load, but only with a real pointer — on touch we don't
  // want the keyboard springing up over the suggestions.
  React.useEffect(() => {
    if (window.matchMedia?.("(pointer: fine)").matches) {
      textareaRef.current?.focus();
    }
  }, []);

  React.useEffect(() => {
    if (!atBottomRef.current) return;
    const el = scrollRef.current;
    el?.scrollTo({ top: el.scrollHeight });
  }, [messages]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    atBottomRef.current = atBottom;
    setShowJump((prev) => (prev === !atBottom ? prev : !atBottom));
  }

  function jumpToLatest() {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    atBottomRef.current = true;
    setShowJump(false);
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
    setShowJump(false);
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

  // Run one turn: render `prior` history + the question, then stream the answer.
  // Shared by send, regenerate, and retry.
  async function runTurn(question: string, prior: ChatMessage[]) {
    if (!question || streaming) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError("You’re offline. The assistant needs a connection to search and answer.");
      return;
    }

    setError(null);
    setMessages([
      ...prior,
      { role: "user", content: question },
      { role: "assistant", content: "" },
    ]);
    atBottomRef.current = true;
    setShowJump(false);
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

  function send(text: string) {
    const question = text.trim();
    if (!question || streaming) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    void runTurn(question, messages);
  }

  // Re-ask the most recent question (used by "Regenerate" and error "Try again"),
  // dropping the previous answer.
  function rerunLast() {
    if (streaming) return;
    let idx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        idx = i;
        break;
      }
    }
    if (idx === -1) return;
    void runTurn(messages[idx].content, messages.slice(0, idx));
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
            <BetaBadge />
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

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          role="log"
          aria-live="polite"
          aria-label="Conversation with the study assistant"
          className="h-full overflow-y-auto"
        >
          {empty ? (
            <EmptyState disabled={!online} onPick={(s) => send(s)} />
          ) : (
            <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
              {messages.map((m, i) => {
                const isLast = i === messages.length - 1;
                const canRegenerate =
                  m.role === "assistant" &&
                  isLast &&
                  !streaming &&
                  m.content.trim().length > 0;
                return (
                  <Bubble
                    key={i}
                    message={m}
                    streaming={streaming && isLast}
                    onRegenerate={canRegenerate ? rerunLast : undefined}
                  />
                );
              })}
              {error && (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  <span className="flex-1">{error}</span>
                  <button
                    type="button"
                    onClick={rerunLast}
                    className="inline-flex items-center gap-1 font-medium text-destructive hover:underline"
                  >
                    <RotateCcw className="size-3.5" /> Try again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {showJump && (
          <button
            type="button"
            onClick={jumpToLatest}
            aria-label="Scroll to latest"
            className="absolute bottom-3 left-1/2 flex size-9 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition-colors hover:text-foreground"
          >
            <ChevronDown className="size-4" />
          </button>
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
              aria-label="Ask a question"
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
          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <p className="hidden shrink-0 sm:block">
              <kbd className="rounded border border-border px-1 font-sans text-[10px]">
                Enter
              </kbd>{" "}
              to send ·{" "}
              <kbd className="rounded border border-border px-1 font-sans text-[10px]">
                Shift
              </kbd>
              +
              <kbd className="rounded border border-border px-1 font-sans text-[10px]">
                Enter
              </kbd>{" "}
              for a new line
            </p>
            <p className="flex-1 text-center sm:text-right">
              A study aid — not an official source of Church doctrine.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

function BetaBadge() {
  return (
    <span
      title="This feature is in beta and still improving."
      className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide leading-none text-primary"
    >
      Beta
    </span>
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
      <div className="mt-5 flex items-center gap-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Ask about the scriptures
        </h1>
        <BetaBadge />
      </div>
      <p className="mt-2 max-w-md font-serif leading-relaxed text-muted-foreground text-pretty">
        Questions about the standard works or General Conference — answered from the
        text in this app, with references you can open.
      </p>
      <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map(({ text, icon: Icon }) => (
          <button
            key={text}
            type="button"
            onClick={() => onPick(text)}
            disabled={disabled}
            className="group flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent/40 disabled:opacity-50"
          >
            <Icon className="size-4 shrink-0 text-primary/60 transition-colors group-hover:text-primary" />
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function Bubble({
  message,
  streaming,
  onRegenerate,
}: {
  message: ChatMessage;
  streaming: boolean;
  onRegenerate?: () => void;
}) {
  const isUser = message.role === "user";
  const empty = !message.content;
  // A system notice (e.g. rate-limit warning) is flagged with a leading marker
  // by the server — render it as a warning, not as an answer.
  const isNotice = !isUser && message.content.startsWith(NOTICE_PREFIX);
  const noticeText = isNotice ? message.content.slice(NOTICE_PREFIX.length).trim() : "";
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

  if (isUser) {
    return (
      <div className="flex flex-col items-end animate-in fade-in slide-in-from-bottom-1 duration-200">
        <div className="max-w-[85%] rounded-2xl bg-primary px-3.5 py-2 text-sm whitespace-pre-wrap break-words text-primary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  if (isNotice) {
    return (
      <div className="flex w-full animate-in fade-in slide-in-from-bottom-1 duration-200">
        <div
          role="status"
          className="flex w-full items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-3 text-sm text-foreground/90"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500" />
          <div className="min-w-0 flex-1">
            <p className="whitespace-pre-wrap break-words">{noticeText}</p>
            {onRegenerate && !streaming && (
              <button
                type="button"
                onClick={onRegenerate}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-700 transition-colors hover:text-amber-800 dark:text-amber-500 dark:hover:text-amber-300"
              >
                <RotateCcw className="size-3" /> Try again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex w-full gap-2.5 animate-in fade-in slide-in-from-bottom-1 duration-200">
      <span
        aria-hidden
        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <Sparkles className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm break-words text-foreground">
          {empty && streaming ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Searching the library…
            </span>
          ) : (
            <AssistantAnswer content={message.content} complete={!streaming} />
          )}
        </div>

        {!empty && !streaming && (
          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <button
              type="button"
              onClick={copy}
              aria-label="Copy answer"
              className="flex items-center gap-1 transition-colors hover:text-foreground"
            >
              {copied ? (
                <>
                  <Check className="size-3 animate-in zoom-in duration-200" /> Copied
                </>
              ) : (
                <>
                  <Copy className="size-3" /> Copy
                </>
              )}
            </button>
            {onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                aria-label="Regenerate answer"
                className="flex items-center gap-1 transition-colors hover:text-foreground"
              >
                <RotateCcw className="size-3" /> Regenerate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
