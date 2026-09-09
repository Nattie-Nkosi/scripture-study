// Builds the reverse citation index: which General Conference talks cite which
// verses. Parses every talk's footnotes (clean scripture citations) into
// talk_citations rows. Run after the migration:
//   npm run db:migrate  &&  npm run db:citations
// Validate on a subset first:  npm run db:citations -- --limit=2
//
// Idempotent + resumable: talks already indexed (by talk_id) are skipped, and
// inserts use `on conflict do nothing`, so a re-run only fills in what's missing.
import { setDefaultResultOrder } from "node:dns";
import { neon } from "@neondatabase/serverless";
import { createFootnoteParser } from "./lib/citation-parser.mjs";

// Prefer IPv4 — Neon's host can resolve to an unreachable IPv6 address first on
// some networks and Node's fetch won't fall back (mirrors src/lib/db/client.ts).
try {
  setDefaultResultOrder("ipv4first");
} catch {
  // Older Node without the API — ignore.
}

const SCRIPTURE_BASE = (
  process.env.OPENSCRIPTURE_API_BASE_URL ||
  "https://openscriptureapi.org/api/scriptures/v1/lds/en"
).replace(/\/+$/, "");
const CONFERENCE_BASE = (
  process.env.OPENSCRIPTURE_CONFERENCE_API_BASE_URL ||
  "https://openscriptureapi.org/api/conference/v1/lds/en"
).replace(/\/+$/, "");

const CONCURRENCY = 6; // talks fetched in parallel — polite but not glacial

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}
const sql = neon(url);

