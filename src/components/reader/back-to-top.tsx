"use client";

import * as React from "react";
import { ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils";

/** Floating "scroll to top" button that fades in once you're well down the
 *  page. Sits above the assistant's "Ask" button (right-4 bottom-4). */
export function BackToTop() {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 800);
    const id = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
      className={cn(
        "fixed right-4 z-30 flex size-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-lg backdrop-blur transition-all hover:text-foreground",
        show ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      <ArrowUp className="size-4" />
    </button>
  );
}
