"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Bookmark,
  CornerDownLeft,
  House,
  Library,
  Loader2,
  Mic,
  Search,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getLibraryIndex,
  resolveReference,
  type LibraryBook,
} from "@/lib/actions/library";
import type { ReferenceJump } from "@/lib/scripture/reference-query";
import { getLastRead, type LastRead } from "@/lib/study/storage";

const OPEN_EVENT = "open-command-palette";

/** Open the command palette from anywhere (e.g. a header button). */
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

// The book list is the same on every open, so fetch it once per session.
let LIBRARY_CACHE: LibraryBook[] | null = null;

type Item = {
  id: string;
  group: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  href: string;
};

/** Lightweight ranking: exact > prefix > substring > subsequence. Returns null
 *  when `query` doesn't match `target` at all. */
function fuzzyScore(query: string, target: string): number | null {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();
  if (!q) return 0;
  if (t === q) return 1000;
  if (t.startsWith(q)) return 900 - (t.length - q.length);
  const idx = t.indexOf(q);
  if (idx >= 0) return 700 - idx - (t.length - q.length) * 0.1;

  let ti = 0;
  let qi = 0;
  let gaps = 0;
  let last = -1;
  while (ti < t.length && qi < q.length) {
    if (t[ti] === q[qi]) {
      if (last >= 0 && ti - last > 1) gaps++;
      last = ti;
      qi++;
    }
    ti++;
  }
  return qi === q.length ? 400 - gaps * 10 - t.length * 0.1 : null;
}

/** Split a query like "Alma 32" or "John 3:16" into its book name and chapter.
 *  The verse part (":16") is left to the network reference resolver. */
function splitChapter(query: string): { name: string; chapter: number | null } {
  const m = /^(.+?)\s*(\d+)(?::\d+)?\s*$/.exec(query.trim());
  if (m) return { name: m[1].trim(), chapter: Number(m[2]) };
  return { name: query.trim(), chapter: null };
}

