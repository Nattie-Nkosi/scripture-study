import "server-only";

import { findReferences } from "@/lib/scripture/client";
import { getBookIndexById } from "@/lib/scripture/reference-index";
import { matchRestorationReference } from "@/lib/scripture/restoration-refs";

/** A located scripture target for a reference chip: enough to build a reader
 *  link and fetch a verse preview. `verse` is the named verse, or 1 for a
 *  chapter-only reference; `hasVerse` records which so the reader link only
 *  carries a verse anchor when the reference actually named one. */
export interface ReferenceTarget {
  book: string;
  chapter: number;
  verse: number;
  volume: string;
  hasVerse: boolean;
}

/** A lesson's scripture reference string. `target` is null when the string
 *  isn't a locatable chapter (e.g. "Introduction to the Old Testament"), so the
 *  caller renders it as plain text. */
export interface LessonReference {
  label: string;
  target: ReferenceTarget | null;
}

async function resolveOne(ref: string): Promise<LessonReference> {
  const label = ref.trim();
  if (!label) return { label: ref, target: null };

  const restoration = matchRestorationReference(label);
  if (restoration && restoration.volume) {
    return {
      label,
      target: {
        book: restoration.book,
        chapter: restoration.chapter,
        verse: restoration.verse,
        volume: restoration.volume,
        hasVerse: restoration.prettyString.includes(":"),
      },
    };
  }

  try {
    const res = await findReferences(label);
    const target = res.references
      .flatMap((f) => f.reference ?? [])
      .find((t) => t.type === "scripture" && t.book);
    const chapter = target?.chapters?.[0];
    if (target && chapter?.start) {
      const info = (await getBookIndexById()).get(target.book);
      if (info) {
        const namedVerse = chapter.verses?.[0]?.start;
        return {
          label,
          target: {
            book: target.book,
            chapter: chapter.start,
            verse: namedVerse ?? 1,
            volume: info.volumeId,
            hasVerse: namedVerse != null,
          },
        };
      }
    }
  } catch {
    // Fall through to an unlinked reference on any lookup failure.
  }

  return { label, target: null };
}

/** Resolve each of a lesson's scripture references to a chapter/verse target
 *  (or null), preserving order. Lookups are cached and run in parallel. */
export function resolveLessonReferences(
  refs: string[],
): Promise<LessonReference[]> {
  return Promise.all(refs.map(resolveOne));
}
