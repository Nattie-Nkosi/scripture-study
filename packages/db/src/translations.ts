import "server-only";
import { getSql } from "./client";

const COLS_PER_ROW = 6;

export interface CachedVerse {
  verse: number;
  text: string;
}

/** Read a cached Simple English chapter. Returns null when the database isn't
 *  configured or nothing is stored yet. Keyed by volume/book/chapter/verse. */
export async function getCachedChapter(
  volume: string,
  book: string,
  chapter: number,
): Promise<CachedVerse[] | null> {
  const sql = getSql();
  if (!sql) return null;

  try {
    const rows = (await sql`
      select verse, simple_text
      from ai_translations
      where volume = ${volume} and book = ${book} and chapter = ${chapter}
      order by verse asc
    `) as { verse: number; simple_text: string }[];

    if (rows.length === 0) return null;
    return rows.map((r) => ({ verse: r.verse, text: r.simple_text }));
  } catch (err) {
    console.error("[translations] read error:", (err as Error).message);
    return null;
  }
}

/** Upsert a whole chapter's Simple English verses. Best-effort: silently
 *  no-ops when the database isn't configured, logs and swallows write errors. */
export async function saveChapterTranslation(
  volume: string,
  book: string,
  chapter: number,
  model: string,
  verses: CachedVerse[],
): Promise<void> {
  const sql = getSql();
  if (!sql || verses.length === 0) return;

  const params: unknown[] = [];
  const tuples = verses.map((v, i) => {
    const o = i * COLS_PER_ROW;
    params.push(volume, book, chapter, v.verse, v.text, model);
    return `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6})`;
  });

  const text = `
    insert into ai_translations (volume, book, chapter, verse, simple_text, model)
    values ${tuples.join(", ")}
    on conflict (volume, book, chapter, verse)
    do update set simple_text = excluded.simple_text, model = excluded.model, updated_at = now()
  `;

  try {
    await sql.query(text, params);
  } catch (err) {
    console.error("[translations] write error:", (err as Error).message);
  }
}
