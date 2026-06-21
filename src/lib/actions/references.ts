"use server";

import { findReferences } from "@/lib/scripture/client";
import { getBookIndexById } from "@/lib/scripture/reference-index";
import { RESTORATION_BOOKS } from "@/lib/scripture/restoration-refs";

type Span = { start: number; end: number; url: string };

const MAX_INPUT = 20000;

/** Turn scripture references in assistant text into markdown links to the
 *  reader (e.g. "John 3:16" -> "[John 3:16](/read/newtestament/john/3#v16)").
 *  Restoration scriptures (D&C, Joseph Smith—History, etc.) are matched directly
 *  because the finder mis-parses them; everything else goes through the cached
 *  referencesFinder. Returns the text unchanged on any failure. */
export async function linkifyScriptureReferences(text: string): Promise<string> {
  if (!text || text.length > MAX_INPUT) return text;

  try {
    const spans: Span[] = [];
    // Mask Restoration references (same length) so the finder doesn't re-parse
    // them, while keeping every other reference's offsets aligned to `text`.
    let masked = text;

    for (const book of RESTORATION_BOOKS) {
      book.re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = book.re.exec(text)) !== null) {
        const chapter = Number(m[1]);
        const verse = m[2] ? Number(m[2]) : null;
        spans.push({
          start: m.index,
          end: m.index + m[0].length,
          url: `/read/${book.volumeId}/${book.id}/${chapter}${verse ? `#v${verse}` : ""}`,
        });
        masked =
          masked.slice(0, m.index) +
          " ".repeat(m[0].length) +
          masked.slice(m.index + m[0].length);
      }
    }

    const [res, bookIndex] = await Promise.all([
      findReferences(masked),
      getBookIndexById(),
    ]);

    for (const f of res.references) {
      const target = f.reference?.find((t) => t.type === "scripture" && t.book);
      if (!target) continue;
      const ch = target.chapters?.[0];
      if (!ch) continue;
      const info = bookIndex.get(target.book);
      if (!info) continue;
      const verse = ch.verses?.[0]?.start;
      spans.push({
        start: f.start,
        end: f.end,
        url: `/read/${info.volumeId}/${target.book}/${ch.start}${verse ? `#v${verse}` : ""}`,
      });
    }

    if (spans.length === 0) return text;

    spans.sort((a, b) => a.start - b.start);

    let out = "";
    let cursor = 0;
    for (const s of spans) {
      if (s.start < cursor || s.end <= s.start) continue; // overlapping / invalid
      // Already the visible text of a markdown link — don't nest one inside it.
      if (text.slice(s.end, s.end + 2) === "](") continue;
      out += text.slice(cursor, s.start);
      out += `[${text.slice(s.start, s.end)}](${s.url})`;
      cursor = s.end;
    }
    out += text.slice(cursor);
    return out;
  } catch {
    return text;
  }
}
