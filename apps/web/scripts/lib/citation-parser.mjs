// Parse a General Conference footnote string into structured scripture
// references. Footnotes are clean citations — "3 Nephi 15:9.", "See Mosiah
// 5:2, 7.", "See Mosiah 27:24–26.", "See 2 Corinthians 5:17; Mosiah 27:26." —
// so a deterministic parser beats calling the external referencesFinder tens of
// thousands of times (and the finder mis-parses Restoration books anyway).
//
// Pure ESM, no I/O: createFootnoteParser(bookEntries) builds the lookup once and
// returns parse(text) -> [{ volume, book, chapter, verseStart, verseEnd }].
// verseStart/verseEnd are null for a whole-chapter citation.

/** Lowercase, fold every dash variant to "-", and collapse whitespace, so book
 *  names and footnote text compare the same way (e.g. "Joseph Smith—History"). */
export function normalizeName(s) {
  return String(s)
    .toLowerCase()
    .replace(/[‐-―−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Chapter ranges without a colon ("Mosiah 5–7") are rare in footnotes; cap how
// many whole chapters one expands to so a stray "1–150" can't blow up.
const CHAPTER_RANGE_CAP = 10;

/**
 * @param {{ name: string, volume: string, book: string }[]} bookEntries
 *   Every book name/alias mapped to its volume + book id.
 */
export function createFootnoteParser(bookEntries) {
  const table = new Map();
  for (const e of bookEntries) {
    const key = normalizeName(e.name);
    if (key && !table.has(key)) table.set(key, { volume: e.volume, book: e.book });
  }

  // Alternation of every known name, longest first so "1 nephi" wins over
  // "nephi" and "joseph smith-history" over any prefix.
  const names = [...table.keys()].sort((a, b) => b.length - a.length);
  const bookRe = new RegExp(`^(${names.map(escapeRegExp).join("|")})`, "i");

  /** A group is "<chapter:verselist>" after the book. Emits one segment per
   *  comma item, tracking the current chapter so "5:2, 7" reads as ch5 v2 + v7. */
  function parseNumbers(rest, resolved, out) {
    let chapter = null;
    let sawColon = false;
    for (let item of rest.split(",")) {
      item = item.trim().replace(/[.)\]\s]+$/, "");
      if (!item) continue;

      const colon = /^(\d+):(\d+)(?:-(\d+))?$/.exec(item);
      if (colon) {
        chapter = Number(colon[1]);
        sawColon = true;
        const vs = Number(colon[2]);
        const ve = colon[3] ? Number(colon[3]) : vs;
        push(out, resolved, chapter, vs, ve);
        continue;
      }
      const range = /^(\d+)-(\d+)$/.exec(item);
      if (range) {
        const a = Number(range[1]);
        const b = Number(range[2]);
        if (sawColon && chapter != null) {
          push(out, resolved, chapter, a, b); // verse range in current chapter
        } else {
          for (let c = a; c <= b && c - a < CHAPTER_RANGE_CAP; c++) {
            push(out, resolved, c, null, null); // whole-chapter range
          }
        }
        continue;
      }
      const bare = /^(\d+)$/.exec(item);
      if (bare) {
        const n = Number(bare[1]);
        if (sawColon && chapter != null) push(out, resolved, chapter, n, n);
        else push(out, resolved, n, null, null);
      }
    }
  }

  function parse(text) {
    const out = [];
    let s = normalizeName(text);
    // Drop leading connectives and any leading punctuation/quotes.
    s = s.replace(/^[\s"'“”‘’(]+/, "");
    s = s.replace(/^(see also|see|compare|cf\.?|e\.g\.,?)\s+/i, "");

    let lastResolved = null;
    for (const rawGroup of s.split(";")) {
      const group = rawGroup.trim().replace(/^(see also|see)\s+/i, "");
      if (!group) continue;

      const m = bookRe.exec(group);
      if (m) {
        const resolved = table.get(normalizeName(m[1]));
        if (!resolved) continue;
        lastResolved = resolved;
        parseNumbers(group.slice(m[0].length).trim(), resolved, out);
      } else if (lastResolved && /^\d[\d\s:,.-]*$/.test(group)) {
        // A trailing "; 7:14" reuses the previous group's book. Only when the
        // group is purely numeric so "2 Nephi 2:25" is never misread this way.
        parseNumbers(group, lastResolved, out);
      }
    }

    return dedupe(out);
  }

  return parse;
}

function push(out, resolved, chapter, verseStart, verseEnd) {
  if (!Number.isInteger(chapter) || chapter < 1) return;
  out.push({
    volume: resolved.volume,
    book: resolved.book,
    chapter,
    verseStart: verseStart ?? null,
    verseEnd: verseEnd ?? null,
  });
}

function dedupe(segments) {
  const seen = new Set();
  const out = [];
  for (const s of segments) {
    const key = `${s.book}|${s.chapter}|${s.verseStart}|${s.verseEnd}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}
