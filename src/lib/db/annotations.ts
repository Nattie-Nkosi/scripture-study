import "server-only";
import { getSql } from "./client";

export interface VerseAnnotation {
  verse: number;
  color: string | null;
  note: string | null;
}

export async function getAnnotations(
  deviceId: string,
  volume: string,
  book: string,
  chapter: number,
): Promise<VerseAnnotation[]> {
  const sql = getSql();
  if (!sql || !deviceId) return [];

  try {
    const rows = (await sql`
      select verse, color, note
      from verse_annotations
      where device_id = ${deviceId}
        and volume = ${volume} and book = ${book} and chapter = ${chapter}
      order by verse asc
    `) as { verse: number; color: string | null; note: string | null }[];
    return rows;
  } catch (err) {
    console.error("[annotations] read error:", (err as Error).message);
    return [];
  }
}

/** Upsert a verse's highlight/note. When both are empty, the row is deleted. */
export async function upsertAnnotation(
  deviceId: string,
  volume: string,
  book: string,
  chapter: number,
  verse: number,
  color: string | null,
  note: string | null,
): Promise<void> {
  const sql = getSql();
  if (!sql || !deviceId) return;

  const cleanColor = color || null;
  const cleanNote = note && note.trim() ? note.trim() : null;

  try {
    if (cleanColor === null && cleanNote === null) {
      await sql`
        delete from verse_annotations
        where device_id = ${deviceId} and volume = ${volume}
          and book = ${book} and chapter = ${chapter} and verse = ${verse}
      `;
      return;
    }

    await sql`
      insert into verse_annotations (device_id, volume, book, chapter, verse, color, note)
      values (${deviceId}, ${volume}, ${book}, ${chapter}, ${verse}, ${cleanColor}, ${cleanNote})
      on conflict (device_id, volume, book, chapter, verse)
      do update set color = excluded.color, note = excluded.note, updated_at = now()
    `;
  } catch (err) {
    console.error("[annotations] write error:", (err as Error).message);
  }
}
