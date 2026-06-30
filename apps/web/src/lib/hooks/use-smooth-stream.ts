"use client";

import * as React from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.(REDUCED_MOTION_QUERY).matches
  );
}

/** Progressively reveals `target` so streamed text types out smoothly instead
 *  of lurching in as network chunks land. Returns the revealed prefix.
 *
 *  The reveal rate scales with how far behind it is, so it tracks the stream
 *  closely rather than falling behind, and finishes quickly once `complete` is
 *  set. Content that's whole on mount (a reloaded saved chat) and reduced-motion
 *  users get the full text immediately. */
export function useSmoothStream(target: string, complete: boolean): string {
  const [reduce, setReduce] = React.useState(prefersReducedMotion);
  const [revealed, setRevealed] = React.useState(() =>
    complete || reduce ? target.length : 0,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    const sync = () => setReduce(mql.matches);
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  React.useEffect(() => {
    if (reduce || revealed >= target.length) return; // done, or nothing to add

    const start = performance.now();
    const id = requestAnimationFrame((now) => {
      const dt = Math.min(now - start, 100); // clamp a backgrounded-tab gap
      const remaining = target.length - revealed;
      const floorCps = complete ? 1400 : 280;
      const step = Math.max(
        Math.ceil((floorCps * dt) / 1000),
        Math.ceil(remaining / (complete ? 4 : 22)),
      );
      setRevealed(Math.min(target.length, revealed + step));
    });
    return () => cancelAnimationFrame(id);
  }, [revealed, target, complete, reduce]);

  return target.slice(0, reduce ? target.length : Math.min(revealed, target.length));
}
