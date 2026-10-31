import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

import { listTypes } from "@/lib/study-helps/client";
import {
  STUDY_HELP_TYPES,
  typeName,
  typeBlurb,
} from "@/lib/study-helps/format";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Ornament } from "@/components/ornament";
import type { StudyHelpType } from "@/lib/study-helps/types";

export const metadata = {
  title: "Study Helps",
};

/** Live entry counts, or an empty map if the service is unavailable — the cards
 *  render either way. */
async function entryCounts(): Promise<Map<StudyHelpType, number>> {
  try {
    const { types } = await listTypes();
    return new Map(types.map((t) => [t.type, t.entryCount]));
  } catch {
    return new Map();
  }
}

export default async function StudyHelpsPage() {
  const counts = await entryCounts();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-14 sm:py-20">
        <h1 className="font-display text-5xl font-light tracking-tight sm:text-6xl">
          Study Helps
          <span className="mt-2 block text-[0.5em] leading-tight">Look deeper</span>
        </h1>
        <p className="mt-4 max-w-xl font-serif text-lg leading-relaxed text-muted-foreground text-pretty">
          The scripture study aids (the Bible Dictionary, Topical Guide, index,
          and Joseph Smith Translation) with every citation linked straight into
          the reader.
        </p>

        <form
          action="/study-helps/search"
          method="get"
          className="mt-8 flex flex-col gap-2 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search strokeWidth={1.5} className="pointer-events-none absolute top-1/2 left-0.5 size-4.5 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              type="search"
              placeholder="Search the study helps…"
              aria-label="Search the study helps"
              className="w-full border-0 border-b border-field-edge bg-transparent py-3 pr-3 pl-8 font-serif text-xl outline-none transition-colors placeholder:text-muted-foreground/60 placeholder:italic focus-visible:border-primary"
            />
          </div>
        </form>

        <Ornament className="my-16" />

        <ul className="grid border-t border-border sm:grid-cols-2 sm:gap-x-10">
          {STUDY_HELP_TYPES.map((type) => {
            const count = counts.get(type);
            return (
              <li key={type}>
                <Link
                  href={`/study-helps/${type}`}
                  className="group flex h-full flex-col border-b border-border py-6"
                >
                  <span className="font-display text-2xl tracking-tight transition-colors group-hover:text-primary">
                    {typeName(type)}
                  </span>
                  {count != null && (
                    <span className="mt-1 eyebrow text-muted-foreground">
                      {count.toLocaleString()} entries
                    </span>
                  )}
                  <span className="mt-2 flex-1 font-serif text-[0.95rem] leading-relaxed text-muted-foreground">
                    {typeBlurb(type)}
                  </span>
                  <span className="mt-3 inline-flex items-center gap-1.5 font-serif text-primary italic">
                    Browse
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}
