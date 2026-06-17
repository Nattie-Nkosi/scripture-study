import "server-only";
import { neon } from "@neondatabase/serverless";

let sql: ReturnType<typeof neon> | null = null;

function connectionString(): string | undefined {
  // Vercel's Neon integration sets DATABASE_URL; POSTGRES_URL is a fallback.
  return process.env.DATABASE_URL || process.env.POSTGRES_URL;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(connectionString());
}

/** Server-only Neon SQL client. Returns null when DATABASE_URL isn't set, so
 *  callers can degrade gracefully (e.g. translate without caching). The
 *  connection string is a secret — never import this on the client. */
export function getSql(): ReturnType<typeof neon> | null {
  const url = connectionString();
  if (!url) return null;
  if (!sql) sql = neon(url);
  return sql;
}
