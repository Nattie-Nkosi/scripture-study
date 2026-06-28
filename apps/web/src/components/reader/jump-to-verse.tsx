"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/** A compact picker that scrolls to any verse in a long chapter. Shown only
 *  when a chapter is long enough that scrolling to find a verse is a chore. */
export function JumpToVerse({ count }: { count: number }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function jump(n: number) {
    setOpen(false);
    const el = document.getElementById(`v${n}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", `#v${n}`);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 font-sans text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Jump to verse
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-1/2 z-30 mt-2 w-64 -translate-x-1/2 rounded-xl border border-border bg-card p-2 shadow-lg animate-in fade-in zoom-in-95 duration-150">
          <div className="grid max-h-64 grid-cols-6 gap-1 overflow-y-auto">
            {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => jump(n)}
                className="rounded-md py-1.5 text-center font-sans text-xs tabular-nums text-foreground/80 transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
