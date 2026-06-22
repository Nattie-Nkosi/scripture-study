import "server-only";
import path from "node:path";
import { env, pipeline, type FeatureExtractionPipeline } from "@xenova/transformers";

// Self-hosted sentence embeddings (no API key) for semantic scripture search.
// The same model embeds the corpus offline (scripts/embed-corpus.mjs) and the
// query here, so the vectors are comparable. 384 dims, L2-normalized.

export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
export const EMBEDDING_DIMS = 384;

// Prefer a pre-downloaded copy under .models/ (committed by `npm run` setup or
// fetched once), so a network that can't reach the HF CDN still works locally.
// Remote stays enabled so environments that can download (e.g. Vercel) still do.
env.localModelPath = path.resolve(process.cwd(), ".models");
env.allowRemoteModels = true;

// Loading the model is expensive, so build the pipeline once per process. The
// promise is cached so concurrent callers share a single load (and a single
// download on first use). Mirrors the lazy client in ./groq.ts.
let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", EMBEDDING_MODEL).catch(
      (err) => {
        extractorPromise = null; // let a later request retry the load
        throw err;
      },
    );
  }
  return extractorPromise;
}

/** Embed a single string into a normalized 384-dim vector. */
export async function embedText(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}
