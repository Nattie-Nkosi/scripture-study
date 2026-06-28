import "server-only";
import { getSql } from "./client";

export interface SemanticHit {
  reference: string;
  text: string;
  score: number; // cosine similarity in [-1, 1]; higher is closer
}

/** pgvector wants the vector as a bracketed literal, e.g. "[0.1,0.2,…]". */
function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

/** Nearest verses to a query embedding, by cosine distance. Returns [] when the
 *  database isn't configured or the table hasn't been populated, so callers can
 *  fall back to keyword search (same graceful-degrade pattern as ./chat.ts). */
export async function semanticSearchScriptures(
  embedding: number[],
  opts: { limit?: number; volume?: string } = {},
): Promise<SemanticHit[]> {
  const sql = getSql();
  if (!sql || embedding.length === 0) return [];

  const limit = opts.limit ?? 12;
  const vec = toVectorLiteral(embedding);

  try {
    // Two branches rather than a composed fragment — the Neon HTTP driver's
    // template only interpolates values, not nested `sql` pieces.
    const rows = (opts.volume
      ? await sql`
          select reference, text, 1 - (embedding <=> ${vec}::vector) as score
          from scripture_embeddings
          where volume = ${opts.volume}
          order by embedding <=> ${vec}::vector
          limit ${limit}
        `
      : await sql`
          select reference, text, 1 - (embedding <=> ${vec}::vector) as score
          from scripture_embeddings
          order by embedding <=> ${vec}::vector
          limit ${limit}
        `) as { reference: string; text: string; score: number }[];

    return rows.map((r) => ({
      reference: r.reference,
      text: r.text,
      score: Number(r.score),
    }));
  } catch (err) {
    console.error("[embeddings] semantic search error:", (err as Error).message);
    return [];
  }
}
