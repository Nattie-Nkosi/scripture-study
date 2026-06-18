import "server-only";
import type { AssistantMessage } from "./assistant";

const SYSTEM_INSTRUCTIONS = [
  "You are a study assistant inside an app for reading General Conference talks of The Church of Jesus Christ of Latter-day Saints.",
  "Answer the reader's question using ONLY the talk provided below as your source.",
  "Ground every answer in that talk's text, and quote or paraphrase the speaker accurately.",
  "If the question cannot be answered from the talk, say clearly that it isn't covered in this talk",
  "rather than guessing or drawing on outside material.",
  "Do not invent quotations, references, or doctrine.",
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
