"use server";

import { findReferences } from "@/lib/scripture/client";
import {
  getBookIndexById,
  getBookIndexByTitle,
} from "@/lib/scripture/reference-index";
import { RESTORATION_BOOKS } from "@/lib/scripture/restoration-refs";

type Span = { start: number; end: number; url: string };

/** A scripture reference found in assistant text, resolved to a reader URL. */
export type ScriptureReference = { label: string; url: string };

const MAX_INPUT = 20000;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Find scripture references in assistant text and resolve each to a reader
 *  target (e.g. "John 3:16" -> "/read/newtestament/john/3#v16"), returning the
 *  spans in document order.
 *
 *  Two classes of reference are matched directly, then masked (same length) so
 *  the Open Scripture finder doesn't re-parse them: numbered books (1 Nephi,
 *  2 Corinthians, …) — which the finder mis-merges when they follow a comma,
 *  e.g. "Psalm 23:1, 2 Nephi 2:25" — and Restoration scriptures (D&C, Joseph
 *  Smith—History, …) it mishandles. Everything else goes through the cached
 *  finder. */
async function collectReferenceSpans(text: string): Promise<Span[]> {
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

  return spans;
}

/** The scripture references cited in an assistant answer, in order of first
 *  appearance and de-duplicated by reader target — used to list the sources
 *  beneath the answer rather than highlighting them inline. Returns an empty
 *  list on any failure. */
export async function extractScriptureReferences(
  text: string,
): Promise<ScriptureReference[]> {
  if (!text || text.length > MAX_INPUT) return [];

  try {
    const spans = await collectReferenceSpans(text);
    spans.sort((a, b) => a.start - b.start);

    const out: ScriptureReference[] = [];
    const seen = new Set<string>();
    let cursor = 0;
    for (const s of spans) {
      if (s.start < cursor || s.end <= s.start) continue; // overlapping / invalid
      cursor = s.end;
      if (seen.has(s.url)) continue;
      seen.add(s.url);
      out.push({ label: text.slice(s.start, s.end), url: s.url });
    }
    return out;
  } catch {
    return [];
  }
}
