// Runs every .sql file in /migrations against DATABASE_URL, in order.
// Usage: npm run db:migrate   (loads .env.local via node --env-file)
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}

const sql = neon(url);
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
    await sql.query(statement);
  }
  console.log(`  ✓ ${file}`);
}

console.log("Migrations complete.");
