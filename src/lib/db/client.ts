import "server-only";
import { setDefaultResultOrder } from "node:dns";
import { neon } from "@neondatabase/serverless";

// Local dev only: Neon's host resolves to an unreachable IPv6 address first on
// some networks, and Node's fetch (undici) hangs on it instead of falling back
// to IPv4 like the OS does — surfacing as "Error connecting to database: fetch
// failed". Preferring IPv4 fixes it. Runs here (not in instrumentation.ts) so it
// is guaranteed to apply in the same process that opens the Neon connection.
if (process.env.NODE_ENV !== "production") {
  try {
    setDefaultResultOrder("ipv4first");
  } catch {
    // Older Node without the API — ignore.
  }
}

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
