import "server-only";
import { getSql, isDatabaseConfigured } from "@gospel/db";

// Admin-only reads/writes over the shared Neon database. Unlike the web app's
// queries these are NOT scoped to a device — the administrator sees everything.
// All functions degrade gracefully (return zeros/empties) when DATABASE_URL is
// unset, so pages still render instead of crashing.

export { isDatabaseConfigured };

async function scalar(query: PromiseLike<unknown>): Promise<number> {
  try {
    const rows = (await query) as Record<string, unknown>[];
    const first = rows[0];
    const value = first ? Object.values(first)[0] : 0;
    return Number(value ?? 0);
  } catch {
    return 0;
  }
}

export interface Overview {
  configured: boolean;
  conversations: number;
  conversationDevices: number;
  askMessages: number;
  chatMessages: number;
  chatDevices: number;
  talkMessages: number;
  embeddings: number;
  embeddingVolumes: number;
  translations: number;
  translatedChapters: number;
  hnswIndex: boolean;
}

export async function getOverview(): Promise<Overview> {
  const sql = getSql();
  if (!sql) {
    return {
      configured: false,
      conversations: 0,
      conversationDevices: 0,
      askMessages: 0,
      chatMessages: 0,
      chatDevices: 0,
      talkMessages: 0,
      embeddings: 0,
      embeddingVolumes: 0,
      translations: 0,
      translatedChapters: 0,
      hnswIndex: false,
    };
  }

  const [
    conversations,
    conversationDevices,
    askMessages,
    chatMessages,
    chatDevices,
    talkMessages,
    embeddings,
    embeddingVolumes,
    translations,
    translatedChapters,
    hnsw,
  ] = await Promise.all([
    scalar(sql`select count(*)::int from ask_conversations`),
    scalar(sql`select count(distinct device_id)::int from ask_conversations`),
    scalar(sql`select count(*)::int from ask_messages`),
    scalar(sql`select count(*)::int from chat_messages`),
    scalar(sql`select count(distinct device_id)::int from chat_messages`),
    scalar(sql`select count(*)::int from talk_chat_messages`),
    scalar(sql`select count(*)::int from scripture_embeddings`),
    scalar(sql`select count(distinct volume)::int from scripture_embeddings`),
    scalar(sql`select count(*)::int from ai_translations`),
    scalar(
      sql`select count(*)::int from (select 1 from ai_translations group by volume, book, chapter) t`,
    ),
    scalar(
      sql`select count(*)::int from pg_indexes where indexname = 'scripture_embeddings_hnsw'`,
    ),
  ]);

  return {
    configured: true,
    conversations,
    conversationDevices,
    askMessages,
    chatMessages,
    chatDevices,
    talkMessages,
    embeddings,
    embeddingVolumes,
    translations,
    translatedChapters,
    hnswIndex: hnsw > 0,
  };
}

export interface ConversationRow {
  id: string;
  deviceId: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export async function listConversations(opts: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rows: ConversationRow[]; total: number }> {
  const sql = getSql();
  if (!sql) return { rows: [], total: 0 };

  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const pattern = opts.search?.trim() ? `%${opts.search.trim()}%` : null;

  try {
    const rows = (await sql`
      select c.id, c.device_id, c.title, c.created_at, c.updated_at,
             count(m.id)::int as message_count
      from ask_conversations c
      left join ask_messages m on m.conversation_id = c.id
      where (${pattern}::text is null or c.title ilike ${pattern})
      group by c.id
      order by c.updated_at desc
      limit ${limit} offset ${offset}
    `) as {
      id: string;
      device_id: string;
      title: string;
      created_at: string;
      updated_at: string;
      message_count: number;
    }[];

    const total = await scalar(
      sql`select count(*)::int from ask_conversations c
          where (${pattern}::text is null or c.title ilike ${pattern})`,
    );

    return {
      rows: rows.map((r) => ({
        id: r.id,
        deviceId: r.device_id,
        title: r.title,
        messageCount: r.message_count,
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      })),
      total,
    };
  } catch {
    return { rows: [], total: 0 };
  }
}

export interface ConversationDetail {
  id: string;
  deviceId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: { role: string; content: string; createdAt: string }[];
}

export async function loadConversation(
  id: string,
): Promise<ConversationDetail | null> {
  const sql = getSql();
  if (!sql || !id) return null;

  try {
    const head = (await sql`
      select id, device_id, title, created_at, updated_at
      from ask_conversations where id = ${id} limit 1
    `) as {
      id: string;
      device_id: string;
      title: string;
      created_at: string;
      updated_at: string;
    }[];
    if (head.length === 0) return null;

    const messages = (await sql`
      select role, content, created_at
      from ask_messages where conversation_id = ${id}
      order by created_at asc, id asc limit 1000
    `) as { role: string; content: string; created_at: string }[];

    const h = head[0];
    return {
      id: h.id,
      deviceId: h.device_id,
      title: h.title,
      createdAt: new Date(h.created_at).toISOString(),
      updatedAt: new Date(h.updated_at).toISOString(),
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: new Date(m.created_at).toISOString(),
      })),
    };
  } catch {
    return null;
  }
}

