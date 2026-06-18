// Types for the General Conference API.
// Base: https://openscriptureapi.org/api/conference/v1/lds/en
// Modeled on the verified response shapes from the live API.

/** A footnote anchored to a span of paragraph text (zero-based offsets).
 *  `text` holds the raw note, often a scripture citation ("See D&C 88:63."). */
export interface TalkFootNote {
  start: number;
  end: number;
  text: string;
}

export interface TalkParagraph {
  text: string;
  footNotes: TalkFootNote[];
}

// --- Talk metadata (no content) — appears in conference & speaker listings ---

export interface TalkSummary {
  _id: string;
  conferenceId: string;
  year: number;
  month: number;
  session: string;
  title: string;
  speaker: string;
  role: string | null;
  talkNumber: number;
  nextTalkId?: string | null;
  prevTalkId?: string | null;
}

// --- GET /talk/:id -----------------------------------------------------------

export interface TalkContent {
  title: string;
  speaker: string;
  role: string | null;
  paragraphs: TalkParagraph[];
}

export interface Talk extends TalkSummary {
  nextTalkId: string | null;
  prevTalkId: string | null;
  content: TalkContent;
}

// --- Conferences -------------------------------------------------------------

export interface ConferenceSession {
  name: string;
  talkIds: string[];
  /** Present only when a conference is fetched with `include_talks=true`. */
  talks?: TalkSummary[];
}

export interface Conference {
  _id: string; // e.g. "2024-10"
  year: number;
  month: number; // 4 (April) or 10 (October)
  title: string; // "October 2024 General Conference"
  sessions: ConferenceSession[];
}

export interface ConferencesResponse {
  total: number;
  limit: number;
  offset: number;
  conferences: Conference[];
}

// --- Speakers ----------------------------------------------------------------

export interface Speaker {
  _id: string;
  name: string;
  talkCount: number;
  firstYear: number;
  lastYear: number;
}
