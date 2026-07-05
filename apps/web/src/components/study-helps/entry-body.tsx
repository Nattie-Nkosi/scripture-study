import type { TextSegment } from "@/lib/scripture/reference-linker";
import { ReferenceText } from "./reference-text";

/** A study-help entry's body: each content block is a paragraph, with every
 *  scripture citation resolved to an inline reader link. Bible Dictionary
 *  entries read as prose; the guides and index read as citation lists. */
export function EntryBody({ paragraphs }: { paragraphs: TextSegment[][] }) {
  return (
    <div className="reader-prose mx-auto mt-8 max-w-2xl font-serif text-foreground/90 animate-in fade-in duration-500">
      {paragraphs.map((segments, i) => (
        <p key={i} className="mt-5 first:mt-0">
          <ReferenceText segments={segments} />
        </p>
      ))}
    </div>
  );
}
