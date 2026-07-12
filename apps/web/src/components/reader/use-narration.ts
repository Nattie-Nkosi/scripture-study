"use client";

import * as React from "react";

export type NarrationStatus = "idle" | "playing" | "paused";

export interface Narration {
  supported: boolean;
  status: NarrationStatus;
  /** 1-based paragraph currently being read, or null when idle. */
  activePara: number | null;
  /** Available English voices on this device (populates once loaded). */
  voices: SpeechSynthesisVoice[];
  /** voiceURI of the voice in use — the saved pick, or the auto-chosen best. */
  activeVoiceURI: string | null;
  /** Choose a voice: persist it and, when idle, speak a short sample. */
  selectVoice: (voiceURI: string) => void;
  /** Start reading from the top, or from a given 1-based paragraph. */
  start: (fromPara?: number) => void;
  /** Pause when playing, resume when paused. */
  toggle: () => void;
  stop: () => void;
}

const emptySubscribe = () => () => {};

const VOICE_KEY = "study:narration-voice";

function readStoredVoice(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(VOICE_KEY);
  } catch {
    return null;
  }
}

/** Feature-detect speech synthesis without tripping hydration (false on the
 *  server, resolved on the client after mount). */
function useSpeechSupported(): boolean {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => typeof window !== "undefined" && "speechSynthesis" in window,
    () => false,
  );
}

/** Rough quality tiers by voice name/URI — modern neural voices announce
 *  themselves ("Natural", "Online", "Enhanced", "Google", "Siri"); legacy
 *  formant voices ("Desktop", "eSpeak", "Compact") are the robotic ones. */
const VOICE_TIERS: { re: RegExp; score: number }[] = [
  { re: /natural|neural/i, score: 100 },
  { re: /online/i, score: 90 },
  { re: /enhanced|premium/i, score: 70 },
  { re: /\bgoogle\b/i, score: 55 },
  { re: /siri/i, score: 40 },
];

function scoreVoice(v: SpeechSynthesisVoice): number {
  const hay = `${v.name} ${v.voiceURI}`;
  let score = 0;
  for (const tier of VOICE_TIERS) {
    if (tier.re.test(hay)) score = Math.max(score, tier.score);
  }
  if (/desktop|espeak|compact/i.test(hay)) score -= 40;
  if (v.lang === "en-US") score += 8;
  else if (v.lang.startsWith("en")) score += 4;
  if (v.default) score += 1;
  return score;
}

/** The best-sounding available English voice, or null if none are loaded yet. */
function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const en = voices.filter((v) => v.lang.startsWith("en"));
  if (!en.length) return null;
  return en.reduce((best, v) => (scoreVoice(v) > scoreVoice(best) ? v : best));
}

type Chunk = { para: number; text: string };

/** Flatten paragraphs into sentence-sized chunks, each tagged with its 1-based
 *  paragraph. Sentences keep utterances short enough to dodge Chrome's ~15s
 *  cutoff for long strings while still letting us highlight per paragraph. */
