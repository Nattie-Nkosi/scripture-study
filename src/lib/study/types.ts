// Personal study data shapes (Phase 8). Every record is anchored to a specific
// place in scripture by volume/book/chapter[/verse] — the same identity the
// reader routes and the scripture API already use — so a future server/Supabase
// backend can map these 1:1 without reshaping the data.

export type HighlightColor = "yellow" | "green" | "blue" | "pink";

export interface VerseRef {
  volume: string;
  book: string;
  chapter: number;
  verse: number;
}

export interface ChapterRef {
  volume: string;
  book: string;
  chapter: number;
}

export interface Highlight extends VerseRef {
  id: string;
  color: HighlightColor;
  bookTitle: string; // denormalized so the study page renders without a fetch
  createdAt: number;
  updatedAt: number;
}

export interface Note extends VerseRef {
  id: string;
  text: string;
  bookTitle: string; // denormalized so the study page renders without a fetch
  createdAt: number;
  updatedAt: number;
}

export interface Bookmark extends ChapterRef {
  id: string;
  verse: number | null; // null = a whole-chapter bookmark
  bookTitle: string; // denormalized so the study page renders without a fetch
  createdAt: number;
}

export interface LastRead extends ChapterRef {
  bookTitle: string; // denormalized for "Continue reading" without a fetch
  verse?: number; // last-read verse within the chapter (1 = top); resume target
  updatedAt: number; // only the most recent position is kept
}
