"use server";

import { findReferences, getVerse } from "@/lib/scripture/client";
import { getBookIndexById } from "@/lib/scripture/reference-index";
import type { ParsedReference } from "@/lib/scripture/types";

/** Restoration-scripture books the referencesFinder mis-parses when written out
 *  in full (e.g. it maps "Doctrine and Covenants 88:73" to "Colossians", and
 *  "Articles of Faith 1:13" to "1 Samuel"). Conference talks cite these by full
 *  name constantly, so we detect them ourselves and keep the finder for the
 *  Bible / Book of Mormon references it handles correctly. */
const RESTORATION_BOOKS: {
  id: string;
  volumeId: string;
  title: string;
  re: RegExp;
}[] = [
  {
    id: "doctrineandcovenants",
    volumeId: "doctrineandcovenants",
    title: "Doctrine and Covenants",
    re: /\b(?:Doctrine\s+and\s+Covenants|D\.?\s*&\s*C\.?)\s+(\d+)(?::(\d+))?/gi,
  },
  {
    id: "josephsmithhistory",
    volumeId: "pearlofgreatprice",
    title: "Joseph Smith—History",
    re: /\bJoseph\s+Smith\s*[—–-]\s*History\s+(\d+)(?::(\d+))?/gi,
  },
  {
    id: "josephsmithmatthew",
    volumeId: "pearlofgreatprice",
    title: "Joseph Smith—Matthew",
    re: /\bJoseph\s+Smith\s*[—–-]\s*Matthew\s+(\d+)(?::(\d+))?/gi,
  },
  {
    id: "articlesoffaith",
    volumeId: "pearlofgreatprice",
    title: "Articles of Faith",
    re: /\bArticles\s+of\s+Faith\s+(\d+)(?::(\d+))?/gi,
  },
];

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
