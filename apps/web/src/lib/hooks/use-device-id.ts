"use client";

import * as React from "react";

const STORAGE_KEY = "scripture-study-device-id";

/** A stable anonymous id for this browser, used to scope chat history while
 *  auth is deferred. Null until hydrated on the client. */
export function useDeviceId(): string | null {
  const [id, setId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let value = localStorage.getItem(STORAGE_KEY);
    if (!value) {
      value = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, value);
    }
    setId(value);
  }, []);

  return id;
}
