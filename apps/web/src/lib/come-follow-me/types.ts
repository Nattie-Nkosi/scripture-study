// Types for the Come, Follow Me API.
// Base: https://openscriptureapi.org/api/manuals/v1/lds/en
// Modeled on the response shapes documented by the Open Scripture API.

/** The week a lesson covers, with a human-readable label (e.g. "January 5–11"). */
export interface LessonDateRange {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  display: string;
}

// --- Lesson metadata (no text) — appears in the /come-follow-me listing --------

export interface LessonSummary {
  _id: string; // the week's start date, YYYY-MM-DD
  manualId: string; // e.g. "come-follow-me-for-home-and-church-old-testament-2026"
  year: number;
  title: string;
  dateRange: LessonDateRange;
  scriptureReferences: string[];
}

// --- GET /come-follow-me/:date — a single lesson with its body -----------------

export interface LessonContent {
  text: string;
}

export interface Lesson extends LessonSummary {
  content: LessonContent;
}

// --- GET /come-follow-me -------------------------------------------------------

export interface LessonsResponse {
  total: number;
  limit: number;
  offset: number;
  lessons: LessonSummary[];
}
