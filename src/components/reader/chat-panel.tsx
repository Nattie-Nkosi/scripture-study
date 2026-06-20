"use client";

import * as React from "react";
import {
  AlertTriangle,
  Check,
  CloudOff,
  Copy,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useDeviceId } from "@/lib/hooks/use-device-id";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";

export type ChatMessage = { role: "user" | "assistant"; content: string };

const mdComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-2"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-background/70 px-1 py-0.5 font-mono text-[0.85em]">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded-md bg-background/70 p-2 text-xs last:mb-0">
      {children}
    </pre>
  ),
  h1: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
  h2: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
  h3: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-border pl-3 italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-border" />,
  del: ({ children }) => <del className="line-through opacity-70">{children}</del>,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-border px-2 py-1 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-2 py-1">{children}</td>
  ),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- drop the hast node so it isn't spread onto the DOM input
  input: ({ node, ...props }) => (
    <input {...props} disabled className="mr-1.5 align-middle accent-primary" />
  ),
};

/** A grounded, streaming study-chat slide-over. The grounding source (scripture
 *  chapter, conference talk, …) is supplied by the caller via `endpoint`,
 *  `buildBody`, and the history load/clear callbacks. */
export function ChatPanel({
  subtitle,
  emptyHint,
  disclaimer,
  suggestions,
  placeholder,
  endpoint,
  loadHistory,
  clearHistory,
  buildBody,
}: {
  subtitle: string;
  emptyHint: React.ReactNode;
  disclaimer: React.ReactNode;
  suggestions: string[];
  placeholder: string;
  endpoint: string;
  loadHistory: (deviceId: string) => Promise<ChatMessage[]>;
  clearHistory: (deviceId: string) => Promise<void>;
  buildBody: (
    deviceId: string,
    question: string,
    history: ChatMessage[],
  ) => unknown;
}) {
  const deviceId = useDeviceId();
  const online = useOnlineStatus();
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const historyLoadedRef = React.useRef(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const atBottomRef = React.useRef(true);
  const asideRef = React.useRef<HTMLElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  // Keep the latest callbacks without re-running the history effect on each render.
  const loadRef = React.useRef(loadHistory);
  loadRef.current = loadHistory;
  const clearRef = React.useRef(clearHistory);
  clearRef.current = clearHistory;
  const buildRef = React.useRef(buildBody);
  buildRef.current = buildBody;

  // Load saved history the first time the panel is opened.
  React.useEffect(() => {
    if (!open || !deviceId || historyLoadedRef.current) return;
    historyLoadedRef.current = true;
    loadRef
      .current(deviceId)
      .then((h) => {
        if (h.length) setMessages(h);
      })
      .catch(() => {});
  }, [open, deviceId]);

  // While open, behave like a real modal: lock background scroll, keep keyboard
  // focus inside the panel (so Tab can't wander onto the obscured page), close on
  // Escape, and return focus to the launcher on close.
  React.useEffect(() => {
    if (!open) return;

    const trigger = triggerRef.current;
    const { body, documentElement } = document;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    // Compensate for the disappearing scrollbar so the page doesn't jump.
    const scrollbar = window.innerWidth - documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const root = asideRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !root.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => textareaRef.current?.focus(), 60);

    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
      trigger?.focus();
    };
  }, [open]);

  // Stick to the bottom only if the user is already near it.
  React.useEffect(() => {
    if (!atBottomRef.current) return;
    const el = scrollRef.current;
    el?.scrollTo({ top: el.scrollHeight });
  }, [messages, open]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  function resizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
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
    if (!question || streaming || !deviceId) return;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError(
        "You’re offline. The study assistant needs a connection — your reading, notes, and highlights stay on this device.",
      );
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
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRef.current(deviceId, question, prior)),
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
        dropEmptyPlaceholder(); // keep any partial answer; drop if nothing came
      } else {
        const offline =
          typeof navigator !== "undefined" && !navigator.onLine;
        setError(
          offline
            ? "Connection lost. The study assistant needs a connection — your reading and notes are still here."
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

  function newChat() {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    if (deviceId) void clearRef.current(deviceId);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open study assistant"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="fixed right-4 bottom-4 z-30 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        <MessageCircle className="size-5" />
        <span className="hidden sm:inline">Ask</span>
      </button>

      <div
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/30 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden
      />

      <aside
        ref={asideRef}
        role="dialog"
        aria-modal="true"
        aria-label="Study assistant"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background shadow-xl transition-transform duration-300 sm:w-[26rem]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles className="size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="font-serif text-sm font-semibold leading-tight">
                Study assistant
              </p>
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={newChat}
                className="text-muted-foreground"
              >
                <Plus className="size-4" /> New
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <X />
            </Button>
          </div>
        </header>

        <div className="flex items-start gap-2 border-b border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <p>{disclaimer}</p>
        </div>

        {!online && (
          <div className="flex items-start gap-2 border-b border-border bg-amber-500/10 px-4 py-2 text-xs text-foreground/80">
            <CloudOff className="mt-0.5 size-3.5 shrink-0" />
            <p>
              You’re offline. The study assistant needs a connection — your
              reading, notes, and highlights stay on this device.
            </p>
          </div>
        )}

        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
        >
          {messages.length === 0 ? (
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">{emptyHint}</p>
              <div className="mt-4 flex flex-col gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    disabled={!deviceId || !online}
                    className="rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-accent/40 disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <Bubble
                key={i}
                message={m}
                streaming={streaming && i === messages.length - 1}
              />
            ))
          )}

          {error && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t border-border p-3"
        >
          <div className="flex items-end gap-2">
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
              placeholder={online ? placeholder : "Offline — connect to ask"}
              disabled={!deviceId || !online}
              className="max-h-40 min-h-[2.5rem] flex-1 resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
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
                disabled={!input.trim() || !deviceId || !online}
              >
                <Send />
              </Button>
            )}
          </div>
        </form>
      </aside>
    </>
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
          "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
          isUser
            ? "bg-primary whitespace-pre-wrap text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        {empty && streaming ? (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Thinking…
          </span>
        ) : isUser ? (
          message.content
        ) : (
          <AssistantMarkdown content={message.content} />
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

function AssistantMarkdown({ content }: { content: string }) {
  return (
    <div className="leading-relaxed [&>:first-child]:mt-0 [&>:last-child]:mb-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
