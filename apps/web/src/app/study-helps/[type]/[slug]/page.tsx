import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getEntry, fetchStudyHelpOrNotFound } from "@/lib/study-helps/client";
import { linkEntryContent } from "@/lib/study-helps/references";
import { isStudyHelpType, typeName } from "@/lib/study-helps/format";
import { SiteHeader } from "@/components/site-header";
import { ReadingProgress } from "@/components/reader/reading-progress";
import { BackToTop } from "@/components/reader/back-to-top";
import { EntryBody } from "@/components/study-helps/entry-body";
import { Ornament } from "@/components/ornament";
import type { StudyHelpType } from "@/lib/study-helps/types";

type Props = {
  params: Promise<{ type: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type, slug } = await params;
  if (!isStudyHelpType(type)) return { title: "Study Helps" };
  const entry = await fetchStudyHelpOrNotFound(() => getEntry(`${type}-${slug}`));
  return { title: `${entry.title} — ${typeName(type)}` };
}

/** Derive a see-also entry's work from its id ("tg-dwell" -> "tg"), falling
 *  back to the current entry's work when the prefix isn't a known type. */
function seeAlsoType(entryId: string, fallback: StudyHelpType): StudyHelpType {
  const prefix = entryId.slice(0, entryId.indexOf("-"));
  return isStudyHelpType(prefix) ? prefix : fallback;
}

export default async function EntryPage({ params }: Props) {
  const { type, slug } = await params;
  if (!isStudyHelpType(type)) notFound();

  const entry = await fetchStudyHelpOrNotFound(() =>
    getEntry(`${type}-${slug}`),
  );
  const paragraphs = await linkEntryContent(entry.content);

  return (
    <>
      <SiteHeader />
      <ReadingProgress />

      <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
        <Link
          href={`/study-helps/${type}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          {typeName(type)}
        </Link>

        <div className="mt-6 text-center animate-in fade-in duration-500">
          <p className="small-caps text-sm text-primary">{typeName(type)}</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl text-balance">
            {entry.title}
          </h1>
          <Ornament className="mt-7" />
        </div>

        <EntryBody paragraphs={paragraphs} />

        {entry.seeAlso.length > 0 && (
          <div className="mx-auto mt-12 max-w-2xl border-t border-border pt-6">
            <p className="small-caps text-sm text-primary">See also</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {entry.seeAlso.map((ref) => (
                <Link
                  key={ref.entryId}
                  href={`/study-helps/${seeAlsoType(ref.entryId, type)}/${ref.slug}`}
                  className="rounded-full border border-border px-3 py-1 font-serif text-sm text-foreground/90 transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {ref.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <BackToTop />
    </>
  );
}
