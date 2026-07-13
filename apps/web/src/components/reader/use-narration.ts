"use client";

import * as React from "react";

export type NarrationStatus = "idle" | "playing" | "paused";

export interface NarrationVoice {
  id: string;
  label: string;
  detail?: string;
}

export interface Narration {
  /** True when playback is possible at all (browser speech and/or HD). */
  supported: boolean;
  /** True while the ElevenLabs HD engine is the active source. */
  hd: boolean;
  status: NarrationStatus;
  /** 1-based paragraph currently being read, or null when idle. */
  activePara: number | null;
  /** Voices for the active engine (HD account voices, or device voices). */
  voices: NarrationVoice[];
  /** id of the voice in use — saved pick, or the auto/default choice. */
  activeVoiceId: string | null;
  /** Transient message, e.g. after falling back from HD to a device voice. */
  notice: string | null;
  /** Choose a voice: persist it (and, for device voices when idle, preview it). */
  selectVoice: (id: string) => void;
  /** Start reading from the top, or from a given 1-based paragraph. */
  start: (fromPara?: number) => void;
  toggle: () => void;
  stop: () => void;
}

const emptySubscribe = () => () => {};

const VOICE_KEY = "study:narration-voice";
const HD_VOICE_KEY = "study:narration-voice-hd";

function readStored(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function persist(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures (private mode / quota) — selection still applies.
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

function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const en = voices.filter((v) => v.lang.startsWith("en"));
  if (!en.length) return null;
  return en.reduce((best, v) => (scoreVoice(v) > scoreVoice(best) ? v : best));
}

/** Trim the redundant "Microsoft/Google … -" prefix and locale from a device
 *  voice name so the picker reads cleanly. */
function browserVoiceLabel(v: SpeechSynthesisVoice): string {
  return v.name.replace(/^(Microsoft|Google)\s+/, "").replace(/\s*-\s*English.*$/i, "");
}

type Chunk = { para: number; text: string };

/** Flatten paragraphs into sentence-sized chunks (used by the browser engine),
 *  each tagged with its 1-based paragraph. Sentences keep utterances short
 *  enough to dodge Chrome's ~15s cutoff while still highlighting per paragraph. */
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

class HdError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`hd ${status}`);
    this.status = status;
  }
}

