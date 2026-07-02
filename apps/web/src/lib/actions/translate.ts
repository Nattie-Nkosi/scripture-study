"use server";

import { headers } from "next/headers";

import { getSimpleEnglishChapter, type SimpleVerse } from "@/lib/ai/simple-english";
import { TRANSLATE_RULES, checkLimits, clientIp } from "@/lib/rate-limit";

export type TranslateResult =
  | { ok: true; verses: SimpleVerse[] }
  | { ok: false; error: string };

export async function translateChapterAction(
  volume: string,
  book: string,
  chapter: number,
): Promise<TranslateResult> {
  const verdict = await checkLimits(clientIp(await headers()), TRANSLATE_RULES);
  if (!verdict.ok) {
    return {
      ok: false,
      error:
        "You’ve requested a lot of Simple English translations in a short time. Please wait a moment and try again.",
    };
  }

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
