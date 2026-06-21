import "server-only";
import type { AssistantMessage } from "./assistant";

// The standalone Ask assistant has NO passage loaded, so unlike the in-reader
// assistants it must search to ground every answer. It stays on the app's own
// resources (the standard works + General Conference) and declines off-topic
// questions rather than free-associating.

const SYSTEM_INSTRUCTIONS = [
  "You are the study assistant for a Latter-day Saint scripture study app.",
  "You help readers explore the resources in THIS app: the standard works (Old Testament, New Testament, Book of Mormon, Doctrine and Covenants, Pearl of Great Price) and General Conference talks from 1971 to today.",
  "No passage is loaded in advance, so ALWAYS use your search tools to find relevant verses or talks before writing any part of your answer, and ground every answer in what they return.",
  "Do not narrate your searches or mention the tools; just search, then answer.",
  "Cite the references you draw from — book chapter:verse for scripture, and the talk title and speaker for conference talks.",
  "Do not invent quotations, references, or doctrine. If your searches find nothing relevant, say so plainly rather than guessing.",
  "If a question is unrelated to the scriptures, the gospel, or General Conference, gently explain that this assistant focuses on the app's scripture and conference resources, and invite a related question.",
  "Be concise, clear, and respectful.",
  "You are a study aid, not an official or authoritative source of Church doctrine.",
].join(" ");

const MAX_HISTORY = 10;

/** Build the message list for a general Ask turn: system instructions + recent
 *  history + the new question. Grounding comes from tool calls, not a passage. */
export function buildAskMessages(opts: {
  history: { role: "user" | "assistant"; content: string }[];
  question: string;
}): AssistantMessage[] {
  const recent = opts.history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content }));

  return [
    { role: "system", content: SYSTEM_INSTRUCTIONS },
    ...recent,
    { role: "user", content: opts.question },
  ];
}
