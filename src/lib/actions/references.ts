"use server";

import { findReferences } from "@/lib/scripture/client";
import {
  getBookIndexById,
  getBookIndexByTitle,
} from "@/lib/scripture/reference-index";
import { RESTORATION_BOOKS } from "@/lib/scripture/restoration-refs";

type Span = { start: number; end: number; url: string };

const MAX_INPUT = 20000;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Turn scripture references in assistant text into markdown links to the
 *  reader (e.g. "John 3:16" -> "[John 3:16](/read/newtestament/john/3#v16)").
 *
 *  Two classes of reference are matched directly, then masked (same length) so
 *  the Open Scripture finder doesn't re-parse them: numbered books (1 Nephi,
 *  2 Corinthians, …) — which the finder mis-merges when they follow a comma,
 *  e.g. "Psalm 23:1, 2 Nephi 2:25" — and Restoration scriptures (D&C, Joseph
 *  Smith—History, …) it mishandles. Everything else goes through the cached
 *  finder. Returns the text unchanged on any failure. */
export async function linkifyScriptureReferences(text: string): Promise<string> {
  if (!text || text.length > MAX_INPUT) return text;

  try {
    const byTitle = await getBookIndexByTitle();
    const spans: Span[] = [];
    let masked = text;

    const maskOut = (start: number, len: number) => {
      masked =
        masked.slice(0, start) + " ".repeat(len) + masked.slice(start + len);
    };

    // 1. Numbered books, resolved through the app's own title index.
    const numberedTitles = [...byTitle.keys()]
      .filter((t) => /^\d/.test(t))
      .sort((a, b) => b.length - a.length);

    if (numberedTitles.length > 0) {
      const alt = numberedTitles
        .map((t) => t.split(/\s+/).map(escapeRegExp).join("\\s+"))
        .join("|");
      const re = new RegExp(
        `\\b(${alt})\\s+(\\d+)(?::(\\d+))?(?:\\s*[\\u2013\\u2014-]\\s*\\d+)?`,
        "gi",
      );
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const ref = byTitle.get(m[1].toLowerCase().replace(/\s+/g, " "));
        if (!ref) continue;
        const chapter = Number(m[2]);
        const verse = m[3] ? Number(m[3]) : null;
        spans.push({
          start: m.index,
          end: m.index + m[0].length,
          url: `/read/${ref.volumeId}/${ref.bookId}/${chapter}${verse ? `#v${verse}` : ""}`,
        });
        maskOut(m.index, m[0].length);
      }
    }

    // 2. Restoration scriptures (D&C, Joseph Smith—History, etc.).
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
        maskOut(m.index, m[0].length);
      }
    }

    // 3. Everything else via the cached finder, on the masked text.
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
