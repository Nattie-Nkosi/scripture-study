import Link from "next/link";

import { cn } from "@/lib/utils";
import type { LessonBlock } from "@/lib/come-follow-me/body";
import type { TextSegment } from "@/lib/scripture/reference-linker";

function Segments({ segments }: { segments: TextSegment[] }) {
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

/** A parsed Come, Follow Me lesson: section headings, teaching-idea
 *  sub-headings, "see also" notes, and body prose — with every scripture
 *  reference resolved to an inline reader link. */
export function LessonBody({ blocks }: { blocks: LessonBlock[] }) {
  return (
    <div className="reader-prose mx-auto mt-10 max-w-2xl font-serif text-foreground/90 animate-in fade-in duration-500">
      {blocks.map((block, i) => {
        if (block.type === "section") {
          return (
            <h2
              key={i}
              className="mt-12 mb-2 border-t border-border pt-6 font-sans small-caps text-sm font-medium tracking-wide text-primary first:mt-0 first:border-t-0 first:pt-0"
            >
              <Segments segments={block.segments} />
            </h2>
          );
        }
        if (block.type === "subheading") {
          return (
            <h3
              key={i}
              className="mt-9 mb-1 font-display text-xl font-semibold tracking-tight text-foreground text-balance first:mt-0"
            >
              <Segments segments={block.segments} />
            </h3>
          );
        }
        if (block.type === "note") {
          return (
            <p
              key={i}
              className={cn(
                "mt-3 font-sans text-sm text-muted-foreground",
                "[&_a]:decoration-muted-foreground/40",
              )}
            >
              <Segments segments={block.segments} />
            </p>
          );
        }
        return (
          <p key={i} className="mt-5 first:mt-0">
            <Segments segments={block.segments} />
          </p>
        );
      })}
    </div>
  );
}