const limitArg = Number(
  process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1],
);
const conferenceArg = process.argv
  .find((a) => a.startsWith("--conference="))
  ?.split("=")[1];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiGet(base, path, tries = 4) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${base}${path}`, {
        headers: { Accept: "application/json", "User-Agent": "gospel-library-citations/1.0" },
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) throw new Error("non-JSON response");
      return res.json();
    } catch (err) {
      if (attempt >= tries) throw new Error(`GET ${path} failed: ${err.message}`);
      await sleep(400 * attempt);
    }
  }
}
const scrGet = (path) => apiGet(SCRIPTURE_BASE, path);
const confGet = (path) => apiGet(CONFERENCE_BASE, path);

// Neon over HTTP is flaky on some networks (transient ETIMEDOUT/fetch failed);
// retry so a single blip doesn't kill a long ingest (mirrors embed-corpus.mjs).
async function dbRetry(fn, label, tries = 6) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = String(err?.message ?? err);
      const transient = /fetch failed|ETIMEDOUT|ENETUNREACH|ECONNRESET|EAI_AGAIN|terminating|timeout/i.test(msg);
      if (attempt >= tries || !transient) throw new Error(`${label} failed: ${msg}`);
      await sleep(800 * attempt);
    }
  }
}

// Footnote spellings/abbreviations that differ from the API's book titles. Each
// alias points at a canonical title; it's only registered if that title exists.
const ALIASES = {
  "Psalm": "Psalms",
  "D&C": "Doctrine and Covenants",
  "D. & C.": "Doctrine and Covenants",
  "JS—H": "Joseph Smith—History",
  "JS-H": "Joseph Smith—History",
  "A of F": "Articles of Faith",
};

async function buildBookEntries() {
  const { volumes } = await scrGet("/volumes");
  const entries = [];
  const byTitle = new Map();
  for (const vol of volumes) {
    const detail = await scrGet(`/volume/${encodeURIComponent(vol._id)}`);
    for (const b of detail.books) {
      const entry = { name: b.title, volume: vol._id, book: b._id };
      entries.push(entry);
      byTitle.set(b.title.toLowerCase(), entry);
    }
  }
  for (const [alias, canonical] of Object.entries(ALIASES)) {
    const target = byTitle.get(canonical.toLowerCase());
    if (target) entries.push({ name: alias, volume: target.volume, book: target.book });
  }
  return entries;
}

/** Newest-first list of { talkId, conferenceId, year, month, session }. */
async function collectTalks() {
  if (conferenceArg) {
    const conf = await confGet(`/conference/${encodeURIComponent(conferenceArg)}`);
    return talksFromConference(conf);
  }

  const first = await confGet("/conferences?limit=100&offset=0");
  const conferences = [...first.conferences];
  while (conferences.length < first.total) {
    const next = await confGet(`/conferences?limit=100&offset=${conferences.length}`);
    if (next.conferences.length === 0) break;
    conferences.push(...next.conferences);
  }

  const chosen = Number.isFinite(limitArg) ? conferences.slice(0, limitArg) : conferences;
  return chosen.flatMap(talksFromConference);
}

function talksFromConference(conf) {
  const m = /^(\d{4})-(\d{2})$/.exec(conf._id);
  const year = m ? Number(m[1]) : conf.year;
  const month = m ? Number(m[2]) : conf.month;
  const out = [];
  for (const session of conf.sessions ?? []) {
    for (const talkId of session.talkIds ?? []) {
      out.push({ talkId, conferenceId: conf._id, year, month, session: session.name });
    }
  }
  return out;
}

const vint = (n) => (Number.isInteger(n) ? n : null);

async function insertRows(rows) {
  if (rows.length === 0) return;
  const cols = 13;
  const params = [];
  const tuples = rows.map((r, k) => {
    const b = k * cols;
    params.push(
      r.talkId, r.conferenceId, r.year, r.month, r.session, r.title, r.speaker,
      r.volume, r.book, r.chapter, r.verseStart, r.verseEnd, r.paragraph,
    );
    return `(${Array.from({ length: cols }, (_, j) => `$${b + j + 1}`).join(",")})`;
  });
  await dbRetry(
    () =>
      sql.query(
        `insert into talk_citations
           (talk_id, conference_id, year, month, session, title, speaker,
            volume, book, chapter, verse_start, verse_end, paragraph)
         values ${tuples.join(",")}
         on conflict do nothing`,
        params,
      ),
    "insert",
  );
}

async function indexTalk(meta, parse) {
  const talk = await confGet(`/talk/${encodeURIComponent(meta.talkId)}`);
  const title = talk.title ?? talk.content?.title ?? meta.talkId;
  const speaker = talk.speaker ?? talk.content?.speaker ?? "";
  const paragraphs = talk.content?.paragraphs ?? [];

  const rows = [];
  paragraphs.forEach((p, i) => {
    for (const fn of p.footNotes ?? []) {
      for (const seg of parse(fn.text || "")) {
        rows.push({
          talkId: meta.talkId,
          conferenceId: meta.conferenceId,
          year: meta.year,
          month: meta.month,
          session: meta.session,
          title,
          speaker,
          volume: seg.volume,
          book: seg.book,
          chapter: seg.chapter,
          verseStart: vint(seg.verseStart),
          verseEnd: vint(seg.verseEnd),
          paragraph: i + 1,
        });
      }
    }
  });

  await insertRows(rows);
  return rows.length;
}

/** Run `fn` over `items` with bounded concurrency, preserving no order. */
async function pool(items, concurrency, fn) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      await fn(items[i], i);
    }
  });
  await Promise.all(workers);
}

// --- Run ---------------------------------------------------------------------

console.log("Building book table…");
const bookEntries = await buildBookEntries();
const parse = createFootnoteParser(bookEntries);
console.log(`  ${bookEntries.length} book names/aliases.`);

console.log("Collecting talks…");
const allTalks = await collectTalks();

const doneRows = await dbRetry(
  () => sql`select distinct talk_id from talk_citations`,
  "load progress",
);
const done = new Set(doneRows.map((r) => r.talk_id));
const todo = allTalks.filter((t) => !done.has(t.talkId));
console.log(`  ${allTalks.length} talks total, ${done.size} already indexed, ${todo.length} to process.`);

let processed = 0;
let citations = 0;
let failed = 0;
await pool(todo, CONCURRENCY, async (meta) => {
  try {
    // Assign after the await completes — `citations += await …` would read
    // citations before suspending, losing updates when workers interleave.
    const n = await indexTalk(meta, parse);
    citations += n;
  } catch (err) {
    failed += 1;
    console.error(`  ! ${meta.talkId}: ${err.message}`);
  }
  processed += 1;
  if (processed % 50 === 0 || processed === todo.length) {
    console.log(`  ${processed}/${todo.length} talks — ${citations} citations`);
  }
});

console.log(`\nDone. Indexed ${citations} citations from ${processed - failed} talks${failed ? ` (${failed} failed)` : ""}.`);
