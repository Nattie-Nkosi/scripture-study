// Pure display helpers — safe to import from both server and client components.

import type { StudyHelpType } from "./types";

interface TypeMeta {
  name: string;
  short: string;
  blurb: string;
}

const TYPE_META: Record<StudyHelpType, TypeMeta> = {
  bd: {
    name: "Bible Dictionary",
    short: "Bible Dictionary",
    blurb: "A concise encyclopedia of biblical people, places, and subjects.",
  },
  tg: {
    name: "Topical Guide",
    short: "Topical Guide",
    blurb: "An alphabetical guide of scripture citations gathered by topic.",
  },
  index: {
    name: "Triple Combination Index",
    short: "Index",
    blurb:
      "An index to the Book of Mormon, Doctrine and Covenants, and Pearl of Great Price.",
  },
  jst: {
    name: "Joseph Smith Translation",
    short: "JST",
    blurb: "Excerpts from the Prophet's inspired revision of the Bible.",
  },
};

/** Display order across the section (dictionary first, then the guides). */
export const STUDY_HELP_TYPES: StudyHelpType[] = ["bd", "tg", "index", "jst"];

export function isStudyHelpType(value: string): value is StudyHelpType {
  return value === "bd" || value === "tg" || value === "index" || value === "jst";
}

/** Full name of a work, e.g. "bd" -> "Bible Dictionary". */
export function typeName(type: StudyHelpType): string {
  return TYPE_META[type].name;
}

/** Short name for tight spots, e.g. "index" -> "Index". */
export function typeShortName(type: StudyHelpType): string {
  return TYPE_META[type].short;
}

export function typeBlurb(type: StudyHelpType): string {
  return TYPE_META[type].blurb;
}

/** Estimated reading time in whole minutes (≥1) at an unhurried ~200 wpm. */
export function readingTimeMinutes(text: string): number {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / 200));
}
