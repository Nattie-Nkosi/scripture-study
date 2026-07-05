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
        <p className="small-caps text-sm text-primary">Study Helps</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Look deeper
        </h1>
        <p className="mt-4 max-w-xl font-serif text-lg leading-relaxed text-muted-foreground text-pretty">
          The scripture study aids — the Bible Dictionary, Topical Guide, index,
          and Joseph Smith Translation — with every citation linked straight into
          the reader.
        </p>

        <form
          action="/study-helps/search"
          method="get"
          className="mt-8 flex flex-col gap-2 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              type="search"
              placeholder="Search the study helps…"
              aria-label="Search the study helps"
              className="w-full rounded-lg border border-input bg-card py-2.5 pr-3 pl-9 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 sm:text-sm"
            />
          </div>
        </form>

        <Ornament className="my-12" />

        <ul className="grid gap-4 sm:grid-cols-2">
          {STUDY_HELP_TYPES.map((type) => {
            const count = counts.get(type);
            return (
              <li key={type}>
                <Link
                  href={`/study-helps/${type}`}
                  className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
                >
                  <span className="font-display text-xl font-semibold tracking-tight transition-colors group-hover:text-primary">
                    {typeName(type)}
                  </span>
                  {count != null && (
                    <span className="mt-0.5 small-caps text-xs text-muted-foreground">
                      {count.toLocaleString()} entries
                    </span>
                  )}
                  <span className="mt-2 flex-1 font-serif text-sm leading-relaxed text-muted-foreground">
                    {typeBlurb(type)}
                  </span>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
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
