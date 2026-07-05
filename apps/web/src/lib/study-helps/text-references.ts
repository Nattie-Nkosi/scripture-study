import "server-only";

import { getEntry } from "./client";
import type { StudyHelpType } from "./types";
import type { ReferenceSpan } from "@/lib/scripture/reference-linker";

/** Manual prose cites study helps as: “Elijah” in the Bible Dictionary, or
 *  “Faith” in the Topical Guide. Capture the quoted entry title (group 1) and
 *  the work (group 2). */
const CITATION_RE =
  /[“"]([^“”"]{1,80}?)[”"]\s+in\s+the\s+(Bible Dictionary|Topical Guide)\b/gi;

const WORK_TYPE: Record<string, StudyHelpType> = {
  "bible dictionary": "bd",
  "topical guide": "tg",
};

/** Don't validate an unbounded number of citations from one body. */
const MAX_CANDIDATES = 25;

/** Turn a cited entry title into its slug the way the API does: lowercase, drop
 *  bracketed notes and apostrophes, and collapse every other run of characters
 *  to a single hyphen ("Judges, book of" -> "judges-book-of"). */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Find "…in the Bible Dictionary / Topical Guide" citations in free text and
 *  link each quoted title to its Study Helps entry. Every candidate is verified
 *  against the API (cached) so a bad slug never becomes a dead link — it just
 *  stays plain text. Returns spans over the quoted title, in document order. */
export async function collectStudyHelpSpans(
  text: string,
): Promise<ReferenceSpan[]> {
  const candidates: {
    start: number;
    end: number;
    type: StudyHelpType;
    slug: string;
  }[] = [];

  CITATION_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while (
    (m = CITATION_RE.exec(text)) !== null &&
    candidates.length < MAX_CANDIDATES
  ) {
    const type = WORK_TYPE[m[2].toLowerCase()];
    const slug = slugify(m[1]);
    // The quoted title sits right after the opening quote, so its offset within
    // the match locates it in the source (no `d`-flag indices needed).
    const start = m.index + m[0].indexOf(m[1]);
    if (!type || !slug) continue;
    candidates.push({ start, end: start + m[1].length, type, slug });
  }

  if (candidates.length === 0) return [];

  const exists = new Map<string, boolean>();
  await Promise.all(
    [...new Set(candidates.map((c) => `${c.type}-${c.slug}`))].map(async (id) => {
      try {
        await getEntry(id);
        exists.set(id, true);
      } catch {
        exists.set(id, false);
      }
    }),
  );

  const spans: ReferenceSpan[] = [];
  for (const c of candidates) {
    if (exists.get(`${c.type}-${c.slug}`)) {
      spans.push({
        start: c.start,
        end: c.end,
        url: `/study-helps/${c.type}/${c.slug}`,
      });
    }
  }
  return spans;
}
