import "server-only";
import { getSql } from "./client";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** Load a chapter's chat history for a device. Returns [] when the database
 *  isn't configured or there's nothing stored. */
export async function getChatHistory(
  deviceId: string,
  volume: string,
  book: string,
  chapter: number,
): Promise<ChatMessage[]> {
  const sql = getSql();
  if (!sql || !deviceId) return [];

  try {
    const rows = (await sql`
      select role, content
      from chat_messages
      where device_id = ${deviceId}
        and volume = ${volume} and book = ${book} and chapter = ${chapter}
      order by created_at asc, id asc
      limit 200
    `) as { role: ChatRole; content: string }[];
    return rows.map((r) => ({ role: r.role, content: r.content }));
  } catch (err) {
    console.error("[chat] history read error:", (err as Error).message);
    return [];
  }
}

/** Append a single chat message. Best-effort: no-ops without a database. */
export async function saveChatMessage(
  deviceId: string,
  volume: string,
  book: string,
  chapter: number,
  role: ChatRole,
  content: string,
): Promise<void> {
  const sql = getSql();
  if (!sql || !deviceId) return;

  try {
    await sql`
      insert into chat_messages (device_id, volume, book, chapter, role, content)
      values (${deviceId}, ${volume}, ${book}, ${chapter}, ${role}, ${content})
    `;
  } catch (err) {
    console.error("[chat] save error:", (err as Error).message);
  }
}
