import "server-only";

import { findReferences, getVerse } from "./client";
import { getBookIndexById } from "./reference-index";
import { matchRestorationReference } from "./restoration-refs";

export interface ReferenceJump {
  /** What the user asked for, normalized, e.g. "2 Corinthians 8:12". */
  label: string;
  /** Reader deep link, e.g. "/read/newtestament/2corinthians/8#v12". */
  url: string;
  /** Preview text of the verse (chapter verse 1 when only a chapter was given). */
  text: string;
}

/** If the whole query is a single scripture reference (e.g. "2 Corinthians
 *  8:12", "Mosiah 2", "D&C 88:73"), resolve it to a reader deep link plus a
 *  verse preview so search can jump straight there. Returns null when the query
 *  isn't a reference, only partly matches, or names a verse that doesn't exist —
 *  callers fall back to a normal full-text search in those cases. */
export async function resolveReferenceQuery(
  query: string,
): Promise<ReferenceJump | null> {
  const text = query.trim();
  if (!text) return null;

  let book: string;
  let chapter: number;
  let verse: number;
  let volume: string;
  let label: string;

  const restoration = matchRestorationReference(text);
  if (restoration) {
    book = restoration.book;
    chapter = restoration.chapter;
    verse = restoration.verse;
    volume = restoration.volume;
    label = restoration.prettyString;
  } else {
    let res;
    try {
      res = await findReferences(text);
    } catch {
      return null;
    }

    // Require a single reference that spans the entire query — a partial match
    // (e.g. "faith in Christ Alma 32") is a phrase search, not a jump. This
    // also rejects the finder's mis-parses of full Restoration names, which
    // start partway through the string.
    const match = res.references.find(
      (f) =>
        f.start === 0 &&
        f.end === text.length &&
        f.reference?.some((t) => t.type === "scripture" && t.book),
    );
    if (!match) return null;

    const target = match.reference.find(
      (t) => t.type === "scripture" && t.book,
    )!;
    const ch = target.chapters?.[0];
    if (!ch) return null;

    const bookInfo = (await getBookIndexById()).get(target.book);
    if (!bookInfo) return null;

    book = target.book;
    chapter = ch.start;
    const hasVerse = (ch.verses?.length ?? 0) > 0;
    verse = ch.verses?.[0]?.start ?? 1;
    volume = bookInfo.volumeId;
    label = `${bookInfo.bookTitle} ${chapter}${hasVerse ? `:${verse}` : ""}`;
  }

  // Confirm the verse actually exists; this both validates the reference and
  // gives us text for the preview. Out-of-range references (typos) 404 here and
  // fall through to a normal search.
  let v;
  try {
    v = await getVerse(book, chapter, verse);
  } catch {
    return null;
  }

  return {
    label,
    url: `/read/${volume}/${book}/${chapter}#v${verse}`,
    text: v.text,
  };
}
