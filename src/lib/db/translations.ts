import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const TABLE = "ai_translations";

export interface CachedVerse {
  verse: number;
  text: string;
}

/** Read a cached Simple English chapter. Returns null when caching is
 *  unavailable or nothing is stored yet. Keyed by volume/book/chapter/verse. */
export async function getCachedChapter(
  volume: string,
  book: string,
  chapter: number,
): Promise<CachedVerse[] | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;

  const { data, error } = await sb
    .from(TABLE)
    .select("verse, simple_text")
    .eq("volume", volume)
    .eq("book", book)
    .eq("chapter", chapter)
    .order("verse", { ascending: true });

  if (error) {
    console.error("[translations] read error:", error.message);
    return null;
  }
  if (!data || data.length === 0) return null;

  return data.map((row) => ({
    verse: row.verse as number,
    text: row.simple_text as string,
  }));
}

/** Upsert a whole chapter's Simple English verses. Best-effort: silently
 *  no-ops when Supabase isn't configured, logs and swallows write errors. */
export async function saveChapterTranslation(
  volume: string,
  book: string,
  chapter: number,
  model: string,
  verses: CachedVerse[],
): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;

  const rows = verses.map((v) => ({
    volume,
    book,
    chapter,
    verse: v.verse,
    simple_text: v.text,
    model,
  }));

  const { error } = await sb
    .from(TABLE)
    .upsert(rows, { onConflict: "volume,book,chapter,verse" });

  if (error) console.error("[translations] write error:", error.message);
}
