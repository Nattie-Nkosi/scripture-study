import "server-only";
import { getSql } from "./client";
import type { ChatMessage } from "./chat";

// Summary shape for a saved Ask chat. Defined here so the package has no
// dependency on the web app; the web app's own copy in lib/ask/saved-chats.ts
// is structurally identical, so values flow between them without conversion.
export interface AskConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

function deriveTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === "user" && m.content.trim());
  const text = first?.content.trim().replace(/\s+/g, " ") ?? "";
  if (!text) return "New chat";
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

// Drop every chat with no activity in the retention window, across all devices.
// `updated_at` is bumped on each saved turn, so an actively-used chat survives.
// Run on each list so the table stays small without a scheduled job; deletes
// cascade to ask_messages.
async function pruneExpired(sql: NonNullable<ReturnType<typeof getSql>>) {
  try {
    await sql`
      delete from ask_conversations
      where updated_at < now() - interval '7 days'
    `;
  } catch (err) {
    console.error("[ask-conv] prune error:", (err as Error).message);
  }
}

/** List a device's saved chats, newest activity first. Prunes expired chats as
 *  a side effect. Returns [] without a database. */
export async function listAskConversations(
  deviceId: string,
): Promise<AskConversationSummary[]> {
  const sql = getSql();
  if (!sql || !deviceId) return [];

  try {
    await pruneExpired(sql);
    const rows = (await sql`
      select id, title, created_at, updated_at
      from ask_conversations
      where device_id = ${deviceId}
      order by updated_at desc
      limit 100
    `) as {
      id: string;
      title: string;
      created_at: string;
      updated_at: string;
    }[];
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    }));
  } catch (err) {
    console.error("[ask-conv] list error:", (err as Error).message);
    return [];
  }
}

/** Load a saved chat's messages, verifying it belongs to the device. Returns
 *  null when missing, expired, or there's no database. */
export async function loadAskConversation(
  deviceId: string,
  id: string,
): Promise<ChatMessage[] | null> {
  const sql = getSql();
  if (!sql || !deviceId || !id) return null;

  try {
    const owner = (await sql`
      select 1 from ask_conversations
      where id = ${id} and device_id = ${deviceId}
      limit 1
    `) as unknown[];
    if (owner.length === 0) return null;

    const rows = (await sql`
      select role, content
      from ask_messages
      where conversation_id = ${id}
      order by created_at asc, id asc
      limit 500
    `) as { role: ChatMessage["role"]; content: string }[];
    return rows.map((r) => ({ role: r.role, content: r.content }));
  } catch (err) {
    console.error("[ask-conv] load error:", (err as Error).message);
    return null;
  }
}

/** Create (when `id` is null/unknown) or overwrite a saved chat with the given
 *  messages. Replacing all messages keeps regenerate/retry in sync. The title
 *  is only set on creation, so a manual rename is preserved. Returns the chat's
 *  id and current title, or null without a database. */
export async function saveAskConversation(
  deviceId: string,
  id: string | null,
  messages: ChatMessage[],
): Promise<{ id: string; title: string } | null> {
  const sql = getSql();
  if (!sql || !deviceId) return null;

  const clean = messages.filter((m) => m.content.trim());
  if (clean.length === 0) return null;

  try {
    let convId = id;
    let title = deriveTitle(clean);

    if (convId) {
      const updated = (await sql`
        update ask_conversations set updated_at = now()
        where id = ${convId} and device_id = ${deviceId}
        returning title
      `) as { title: string }[];
      if (updated.length === 0) {
        convId = null; // Vanished (e.g. expired) — fall through to recreate.
      } else {
        title = updated[0].title;
      }
    }

    if (!convId) {
      const inserted = (await sql`
        insert into ask_conversations (device_id, title)
        values (${deviceId}, ${title})
        returning id
      `) as { id: string }[];
      convId = inserted[0].id;
    }

    const queries = [
      sql`delete from ask_messages where conversation_id = ${convId}`,
      ...clean.map(
        (m) => sql`
          insert into ask_messages (conversation_id, role, content)
          values (${convId}, ${m.role}, ${m.content})
        `,
      ),
    ];
    await sql.transaction(queries);

    return { id: convId, title };
  } catch (err) {
    console.error("[ask-conv] save error:", (err as Error).message);
    return null;
  }
}

/** Rename a saved chat. Leaves activity order untouched. */
export async function renameAskConversation(
  deviceId: string,
  id: string,
  title: string,
): Promise<boolean> {
  const sql = getSql();
  if (!sql || !deviceId || !id) return false;

  const clean = title.trim().replace(/\s+/g, " ").slice(0, 120) || "Untitled chat";
  try {
    const res = (await sql`
      update ask_conversations set title = ${clean}
      where id = ${id} and device_id = ${deviceId}
      returning id
    `) as unknown[];
    return res.length > 0;
  } catch (err) {
    console.error("[ask-conv] rename error:", (err as Error).message);
    return false;
  }
}

/** Delete a saved chat (messages cascade). */
export async function deleteAskConversation(
  deviceId: string,
  id: string,
): Promise<boolean> {
  const sql = getSql();
  if (!sql || !deviceId || !id) return false;

  try {
    const res = (await sql`
      delete from ask_conversations
      where id = ${id} and device_id = ${deviceId}
      returning id
    `) as unknown[];
    return res.length > 0;
  } catch (err) {
    console.error("[ask-conv] delete error:", (err as Error).message);
    return false;
  }
}
