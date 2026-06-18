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
