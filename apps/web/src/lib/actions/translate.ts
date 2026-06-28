"use server";

import { getSimpleEnglishChapter, type SimpleVerse } from "@/lib/ai/simple-english";

export type TranslateResult =
  | { ok: true; verses: SimpleVerse[] }
  | { ok: false; error: string };

export async function translateChapterAction(
  volume: string,
  book: string,
  chapter: number,
): Promise<TranslateResult> {
  try {
    const verses = await getSimpleEnglishChapter(volume, book, chapter);
    return { ok: true, verses };
  } catch (err) {
    console.error("[translateChapterAction] failed:", err);
    return {
      ok: false,
      error:
        "We couldn’t generate the Simple English version right now. Please try again.",
    };
  }
}
