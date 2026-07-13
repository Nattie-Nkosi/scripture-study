import "server-only";

// Request throttling for the unauthenticated, AI-cost-bearing endpoints (the
// three assistant routes + the Simple English action). Without this, one client
// can hammer the endpoints and drain the shared free Groq quota — a trivial
// denial-of-wallet.
//
// Defaults to an in-process fixed-window limiter, which needs no infra and works
// in dev and on a single warm serverless instance (it reliably enforces the
// short burst window). Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN to
// upgrade to a fleet-wide counter (needed for the daily cap to hold across
// Vercel's serverless instances). Any Upstash failure fails OPEN to the
// in-memory limiter, so a throttling outage never takes the app down.

export type RateRule = { limit: number; windowSecs: number };
export type NamedRule = { name: string; rule: RateRule };
export type RateVerdict = { ok: boolean; retryAfterSecs: number };

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const useUpstash = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

// Rule sets, kept here so limits live in one place.
export const AI_CHAT_RULES: NamedRule[] = [
  { name: "ai-burst", rule: { limit: 12, windowSecs: 60 } },
  { name: "ai-daily", rule: { limit: 150, windowSecs: 86_400 } },
];
export const TRANSLATE_RULES: NamedRule[] = [
  { name: "tr-burst", rule: { limit: 8, windowSecs: 60 } },
  { name: "tr-daily", rule: { limit: 100, windowSecs: 86_400 } },
];
// Text-to-speech is one request per paragraph and each costs ElevenLabs credits.
// Cached plays don't reach here; these caps just bound the denial-of-wallet risk.
export const TTS_RULES: NamedRule[] = [
  { name: "tts-burst", rule: { limit: 30, windowSecs: 60 } },
  { name: "tts-daily", rule: { limit: 600, windowSecs: 86_400 } },
];

// --- In-memory fixed-window store -------------------------------------------

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;
let lastSweep = 0;

function sweep(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
  // Hard ceiling: under a flood of distinct keys, drop everything rather than
  // grow without bound. Degrades throttling briefly; never leaks memory.
  if (buckets.size > MAX_BUCKETS) buckets.clear();
}

function hitMemory(key: string, rule: RateRule, now: number): RateVerdict {
  sweep(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowSecs * 1000 });
    return { ok: true, retryAfterSecs: 0 };
  }
  b.count += 1;
  if (b.count > rule.limit) {
    return { ok: false, retryAfterSecs: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  return { ok: true, retryAfterSecs: 0 };
}

// --- Upstash REST path (optional) -------------------------------------------

// Atomic fixed-window counter: increment, and set the TTL only on the first hit
// of the window so the window doesn't slide forward on every request.
const INCR_SCRIPT =
  'local c = redis.call("INCR", KEYS[1]) ' +
  'if c == 1 then redis.call("PEXPIRE", KEYS[1], ARGV[1]) end ' +
  "return c";

let upstashWarned = false;

async function hitUpstash(key: string, rule: RateRule): Promise<RateVerdict> {
  const res = await fetch(UPSTASH_URL as string, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(["EVAL", INCR_SCRIPT, "1", key, String(rule.windowSecs * 1000)]),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const data = (await res.json()) as { result?: number; error?: string };
  if (typeof data.result !== "number") throw new Error(data.error ?? "upstash: bad response");
  if (data.result > rule.limit) {
    // Without a second round-trip for the exact TTL, use the window as the hint.
    return { ok: false, retryAfterSecs: rule.windowSecs };
  }
  return { ok: true, retryAfterSecs: 0 };
}

async function hit(id: string, rule: RateRule, bucket: string): Promise<RateVerdict> {
  const key = `rl:${bucket}:${id}`;
  if (useUpstash) {
    try {
      return await hitUpstash(key, rule);
    } catch (err) {
      if (!upstashWarned) {
        upstashWarned = true;
        console.error("[rate-limit] Upstash unavailable — using in-memory fallback:", err);
      }
    }
  }
  return hitMemory(key, rule, Date.now());
}

// --- Public API -------------------------------------------------------------

/** The client's IP on Vercel: `x-real-ip` is set by the platform to the true
 *  client address (not client-appendable, unlike the head of x-forwarded-for). */
export function clientIp(headers: Headers): string {
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

/** Apply every rule for an identifier; the first breach wins. */
export async function checkLimits(id: string, rules: NamedRule[]): Promise<RateVerdict> {
  for (const r of rules) {
    const verdict = await hit(id, r.rule, r.name);
    if (!verdict.ok) return verdict;
  }
  return { ok: true, retryAfterSecs: 0 };
}

/** Route-handler guard: returns a ready 429 Response if throttled, else null. */
export async function enforceApiRateLimit(
  req: Request,
  rules: NamedRule[],
): Promise<Response | null> {
  const verdict = await checkLimits(clientIp(req.headers), rules);
  if (verdict.ok) return null;
  return Response.json(
    {
      error:
        "You’ve reached the current usage limit for the assistant. It runs on a free AI service — please wait a little while, then try again.",
    },
    { status: 429, headers: { "Retry-After": String(verdict.retryAfterSecs) } },
  );
}
