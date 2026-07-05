import "server-only";

import {
  collectReferenceSpans,
  normalizeSpans,
  toSegments,
  type ReferenceSpan,
  type TextSegment,
} from "@/lib/scripture/reference-linker";
import { collectStudyHelpSpans } from "@/lib/study-helps/text-references";

export type BlockType = "section" | "subheading" | "note" | "paragraph";

export interface LessonBlock {
  type: BlockType;
  segments: TextSegment[];
}

/** Longest a block can be to read as a heading rather than body prose. */
const SUBHEADING_MAX = 130;

/** Top-level section headings that recur across the curriculum. Matched at the
 *  start of a short block so wording variants ("Ideas for Personal Scripture
 *  Study", "Ideas for Teaching Children", …) are all caught. */
const SECTION_RE =
  /^(ideas for |scripture helps\b|additional resources\b|resources? to help\b|improving (our teaching|personal|family)|suggestions for )/i;

/** Secondary reference lines the manual appends after a teaching idea. */
const NOTE_RE = /^(see also\b|for more (about|on)\b|see\b.+\bfor\b)/i;

/** Scrape artifacts that carry no reading value. */
const ARTIFACT_RE = /^(click to see more\.?|watch\b.*\bvideo\.?)$/i;

/** Split a lesson body into blocks on blank lines, keeping each block's start
 *  offset within the original text so reference spans can be mapped back. */
function splitBlocks(text: string): { text: string; start: number }[] {
  const blocks: { text: string; start: number }[] = [];
  const delimiter = /\n\s*\n/g;

  const push = (from: number, to: number) => {
    const raw = text.slice(from, to);
    const lead = raw.length - raw.trimStart().length;
    const trimmed = raw.trim();
    if (trimmed) blocks.push({ text: trimmed, start: from + lead });
  };

  let idx = 0;
  let m: RegExpExecArray | null;
  while ((m = delimiter.exec(text)) !== null) {
    push(idx, m.index);
    idx = m.index + m[0].length;
  }
  push(idx, text.length);
  return blocks;
}

function classify(text: string): BlockType {
  if (text.length <= 70 && SECTION_RE.test(text)) return "section";
  if (NOTE_RE.test(text)) return "note";
  if (text.length <= SUBHEADING_MAX && !text.endsWith("?")) return "subheading";
  return "paragraph";
}

/** Parse a lesson body into typed blocks (section / sub-heading / note /
 *  paragraph) with every reference resolved to an inline link: scripture
 *  citations into the reader, and "…in the Bible Dictionary / Topical Guide"
 *  citations into Study Helps. Detection runs once over the whole body, then
 *  spans are localized to each block. Each collector fails independently, so a
 *  problem with one still leaves the other's links (and the plain prose). */
export async function buildLessonBody(text: string): Promise<LessonBlock[]> {
  const blocks = splitBlocks(text).filter((b) => !ARTIFACT_RE.test(b.text));

  const [scripture, studyHelps] = await Promise.all([
    collectReferenceSpans(text).catch(() => [] as ReferenceSpan[]),
    collectStudyHelpSpans(text).catch(() => [] as ReferenceSpan[]),
  ]);
  const spans = normalizeSpans([...scripture, ...studyHelps]);

  return blocks.map((block) => {
    const end = block.start + block.text.length;
    const local = spans
      .filter((s) => s.start >= block.start && s.end <= end)
      .map((s) => ({
        start: s.start - block.start,
        end: s.end - block.start,
        url: s.url,
      }));
    return {
      type: classify(block.text),
      segments: toSegments(block.text, local),
    };
  });
}
