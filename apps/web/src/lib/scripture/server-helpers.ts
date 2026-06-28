import "server-only";
import { notFound } from "next/navigation";

import { ScriptureApiError } from "./client";

/** Run a scripture fetch, mapping "reference not found" to a 404 while letting
 *  genuine network/server errors bubble up to the nearest error boundary. */
export async function fetchOrNotFound<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (
      err instanceof ScriptureApiError &&
      err.status !== undefined &&
      err.status < 500
    ) {
      notFound();
    }
    throw err;
  }
}
