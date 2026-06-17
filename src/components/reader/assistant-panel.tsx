"use client";

import * as React from "react";
import {
  AlertTriangle,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useDeviceId } from "@/lib/hooks/use-device-id";
import { loadChatHistory } from "@/lib/actions/chat";

type Role = "user" | "assistant";
type Message = { role: Role; content: string };

const SUGGESTIONS = [
  "Summarize this chapter",
  "Explain the first verse in plain terms",
  "What are the main themes here?",
];

export function AssistantPanel({
  volume,
  book,
  chapter,
  bookTitle,
}: {
  volume: string;
  book: string;
  chapter: number;
  bookTitle: string;
}) {
  const deviceId = useDeviceId();
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = React.useState(false);

  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Load saved history the first time the panel is opened.
  React.useEffect(() => {
    if (!open || !deviceId || historyLoaded) return;
    setHistoryLoaded(true);
    loadChatHistory(deviceId, volume, book, chapter)
      .then((h) => {
        if (h.length) setMessages(h);
      })
      .catch(() => {});
  }, [open, deviceId, historyLoaded, volume, book, chapter]);

  // Close on Escape.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Auto-scroll to the latest message.
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || streaming || !deviceId) return;

    setInput("");
    setError(null);
    const prior = messages;
    setMessages([
      ...prior,
      { role: "user", content: question },
      { role: "assistant", content: "" },
    ]);
    setStreaming(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          volume,
          book,
          chapter,
          question,
          history: prior,
        }),
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
        setMessages((prev) => {
          const copy = prev.slice();
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
      if (!acc.trim()) {
        setMessages((prev) => {
          const copy = prev.slice();
          copy[copy.length - 1] = {
            role: "assistant",
            content: "(No response — please try again.)",
          };
          return copy;
        });
      }
    } catch (err) {
      setError((err as Error).message || "Something went wrong.");
      // Drop the empty assistant placeholder.
      setMessages((prev) =>
        prev.filter(
          (m, i) =>
            !(i === prev.length - 1 && m.role === "assistant" && m.content === ""),
        ),
      );
    } finally {
      setStreaming(false);
    }
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open study assistant"
        className="fixed right-4 bottom-4 z-30 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        <MessageCircle className="size-5" />
        <span className="hidden sm:inline">Ask</span>
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/30 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Study assistant"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background shadow-xl transition-transform duration-300 sm:w-[26rem]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <div>
              <p className="font-serif text-sm font-semibold leading-tight">
                Study assistant
              </p>
              <p className="text-xs text-muted-foreground">
                {bookTitle} {chapter}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close"
            onClick={() => setOpen(false)}
          >
            <X />
          </Button>
        </header>

        <div className="flex items-start gap-2 border-b border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <p>
            Study aid — <strong>not</strong> an official source of Church
            doctrine. Answers are AI-generated from this chapter’s text.
          </p>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Ask anything about <span className="font-medium">{bookTitle} {chapter}</span>.
                Answers stay grounded in this chapter.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    disabled={!deviceId}
                    className="rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-accent/40 disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => <Bubble key={i} message={m} streaming={streaming && i === messages.length - 1} />)
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
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Ask about this chapter…"
              disabled={streaming || !deviceId}
              className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
            />
            <Button
              type="submit"
              size="icon"
              aria-label="Send"
              disabled={streaming || !input.trim() || !deviceId}
            >
              {streaming ? <Loader2 className="animate-spin" /> : <Send />}
            </Button>
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
  message: Message;
  streaming: boolean;
}) {
  const isUser = message.role === "user";
  const empty = !message.content;

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        {empty && streaming ? (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Thinking…
          </span>
        ) : (
          message.content
        )}
      </div>
    </div>
  );
}
