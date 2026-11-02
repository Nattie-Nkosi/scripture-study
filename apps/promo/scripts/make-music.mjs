// Synthesises the soundtrack to public/score.wav, cut to the scene timeline:
// a restless ticking hook, then a warm pad that changes chord on every scene
// with a soft bell on each cut, ending on a held D major chord.
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";

const timeline = JSON.parse(readFileSync(new URL("../src/timeline.json", import.meta.url)));
const RATE = 44100;
const { fps, transition, scenes } = timeline;

const starts = [];
let f = 0;
for (const s of scenes) {
  starts.push(f / fps);
  f += s.frames - transition;
}
const total = (f + transition) / fps;
const N = Math.ceil(total * RATE);
const L = new Float32Array(N);
const R = new Float32Array(N);

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

// One chord per scene after the hook. MIDI notes.
const CHORDS = [
  [50, 57, 62, 64, 66], // D add9
  [47, 54, 59, 62, 66], // Bm7
  [43, 50, 55, 59, 66], // Gmaj7
  [45, 52, 57, 61, 64], // A
  [42, 50, 57, 62, 66], // D/F#
  [40, 52, 55, 59, 62], // Em7
  [43, 50, 59, 62, 67], // Gmaj
  [45, 52, 57, 62, 64], // Asus4
  [38, 50, 57, 62, 66, 69], // D
];
const BELLS = [74, 78, 81, 79, 76, 83, 81, 78, 74];

function pad(notes, t0, t1, gain) {
  const attack = 1.1;
  const release = 1.6;
  const a = Math.floor(t0 * RATE);
  const b = Math.min(N, Math.floor((t1 + release) * RATE));
  for (const [k, note] of notes.entries()) {
    const freq = hz(note);
    const voiceGain = gain * (note < 48 ? 0.9 : 0.45);
    for (let i = a; i < b; i++) {
      const t = i / RATE;
      const env = smooth((t - t0) / attack) * (t > t1 ? 1 - smooth((t - t1) / release) : 1);
      if (env <= 0) continue;
      const vib = 1 + 0.0025 * Math.sin(2 * Math.PI * 4.8 * t + k);
      const ph = 2 * Math.PI * freq * vib * t;
      const tone = Math.sin(ph) + 0.28 * Math.sin(2 * ph) + 0.08 * Math.sin(3 * ph);
      const detune = Math.sin(ph * 1.004 + 1.3) + 0.25 * Math.sin(2 * ph * 1.004);
      L[i] += voiceGain * env * (tone * 0.65 + detune * 0.35);
      R[i] += voiceGain * env * (tone * 0.35 + detune * 0.65);
    }
  }
}

function bell(note, t0, gain) {
  const freq = hz(note);
  const a = Math.floor(t0 * RATE);
  const b = Math.min(N, a + RATE * 3);
  for (let i = a; i < b; i++) {
    const t = (i - a) / RATE;
    const env = Math.min(1, t * 400) * Math.exp(-t * 2.2);
    const s = Math.sin(2 * Math.PI * freq * t) + 0.4 * Math.sin(2 * Math.PI * freq * 2.76 * t) * Math.exp(-t * 3) + 0.15 * Math.sin(2 * Math.PI * freq * 5.4 * t) * Math.exp(-t * 6);
    L[i] += gain * env * s * 0.9;
    R[i] += gain * env * s * 1.1;
  }
}

function tick(t0, gain, pitch) {
  const a = Math.floor(t0 * RATE);
  const b = Math.min(N, a + Math.floor(RATE * 0.05));
  let seed = a;
  for (let i = a; i < b; i++) {
    const t = (i - a) / RATE;
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    const noise = seed / 2147483648 - 1;
    const s = (Math.sin(2 * Math.PI * pitch * t) * 0.6 + noise * 0.4) * Math.exp(-t * 90);
    L[i] += gain * s;
    R[i] += gain * s;
  }
}

function thump(t0, gain) {
  const a = Math.floor(t0 * RATE);
  const b = Math.min(N, a + Math.floor(RATE * 0.5));
  for (let i = a; i < b; i++) {
    const t = (i - a) / RATE;
    const s = Math.sin(2 * Math.PI * (50 + 60 * Math.exp(-t * 30)) * t) * Math.exp(-t * 7);
    L[i] += gain * s;
    R[i] += gain * s;
  }
}

// Hook: a clock-like tick that speeds up, with a low pulse, until the calm arrives.
const hookEnd = starts[1];
for (let t = 0.05, step = 0.3; t < hookEnd - 0.25; t += step, step = Math.max(0.12, step * 0.95)) {
  tick(t, 0.22, 1800 + (t * 997) % 400);
}
for (let t = 0.05; t < hookEnd - 0.3; t += 0.75) thump(t, 0.35);

for (let s = 1; s < scenes.length; s++) {
  const t0 = starts[s];
  const t1 = s + 1 < scenes.length ? starts[s + 1] + transition / fps : total - 1.4;
  pad(CHORDS[s - 1], t0 - 0.2, t1, 0.07);
  bell(BELLS[s - 1], t0, s === 1 ? 0.22 : 0.12);
}
bell(86, starts[1] + 0.35, 0.08);

// A short stereo echo for space.
for (const [buf, d, fb] of [[L, 0.31, 0.28], [R, 0.37, 0.28]]) {
  const delay = Math.floor(d * RATE);
  for (let i = delay; i < N; i++) buf[i] += buf[i - delay] * fb;
}

// Gentle low-pass, master fade, normalise to -1 dBFS.
for (const buf of [L, R]) {
  let y = 0;
  for (let i = 0; i < N; i++) {
    y += 0.35 * (buf[i] - y);
    buf[i] = y;
  }
}
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / RATE;
  const fade = Math.min(1, t / 0.05) * (t > total - 2 ? Math.max(0, (total - t) / 2) : 1);
  L[i] *= fade;
  R[i] *= fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = 0.89 / peak;

const data = Buffer.alloc(44 + N * 4);
data.write("RIFF", 0);
data.writeUInt32LE(36 + N * 4, 4);
data.write("WAVEfmt ", 8);
data.writeUInt32LE(16, 16);
data.writeUInt16LE(1, 20);
data.writeUInt16LE(2, 22);
data.writeUInt32LE(RATE, 24);
data.writeUInt32LE(RATE * 4, 28);
data.writeUInt16LE(4, 32);
data.writeUInt16LE(16, 34);
data.write("data", 36);
data.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * norm)) * 32767), 44 + i * 4);
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * norm)) * 32767), 46 + i * 4);
}
mkdirSync(new URL("../public/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/score.wav", import.meta.url), data);
console.log(`score.wav: ${total.toFixed(1)}s, ${scenes.length} cues`);
