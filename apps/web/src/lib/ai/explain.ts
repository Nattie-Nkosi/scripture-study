import "server-only";
import type { AssistantMessage } from "./assistant";

// The reader tapped a single verse and wants to understand it. Unlike the chat
// assistants this is a one-shot: no history, a short focused explanation, with a
// cross-reference pulled in only when it genuinely helps.

const SYSTEM_INSTRUCTIONS = [
  "You are a warm, knowledgeable study companion inside a Latter-day Saint scripture study app.",
  "The reader has tapped a single verse and wants to understand it. Explain what it means clearly and accessibly, in your own words.",
  "Ground your explanation in the verse and its immediate context, both provided below. When a name, event, cross-reference, or teaching that clarifies the verse lives elsewhere in scripture, use the search_scriptures tool to find the real verses rather than relying on memory, and cite them (book chapter:verse).",
  "For the meaning of a term, a person, or background — use the search_study_helps tool (Bible Dictionary, Topical Guide, Index, Joseph Smith Translation) and cite the entry with its work, e.g. Bible Dictionary, \"Faith\".",
  "Never invent quotations, references, or doctrine. If a search turns up nothing relevant, simply explain from the verse itself.",
  "Keep it short — two or three sentences to a short paragraph. Lead with the meaning, add one insight or cross-reference only if it genuinely helps, and stop. Do not restate the whole verse or pad the answer.",
  "Be respectful of differing beliefs. You are a study aid, not an official or authoritative source of Church doctrine.",
].join(" ");

/** Build the message list to explain one verse: system instructions + a window
 *  of surrounding verses as context + the target verse to explain. */
export function buildExplainMessages(opts: {
  bookTitle: string;
  chapterNumber: number;
  verseNumber: number;
  verseText: string;
  context: { n: number; text: string }[];
}): AssistantMessage[] {
  const reference = `${opts.bookTitle} ${opts.chapterNumber}:${opts.verseNumber}`;
  const contextBlock = opts.context.map((v) => `${v.n}. ${v.text}`).join("\n");

  const system =
    `${SYSTEM_INSTRUCTIONS}\n\n` +
    `Surrounding context — ${opts.bookTitle} ${opts.chapterNumber} (King James Version):\n` +
    contextBlock;

  const user =
    `Explain ${reference}:\n"${opts.verseText}"\n\n` +
    "What does this verse mean? Keep it brief.";

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
