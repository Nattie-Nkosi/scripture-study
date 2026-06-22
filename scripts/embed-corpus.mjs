// Embeds the standard works into Neon (pgvector) for semantic scripture search.
// Run after the migration:  npm run db:migrate  &&  npm run db:embed
// Validate on a subset first: npm run db:embed -- --volume=bookofmormon
//
// Idempotent + resumable: rows already present (by volume,book,chapter,verse)
// are skipped, so a re-run only fills in what's missing.
import { setDefaultResultOrder } from "node:dns";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { env, pipeline } from "@xenova/transformers";

// Load the model from the pre-downloaded .models/ copy (the HF CDN times out via
// Node fetch on some networks); remote stays on as a fallback.
env.localModelPath = path.resolve(process.cwd(), ".models");
env.allowRemoteModels = true;

// Prefer IPv4 — Neon's host can resolve to an unreachable IPv6 address first on
// some networks and Node's fetch won't fall back (mirrors src/lib/db/client.ts).
try {
  setDefaultResultOrder("ipv4first");
} catch {
  // Older Node without the API — ignore.
}

const DEFAULT_BASE = "https://openscriptureapi.org/api/scriptures/v1/lds/en";
const BASE = (process.env.OPENSCRIPTURE_API_BASE_URL || DEFAULT_BASE).replace(/\/+$/, "");
const MODEL = "Xenova/all-MiniLM-L6-v2";
const BATCH = 32; // verses per embed + per multi-row insert

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}
const sql = neon(url);

const volumeArg = process.argv
  .find((a) => a.startsWith("--volume="))
  ?.split("=")[1];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiGet(path, tries = 4) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        headers: { Accept: "application/json", "User-Agent": "gospel-library-embed/1.0" },
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) throw new Error(`non-JSON response`);
      return res.json();
    } catch (err) {
      if (attempt >= tries) throw new Error(`GET ${path} failed: ${err.message}`);
      await sleep(400 * attempt);
    }
  }
}

// Neon over HTTP is flaky on some networks (transient ETIMEDOUT/fetch failed);
// retry so a single blip doesn't kill a long ingest.
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

console.log(`Loading ${MODEL}…`);
const extractor = await pipeline("feature-extraction", MODEL);

async function embedBatch(texts) {
  const out = await extractor(texts, { pooling: "mean", normalize: true });
  const [n, d] = out.dims;
  const vecs = [];
  for (let i = 0; i < n; i++) vecs.push(Array.from(out.data.slice(i * d, (i + 1) * d)));
  return vecs;
}

const vlit = (v) => `[${v.join(",")}]`;

async function insertBatch(records, vecs) {
  const cols = 8;
  const params = [];
  const tuples = records.map((r, k) => {
    const b = k * cols;
    params.push(r.volume, r.book, r.bookTitle, r.chapter, r.verse, r.reference, r.text, vlit(vecs[k]));
    return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8}::vector)`;
  });
  await dbRetry(
    () =>
      sql.query(
        `insert into scripture_embeddings
           (volume, book, book_title, chapter, verse, reference, text, embedding)
         values ${tuples.join(",")}
         on conflict (volume, book, chapter, verse) do nothing`,
        params,
      ),
    "insert",
  );
}

// Chapters already populated, so a resume skips re-embedding completed work.
const done = new Map();
const progressRows = await dbRetry(
  () =>
    sql`select book, chapter, count(*)::int as n
        from scripture_embeddings group by book, chapter`,
  "load progress",
);
for (const r of progressRows) done.set(`${r.book}:${r.chapter}`, r.n);

const { volumes } = await apiGet("/volumes");
const targets = volumeArg ? volumes.filter((v) => v._id === volumeArg) : volumes;
if (targets.length === 0) {
  console.error(`No volume matched "${volumeArg}". Ids: ${volumes.map((v) => v._id).join(", ")}`);
  process.exit(1);
}

let grandTotal = 0;
for (const vol of targets) {
  const { books } = await apiGet(`/volume/${encodeURIComponent(vol._id)}`);
  console.log(`\n${vol.title} — ${books.length} books`);

  for (const book of books) {
    const detail = await apiGet(`/book/${encodeURIComponent(book._id)}`);
    let bookCount = 0;

    for (let ch = 1; ch <= detail.chapters.length; ch++) {
      const data = await apiGet(`/book/${encodeURIComponent(book._id)}/${ch}`);
      const bookTitle = data.book?.titleShort || data.chapter?.bookTitle || book.title;
      const number = data.chapter?.number ?? ch;
      const verses = data.chapter?.verses ?? [];

      const records = verses
        .map((v, i) => ({
          volume: vol._id,
          book: book._id,
          bookTitle,
          chapter: number,
          verse: i + 1,
          reference: `${bookTitle} ${number}:${i + 1}`,
          text: (v.text || "").trim(),
        }))
        .filter((r) => r.text.length > 0);

      if ((done.get(`${book._id}:${number}`) ?? 0) >= records.length) continue;

      for (let i = 0; i < records.length; i += BATCH) {
        const batch = records.slice(i, i + BATCH);
        const vecs = await embedBatch(batch.map((r) => r.text));
        await insertBatch(batch, vecs);
        bookCount += batch.length;
      }
    }

    grandTotal += bookCount;
    if (bookCount > 0) console.log(`  ${book.title}: ${bookCount} verses`);
  }
}

console.log(`\nEmbedded ${grandTotal} verses. Building ANN index…`);
await dbRetry(
  () =>
    sql.query(
      `create index if not exists scripture_embeddings_hnsw
         on scripture_embeddings using hnsw (embedding vector_cosine_ops)`,
    ),
  "create index",
);
console.log("Done.");
