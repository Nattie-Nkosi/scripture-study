// Input bounds for the assistant routes. The endpoints are unauthenticated and
// forward user text into a paid LLM, so cap what a single request can carry to
// keep token cost (and abuse surface) bounded.

export const MAX_QUESTION_CHARS = 2000;
export const MAX_HISTORY_TURNS = 12;
export const MAX_HISTORY_CHARS = 8000;

export type ChatTurn = { role: "user" | "assistant"; content: string };

export function normalizeQuestion(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

export function questionTooLong(question: string): boolean {
  return question.length > MAX_QUESTION_CHARS;
}

/** Keep only well-formed turns, cap each turn's length, and keep the most recent
 *  ones — so a caller can't inflate the prompt with a huge or malformed history. */
export function clampHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  const turns: ChatTurn[] = [];
  for (const item of raw) {
    const role = (item as ChatTurn)?.role;
    const content = (item as ChatTurn)?.content;
    if ((role === "user" || role === "assistant") && typeof content === "string") {
      turns.push({ role, content: content.slice(0, MAX_HISTORY_CHARS) });
    }
  }
  return turns.slice(-MAX_HISTORY_TURNS);
}
