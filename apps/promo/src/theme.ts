import { loadFont as loadNewsreader } from "@remotion/google-fonts/Newsreader";
import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";

const newsreader = loadNewsreader("normal", { weights: ["300", "400", "500"], subsets: ["latin"] });
loadNewsreader("italic", { weights: ["300", "400"], subsets: ["latin"] });
const geist = loadGeist("normal", { weights: ["400", "500"], subsets: ["latin"] });

export const serif = `${newsreader.fontFamily}, Georgia, serif`;
export const sans = `${geist.fontFamily}, system-ui, sans-serif`;

// Mirrors apps/web/src/app/tokens.css so the video looks like the app.
export type Palette = {
  name: string;
  paper: string;
  card: string;
  ink: string;
  muted: string;
  signal: string;
  rule: string;
};

export const paper: Palette = {
  name: "Paper",
  paper: "oklch(0.982 0.01 84)",
  card: "oklch(0.995 0.006 86)",
  ink: "oklch(0.235 0.016 55)",
  muted: "oklch(0.52 0.02 58)",
  signal: "oklch(0.45 0.125 25)",
  rule: "oklch(0.9 0.014 78)",
};

export const themes: Palette[] = [
  paper,
  {
    name: "Sepia",
    paper: "oklch(0.905 0.048 79)",
    card: "oklch(0.935 0.042 80)",
    ink: "oklch(0.295 0.045 50)",
    muted: "oklch(0.47 0.05 54)",
    signal: "oklch(0.44 0.14 30)",
    rule: "oklch(0.78 0.055 71)",
  },
  {
    name: "Twilight",
    paper: "oklch(0.215 0.048 264)",
    card: "oklch(0.25 0.05 264)",
    ink: "oklch(0.915 0.022 85)",
    muted: "oklch(0.74 0.035 80)",
    signal: "oklch(0.8 0.13 84)",
    rule: "oklch(0.82 0.08 85 / 14%)",
  },
  {
    name: "Dark",
    paper: "oklch(0.19 0.012 60)",
    card: "oklch(0.22 0.013 60)",
    ink: "oklch(0.92 0.014 84)",
    muted: "oklch(0.72 0.018 80)",
    signal: "oklch(0.62 0.14 25)",
    rule: "oklch(1 0 0 / 9%)",
  },
  {
    name: "Night",
    paper: "oklch(0 0 0)",
    card: "oklch(0.135 0.006 60)",
    ink: "oklch(0.9 0.013 84)",
    muted: "oklch(0.68 0.016 80)",
    signal: "oklch(0.64 0.15 25)",
    rule: "oklch(1 0 0 / 12%)",
  },
];

export const plate = "oklch(0.2 0.014 5)";
export const signalFill = "oklch(0.45 0.125 25)";
export const highlight = "oklch(0.86 0.09 80 / 0.75)";