function buildChunks(paragraphs: { text: string }[]): Chunk[] {
  const chunks: Chunk[] = [];
  paragraphs.forEach((p, i) => {
    const parts = p.text.match(/[^.!?]+[.!?]+["'”’)]*\s*|[^.!?]+$/g) ?? [p.text];
    for (const part of parts) {
      const t = part.trim();
      if (t) chunks.push({ para: i + 1, text: t });
    }
  });
  return chunks;
}

export function useNarration(paragraphs: { text: string }[]): Narration {
  const supported = useSpeechSupported();
  const [status, setStatus] = React.useState<NarrationStatus>("idle");
  const [activePara, setActivePara] = React.useState<number | null>(null);

  const chunks = React.useMemo(() => buildChunks(paragraphs), [paragraphs]);
  const chunksRef = React.useRef(chunks);
  React.useEffect(() => {
    chunksRef.current = chunks;
  }, [chunks]);

  const voiceRef = React.useRef<SpeechSynthesisVoice | null>(null);
  // Identity token for the current playback run. Utterance callbacks capture
  // their token and no-op once it's replaced (a new run) or cleared (stop /
  // unmount) — the guard against cancel()'s callbacks resurrecting speech.
  const runTokenRef = React.useRef<object | null>(null);
  const speakRef = React.useRef<(i: number, token: object) => void>(() => {});

  const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = React.useState<string | null>(readStoredVoice);

  const statusRef = React.useRef(status);
  React.useEffect(() => {
    statusRef.current = status;
  }, [status]);

  React.useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const load = () => {
      const en = synth.getVoices().filter((v) => v.lang.startsWith("en"));
      if (en.length) setVoices(en);
    };
    load();
    synth.addEventListener("voiceschanged", load);
    return () => synth.removeEventListener("voiceschanged", load);
  }, [supported]);

  // Effective voice: the saved pick if still available, else the best guess.
  const activeVoice = React.useMemo(() => {
    if (voiceURI) {
      const match = voices.find((v) => v.voiceURI === voiceURI);
      if (match) return match;
    }
    return pickBestVoice(voices);
  }, [voices, voiceURI]);

  React.useEffect(() => {
    voiceRef.current = activeVoice;
  }, [activeVoice]);

  const selectVoice = React.useCallback(
    (uri: string) => {
      setVoiceURI(uri);
      try {
        window.localStorage.setItem(VOICE_KEY, uri);
      } catch {
        // Ignore storage failures (private mode / quota) — selection still applies.
      }
      // Preview the choice when nothing is being read aloud.
      if (!supported || statusRef.current !== "idle") return;
      const voice = window.speechSynthesis.getVoices().find((v) => v.voiceURI === uri);
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance("Here is how this voice sounds.");
      u.lang = "en-US";
      if (voice) u.voice = voice;
      window.speechSynthesis.speak(u);
    },
    [supported],
  );

  React.useEffect(() => {
    speakRef.current = function run(i: number, token: object) {
      if (runTokenRef.current !== token) return;
      const chunks = chunksRef.current;
      if (i >= chunks.length) {
        runTokenRef.current = null;
        setStatus("idle");
        setActivePara(null);
        return;
      }
      const chunk = chunks[i];
      setActivePara(chunk.para);
      const u = new SpeechSynthesisUtterance(chunk.text);
      u.lang = "en-US";
      if (voiceRef.current) u.voice = voiceRef.current;
      u.onend = () => {
        if (runTokenRef.current === token) run(i + 1, token);
      };
      u.onerror = (e) => {
        if (runTokenRef.current !== token) return;
        // stop()/start() cancel the queue — that surfaces as these, not a fault.
        if (e.error === "canceled" || e.error === "interrupted") return;
        runTokenRef.current = null;
        setStatus("idle");
        setActivePara(null);
      };
      window.speechSynthesis.speak(u);
    };
  }, []);

  const start = React.useCallback(
    (fromPara?: number) => {
      if (!supported) return;
      const chunks = chunksRef.current;
      if (chunks.length === 0) return;
      window.speechSynthesis.cancel();
      const token = {};
      runTokenRef.current = token;
      const found =
        fromPara != null ? chunks.findIndex((c) => c.para >= fromPara) : 0;
      const startIdx = found < 0 ? 0 : found;
      setStatus("playing");
      // Speak synchronously within the click — iOS Safari blocks speech that
      // isn't kicked off directly by the user gesture.
      speakRef.current(startIdx, token);
    },
    [supported],
  );

  const toggle = React.useCallback(() => {
    const synth = window.speechSynthesis;
    setStatus((s) => {
      if (s === "playing") {
        synth.pause();
        return "paused";
      }
      if (s === "paused") {
        synth.resume();
        return "playing";
      }
      return s;
    });
  }, []);

  const stop = React.useCallback(() => {
    runTokenRef.current = null;
    if (supported) window.speechSynthesis.cancel();
    setStatus("idle");
    setActivePara(null);
  }, [supported]);

  React.useEffect(() => {
    if (!supported) return;
    return () => {
      runTokenRef.current = null;
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  return {
    supported,
    status,
    activePara,
    voices,
    activeVoiceURI: activeVoice?.voiceURI ?? null,
    selectVoice,
    start,
    toggle,
    stop,
  };
}
