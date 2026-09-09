import { getVerseCitations } from "@gospel/db";
import { CITATIONS_RULES, enforceApiRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "Who taught this?" — the conference talks that cite a given verse, newest
// first, with a by-decade histogram. Reads the precomputed talk_citations index
// (scripts/index-citations.mjs); returns an empty result when the index isn't
// built rather than erroring, so the reader panel just shows nothing.
export async function GET(req: Request) {
  const limited = await enforceApiRateLimit(req, CITATIONS_RULES);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const book = (searchParams.get("book") ?? "").trim();
  const chapter = Number(searchParams.get("chapter"));
  const verse = Number(searchParams.get("verse"));

  if (!book || !Number.isInteger(chapter) || !Number.isInteger(verse)) {
    return Response.json({ error: "Missing book, chapter, or verse." }, { status: 400 });
  }

  // Absent/empty -> Number(null|"") === 0, which is an integer, so guard on > 0
  // to fall back to the default rather than clamping to 1.
  const rawLimit = Number(searchParams.get("limit"));
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 50;

  const result = await getVerseCitations({ book, chapter, verse }, { limit });
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
