import "server-only";

export type AssistantMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const SYSTEM_INSTRUCTIONS = [
  "You are a study assistant inside a scripture study app.",
  "Answer the reader's question using ONLY the scripture passage provided below as your source.",
  "Ground every answer in that text, and refer to verse numbers when relevant.",
  "If the question cannot be answered from the passage, say clearly that it isn't covered in this chapter",
  "rather than guessing or drawing on outside material.",
  "Do not invent quotations, references, or doctrine.",
  "Be concise, clear, and respectful.",
  "You are a study aid, not an official or authoritative source of Church doctrine.",
].join(" ");

const MAX_HISTORY = 10;

/** Build the grounded message list: system instructions + the chapter text as
 *  context + recent history + the new question. */
export function buildGroundedMessages(opts: {
  bookTitle: string;
  chapterNumber: number;
  verses: { n: number; text: string }[];
  history: { role: "user" | "assistant"; content: string }[];
  question: string;
}): AssistantMessage[] {
  const passage = opts.verses.map((v) => `${v.n}. ${v.text}`).join("\n");

  const system =
    `${SYSTEM_INSTRUCTIONS}\n\n` +
    `Reference passage — ${opts.bookTitle} ${opts.chapterNumber} (King James Version):\n` +
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
