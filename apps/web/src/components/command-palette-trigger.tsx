"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { openCommandPalette } from "@/components/command-palette";

const emptySubscribe = () => () => {};

// "⌘" on Apple platforms, "Ctrl" elsewhere — resolved after mount so the markup
// matches between server and client without a hydration mismatch.
function useModKey(): string {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => (/Mac|iPhone|iPad/i.test(navigator.userAgent) ? "⌘" : "Ctrl"),
    () => "⌘",
  );
}

export function CommandPaletteTrigger({ iconOnly = false }: { iconOnly?: boolean }) {
  const mod = useModKey();

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={openCommandPalette}
        aria-label="Search and jump"
        className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-55"
      >
        <Search className="size-4" />
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={openCommandPalette}
        aria-label="Search and jump"
        className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-55 sm:hidden"
      >
        <Search className="size-4" />
      </button>
      <button
        type="button"
        onClick={openCommandPalette}
        className="hidden h-9 items-center gap-2 rounded-(--radius-card) border border-border px-3 font-serif text-base text-muted-foreground transition-colors duration-(--dur-short) hover:border-primary/40 hover:text-foreground active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 sm:flex"
      >
        <Search className="size-4" />
        <span>Search…</span>
        <kbd className="ml-4 rounded-sm border border-border px-1.5 font-sans text-xs leading-5">
          {mod}K
        </kbd>
      </button>
    </>
  );
}
