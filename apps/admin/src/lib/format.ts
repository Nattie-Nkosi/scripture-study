const NUMBER = new Intl.NumberFormat("en-US");

export function fmtNumber(n: number): string {
  return NUMBER.format(n);
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Short device-id for display — keeps the head and tail of a UUID. */
export function shortId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

export type QuestionSource = "ask" | "chapter" | "talk";

export function sourceLabel(source: QuestionSource): string {
  return source === "ask" ? "Ask" : source === "chapter" ? "Chapter" : "Talk";
}

/** Title-case a book slug for display, e.g. "1-nephi" -> "1 Nephi". */
export function titleCaseSlug(slug: string): string {
  return slug
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** A reader-facing chapter label, e.g. ("hebrews", 7) -> "Hebrews 7". */
export function chapterLabel(book: string, chapter: number | null): string {
  const b = titleCaseSlug(book);
  return chapter != null ? `${b} ${chapter}` : b;
}
