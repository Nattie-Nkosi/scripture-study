"use client";

import * as React from "react";
import { RefreshCw, X } from "lucide-react";

import { Button } from "@/components/ui/button";

// Registers the service worker (production only — a SW in dev fights Turbopack's
// HMR by caching stale chunks) and surfaces a quiet prompt when a new version is
// waiting, so users are never stranded on a stale build. We never swap the
// worker out from under a running page: the new worker waits until the user
// accepts, then we skip waiting, let it take control, and reload once.
export function ServiceWorkerRegister() {
  const [waiting, setWaiting] = React.useState<ServiceWorker | null>(null);
  const updatingRef = React.useRef(false);

  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    // Reload only after an update we initiated activates — not on the first
    // install's claim of this page.
    const onControllerChange = () => {
      if (!updatingRef.current) return;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    let reg: ServiceWorkerRegistration | undefined;

    // Prompt only for a genuine update — when an old worker already controls the
    // page. A first install (no controller yet) just activates silently.
    const offerUpdate = (worker: ServiceWorker | null) => {
      if (worker && navigator.serviceWorker.controller) setWaiting(worker);
    };

    const register = async () => {
      try {
        reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
      } catch {
        return;
      }

      offerUpdate(reg.waiting);

      reg.addEventListener("updatefound", () => {
        const installing = reg?.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed") offerUpdate(installing);
        });
      });
    };

    // Catch updates shipped while a long-lived tab sat in the background.
    const onVisible = () => {
      if (document.visibilityState === "visible") reg?.update().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("load", register);
    };
  }, []);

  if (!waiting) return null;

  const refresh = () => {
    updatingRef.current = true;
    waiting.postMessage({ type: "SKIP_WAITING" });
  };

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-[60] flex max-w-[calc(100%-2rem)] items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg animate-in fade-in slide-in-from-bottom-2 sm:max-w-sm"
    >
      <RefreshCw className="size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">A new version is ready</p>
        <p className="text-xs text-muted-foreground">
          Refresh to get the latest.
        </p>
      </div>
      <Button size="sm" onClick={refresh}>
        Refresh
      </Button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setWaiting(null)}
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
