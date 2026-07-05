import "server-only";

import { findReferences } from "@/lib/scripture/client";
import { getBookIndexById } from "@/lib/scripture/reference-index";
import { matchRestorationReference } from "@/lib/scripture/restoration-refs";

/** A lesson's scripture reference string, resolved to a reader link when it
 *  names a chapter we can locate; `url` is null when it doesn't (e.g.
 *  "Introduction to the Old Testament"), so the caller renders it as plain text. */
export interface LessonReference {
  label: string;
  url: string | null;
}

/** Resolve one reference to the chapter it opens on. Come, Follow Me references
 *  are chapter-level study blocks (often ranges like "Genesis 1–2"), so we link
 *  to the first chapter and omit any verse anchor. */
async function resolveOne(ref: string): Promise<LessonReference> {
  const label = ref.trim();
  if (!label) return { label: ref, url: null };

  const restoration = matchRestorationReference(label);
  if (restoration && restoration.volume) {
    return {
      label,
      url: `/read/${restoration.volume}/${restoration.book}/${restoration.chapter}`,
    };
  }

  try {
    const res = await findReferences(label);
    const target = res.references
      .flatMap((f) => f.reference ?? [])
      .find((t) => t.type === "scripture" && t.book);
    const chapter = target?.chapters?.[0]?.start;
    if (target && chapter) {
      const info = (await getBookIndexById()).get(target.book);
      if (info) {
        return {
          label,
          url: `/read/${info.volumeId}/${target.book}/${chapter}`,
        };
      }
    }
  } catch {
    // Fall through to an unlinked reference on any lookup failure.
  }

  return { label, url: null };
}

/** Resolve each of a lesson's scripture references to a reader link (or null),
 *  preserving order. Lookups are cached and run in parallel. */
export function resolveLessonReferences(
  refs: string[],
): Promise<LessonReference[]> {
  return Promise.all(refs.map(resolveOne));
}
