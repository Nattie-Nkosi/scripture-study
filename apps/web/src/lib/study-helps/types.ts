/** The four reference works exposed by the Study Helps API. */
export type StudyHelpType = "bd" | "tg" | "index" | "jst";

/** A work summary from `/types` (name + how many entries it holds). */
export interface StudyHelpTypeInfo {
  type: StudyHelpType;
  name: string;
  description: string;
  entryCount: number;
}

export interface StudyHelpTypesResponse {
  types: StudyHelpTypeInfo[];
}

/** A single entry's listing row (no body), from `/entries`. */
export interface EntrySummary {
  _id: string;
  slug: string;
  title: string;
  type: StudyHelpType;
}

export interface EntriesResponse {
  total: number;
  limit: number;
  offset: number;
  type: StudyHelpType;
  entries: EntrySummary[];
}

/** A scripture reference the API has already located and resolved for us. */
export interface ParsedReference {
  volume: string;
  bookKey: string;
  book: string;
  chapter: number;
  chapterId: string;
  verses: { start: number; end: number }[];
}

/** A reference within an entry's or a search snippet's text. `parsed` is null
 *  when the citation couldn't be resolved to a chapter, so it stays plain. */
export interface EntryReference {
  text: string;
  start: number;
  end: number;
  parsed: ParsedReference | null;
}

export interface EntryContentBlock {
  text: string;
  references: EntryReference[];
}

/** A cross-link to a sibling entry (e.g. Topical Guide "Abide" -> "Dwell"). */
export interface EntrySeeAlso {
  entryId: string;
  slug: string;
  title: string;
}

export interface StudyHelpEntry {
  _id: string;
  slug: string;
  title: string;
  type: StudyHelpType;
  seeAlso: EntrySeeAlso[];
  content: EntryContentBlock[];
}

export interface SearchResult {
  entryId: string;
  type: StudyHelpType;
  slug: string;
  title: string;
  text: string;
  references: EntryReference[];
}

export interface StudyHelpSearchResponse {
  query: string;
  total: number;
  limit: number;
  offset: number;
  results: SearchResult[];
}
