"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

const START_EVENT = "app:navigation-start";
// Quick navigations finish before this and never show the bar.
const SHOW_AFTER_MS = 150;
const SLOW_AFTER_MS = 8000;
const SLOW_AFTER_MS_ON_SLOW_LINK = 4000;
// A failed navigation never changes the URL, so stop waiting eventually.
const GIVE_UP_MS = 30000;

type NetworkInformation = { effectiveType?: string; saveData?: boolean };

/** Call before a programmatic `router.push` so it gets the same feedback as a link. */
export function startNavigationProgress(href: string) {
  window.dispatchEvent(new CustomEvent(START_EVENT, { detail: href }));
}

function isNewPage(href: string) {
  const url = new URL(href, location.href);
  return url.origin === location.origin && (url.pathname !== location.pathname || url.search !== location.search);
}

function isSlowLink() {
  const c = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  return Boolean(c?.saveData || (c?.effectiveType && /(^|-)(2g|3g)$/.test(c.effectiveType)));
}

// On a slow connection the route's loading screen may not be prefetched yet, so a
// tap would otherwise show nothing until the server answers. This bar starts on the
// tap itself and finishes when the URL changes. It is driven through refs, not
// state, so a navigation never re-renders the tree around it.
function Progress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const barRef = React.useRef<HTMLDivElement>(null);
  const noteRef = React.useRef<HTMLDivElement>(null);
  const timers = React.useRef<number[]>([]);
  const active = React.useRef(false);
  const doneRef = React.useRef<() => void>(() => {});

  const clearTimers = React.useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  const start = React.useCallback(() => {
    const bar = barRef.current;
    const note = noteRef.current;
    if (!bar || !note || active.current) return;
    active.current = true;
    clearTimers();
    timers.current.push(
      window.setTimeout(() => {
        bar.style.transition = "none";
        bar.style.transform = "scaleX(0)";
        bar.style.opacity = "1";
        void bar.offsetWidth;
        const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
        bar.style.transition = calm ? "none" : "transform 8s cubic-bezier(0.1, 0.7, 0.2, 1)";
        bar.style.transform = "scaleX(0.9)";
      }, SHOW_AFTER_MS),
      window.setTimeout(
        () => {
          note.removeAttribute("aria-hidden");
          note.style.opacity = "1";
          note.style.transform = "translate(-50%, 0)";
        },
        isSlowLink() ? SLOW_AFTER_MS_ON_SLOW_LINK : SLOW_AFTER_MS,
      ),
      window.setTimeout(() => doneRef.current(), GIVE_UP_MS),
    );
  }, [clearTimers]);

  const done = React.useCallback(() => {
    const bar = barRef.current;
    const note = noteRef.current;
    if (!bar || !note || !active.current) return;
    active.current = false;
    clearTimers();
    note.setAttribute("aria-hidden", "true");
    note.style.opacity = "0";
    note.style.transform = "translate(-50%, 0.5rem)";
    if (bar.style.opacity !== "1") return;
    bar.style.transition = "transform 200ms ease-out";
    bar.style.transform = "scaleX(1)";
    timers.current.push(
      window.setTimeout(() => {
        bar.style.transition = "opacity 300ms ease-out";
        bar.style.opacity = "0";
      }, 200),
    );
  }, [clearTimers]);

  React.useEffect(() => {
    doneRef.current = done;
    done();
  }, [pathname, searchParams, done]);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement) || a.target === "_blank" || a.hasAttribute("download")) return;
      if (isNewPage(a.href)) start();
    };
    const onStart = (e: Event) => {
      if (isNewPage((e as CustomEvent<string>).detail)) start();
    };
    window.addEventListener(START_EVENT, onStart);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener(START_EVENT, onStart);
      document.removeEventListener("click", onClick, true);
      clearTimers();
    };
  }, [start, clearTimers]);

  return (
    <>
      <div
        ref={barRef}
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-(--z-toast) h-0.5 origin-left bg-primary opacity-0"
        style={{ transform: "scaleX(0)" }}
      />
      <div
        ref={noteRef}
        role="status"
        aria-hidden
        className="pointer-events-none fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-1/2 z-(--z-toast) rounded-(--radius-card) border border-border bg-card px-4 py-2.5 font-serif text-sm whitespace-nowrap text-muted-foreground opacity-0 shadow-sm transition-[opacity,transform] duration-(--dur-long)"
        style={{ transform: "translate(-50%, 0.5rem)" }}
      >
        Slow connection. Still loading…
      </div>
    </>
  );
}

export function NavigationProgress() {
  return (
    <React.Suspense fallback={null}>
      <Progress />
    </React.Suspense>
  );
}
