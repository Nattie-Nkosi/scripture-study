import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";

import { fetchWithRetry } from "@/lib/fetch-with-retry";
import type {
  EntriesResponse,
  StudyHelpEntry,
  StudyHelpSearchResponse,
  StudyHelpType,
  StudyHelpTypesResponse,
} from "./types";

const DEFAULT_BASE_URL =
  "https://openscriptureapi.org/api/study-helps/v1/lds/en";

const BASE_URL = (
  process.env.OPENSCRIPTURE_STUDY_HELPS_API_BASE_URL || DEFAULT_BASE_URL
).replace(/\/+$/, "");

const ONE_DAY = 60 * 60 * 24;

/** Reference-work entries are effectively immutable; the type/entry lists change
 *  rarely, and search gets a shorter window. */
const ENTRY_REVALIDATE = ONE_DAY * 30;
const LIST_REVALIDATE = ONE_DAY * 7;
const SEARCH_REVALIDATE = 60 * 60;

export class StudyHelpsApiError extends Error {
  readonly status?: number;
  readonly url?: string;

  constructor(message: string, status?: number, url?: string) {
    super(message);
    this.name = "StudyHelpsApiError";
    this.status = status;
    this.url = url;
  }
}

async function apiGet<T>(
  path: string,
  revalidate: number = ENTRY_REVALIDATE,
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  let res: Response;
  try {
    res = await fetchWithRetry(url, {
      headers: { Accept: "application/json" },
      next: { revalidate },
    });
  } catch (err) {
    throw new StudyHelpsApiError(
      `Network error requesting ${path}: ${(err as Error).message}`,
      undefined,
      url,
    );
  }

  if (!res.ok) {
    throw new StudyHelpsApiError(
      `Study Helps API returned ${res.status} ${res.statusText} for ${path}`,
      res.status,
      url,
    );
  }

  // Unknown routes are served the marketing site's HTML rather than JSON.
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new StudyHelpsApiError(
      `Expected JSON from ${path} but received "${contentType}". The entry may not exist.`,
      res.status,
      url,
    );
  }

  return (await res.json()) as T;
}

/** The four reference works with their entry counts. */
export const listTypes = cache(
  (): Promise<StudyHelpTypesResponse> => apiGet("/types", LIST_REVALIDATE),
);

/** One alphabetical page of a work's entries (title/slug only, no body). */
export const listEntries = cache(
  (type: StudyHelpType, limit = 60, offset = 0): Promise<EntriesResponse> => {
    const params = new URLSearchParams({
      type,
      limit: String(limit),
      offset: String(offset),
    });
    return apiGet(`/entries?${params.toString()}`, LIST_REVALIDATE);
  },
);

/** A single entry by id (e.g. "bd-faith"), with full content. */
export const getEntry = cache(
  (id: string): Promise<StudyHelpEntry> =>
    apiGet(`/entry/${encodeURIComponent(id)}`),
);

/** Full-text search across the reference works, optionally scoped to one work. */
export async function searchStudyHelps(
  query: string,
  options: { type?: StudyHelpType; limit?: number; offset?: number } = {},
): Promise<StudyHelpSearchResponse> {
  const params = new URLSearchParams({ q: query });
  if (options.type) params.set("type", options.type);
  if (options.limit != null) params.set("limit", String(options.limit));
  if (options.offset != null) params.set("offset", String(options.offset));
  return apiGet(`/search?${params.toString()}`, SEARCH_REVALIDATE);
}

/** Run an entry fetch, mapping "not found" to a 404 while letting genuine
 *  network/server errors bubble to the nearest error boundary. */
export async function fetchStudyHelpOrNotFound<T>(
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (
      err instanceof StudyHelpsApiError &&
      err.status !== undefined &&
      err.status < 500
    ) {
      notFound();
    }
    throw err;
  }
}
