import "server-only";
import path from "node:path";
import type { FeatureExtractionPipeline } from "@xenova/transformers";

// Sentence embeddings for semantic scripture search — 384 dims, L2-normalized.
// The corpus was embedded with all-MiniLM-L6-v2, so the query must use the SAME
// model. Two backends, picked by environment:
//   • HF_TOKEN set  → Hugging Face hosted inference (works on Vercel serverless,
//     where the native onnx runtime can't load).
//   • otherwise     → the on-disk Transformers.js model (fast, free, offline),
//     imported lazily so a runtime that can't load it just falls back to
//     keyword search instead of crashing the route.

export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
export const EMBEDDING_DIMS = 384;

function l2normalize(v: number[]): number[] {
  let sum = 0;
  for (const x of v) sum += x * x;
  const norm = Math.sqrt(sum) || 1;
  return v.map((x) => x / norm);
}

// --- Hosted backend (Hugging Face Inference API) ---------------------------

// Hugging Face migrated serverless inference to router.huggingface.co; the old
// api-inference.huggingface.co host no longer responds. This is the current
// canonical endpoint for the sentence-transformers feature-extraction pipeline.
const HF_EMBED_URL =
  process.env.HF_EMBED_URL ||
  "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction";

async function embedViaHuggingFace(text: string, token: string): Promise<number[]> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(HF_EMBED_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      // wait_for_model holds the request while a cold model loads, instead of 503.
      body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
    });

    if (res.status === 503 && attempt < 3) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      continue;
    }
    if (!res.ok) {
      throw new Error(`HF embedding failed: ${res.status} ${res.statusText}`);
    }

    // For a single string this model returns the pooled 384-vector (sometimes
    // wrapped as [[...]]). Normalize ourselves so it matches the indexed corpus.
    const data = (await res.json()) as number[] | number[][];
    const vec = Array.isArray(data[0]) ? (data[0] as number[]) : (data as number[]);
    if (!Array.isArray(vec) || vec.length !== EMBEDDING_DIMS) {
      throw new Error(
        `HF embedding returned an unexpected shape (length ${Array.isArray(vec) ? vec.length : "?"}).`,
      );
    }
    return l2normalize(vec);
  }
}

// --- Local backend (Transformers.js, dev) ----------------------------------

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;
let localUnavailable = false;

async function loadExtractor(): Promise<FeatureExtractionPipeline> {
  const { env, pipeline } = await import("@xenova/transformers");
  // Prefer a pre-downloaded copy under .models/ (a flaky network can't reach the
  // HF CDN); remote stays enabled for environments that can download it.
  env.localModelPath = path.resolve(process.cwd(), ".models");
  env.allowRemoteModels = true;
  return pipeline("feature-extraction", EMBEDDING_MODEL);
}

function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = loadExtractor().catch((err) => {
      extractorPromise = null;
      localUnavailable = true; // don't retry a load that can't succeed in this runtime
      throw err;
    });
  }
  return extractorPromise;
}

async function embedViaLocal(text: string): Promise<number[]> {
  if (localUnavailable) throw new Error("Local embedding model is unavailable here.");
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

/** Embed a string into a normalized 384-dim vector. Throws on failure; callers
 *  catch and fall back to keyword search. */
export async function embedText(text: string): Promise<number[]> {
  const token = process.env.HF_TOKEN;
  return token ? embedViaHuggingFace(text, token) : embedViaLocal(text);
}
