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
import { Ornament } from "@/components/ornament";

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

const NUMERALS = ["i", "ii", "iii", "iv", "v", "vi"];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 sm:py-28">
        <section className="max-w-2xl animate-in fade-in duration-700">
          <p className="flex items-center gap-3 eyebrow text-primary">
            <span aria-hidden className="size-1.5 rotate-45 bg-primary/70" />
            A study edition
          </p>

          <h1 className="mt-6 font-display text-[2.75rem] leading-[1.02] font-light tracking-tight sm:text-[4.5rem]">
            A clearer way to <em className="text-primary">read</em> scripture
          </h1>

          <p className="mt-7 max-w-lg font-serif text-lg leading-relaxed text-muted-foreground text-pretty">
            The standard works, General Conference, and Come, Follow Me in one
            calm edition — with notes, study helps, and an assistant grounded
            in the text itself.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              href="/read"
              className="group inline-flex items-center gap-2 border-b border-primary pb-1 font-serif text-lg text-foreground transition-colors hover:text-primary"
            >
              Open the library
              <ArrowRight className="size-4 text-primary transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/ask"
              className="group inline-flex items-center gap-1.5 font-serif text-lg text-muted-foreground transition-colors hover:text-foreground"
            >
              Ask a question
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </section>

        <section className="mt-24 sm:mt-32">
          <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            <Suspense fallback={<ThisWeekCardSkeleton />}>
              <ThisWeekCard />
            </Suspense>
            <ContinueReading className="self-start border-b-0 pt-5" />
          </div>
        </section>

        <Ornament className="mt-20 sm:mt-24" />
        <DailyVerse className="mt-10" />
        <Ornament className="mt-12" />

        <section className="mt-24 sm:mt-32">
          <h2 className="eyebrow text-muted-foreground">Contents</h2>
          <ol className="mt-4 border-b border-border">
            {SECTIONS.map(({ href, label, description }, i) => (
              <li key={href} className="border-t border-border">
                <Link
                  href={href}
                  className="group flex items-baseline gap-5 py-5 sm:gap-8"
                >
                  <span className="w-6 shrink-0 font-serif text-sm text-primary/70 italic">
                    {NUMERALS[i]}.
                  </span>
                  <span className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-6">
                    <span className="font-display text-2xl tracking-tight transition-colors group-hover:text-primary sm:w-56 sm:shrink-0">
                      {label}
                    </span>
                    <span className="mt-1 block font-serif text-[0.95rem] leading-relaxed text-muted-foreground sm:mt-0">
                      {description}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 self-center -translate-x-1 text-primary opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
