"use client";

import * as React from "react";
import {
  Check,
  Clock,
  MessageSquareText,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ASK_RETENTION_DAYS,
  type AskConversationSummary,
} from "@/lib/ask/saved-chats";

export interface SavedChatsPanelProps {
  conversations: AskConversationSummary[];
  activeId: string | null;
  loading: boolean;
  onNew: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

/** The inner content of the saved-chats sidebar — placed in a persistent column
 *  on desktop and inside a slide-over drawer on mobile. */
export function SavedChatsPanel({
  conversations,
  activeId,
  loading,
  onNew,
  onSelect,
  onRename,
  onDelete,
}: SavedChatsPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="p-2">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={onNew}
        >
          <Plus className="size-4" /> New chat
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {conversations.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            {loading ? "Loading…" : "No saved chats yet."}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((c) => (
              <ConversationItem
                key={c.id}
                conversation={c}
                active={c.id === activeId}
                onSelect={() => onSelect(c.id)}
                onRename={(title) => onRename(c.id, title)}
                onDelete={() => onDelete(c.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-start gap-2 border-t border-border px-3 py-2.5 text-[11px] leading-snug text-muted-foreground">
        <Clock className="mt-px size-3.5 shrink-0" />
        <p>
          Saved on this device and deleted automatically {ASK_RETENTION_DAYS} days
          after they start.
        </p>
      </div>
    </div>
  );
}

function ConversationItem({
  conversation,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  conversation: AskConversationSummary;
  active: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [mode, setMode] = React.useState<"view" | "rename" | "confirm">("view");
  const [draft, setDraft] = React.useState(conversation.title);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (mode === "rename") {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [mode]);

  function commitRename() {
    const next = draft.trim();
    if (next && next !== conversation.title) onRename(next);
    setMode("view");
  }

  if (mode === "rename") {
    return (
      <li>
        <div className="flex items-center gap-1 rounded-lg border border-ring bg-card px-1.5 py-1">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitRename();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setDraft(conversation.title);
                setMode("view");
              }
            }}
            aria-label="Rename chat"
            className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none"
          />
          <button
            type="button"
            onClick={commitRename}
            aria-label="Save name"
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Check className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(conversation.title);
              setMode("view");
            }}
            aria-label="Cancel rename"
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </li>
    );
  }

  if (mode === "confirm") {
    return (
      <li>
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-2.5 py-1.5">
          <span className="min-w-0 flex-1 truncate text-xs text-destructive">
            Delete this chat?
          </span>
          <Button variant="ghost" size="xs" onClick={() => setMode("view")}>
            Cancel
          </Button>
          <Button variant="destructive" size="xs" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="group relative">
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg py-2 pl-2.5 pr-14 text-left transition-colors",
          active ? "bg-muted" : "hover:bg-muted/60",
        )}
      >
        <MessageSquareText className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm">{conversation.title}</span>
          <span className="truncate text-[11px] text-muted-foreground">
            {expiryLabel(conversation.updatedAt)}
          </span>
        </span>
      </button>

      <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          onClick={() => {
            setDraft(conversation.title);
            setMode("rename");
          }}
          aria-label="Rename chat"
          className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setMode("confirm")}
          aria-label="Delete chat"
          className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}

function expiryLabel(lastActiveIso: string): string {
  const lastActive = new Date(lastActiveIso).getTime();
  const expires = lastActive + ASK_RETENTION_DAYS * 86_400_000;
  const days = Math.ceil((expires - Date.now()) / 86_400_000);
  if (days <= 0) return "Expires soon";
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days} days`;
}
