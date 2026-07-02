import "server-only";
import { getSql } from "./client";

/** Read a cached chapter summary. Returns null when the database isn't
 *  configured or nothing is stored yet. Keyed by book/chapter. */
export async function getCachedSummary(
  book: string,
  chapter: number,
): Promise<string | null> {
  const sql = getSql();
  if (!sql) return null;

  try {
    const rows = (await sql`
      select summary_text
      from chapter_summaries
      where book = ${book} and chapter = ${chapter}
      limit 1
    `) as { summary_text: string }[];

    return rows.length > 0 ? rows[0].summary_text : null;
  } catch (err) {
    console.error("[summaries] read error:", (err as Error).message);
    return null;
  }
}

/** Upsert a chapter's summary. Best-effort: silently no-ops when the database
 *  isn't configured or the summary is empty; logs and swallows write errors. */
export async function saveSummary(
  book: string,
  chapter: number,
  model: string,
  summary: string,
): Promise<void> {
  const sql = getSql();
  if (!sql || !summary.trim()) return;

  try {
    await sql`
      insert into chapter_summaries (book, chapter, summary_text, model)
      values (${book}, ${chapter}, ${summary}, ${model})
      on conflict (book, chapter)
      do update set summary_text = excluded.summary_text, model = excluded.model, updated_at = now()
    `;
  } catch (err) {
    console.error("[summaries] write error:", (err as Error).message);
  }
}
