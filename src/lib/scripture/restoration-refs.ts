import type { ParsedReference } from "./types";

/** Restoration-scripture books the referencesFinder mis-parses when written out
 *  in full (e.g. it maps "Doctrine and Covenants 88:73" to "Colossians", and
 *  "Articles of Faith 1:13" to "1 Samuel"). We detect these ourselves and keep
 *  the finder for the Bible / Book of Mormon references it handles correctly.
 *  Each `re` is global so footnote text can be scanned for several matches. */
export const RESTORATION_BOOKS: {
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

/** Resolve a string that is ENTIRELY a single Restoration-scripture reference
 *  (e.g. "Doctrine and Covenants 88:73" or "D&C 88") to a structured reference.
 *  Returns null otherwise. Verse defaults to 1 when only a chapter is given. */
export function matchRestorationReference(text: string): ParsedReference | null {
  const trimmed = text.trim();
  for (const book of RESTORATION_BOOKS) {
    const m = new RegExp(`^${book.re.source}$`, "i").exec(trimmed);
    if (!m) continue;
    const chapter = Number(m[1]);
    const verse = m[2] ? Number(m[2]) : 1;
    return {
      prettyString: `${book.title} ${chapter}${m[2] ? `:${verse}` : ""}`,
      book: book.id,
      chapter,
      verse,
      volume: book.volumeId,
    };
  }
  return null;
}
