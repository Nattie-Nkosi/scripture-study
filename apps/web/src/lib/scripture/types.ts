// Types for the Open Scripture API (https://openscriptureapi.org/docs).
// Modeled on the verified response shapes from the live API.
// Base: https://openscriptureapi.org/api/scriptures/v1/lds/en

/** The five LDS standard works, by their API volume ids. */
export type VolumeId =
  | "oldtestament"
  | "newtestament"
  | "bookofmormon"
  | "doctrineandcovenants"
  | "pearlofgreatprice";

/** A character range within a verse's text (zero-based offsets). */
export interface TextRange {
  start: number;
  end: number;
}

// --- GET /volumes ------------------------------------------------------------

export interface VolumeSummary {
  _id: string;
  title: string;
}

export interface VolumesResponse {
  volumes: VolumeSummary[];
}

// --- GET /volume/{id} --------------------------------------------------------

export interface BookSummary {
  _id: string;
  title: string;
}

export interface VolumeDetail {
  _id: string;
  title: string;
  titleShort: string;
  titleOfficial: string;
  books: BookSummary[];
}

// --- GET /book/{id} (or /volume/{volumeId}/{bookId}) -------------------------

export interface ChapterSummary {
  /** e.g. "1nephi1" — the chapter number is the trailing digits / list index. */
  _id: string;
  summary: string;
}

export interface BookDetail {
  _id: string;
  chapterDelineation: string; // "Chapter", "Section", "Psalm", etc.
  chapters: ChapterSummary[];
}

// --- GET /chapter/{id} (or /book/{bookId}/{n}) ------------------------------

/** A footnote anchored to a span of the verse text. `text` holds the raw
 *  note, which may be a Topical Guide entry ("TG Faith.") or a list of
 *  cross references ("1 Ne. 14:30; 2 Ne. 25:20."). */
export interface FootNote {
  start: number;
  end: number;
  text: string;
}

export interface Verse {
  text: string;
  footNotes: FootNote[];
  italics: TextRange[];
  associatedContent: unknown[];
}

export interface ChapterBookRef {
  _id: string;
  title: string;
  titleShort: string;
  titleOfficial: string;
  subtitle: string;
  summary: string;
  chapterDelineation: string;
}

export interface ChapterVolumeRef {
  _id: string;
  title: string;
  titleShort: string;
  titleOfficial: string;
}

export interface ChapterBody {
  bookTitle: string;
  delineation: string;
  number: number;
  summary: string;
  chapterAugmentations: unknown[];
  verses: Verse[];
}

export interface ChapterResponse {
  _id: string;
  book: ChapterBookRef;
  chapter: ChapterBody;
  nextChapterId: string | null;
  prevChapterId: string | null;
  volume: ChapterVolumeRef;
}

// --- GET /book/{bookId}/{n}/{verse} -----------------------------------------
// This endpoint doubles as the footnotes / cross-references endpoint: it
// returns the verse text plus structured cross references and JST references.

export interface CrossReferenceVerseRange {
  start: number;
  end: number;
}

export interface CrossReferenceChapterRange {
  start: number;
  end: number;
  verses?: CrossReferenceVerseRange[];
}

export interface CrossReferenceTarget {
  /** "scripture" | "studyHelp" (and possibly others). */
  type: string;
  /** Present for study-help targets, e.g. "tg" (Topical Guide), "bd", "gs". */
  studyHelpType?: string;
  title?: string;
  entryId?: string;
  book: string;
  chapters: CrossReferenceChapterRange[];
}

export interface CrossReference {
  raw: string; // "Ether 12:6."
  prettyString: string; // "Ether 12:6"
  references: CrossReferenceTarget[];
}

export interface VerseResponse {
  reference: string; // "Alma 32:21"
  book: string; // "Alma"
  chapter: number;
  verse: number;
  text: string;
  crossReferences: CrossReference[];
  jstReferences: CrossReference[];
}

// --- GET /search?q=... ------------------------------------------------------

export interface SearchResultItem {
  reference: string; // "Alma 32:21"
  book: string;
  chapter: number;
  verse: number;
  text: string;
  /** Only present when `highlight=true`. */
  highlight?: string;
}

export interface WordFrequencyItem {
  word: string;
  count: number;
}

export interface SearchResponse {
  query: string;
  total: number;
  limit: number;
  offset: number;
  results: SearchResultItem[];
  /** Only present when `word_frequency=true`. */
  wordFrequency?: WordFrequencyItem[];
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  volume?: VolumeId | string;
  book?: string;
  caseSensitive?: boolean;
  regex?: boolean;
  highlight?: boolean;
  highlightWindow?: number;
  wordFrequency?: boolean;
}

// --- GET /referencesFinder?text=... -----------------------------------------
// Parses free text (e.g. a raw footnote string) into structured references.
// Unlike the single-verse endpoint's crossReferences, this parses the full
// string. It detects scripture references only; study-help text (e.g.
// "TG Hope") is left out of `references`. The inner targets reuse the same
// shape as cross references (see CrossReferenceTarget).

export interface FoundReference {
  start: number; // offset within the input text
  end: number;
  raw: string; // "Mosiah 1:2"
  prettyString: string; // "Mosiah 1:2"
  reference: CrossReferenceTarget[];
}

export interface ReferencesFinderResponse {
  text: string;
  count: number;
  references: FoundReference[];
}

/** A single scripture cross reference, flattened for the footnote UI. */
export interface ParsedReference {
  prettyString: string; // "Mosiah 1:2"
  book: string; // book id, e.g. "mosiah"
  chapter: number;
  verse: number;
  volume: string; // volume id for the reader URL; "" if unknown
}
