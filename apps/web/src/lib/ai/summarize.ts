import "server-only";
import type { AssistantMessage } from "./assistant";

// On-demand overview of a whole chapter, grounded entirely in that chapter's
// text. One-shot, no history.

const SYSTEM_INSTRUCTIONS = [
  "You are a study companion inside a Latter-day Saint scripture study app.",
  "Summarize the chapter provided below so a reader can grasp what it covers, before or after reading it.",
  "Ground the summary entirely in the chapter's own text — its events, teachings, and people. Do not add outside information, interpretation the chapter doesn't support, invented quotations, or doctrine it doesn't state.",
  "Keep it brief: three or four sentences, or a few short bullet points, capturing the main flow and key ideas. Refer to verses by number when it helps (e.g. \"vv. 5–7\").",
  "Be respectful of differing beliefs. You are a study aid, not an official or authoritative source of Church doctrine.",
].join(" ");

/** Build the message list to summarize one chapter: system instructions + the
 *  full chapter text as context. */
export function buildSummaryMessages(opts: {
  bookTitle: string;
  chapterNumber: number;
  verses: { n: number; text: string }[];
}): AssistantMessage[] {
  const passage = opts.verses.map((v) => `${v.n}. ${v.text}`).join("\n");

  const system =
    `${SYSTEM_INSTRUCTIONS}\n\n` +
    `Chapter — ${opts.bookTitle} ${opts.chapterNumber} (King James Version):\n` +
    passage;

  return [
    { role: "system", content: system },
    { role: "user", content: `Summarize ${opts.bookTitle} ${opts.chapterNumber}.` },
  ];
}
