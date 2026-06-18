import "server-only";
import { getSql } from "./client";
import type { ChatMessage, ChatRole } from "./chat";

/** Load a talk's chat history for a device. Returns [] when the database isn't
 *  configured or there's nothing stored. */
export async function getTalkChatHistory(
  deviceId: string,
  talkId: string,
): Promise<ChatMessage[]> {
  const sql = getSql();
  if (!sql || !deviceId) return [];

  try {
    const rows = (await sql`
      select role, content
      from talk_chat_messages
      where device_id = ${deviceId} and talk_id = ${talkId}
      order by created_at asc, id asc
      limit 200
    `) as { role: ChatRole; content: string }[];
    return rows.map((r) => ({ role: r.role, content: r.content }));
  } catch (err) {
    console.error("[talk-chat] history read error:", (err as Error).message);
    return [];
  }
}

/** Delete a talk's chat history for a device (used by "New chat"). */
export async function deleteTalkChatHistory(
  deviceId: string,
  talkId: string,
): Promise<void> {
  const sql = getSql();
  if (!sql || !deviceId) return;

  try {
    await sql`
      delete from talk_chat_messages
      where device_id = ${deviceId} and talk_id = ${talkId}
    `;
  } catch (err) {
    console.error("[talk-chat] delete error:", (err as Error).message);
  }
}

/** Append a single talk chat message. Best-effort: no-ops without a database. */
export async function saveTalkChatMessage(
  deviceId: string,
  talkId: string,
  role: ChatRole,
  content: string,
): Promise<void> {
  const sql = getSql();
  if (!sql || !deviceId) return;

  try {
    await sql`
      insert into talk_chat_messages (device_id, talk_id, role, content)
      values (${deviceId}, ${talkId}, ${role}, ${content})
    `;
  } catch (err) {
    console.error("[talk-chat] save error:", (err as Error).message);
  }
}
