import Link from "next/link";

import type { TextSegment } from "@/lib/scripture/reference-linker";

/** Render pre-split text where reference segments carry a reader link. Shared by
 *  the entry body and search snippets so both link citations identically. */
export function ReferenceText({ segments }: { segments: TextSegment[] }) {
  return (
    <>
      {segments.map((seg, i) =>
        seg.url ? (
          <Link
            key={i}
            href={seg.url}
            className="font-medium text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:decoration-primary"
          >
            {seg.text}
          </Link>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}
