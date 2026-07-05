import "server-only";

import { getBookIndexById } from "@/lib/scripture/reference-index";
import {
  normalizeSpans,
  toSegments,
  type ReferenceSpan,
  type TextSegment,
} from "@/lib/scripture/reference-linker";
import type { EntryContentBlock, EntryReference } from "./types";

type BookIndex = Awaited<ReturnType<typeof getBookIndexById>>;

/** The Study Helps API ships every citation already located (offsets) and
 *  resolved (volume/book/chapter/verse), so — unlike free prose — no finder is
 *  needed. We only map each parsed book id to its volume to build a reader URL,
 *  and drop the rare reference whose book isn't in our index (left as plain
 *  text). */
export function referenceSpans(
  refs: EntryReference[],
  index: BookIndex,
): ReferenceSpan[] {
  const spans: ReferenceSpan[] = [];
  for (const r of refs) {
    const p = r.parsed;
    if (!p?.book || !p.chapter) continue;
    const info = index.get(p.book);
    if (!info) continue;
    const verse = p.verses?.[0]?.start;
    spans.push({
      start: r.start,
      end: r.end,
      url: `/read/${info.volumeId}/${p.book}/${p.chapter}${verse ? `#v${verse}` : ""}`,
    });
  }
  return normalizeSpans(spans);
}

/** Split one snippet of text into linked/plain segments using its references. */
export async function linkText(
  text: string,
  refs: EntryReference[],
): Promise<TextSegment[]> {
  const index = await getBookIndexById();
  return toSegments(text, referenceSpans(refs, index));
}

/** Resolve every content block of an entry to inline-linked segments, in order. */
export async function linkEntryContent(
  content: EntryContentBlock[],
): Promise<TextSegment[][]> {
  const index = await getBookIndexById();
  return content.map((block) =>
    toSegments(block.text, referenceSpans(block.references, index)),
  );
}
