import "server-only";

// Server-only ElevenLabs text-to-speech. The API key never reaches the browser;
// the client talks to our /api/tts routes, which proxy to here.

const API_BASE = "https://api.elevenlabs.io/v1";

/** Flash v2.5 — half the credits per character of the standard models, fast. */
export const ELEVENLABS_MODEL_ID =
  process.env.ELEVENLABS_MODEL_ID || "eleven_flash_v2_5";

/** Default narrator voice ("Rachel") — override with ELEVENLABS_VOICE_ID. */
export const ELEVENLABS_DEFAULT_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

export function isElevenLabsConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

function apiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set.");
  return key;
}

export class ElevenLabsError extends Error {
  readonly status: number;
  constructor(status: number, detail: string) {
    super(`ElevenLabs ${status}: ${detail.slice(0, 200)}`);
    this.name = "ElevenLabsError";
    this.status = status;
  }
}

export interface HdVoice {
  id: string;
  name: string;
  detail?: string;
}

export async function listElevenLabsVoices(): Promise<HdVoice[]> {
  const res = await fetch(`${API_BASE}/voices`, {
    headers: { "xi-api-key": apiKey() },
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) throw new ElevenLabsError(res.status, await res.text().catch(() => ""));
  const data = (await res.json()) as {
    voices?: {
      voice_id: string;
      name: string;
      category?: string;
      labels?: Record<string, string>;
    }[];
  };
  return (data.voices ?? []).map((v) => ({
    id: v.voice_id,
    name: v.name,
    detail: v.labels?.accent || v.labels?.description || v.category || undefined,
  }));
}

/** Synthesize one chunk of text to MP3 bytes. Throws ElevenLabsError on failure
 *  (401 no key, 402 quota, 429 rate) so callers can fall back gracefully. */
export async function synthesizeSpeech(
  text: string,
  voiceId: string,
): Promise<ArrayBuffer> {
  const res = await fetch(
    `${API_BASE}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey(),
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({ text, model_id: ELEVENLABS_MODEL_ID }),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    throw new ElevenLabsError(res.status, await res.text().catch(() => ""));
  }
  return res.arrayBuffer();
}