const NAV_ITEMS: Item[] = [
  { id: "nav-read", group: "Go to", label: "Library", icon: <Library className="size-4" />, href: "/read" },
  { id: "nav-talks", group: "Go to", label: "General Conference", icon: <Mic className="size-4" />, href: "/talks" },
  { id: "nav-study", group: "Go to", label: "My study", icon: <Bookmark className="size-4" />, href: "/study" },
  { id: "nav-search", group: "Go to", label: "Search", icon: <Search className="size-4" />, href: "/search" },
  { id: "nav-home", group: "Go to", label: "Home", icon: <House className="size-4" />, href: "/" },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const [books, setBooks] = React.useState<LibraryBook[]>(LIBRARY_CACHE ?? []);
  const [last, setLast] = React.useState<LastRead | null>(null);
  const [resolved, setResolved] = React.useState<{
    query: string;
    jump: ReferenceJump | null;
  } | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  // Global shortcut (⌘K / Ctrl+K) and a custom event for in-app launchers.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setQuery("");
        setActive(0);
        setOpen((o) => !o);
      }
    };
    const onOpen = () => {
      setQuery("");
      setActive(0);
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  // While open: lock background scroll, focus the input, restore focus on close.
  React.useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const { body, documentElement } = document;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    return () => {
      clearTimeout(t);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
      prevFocus?.focus?.();
    };
  }, [open]);

  // Load the book index lazily the first time the palette opens.
  React.useEffect(() => {
    if (!open || LIBRARY_CACHE) return;
    getLibraryIndex()
      .then((b) => {
        LIBRARY_CACHE = b;
        setBooks(b);
      })
      .catch(() => {});
  }, [open]);

  // Load "Continue reading" each open so it reflects the latest position.
  React.useEffect(() => {
    if (!open) return;
    getLastRead()
      .then(setLast)
      .catch(() => {});
  }, [open]);

  // Resolve a typed reference (debounced) — only attempt when it contains a
  // number, since every scripture reference does. Results are tagged with the
  // query they belong to, so a stale resolution never shows against a newer
  // query (and we never reset state synchronously inside the effect).
  React.useEffect(() => {
    const q = query.trim();
    if (!open || !q || !/\d/.test(q) || resolved?.query === q) return;
    let alive = true;
    const t = setTimeout(() => {
      resolveReference(q)
        .then((r) => {
          if (alive) setResolved({ query: q, jump: r });
        })
        .catch(() => {});
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, open, resolved]);

  const trimmed = query.trim();
  const resolving =
    !!trimmed && /\d/.test(trimmed) && resolved?.query !== trimmed;

  const items = React.useMemo<Item[]>(() => {
    const q = query.trim();
    const list: Item[] = [];

    if (!q) {
      if (last) {
        list.push({
          id: "continue",
          group: "Continue reading",
          label: `${last.bookTitle} ${last.chapter}`,
          sublabel: "Pick up where you left off",
          icon: <BookOpen className="size-4" />,
          href: `/read/${last.volume}/${last.book}/${last.chapter}`,
        });
      }
      return list.concat(NAV_ITEMS);
    }

    const refJump = resolved && resolved.query === q ? resolved.jump : null;
    if (refJump) {
      list.push({
        id: "refjump",
        group: "Jump to reference",
        label: refJump.label,
        sublabel: refJump.text,
        icon: <CornerDownLeft className="size-4" />,
        href: refJump.url,
      });
    }

    const { name, chapter } = splitChapter(q);
    const matchName = chapter ? name : q;
    const scored = books
      .map((b) => ({ b, score: fuzzyScore(matchName, b.bookTitle) }))
      .filter((x): x is { b: LibraryBook; score: number } => x.score !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 7);
    for (const { b } of scored) {
      list.push({
        id: `book-${b.bookId}-${chapter ?? ""}`,
        group: "Books",
        label: chapter ? `${b.bookTitle} ${chapter}` : b.bookTitle,
        sublabel: b.volumeTitle,
        icon: <BookOpen className="size-4" />,
        href: chapter
          ? `/read/${b.volumeId}/${b.bookId}/${chapter}`
          : `/read/${b.volumeId}/${b.bookId}`,
      });
    }

    list.push({
      id: "search-scripture",
      group: "Search",
      label: `Search scriptures for “${q}”`,
      icon: <Search className="size-4" />,
      href: `/search?q=${encodeURIComponent(q)}`,
    });
    list.push({
      id: "search-talks",
      group: "Search",
      label: `Search talks for “${q}”`,
      icon: <Mic className="size-4" />,
      href: `/search?scope=talks&q=${encodeURIComponent(q)}`,
    });

    return list;
  }, [query, resolved, books, last]);

  const activeIndex = Math.min(active, Math.max(0, items.length - 1));

  // Keep the highlighted row in view as the user arrows through results.
  React.useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function close() {
    setOpen(false);
    setQuery("");
    setActive(0);
  }

  function go(href: string) {
    close();
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = items[activeIndex];
      if (it) go(it.href);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  if (!open) return null;

  let lastGroup = "";

  // Portaled to <body> and positioned with inline styles so the overlay is
  // always above the sticky header — independent of any ancestor stacking
  // context or whether a given utility class has been generated.
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 100 }}>
      <div
        onClick={close}
        className="bg-black/40 animate-in fade-in"
        style={{ position: "absolute", inset: 0 }}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        style={{
          position: "absolute",
          left: "1rem",
          right: "1rem",
          top: "12vh",
          marginInline: "auto",
          maxHeight: "70vh",
        }}
        className="flex max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl shadow-black/20 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Jump to a book or reference, or search…"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={items[activeIndex] ? `cmdk-opt-${activeIndex}` : undefined}
            aria-autocomplete="list"
            className="w-full bg-transparent py-3.5 text-base outline-none placeholder:text-muted-foreground"
          />
          {resolving && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
        </div>

        <ul ref={listRef} id="cmdk-list" role="listbox" className="flex-1 overflow-y-auto p-1.5">
          {items.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">
              No matches. Press{" "}
              <kbd className="rounded border border-border px-1 text-xs">Enter</kbd>{" "}
              to search instead.
            </li>
          ) : (
            items.map((it, i) => {
              const header = it.group !== lastGroup ? it.group : null;
              lastGroup = it.group;
              const isActive = i === activeIndex;
              return (
                <React.Fragment key={it.id}>
                  {header && (
                    <li
                      role="presentation"
                      className="px-2 pt-2.5 pb-1 small-caps text-xs text-muted-foreground"
                    >
                      {header}
                    </li>
                  )}
                  <li
                    id={`cmdk-opt-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => go(it.href)}
                    onMouseMove={() => setActive(i)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2",
                      isActive ? "bg-accent text-accent-foreground" : "text-foreground/90",
                    )}
                  >
                    <span className={cn("shrink-0", isActive ? "text-primary" : "text-muted-foreground")}>
                      {it.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{it.label}</span>
                      {it.sublabel && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {it.sublabel}
                        </span>
                      )}
                    </span>
                    {isActive && (
                      <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" />
                    )}
                  </li>
                </React.Fragment>
              );
            })
          )}
        </ul>

        <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border px-1">↑</kbd>
            <kbd className="rounded border border-border px-1">↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border px-1">↵</kbd>
            open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border px-1">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
