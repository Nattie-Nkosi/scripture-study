import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";

import type {
  Conference,
  ConferencesResponse,
  Talk,
} from "./types";

const DEFAULT_BASE_URL =
  "https://openscriptureapi.org/api/conference/v1/lds/en";

const BASE_URL = (
  process.env.OPENSCRIPTURE_CONFERENCE_API_BASE_URL || DEFAULT_BASE_URL
).replace(/\/+$/, "");

const ONE_DAY = 60 * 60 * 24;

/** Talk text is effectively immutable; the conference list grows only twice a
 *  year, so it gets a shorter window to pick up the newest conference. */
const TALK_REVALIDATE = ONE_DAY * 30;
const LIST_REVALIDATE = ONE_DAY;

export class ConferenceApiError extends Error {
  readonly status?: number;
  readonly url?: string;

  constructor(message: string, status?: number, url?: string) {
    super(message);
    this.name = "ConferenceApiError";
    this.status = status;
    this.url = url;
  }
}

async function apiGet<T>(
  path: string,
  revalidate: number = TALK_REVALIDATE,
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate },
    });
  } catch (err) {
    throw new ConferenceApiError(
      `Network error requesting ${path}: ${(err as Error).message}`,
      undefined,
      url,
    );
  }

  if (!res.ok) {
    throw new ConferenceApiError(
      `Conference API returned ${res.status} ${res.statusText} for ${path}`,
      res.status,
      url,
    );
  }

  // Unknown routes are served the marketing site's HTML rather than JSON.
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ConferenceApiError(
      `Expected JSON from ${path} but received "${contentType}". The reference may not exist.`,
      res.status,
      url,
    );
  }

  return (await res.json()) as T;
}

/** One page of conferences, newest first. */
export const listConferences = cache(
  (limit = 20, offset = 0): Promise<ConferencesResponse> =>
    apiGet<ConferencesResponse>(
      `/conferences?limit=${limit}&offset=${offset}`,
      LIST_REVALIDATE,
    ),
);

/** The full archive of conferences, newest first (paged through transparently). */
export const getAllConferences = cache(async (): Promise<Conference[]> => {
  const first = await listConferences(100, 0);
  const all = [...first.conferences];
  while (all.length < first.total) {
    const next = await listConferences(100, all.length);
    if (next.conferences.length === 0) break;
    all.push(...next.conferences);
  }
  return all;
});

/** The most recent conference available. */
export const getLatestConference = cache(
  (): Promise<Conference> =>
    apiGet<Conference>("/conferences/latest", LIST_REVALIDATE),
);

/** A single conference by id (e.g. "2024-04"), optionally with talk metadata. */
export const getConference = cache(
  (id: string, includeTalks = false): Promise<Conference> =>
    apiGet<Conference>(
      `/conference/${encodeURIComponent(id)}${
        includeTalks ? "?include_talks=true" : ""
      }`,
    ),
);

/** A single talk by id (e.g. "2024-04-11oaks"), with full content. */
export const getTalk = cache(
  (id: string): Promise<Talk> =>
    apiGet<Talk>(`/talk/${encodeURIComponent(id)}`),
);

/** Run a conference fetch, mapping "not found" to a 404 while letting genuine
 *  network/server errors bubble to the nearest error boundary. */
export async function fetchConferenceOrNotFound<T>(
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (
      err instanceof ConferenceApiError &&
      err.status !== undefined &&
      err.status < 500
    ) {
      notFound();
    }
    throw err;
  }
}
