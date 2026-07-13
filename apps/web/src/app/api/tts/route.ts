import { getTalk } from "@/lib/conference/client";
import {
  ELEVENLABS_DEFAULT_VOICE_ID,
  ElevenLabsError,
  isElevenLabsConfigured,
  synthesizeSpeech,
} from "@/lib/ai/elevenlabs";
import { TTS_RULES, enforceApiRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_TTS_CHARS = 5000;

/** GET /api/tts?talk={id}&p={paragraph}&voice={voiceId}
 *  Returns MP3 for one paragraph. Text is derived server-side from the immutable
 *  talk, so the URL is short and the response caches hard (replays never rebill). */
export async function GET(req: Request) {
  if (!isElevenLabsConfigured()) {
    return Response.json({ error: "TTS is not configured." }, { status: 501 });
  }

  const limited = await enforceApiRateLimit(req, TTS_RULES);
  if (limited) return limited;

  const url = new URL(req.url);
  const talkId = url.searchParams.get("talk") ?? "";
  const p = Number(url.searchParams.get("p"));
  const rawVoice = url.searchParams.get("voice") ?? "";
  const voice = /^[A-Za-z0-9]{1,64}$/.test(rawVoice)
    ? rawVoice
    : ELEVENLABS_DEFAULT_VOICE_ID;

  if (!talkId || !Number.isInteger(p) || p < 1) {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }

  let talk;
  try {
    talk = await getTalk(talkId);
  } catch {
    return Response.json({ error: "Talk not found." }, { status: 404 });
  }

  const para = talk.content.paragraphs[p - 1];
  if (!para) {
    return Response.json({ error: "Paragraph out of range." }, { status: 404 });
  }

  try {
    const audio = await synthesizeSpeech(para.text.slice(0, MAX_TTS_CHARS), voice);
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[tts] synthesis error:", err);
    // Pass quota/auth/rate statuses through so the client falls back to browser
    // speech; collapse everything else to a generic upstream failure.
    const status = err instanceof ElevenLabsError ? err.status : 502;
    const passthrough = status === 401 || status === 402 || status === 429;
    return Response.json(
      { error: "TTS unavailable." },
      { status: passthrough ? status : 502 },
    );
  }
}
