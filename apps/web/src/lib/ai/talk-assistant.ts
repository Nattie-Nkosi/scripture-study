import "server-only";
import type { AssistantMessage } from "./assistant";

const SYSTEM_INSTRUCTIONS = [
  "You are a study assistant inside an app for reading General Conference talks of The Church of Jesus Christ of Latter-day Saints.",
  "The reader is currently studying the talk provided below; treat it as the primary source for their question, and quote or paraphrase the speaker accurately.",
  "When the answer isn't in this talk, use your tools to look further in the app's library:",
  "search_talks to find what speakers have taught elsewhere, search_scriptures to look up a verse the talk cites or alludes to,",
  "and search_study_helps for a definition, background, or topical cross-references from the Bible Dictionary, Topical Guide, Index, and Joseph Smith Translation.",
  "Ground every answer in the provided talk and any results your tools return, and cite what you drew from — the talk and speaker, the scripture reference, or the study-help entry with its work (e.g. Bible Dictionary, \"Faith\").",
  "Do not invent quotations, references, or doctrine; if a search turns up nothing relevant, say so plainly.",
  "Be concise, clear, and respectful.",
  "You are a study aid, not an official or authoritative source of Church doctrine.",
].join(" ");

const MAX_HISTORY = 10;

/** Build the grounded message list: system instructions + the talk text as
 *  context + recent history + the new question. */
export function buildTalkGroundedMessages(opts: {
  title: string;
  speaker: string;
  role: string | null;
  session: string;
  conferenceTitle: string;
  paragraphs: string[];
  history: { role: "user" | "assistant"; content: string }[];
  question: string;
}): AssistantMessage[] {
  const passage = opts.paragraphs.map((p, i) => `${i + 1}. ${p}`).join("\n");
  const byline = opts.role ? `${opts.speaker}, ${opts.role}` : opts.speaker;

  const system =
    `${SYSTEM_INSTRUCTIONS}\n\n` +
    `Talk — “${opts.title}” by ${byline} ` +
    `(${opts.conferenceTitle}, ${opts.session}):\n` +
    passage;

  const recent = opts.history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content }));

  return [
    { role: "system", content: system },
    ...recent,
    { role: "user", content: opts.question },
  ];
}
