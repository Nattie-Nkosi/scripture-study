import {
  ELEVENLABS_DEFAULT_VOICE_ID,
  isElevenLabsConfigured,
  listElevenLabsVoices,
} from "@/lib/ai/elevenlabs";

export const runtime = "nodejs";

/** GET /api/tts/voices — tells the client whether HD speech is available and,
 *  if so, the account's voices for the picker. Never exposes the API key. */
export async function GET() {
  if (!isElevenLabsConfigured()) {
    return Response.json({ configured: false, voices: [], defaultVoiceId: null });
  }
  try {
    const voices = await listElevenLabsVoices();
    return Response.json(
      { configured: true, voices, defaultVoiceId: ELEVENLABS_DEFAULT_VOICE_ID },
      { headers: { "Cache-Control": "public, max-age=3600" } },
    );
  } catch (err) {
    console.error("[tts/voices] error:", err);
    // Configured but the list call failed — HD still works with the default voice.
    return Response.json({
      configured: true,
      voices: [],
      defaultVoiceId: ELEVENLABS_DEFAULT_VOICE_ID,
    });
  }
}
