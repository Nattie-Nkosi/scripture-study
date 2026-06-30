import "server-only";
import Groq from "groq-sdk";

let client: Groq | null = null;

/** Lazily create the Groq client. Server-only — the key never reaches the browser. */
export function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not set. Add it to .env.local to enable AI features.",
    );
  }
  if (!client) client = new Groq({ apiKey });
  return client;
}

export const TRANSLATION_MODEL =
  process.env.GROQ_TRANSLATION_MODEL || "openai/gpt-oss-120b";

export const ASSISTANT_MODEL =
  process.env.GROQ_ASSISTANT_MODEL || "openai/gpt-oss-120b";
