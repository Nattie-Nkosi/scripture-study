import "server-only";

export type AssistantMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const SYSTEM_INSTRUCTIONS = [
  "You are a study assistant inside a scripture study app.",
  "The reader is currently studying the passage provided below; treat it as the primary source for their question.",
  "When the answer isn't in that passage — a name, event, or teaching explained elsewhere in scripture, like who someone's father was —",
  "use the search_scriptures tool to find the relevant verses in the standard works instead of saying it isn't covered here.",
  "Ground every answer in the provided passage and any verses the search returns, and cite the book, chapter, and verse you drew from.",
  "Do not invent quotations, references, or doctrine; if a search turns up nothing relevant, say so plainly.",
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
