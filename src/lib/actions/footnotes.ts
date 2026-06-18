"use server";

import { findReferences, getVerse } from "@/lib/scripture/client";
import { getBookIndexById } from "@/lib/scripture/reference-index";
import type { ParsedReference } from "@/lib/scripture/types";

/** Parse a raw footnote string into its structured scripture cross references.
 *  Uses the cached referencesFinder; study-help text (e.g. "TG Hope") is not a
 *  scripture reference and is excluded. Returns [] on failure (graceful). */
export async function parseFootnoteReferences(
  text: string,
): Promise<ParsedReference[]> {
  try {
    const [res, bookIndex] = await Promise.all([
      findReferences(text),
      getBookIndexById(),
    ]);
    const out: ParsedReference[] = [];
    for (const found of res.references) {
      const target = found.reference?.find(
        (t) => t.type === "scripture" && t.book,
      );
      if (!target) continue;
      const ch = target.chapters?.[0];
      if (!ch) continue;
      const verse = ch.verses?.[0]?.start ?? 1;
      out.push({
        prettyString: found.prettyString,
        book: target.book,
        chapter: ch.start,
        verse,
        volume: bookIndex.get(target.book)?.volumeId ?? "",
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** Fetch a single verse's text for an inline cross-reference preview. Uses the
 *  cached single-verse endpoint so the same reference isn't refetched. */
export async function previewVerse(
  book: string,
  chapter: number,
  verse: number,
): Promise<{ ok: true; reference: string; text: string } | { ok: false }> {
  try {
    const v = await getVerse(book, chapter, verse);
    return { ok: true, reference: v.reference, text: v.text };
  } catch {
    return { ok: false };
  }
}