export async function deleteConversation(id: string): Promise<boolean> {
  const sql = getSql();
  if (!sql || !id) return false;
  try {
    const res = (await sql`
      delete from ask_conversations where id = ${id} returning id
    `) as unknown[];
    return res.length > 0;
  } catch {
    return false;
  }
}

export interface CorpusVolume {
  volume: string;
  verses: number;
  chapters: number;
}

export async function getCorpusStatus(): Promise<{
  volumes: CorpusVolume[];
  total: number;
  hnswIndex: boolean;
}> {
  const sql = getSql();
  if (!sql) return { volumes: [], total: 0, hnswIndex: false };

  try {
    const rows = (await sql`
      select volume,
             count(*)::int as verses,
             count(distinct (book || ':' || chapter))::int as chapters
      from scripture_embeddings
      group by volume
      order by volume
    `) as { volume: string; verses: number; chapters: number }[];

    const total = rows.reduce((n, r) => n + r.verses, 0);
    const hnsw = await scalar(
      sql`select count(*)::int from pg_indexes where indexname = 'scripture_embeddings_hnsw'`,
    );

    return {
      volumes: rows.map((r) => ({
        volume: r.volume,
        verses: r.verses,
        chapters: r.chapters,
      })),
      total,
      hnswIndex: hnsw > 0,
    };
  } catch {
    return { volumes: [], total: 0, hnswIndex: false };
  }
}

export interface TranslationRow {
  volume: string;
  book: string;
  chapter: number;
  verses: number;
  model: string | null;
  updatedAt: string;
}

export async function listTranslations(): Promise<TranslationRow[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    const rows = (await sql`
      select volume, book, chapter,
             count(*)::int as verses,
             max(model) as model,
             max(updated_at) as updated_at
      from ai_translations
      group by volume, book, chapter
      order by max(updated_at) desc
      limit 200
    `) as {
      volume: string;
      book: string;
      chapter: number;
      verses: number;
      model: string | null;
      updated_at: string;
    }[];
    return rows.map((r) => ({
      volume: r.volume,
      book: r.book,
      chapter: r.chapter,
      verses: r.verses,
      model: r.model,
      updatedAt: new Date(r.updated_at).toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function deleteTranslationChapter(
  volume: string,
  book: string,
  chapter: number,
): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  try {
    const res = (await sql`
      delete from ai_translations
      where volume = ${volume} and book = ${book} and chapter = ${chapter}
      returning verse
    `) as unknown[];
    return res.length > 0;
  } catch {
    return false;
  }
}

const KNOWN_TABLES = [
  "ai_translations",
  "chat_messages",
  "verse_annotations",
  "talk_chat_messages",
  "scripture_embeddings",
  "ask_conversations",
  "ask_messages",
] as const;

export interface TableHealth {
  table: string;
  present: boolean;
  rows: number;
}

export async function getDbHealth(): Promise<{
  configured: boolean;
  tables: TableHealth[];
}> {
  const sql = getSql();
  if (!sql) {
    return {
      configured: false,
      tables: KNOWN_TABLES.map((t) => ({ table: t, present: false, rows: 0 })),
    };
  }

  const tables = await Promise.all(
    KNOWN_TABLES.map(async (table): Promise<TableHealth> => {
      try {
        // Identifier comes from a fixed constant list, never user input.
        const rows = (await sql.query(
          `select count(*)::int as n from ${table}`,
        )) as { n: number }[];
        return { table, present: true, rows: Number(rows[0]?.n ?? 0) };
      } catch {
        return { table, present: false, rows: 0 };
      }
    }),
  );

  return { configured: true, tables };
}
