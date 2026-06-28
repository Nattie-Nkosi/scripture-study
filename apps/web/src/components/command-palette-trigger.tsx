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
        className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
        className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
      >
        <Search className="size-4" />
      </button>
      <button
        type="button"
        onClick={openCommandPalette}
        className="hidden items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:flex"
      >
        <Search className="size-4" />
        <span>Search…</span>
        <kbd className="ml-3 rounded border border-border px-1 font-sans text-[10px] leading-4">
          {mod}K
        </kbd>
      </button>
    </>
  );
}
