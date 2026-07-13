import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ContinueReading } from "@/components/reader/continue-reading";
import { DailyVerse } from "@/components/home/daily-verse";
import {
  ThisWeekCard,
  ThisWeekCardSkeleton,
} from "@/components/come-follow-me/this-week-card";
import { buttonVariants } from "@/components/ui/button";

const SECTIONS = [
  {
    href: "/read",
    label: "Library",
    description:
      "The standard works — Old Testament through the Pearl of Great Price.",
  },
  {
    href: "/talks",
    label: "General Conference",
    description: "Talks from 1971 to today, by conference or by speaker.",
  },
  {
    href: "/come-follow-me",
    label: "Come, Follow Me",
    description: "The weekly home- and church-study curriculum.",
  },
  {
    href: "/study-helps",
    label: "Study Helps",
    description:
      "Bible Dictionary, Topical Guide, index, and Joseph Smith Translation.",
  },
  {
    href: "/ask",
    label: "Ask",
    description: "A study assistant grounded in the scriptures and talks.",
  },
  {
    href: "/study",
    label: "My study",
    description: "Your highlights, notes, and bookmarks in one place.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 sm:py-24">
        <section className="max-w-2xl">
          <p className="small-caps text-sm text-primary">A study edition</p>

          <h1 className="mt-4 font-display text-[2.5rem] leading-[1.06] font-semibold tracking-tight text-balance sm:text-6xl">
            A clearer way to read scripture
          </h1>

          <p className="mt-6 max-w-xl font-serif text-lg leading-relaxed text-muted-foreground text-pretty">
            The standard works, General Conference, and the weekly Come, Follow
            Me lessons — in a calm, readable edition. Highlight and take notes,
            look things up in the study helps, and ask a study assistant
            grounded in the text itself.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/read" className={buttonVariants({ size: "lg" })}>
              Open the library <ArrowRight />
            </Link>
            <Link
              href="/ask"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-foreground"
            >
              Ask a question
              <ArrowUpRight className="size-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
            </Link>
          </div>
        </section>

        <section className="mt-16 sm:mt-24">
          <h2 className="small-caps text-xs text-muted-foreground">Contents</h2>
          <ol className="mt-3 border-b border-border">
            {SECTIONS.map(({ href, label, description }, i) => (
              <li key={href} className="border-t border-border">
                <Link
                  href={href}
                  className="group -mx-3 flex items-start gap-4 rounded-lg px-3 py-5 transition-colors hover:bg-muted/50 sm:gap-6"
                >
                  <span className="mt-1 w-6 shrink-0 font-display text-sm tabular-nums text-primary/80">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-display text-xl font-medium tracking-tight transition-colors group-hover:text-primary">
                      {label}
                    </span>
                    <span className="mt-1 block font-serif text-sm leading-relaxed text-muted-foreground">
                      {description}
                    </span>
                  </span>
                  <ArrowUpRight className="mt-1.5 size-4 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:text-primary group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16 sm:mt-20">
          <h2 className="small-caps text-xs text-muted-foreground">Today</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Suspense fallback={<ThisWeekCardSkeleton />}>
              <ThisWeekCard />
            </Suspense>
            <ContinueReading />
            <DailyVerse className="sm:col-span-2" />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