export function useNarration(
  talkId: string,
  paragraphs: { text: string }[],
): Narration {
  const supported = useSpeechSupported();
  const [status, setStatus] = React.useState<NarrationStatus>("idle");
  const [activePara, setActivePara] = React.useState<number | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  // "hd" once we confirm ElevenLabs is configured; flips to "browser" if we ever
  // have to fall back mid-read (missing key surfaced late, quota spent, offline).
  const [mode, setMode] = React.useState<"browser" | "hd">("browser");
  const [hdVoices, setHdVoices] = React.useState<NarrationVoice[]>([]);
  const [hdVoiceId, setHdVoiceId] = React.useState<string | null>(() =>
    readStored(HD_VOICE_KEY),
  );
  const [hdDefaultVoiceId, setHdDefaultVoiceId] = React.useState<string | null>(null);

  const [browserVoices, setBrowserVoices] = React.useState<SpeechSynthesisVoice[]>([]);
  const [browserVoiceURI, setBrowserVoiceURI] = React.useState<string | null>(() =>
    readStored(VOICE_KEY),
  );

  const chunks = React.useMemo(() => buildChunks(paragraphs), [paragraphs]);

  // --- Refs the async engines read (avoid stale closures) --------------------
  const chunksRef = React.useRef(chunks);
  const paraCountRef = React.useRef(paragraphs.length);
  const talkIdRef = React.useRef(talkId);
  const statusRef = React.useRef(status);
  const modeRef = React.useRef(mode);
  const supportedRef = React.useRef(supported);
  const browserVoiceRef = React.useRef<SpeechSynthesisVoice | null>(null);
  const hdVoiceIdRef = React.useRef<string | null>(null);
  const runTokenRef = React.useRef<object | null>(null);
  const speakRef = React.useRef<(i: number, token: object) => void>(() => {});
  const hdRef = React.useRef<(pIdx: number, token: object) => void>(() => {});
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const hdPromiseRef = React.useRef<Map<string, Promise<string>>>(new Map());
  const hdUrlsRef = React.useRef<string[]>([]);

  React.useEffect(() => {
    chunksRef.current = chunks;
  }, [chunks]);
  React.useEffect(() => {
    paraCountRef.current = paragraphs.length;
  }, [paragraphs]);
  React.useEffect(() => {
    talkIdRef.current = talkId;
  }, [talkId]);
  React.useEffect(() => {
    statusRef.current = status;
  }, [status]);
  React.useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  React.useEffect(() => {
    supportedRef.current = supported;
  }, [supported]);

  // --- Discover whether HD is available + load its voices --------------------
  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/tts/voices")
      .then((r) => (r.ok ? r.json() : { configured: false }))
      .then((d: { configured?: boolean; voices?: NarrationVoice[]; defaultVoiceId?: string | null }) => {
        if (cancelled || !d.configured) return;
        setMode("hd");
        setHdVoices(d.voices ?? []);
        setHdDefaultVoiceId(d.defaultVoiceId ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Device voices (browser engine) ----------------------------------------
  React.useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const load = () => {
      const en = synth.getVoices().filter((v) => v.lang.startsWith("en"));
      if (en.length) setBrowserVoices(en);
    };
    load();
    synth.addEventListener("voiceschanged", load);
    return () => synth.removeEventListener("voiceschanged", load);
  }, [supported]);

  const activeBrowserVoice = React.useMemo(() => {
    if (browserVoiceURI) {
      const match = browserVoices.find((v) => v.voiceURI === browserVoiceURI);
      if (match) return match;
    }
    return pickBestVoice(browserVoices);
  }, [browserVoices, browserVoiceURI]);

  React.useEffect(() => {
    browserVoiceRef.current = activeBrowserVoice;
  }, [activeBrowserVoice]);

  const activeHdVoiceId = hdVoiceId ?? hdDefaultVoiceId;
  React.useEffect(() => {
    hdVoiceIdRef.current = activeHdVoiceId;
  }, [activeHdVoiceId]);

  // --- One reusable audio element for HD playback ----------------------------
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    audioRef.current = new Audio();
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const chunkIndexForPara = React.useCallback((para: number) => {
    const idx = chunksRef.current.findIndex((c) => c.para >= para);
    return idx < 0 ? 0 : idx;
  }, []);

  const revokeHdCache = React.useCallback(() => {
    for (const u of hdUrlsRef.current) URL.revokeObjectURL(u);
    hdUrlsRef.current = [];
    hdPromiseRef.current.clear();
  }, []);

  // --- Browser (device-voice) engine -----------------------------------------
  React.useEffect(() => {
    speakRef.current = function run(i: number, token: object) {
      if (runTokenRef.current !== token) return;
      const list = chunksRef.current;
      if (i >= list.length) {
        runTokenRef.current = null;
        setStatus("idle");
        setActivePara(null);
        return;
      }
      const chunk = list[i];
      setActivePara(chunk.para);
      const u = new SpeechSynthesisUtterance(chunk.text);
      u.lang = "en-US";
      if (browserVoiceRef.current) u.voice = browserVoiceRef.current;
      u.onend = () => {
        if (runTokenRef.current === token) run(i + 1, token);
      };
      u.onerror = (e) => {
        if (runTokenRef.current !== token) return;
        if (e.error === "canceled" || e.error === "interrupted") return;
        runTokenRef.current = null;
        setStatus("idle");
        setActivePara(null);
      };
      window.speechSynthesis.speak(u);
    };
  }, []);

  // --- HD (ElevenLabs) engine ------------------------------------------------
  React.useEffect(() => {
    function fetchAudio(pIdx: number): Promise<string> {
      const voiceId = hdVoiceIdRef.current;
      const key = `${pIdx}:${voiceId ?? "default"}`;
      const cache = hdPromiseRef.current;
      const hit = cache.get(key);
      if (hit) return hit;
      const params = new URLSearchParams({
        talk: talkIdRef.current,
        p: String(pIdx + 1),
      });
      if (voiceId) params.set("voice", voiceId);
      const promise = (async () => {
        const res = await fetch(`/api/tts?${params.toString()}`);
        if (!res.ok) throw new HdError(res.status);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        hdUrlsRef.current.push(url);
        return url;
      })();
      cache.set(key, promise);
      promise.catch(() => cache.delete(key));
      return promise;
    }

    function fallback(pIdx: number, token: object) {
      if (runTokenRef.current !== token) return;
      setMode("browser");
      modeRef.current = "browser";
      setNotice("Using your device voice — HD audio is unavailable.");
      if (!supportedRef.current) {
        runTokenRef.current = null;
        setStatus("idle");
        setActivePara(null);
        return;
      }
      window.speechSynthesis.cancel();
      speakRef.current(chunkIndexForPara(pIdx + 1), token);
    }

    hdRef.current = function run(pIdx: number, token: object) {
      if (runTokenRef.current !== token) return;
      if (pIdx >= paraCountRef.current) {
        runTokenRef.current = null;
        setStatus("idle");
        setActivePara(null);
        return;
      }
      const audio = audioRef.current;
      if (!audio) return;
      setActivePara(pIdx + 1);
      fetchAudio(pIdx)
        .then((src) => {
          if (runTokenRef.current !== token) return;
          audio.src = src;
          audio.onended = () => {
            if (runTokenRef.current === token) run(pIdx + 1, token);
          };
          audio.onerror = () => {
            if (runTokenRef.current === token) fallback(pIdx, token);
          };
          const playing = audio.play();
          if (playing) {
            playing.catch(() => {
              if (runTokenRef.current === token) fallback(pIdx, token);
            });
          }
          void fetchAudio(pIdx + 1).catch(() => {});
        })
        .catch(() => {
          if (runTokenRef.current === token) fallback(pIdx, token);
        });
    };
  }, [chunkIndexForPara]);

  // --- Controls --------------------------------------------------------------
  const start = React.useCallback(
    (fromPara?: number) => {
      const fromP = fromPara != null ? fromPara : 1;
      setNotice(null);
      const token = {};
      runTokenRef.current = token;
      setStatus("playing");
      if (modeRef.current === "hd") {
        audioRef.current?.pause();
        revokeHdCache();
        hdRef.current(fromP - 1, token);
        return;
      }
      if (!supported) {
        runTokenRef.current = null;
        setStatus("idle");
        return;
      }
      window.speechSynthesis.cancel();
      // Speak synchronously within the click — iOS blocks speech that isn't
      // kicked off directly by the user gesture.
      speakRef.current(chunkIndexForPara(fromP), token);
    },
    [supported, chunkIndexForPara, revokeHdCache],
  );

  const toggle = React.useCallback(() => {
    setStatus((s) => {
      if (s === "playing") {
        if (modeRef.current === "hd") audioRef.current?.pause();
        else window.speechSynthesis.pause();
        return "paused";
      }
      if (s === "paused") {
        if (modeRef.current === "hd") void audioRef.current?.play().catch(() => {});
        else window.speechSynthesis.resume();
        return "playing";
      }
      return s;
    });
  }, []);

  const stop = React.useCallback(() => {
    runTokenRef.current = null;
    setNotice(null);
    if (supportedRef.current) window.speechSynthesis.cancel();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
    }
    revokeHdCache();
    setStatus("idle");
    setActivePara(null);
  }, [revokeHdCache]);

  React.useEffect(() => {
    return () => {
      runTokenRef.current = null;
      if (supportedRef.current) window.speechSynthesis.cancel();
      audioRef.current?.pause();
      for (const u of hdUrlsRef.current) URL.revokeObjectURL(u);
      hdUrlsRef.current = [];
    };
  }, []);

  const selectVoice = React.useCallback(
    (id: string) => {
      if (modeRef.current === "hd") {
        setHdVoiceId(id);
        persist(HD_VOICE_KEY, id);
        return; // no auto-preview — each HD sample costs credits.
      }
      setBrowserVoiceURI(id);
      persist(VOICE_KEY, id);
      if (!supported || statusRef.current !== "idle") return;
      const v = window.speechSynthesis.getVoices().find((x) => x.voiceURI === id);
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance("Here is how this voice sounds.");
      u.lang = "en-US";
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
    },
    [supported],
  );

  const hd = mode === "hd";
  const voices: NarrationVoice[] = hd
    ? hdVoices
    : browserVoices.map((v) => ({
        id: v.voiceURI,
        label: browserVoiceLabel(v),
        detail: v.lang,
      }));

  return {
    supported: supported || hd,
    hd,
    status,
    activePara,
    voices,
    activeVoiceId: hd ? activeHdVoiceId : activeBrowserVoice?.voiceURI ?? null,
    notice,
    selectVoice,
    start,
    toggle,
    stop,
  };
}
