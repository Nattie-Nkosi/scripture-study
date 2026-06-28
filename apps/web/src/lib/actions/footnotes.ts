"use server";

import { findReferences, getVerse } from "@/lib/scripture/client";
import { getBookIndexById } from "@/lib/scripture/reference-index";
import { RESTORATION_BOOKS } from "@/lib/scripture/restoration-refs";
import type { ParsedReference } from "@/lib/scripture/types";

/** Pull out the Restoration-scripture references and blank their spans so the
 *  finder doesn't mis-parse the same text. Offsets are preserved (same-length
 *  replacement) so results can be ordered by position. */
function extractRestorationRefs(text: string): {
  refs: { start: number; ref: ParsedReference }[];
  masked: string;
} {
  const refs: { start: number; ref: ParsedReference }[] = [];
  let masked = text;

  for (const book of RESTORATION_BOOKS) {
    book.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = book.re.exec(text)) !== null) {
      const chapter = Number(m[1]);
      const verse = m[2] ? Number(m[2]) : 1;
      refs.push({
        start: m.index,
        ref: {
          prettyString: `${book.title} ${chapter}${m[2] ? `:${verse}` : ""}`,
          book: book.id,
          chapter,
          verse,
          volume: book.volumeId,
        },
      });
      masked =
        masked.slice(0, m.index) +
        " ".repeat(m[0].length) +
        masked.slice(m.index + m[0].length);
    }
  }

  return { refs, masked };
}

/** Parse a raw footnote string into its structured scripture cross references.
 *  Restoration scriptures are resolved directly (the finder mishandles them);
 *  the rest go through the cached referencesFinder. Study-help text (e.g.
 *  "TG Hope") is not a scripture reference and is excluded. Returns [] on
 *  failure (graceful). */
export async function parseFootnoteReferences(
  text: string,
): Promise<ParsedReference[]> {
  try {
    const { refs: restorationRefs, masked } = extractRestorationRefs(text);
    const [res, bookIndex] = await Promise.all([
      findReferences(masked),
      getBookIndexById(),
    ]);

    const found: { start: number; ref: ParsedReference }[] = [...restorationRefs];
    for (const f of res.references) {
      const target = f.reference?.find((t) => t.type === "scripture" && t.book);
      if (!target) continue;
      const ch = target.chapters?.[0];
      if (!ch) continue;
      const verse = ch.verses?.[0]?.start ?? 1;
      found.push({
        start: f.start,
        ref: {
          prettyString: f.prettyString,
          book: target.book,
          chapter: ch.start,
          verse,
          volume: bookIndex.get(target.book)?.volumeId ?? "",
        },
      });
    }

    found.sort((a, b) => a.start - b.start);

    const seen = new Set<string>();
    const out: ParsedReference[] = [];
    for (const { ref } of found) {
      const key = `${ref.book}-${ref.chapter}-${ref.verse}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(ref);
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
