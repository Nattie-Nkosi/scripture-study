import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";

import type { Lesson, LessonSummary, LessonsResponse } from "./types";

const DEFAULT_BASE_URL =
  "https://openscriptureapi.org/api/manuals/v1/lds/en";

const BASE_URL = (
  process.env.OPENSCRIPTURE_MANUALS_API_BASE_URL || DEFAULT_BASE_URL
).replace(/\/+$/, "");

const ONE_DAY = 60 * 60 * 24;

/** Lesson text is stable once published; the archive grows one week at a time,
 *  so the listing gets a shorter window and the current lesson shorter still so
 *  it rolls over to the new week promptly. */
const LESSON_REVALIDATE = ONE_DAY * 30;
const LIST_REVALIDATE = ONE_DAY;
const CURRENT_REVALIDATE = 60 * 60;

export class ComeFollowMeApiError extends Error {
  readonly status?: number;
  readonly url?: string;

  constructor(message: string, status?: number, url?: string) {
    super(message);
    this.name = "ComeFollowMeApiError";
    this.status = status;
    this.url = url;
  }
}

async function apiGet<T>(
  path: string,
  revalidate: number = LESSON_REVALIDATE,
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate },
    });
  } catch (err) {
    throw new ComeFollowMeApiError(
      `Network error requesting ${path}: ${(err as Error).message}`,
      undefined,
      url,
    );
  }

  if (!res.ok) {
    throw new ComeFollowMeApiError(
      `Come, Follow Me API returned ${res.status} ${res.statusText} for ${path}`,
      res.status,
      url,
    );
  }

  // Unknown routes are served the marketing site's HTML rather than JSON.
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ComeFollowMeApiError(
      `Expected JSON from ${path} but received "${contentType}". The lesson may not exist.`,
      res.status,
      url,
    );
  }

  return (await res.json()) as T;
}

/** One page of lessons, earliest first, optionally filtered to a single year. */
export const listLessons = cache(
  (year?: number, limit = 20, offset = 0): Promise<LessonsResponse> => {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    if (year != null) params.set("year", String(year));
    return apiGet<LessonsResponse>(
      `/come-follow-me?${params.toString()}`,
      LIST_REVALIDATE,
    );
  },
);

/** Every lesson for a year, earliest first (paged through transparently). */
export const getLessonsForYear = cache(
  async (year: number): Promise<LessonSummary[]> => {
    const first = await listLessons(year, 100, 0);
    const all = [...first.lessons];
    while (all.length < first.total) {
      const next = await listLessons(year, 100, all.length);
      if (next.lessons.length === 0) break;
      all.push(...next.lessons);
    }
    return all;
  },
);

/** The lesson for the week containing today (or the most recent one in a gap). */
export const getCurrentLesson = cache(
  (): Promise<Lesson> =>
    apiGet<Lesson>("/come-follow-me/current", CURRENT_REVALIDATE),
);

/** A single lesson by its week-start date (e.g. "2026-01-05"). */
export const getLesson = cache(
  (date: string): Promise<Lesson> =>
    apiGet<Lesson>(`/come-follow-me/${encodeURIComponent(date)}`),
);

/** Run a lesson fetch, mapping "not found" to a 404 while letting genuine
 *  network/server errors bubble to the nearest error boundary. */
export async function fetchLessonOrNotFound<T>(
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (
      err instanceof ComeFollowMeApiError &&
      err.status !== undefined &&
      err.status < 500
    ) {
      notFound();
    }
    throw err;
  }
}
