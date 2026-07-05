import "server-only";

import { findReferences, getBook } from "./client";
import { getBookIndexById, getBookIndexByTitle } from "./reference-index";
import { RESTORATION_BOOKS } from "./restoration-refs";

/** A scripture reference located within some text, resolved to a reader URL. */
export interface ReferenceSpan {
  start: number;
  end: number;
  url: string;
}

/** A run of text, optionally carrying a reader link when it is a reference. */
export interface TextSegment {
  text: string;
  url?: string;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The finder is a GET with the text in the query string, so passing a whole
 *  lesson body (or a very long answer) 414s. Keep each finder request's text
 *  under this many characters. */
const FINDER_CHUNK = 700;

/** Cover `text` with `[start, end)` ranges each at most ~FINDER_CHUNK long,
 *  breaking on blank lines first and sentence boundaries second so a scripture
 *  reference is never split across a range. Consecutive short paragraphs are
 *  packed together to keep the number of finder requests down. */
function chunkRanges(text: string): [number, number][] {
  const paras: [number, number][] = [];
  const re = /\n\s*\n/g;
  let idx = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    paras.push([idx, m.index]);
    idx = m.index + m[0].length;
  }
  paras.push([idx, text.length]);

  const ranges: [number, number][] = [];
  let curStart = -1;
  let curEnd = -1;
  const flush = () => {
    if (curStart >= 0) ranges.push([curStart, curEnd]);
    curStart = -1;
    curEnd = -1;
  };

  for (const [s, e] of paras) {
    if (e <= s) continue;
    if (e - s > FINDER_CHUNK) {
      flush();
      let pos = s;
      while (pos < e) {
        let end = Math.min(pos + FINDER_CHUNK, e);
        if (end < e) {
          const dot = text.slice(pos, end).lastIndexOf(". ");
          if (dot > FINDER_CHUNK * 0.4) end = pos + dot + 2;
        }
        ranges.push([pos, end]);
        pos = end;
      }
      continue;
    }
    if (curStart < 0) {
      curStart = s;
      curEnd = e;
    } else if (e - curStart <= FINDER_CHUNK) {
      curEnd = e;
    } else {
      flush();
      curStart = s;
      curEnd = e;
    }
  }
  flush();
  return ranges;
}

/** Find scripture references in free text and resolve each to a reader target
 *  (e.g. "John 3:16" -> "/read/newtestament/john/3#v16"), returning the spans
 *  in document order.
 *
 *  Two classes of reference are matched directly, then masked (same length) so
 *  the Open Scripture finder doesn't re-parse them: numbered books (1 Nephi,
 *  2 Corinthians, …) — which the finder mis-merges when they follow a comma,
 *  e.g. "Psalm 23:1, 2 Nephi 2:25" — and Restoration scriptures (D&C, Joseph
 *  Smith—History, …) it mishandles. Everything else goes through the cached
 *  finder. */
export async function collectReferenceSpans(
  text: string,
): Promise<ReferenceSpan[]> {
  const byTitle = await getBookIndexByTitle();
  const spans: ReferenceSpan[] = [];
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

  // 2b. Mask video-duration timestamps glued to a title (e.g. "1:48The Lord
  //     Speaks"), which the finder otherwise reads as a chapter:verse against a
  //     neighbouring word ("Holy Ghost. 1:48" -> Genesis 1:48). A real
  //     reference never runs a "d:dd" straight into a letter.
  {
    const re = /\d{1,3}:\d{1,3}(?=[A-Za-z])/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) maskOut(m.index, m[0].length);
  }

  // 3. Everything else via the cached finder. Run it over length-bounded chunks
  //    (the finder is a GET, so the whole body would exceed the URI limit) and
  //    offset each chunk's results back to positions in the full text. The
  //    finder trims its input, so account for any leading whitespace per chunk.
  const bookIndex = await getBookIndexById();
  const ranges = chunkRanges(masked);
  const results = await Promise.all(
    ranges.map(([s, e]) => findReferences(masked.slice(s, e))),
  );

  const candidates: (ReferenceSpan & { book: string; chapter: number })[] = [];
  results.forEach((res, i) => {
    const [rangeStart, rangeEnd] = ranges[i];
    const slice = masked.slice(rangeStart, rangeEnd);
    const base = rangeStart + (slice.length - slice.trimStart().length);
    for (const f of res.references) {
      const target = f.reference?.find((t) => t.type === "scripture" && t.book);
      if (!target) continue;
      const ch = target.chapters?.[0];
      if (!ch) continue;
      const info = bookIndex.get(target.book);
      if (!info) continue;
      const start = base + f.start;
      const end = base + f.end;
      // Real book references start with the book name; numbered books are
      // already handled above, so a finder hit that starts with a digit is a
      // page number, hymn number, or video timestamp (e.g. "no. 128", "1:48").
      if (/^\d/.test(text.slice(start, end).trimStart())) continue;
      const verse = ch.verses?.[0]?.start;
      candidates.push({
        start,
        end,
        book: target.book,
        chapter: ch.start,
        url: `/read/${info.volumeId}/${target.book}/${ch.start}${verse ? `#v${verse}` : ""}`,
      });
    }
  });

  // Validate each candidate chapter exists, dropping the finder's out-of-range
  // mis-parses (e.g. "Hymns, no. 128" -> Numbers 128). Books whose count can't
  // be fetched are left in rather than silently dropped.
  const chapterCounts = new Map<string, number>();
  await Promise.all(
    [...new Set(candidates.map((c) => c.book))].map(async (book) => {
      try {
        const detail = await getBook(book);
        chapterCounts.set(book, detail.chapters.length);
      } catch {
        // Leave unknown; candidate is kept.
      }
    }),
  );

  for (const c of candidates) {
    const count = chapterCounts.get(c.book);
    if (count != null && (c.chapter < 1 || c.chapter > count)) continue;
    spans.push({ start: c.start, end: c.end, url: c.url });
  }

  return spans;
}

/** Sort spans by position and drop any that overlap an earlier one, so they can
 *  be interleaved into text without collisions (first match wins). */
export function normalizeSpans(spans: ReferenceSpan[]): ReferenceSpan[] {
  const sorted = [...spans].sort(
    (a, b) => a.start - b.start || b.end - a.end,
  );
  const out: ReferenceSpan[] = [];
  let cursor = 0;
  for (const s of sorted) {
    if (s.start < cursor || s.end <= s.start) continue;
    out.push(s);
    cursor = s.end;
  }
  return out;
}

/** Split `text` into linked and unlinked segments using pre-sorted,
 *  non-overlapping spans (see `normalizeSpans`). */
export function toSegments(
  text: string,
  spans: ReferenceSpan[],
): TextSegment[] {
  if (spans.length === 0) return [{ text }];
  const out: TextSegment[] = [];
  let cursor = 0;
  for (const s of spans) {
    if (s.start > cursor) out.push({ text: text.slice(cursor, s.start) });
    out.push({ text: text.slice(s.start, s.end), url: s.url });
    cursor = s.end;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor) });
  return out;
}
