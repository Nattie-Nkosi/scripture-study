"use client";

import * as React from "react";

/** A thin bar pinned just below the reader header that fills as you scroll
 *  through the page. Drives a ref directly (no per-scroll re-render). */
export function ReadingProgress() {
  const fillRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="fixed inset-x-0 z-30 h-0.5"
      style={{ top: "calc(3.5rem + env(safe-area-inset-top))" }}
    >
      <div
        ref={fillRef}
        className="h-full origin-left bg-primary/70 will-change-transform"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
