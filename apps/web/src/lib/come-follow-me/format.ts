// Pure display helpers — safe to import from both server and client components.

const SMALL_WORDS = new Set(["of", "and", "the", "for", "to", "in"]);

/** Split a lesson body into display paragraphs on blank lines, dropping empties. */
export function lessonParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+\n/g, "\n").trim())
    .filter(Boolean);
}

/** Turn a manual id into a readable curriculum label, e.g.
 *  "come-follow-me-for-home-and-church-old-testament-2026" -> "Old Testament". */
export function manualName(manualId: string): string {
  const slug = manualId
    .replace(/^come-follow-me-for-home-and-church-/, "")
    .replace(/-\d{4}$/, "");
  if (!slug) return "Come, Follow Me";
  return slug
    .split("-")
    .map((word, i) =>
      i > 0 && SMALL_WORDS.has(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

/** Estimated reading time in whole minutes (≥1) at an unhurried ~200 wpm. */
export function readingTimeMinutes(text: string): number {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / 200));
}
