// Pure display helpers — safe to import from both server and client components.

import type { Conference } from "./types";

export function monthName(month: number): string {
  if (month === 4) return "April";
  if (month === 10) return "October";
  return new Date(2000, month - 1, 1).toLocaleString("en-US", { month: "long" });
}

/** Compact label for a conference, e.g. "April 2026". */
export function conferenceShortTitle(year: number, month: number): string {
  return `${monthName(month)} ${year}`;
}

export function talkCount(conference: Conference): number {
  return conference.sessions.reduce((n, s) => n + s.talkIds.length, 0);
}

/** Deep link to the talk on churchofjesuschrist.org, where the official audio
 *  recording — the speaker's own voice — can be played. Talk ids are
 *  `{year}-{month}-{slug}`; the Church path mirrors that as `/{year}/{month}/{slug}`. */
export function officialTalkUrl(talk: { _id: string; year: number; month: number }): string {
  const slug = talk._id.replace(/^\d{4}-\d{2}-/, "");
  const month = String(talk.month).padStart(2, "0");
  return `https://www.churchofjesuschrist.org/study/general-conference/${talk.year}/${month}/${slug}?lang=eng`;
}

/** Estimated reading time in whole minutes (≥1) at an unhurried ~200 wpm. */
export function readingTimeMinutes(paragraphs: { text: string }[]): number {
  const words = paragraphs.reduce(
    (n, p) => n + (p.text.trim() ? p.text.trim().split(/\s+/).length : 0),
    0,
  );
  return Math.max(1, Math.round(words / 200));
}
