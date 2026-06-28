// Runs every .sql file in /migrations against DATABASE_URL, in order.
// Usage: npm run db:migrate   (loads .env.local via node --env-file)
import { setDefaultResultOrder } from "node:dns";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

// Neon's host resolves to an unreachable IPv6 address first on some networks;
// Node's fetch hangs on it instead of falling back to IPv4 like the OS does.
// Prefer IPv4 (mirrors src/lib/db/client.ts).
try {
  setDefaultResultOrder("ipv4first");
} catch {
  // Older Node without the API — ignore.
}

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}

const sql = neon(url);

// Neon over HTTP intermittently fails to connect on some networks (transient
// ETIMEDOUT/fetch failed); retry so a blip doesn't abort the migration.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function runStatement(statement, tries = 6) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await sql.query(statement);
    } catch (err) {
      const msg = String(err?.message ?? err);
      const transient = /fetch failed|ETIMEDOUT|ENETUNREACH|ECONNRESET|EAI_AGAIN|timeout/i.test(msg);
      if (attempt >= tries || !transient) throw err;
      await sleep(800 * attempt);
    }
  }
}

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

if (files.length === 0) {
  console.log("No migrations found.");
  process.exit(0);
}

for (const file of files) {
  const content = await readFile(join(dir, file), "utf8");
  // Strip line comments first, then split — the Neon HTTP driver runs one
  // statement per call.
  const statements = content
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`Running ${file} (${statements.length} statements)…`);
  for (const statement of statements) {
    await runStatement(statement);
  }
  console.log(`  ✓ ${file}`);
}

console.log("Migrations complete.");
