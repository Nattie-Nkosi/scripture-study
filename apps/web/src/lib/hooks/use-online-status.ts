"use client";

import * as React from "react";

/** Tracks the browser's connectivity so network-only features (the study
 *  assistant, search, Simple English) can fail gracefully offline. Starts
 *  optimistic so SSR and the first paint assume online — no false "offline"
 *  flash — then corrects on the next frame and on every connectivity change. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = React.useState(true);

  React.useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    const id = requestAnimationFrame(update);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}
