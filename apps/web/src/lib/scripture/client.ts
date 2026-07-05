import "server-only";
import { cache } from "react";

import { fetchWithRetry } from "@/lib/fetch-with-retry";
import type {
  BookDetail,
  ChapterResponse,
  CrossReference,
  ReferencesFinderResponse,
  SearchOptions,
  SearchResponse,
  VerseResponse,
  VolumeDetail,
  VolumesResponse,
} from "./types";

const DEFAULT_BASE_URL =
  "https://openscriptureapi.org/api/scriptures/v1/lds/en";

const BASE_URL = (
  process.env.OPENSCRIPTURE_API_BASE_URL || DEFAULT_BASE_URL
).replace(/\/+$/, "");

const ONE_DAY = 60 * 60 * 24;

/** Scripture text is effectively immutable, so cache it for a long time.
 *  Next 16 does not cache `fetch` by default; we opt in per request. */
const SCRIPTURE_REVALIDATE = ONE_DAY * 30;
const SEARCH_REVALIDATE = 60 * 60;

export class ScriptureApiError extends Error {
  readonly status?: number;
  readonly url?: string;

  constructor(message: string, status?: number, url?: string) {
    super(message);
    this.name = "ScriptureApiError";
    this.status = status;
    this.url = url;
  }
}

async function apiGet<T>(
  path: string,
  revalidate: number = SCRIPTURE_REVALIDATE,
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  let res: Response;
  try {
    res = await fetchWithRetry(url, {
      headers: { Accept: "application/json" },
      next: { revalidate },
    });
  } catch (err) {
    throw new ScriptureApiError(
      `Network error requesting ${path}: ${(err as Error).message}`,
      undefined,
      url,
    );
  }

  if (!res.ok) {
    throw new ScriptureApiError(
      `Open Scripture API returned ${res.status} ${res.statusText} for ${path}`,
      res.status,
      url,
    );
  }

  // Unknown routes are served the marketing site's HTML rather than JSON, so
  // guard against that instead of letting JSON.parse throw something cryptic.
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ScriptureApiError(
      `Expected JSON from ${path} but received "${contentType}". The reference may not exist.`,
      res.status,
      url,
    );
  }

  return (await res.json()) as T;
}

/** List the five standard works (volumes), in canonical order. */
export const listVolumes = cache(
  (): Promise<VolumesResponse> => apiGet<VolumesResponse>("/volumes"),
);

/** Get a volume and the list of books it contains. */
export const getVolume = cache(
  (volumeId: string): Promise<VolumeDetail> =>
    apiGet<VolumeDetail>(`/volume/${encodeURIComponent(volumeId)}`),
);

/** Get a book and the list of its chapters (with summaries). */
export const getBook = cache(
  (bookId: string): Promise<BookDetail> =>
    apiGet<BookDetail>(`/book/${encodeURIComponent(bookId)}`),
);

/** Get a full chapter with its verses, footnotes, and prev/next chapter ids. */
export const getChapter = cache(
  (bookId: string, chapter: number): Promise<ChapterResponse> =>
    apiGet<ChapterResponse>(
      `/book/${encodeURIComponent(bookId)}/${chapter}`,
    ),
);

/** Get a chapter directly by its id (e.g. "1nephi1"), handy for prev/next nav. */
export const getChapterById = cache(
  (chapterId: string): Promise<ChapterResponse> =>
    apiGet<ChapterResponse>(`/chapter/${encodeURIComponent(chapterId)}`),
);

/** Get a single verse with its structured cross references and JST references. */
export const getVerse = cache(
  (bookId: string, chapter: number, verse: number): Promise<VerseResponse> =>
    apiGet<VerseResponse>(
      `/book/${encodeURIComponent(bookId)}/${chapter}/${verse}`,
    ),
);

/** Footnotes + cross references for a verse. Footnote anchors (character
 *  offsets) live on the chapter's verse objects; the structured/parsed
 *  references come from the single-verse endpoint. */
export const getVerseReferences = cache(
  async (
    bookId: string,
    chapter: number,
    verse: number,
  ): Promise<{
    crossReferences: CrossReference[];
    jstReferences: CrossReference[];
  }> => {
    const v = await getVerse(bookId, chapter, verse);
    return {
      crossReferences: v.crossReferences,
      jstReferences: v.jstReferences,
    };
  },
);

/** Full-text search across scripture, with optional filters and highlighting. */
export async function searchScriptures(
  query: string,
  options: SearchOptions = {},
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query });

  if (options.limit != null) params.set("limit", String(options.limit));
  if (options.offset != null) params.set("offset", String(options.offset));
  if (options.volume) params.set("volume", options.volume);
  if (options.book) params.set("book", options.book);
  if (options.caseSensitive) params.set("case_sensitive", "true");
  if (options.regex) params.set("regex", "true");
  if (options.highlight) params.set("highlight", "true");
  if (options.highlightWindow != null) {
    params.set("highlight_window", String(options.highlightWindow));
  }
  if (options.wordFrequency) params.set("word_frequency", "true");

  return apiGet<SearchResponse>(
    `/search?${params.toString()}`,
    SEARCH_REVALIDATE,
  );
}

/** Parse free text (e.g. a raw footnote string) into structured scripture
 *  references. The result is deterministic per input, so it's cached like
 *  scripture text. Returns scripture references only — study-help text is not
 *  included by the API. */
export const findReferences = cache(
  (text: string): Promise<ReferencesFinderResponse> => {
    const trimmed = text.trim();
    if (!trimmed) {
      return Promise.resolve({ text: "", count: 0, references: [] });
    }
    return apiGet<ReferencesFinderResponse>(
      `/referencesFinder?text=${encodeURIComponent(trimmed)}`,
      SCRIPTURE_REVALIDATE,
    );
  },
);
