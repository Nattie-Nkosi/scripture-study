// The shared highlight palette for both the scripture reader (verse highlights)
// and the conference talk reader (paragraph highlights), so the two stay
// visually identical. `swatch` colors the picker dot; `text` tints the
// highlighted prose (with a dark-mode variant).

import type { HighlightColor } from "./types";

export const HIGHLIGHTS: {
  key: HighlightColor;
  label: string;
  swatch: string;
  text: string;
}[] = [
  { key: "yellow", label: "Yellow", swatch: "bg-yellow-300", text: "bg-yellow-200/70 dark:bg-yellow-300/20" },
  { key: "green", label: "Green", swatch: "bg-green-300", text: "bg-green-200/70 dark:bg-green-300/20" },
  { key: "blue", label: "Blue", swatch: "bg-sky-300", text: "bg-sky-200/70 dark:bg-sky-300/20" },
  { key: "pink", label: "Pink", swatch: "bg-pink-300", text: "bg-pink-200/70 dark:bg-pink-300/20" },
];

export function highlightClass(color: HighlightColor | null): string {
  return HIGHLIGHTS.find((h) => h.key === color)?.text ?? "";
}
