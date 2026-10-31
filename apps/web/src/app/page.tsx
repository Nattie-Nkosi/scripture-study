import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
      "The standard works, from the Old Testament to the Pearl of Great Price.",
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
    href: "/organization",
    label: "Church Organization",
    description: "A map of Church leaders and members, from the General Handbook.",
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

const NUMERALS = ["i", "ii", "iii", "iv", "v", "vi", "vii"];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-20 sm:py-32">
        <section className="max-w-2xl animate-in fade-in duration-700">
          <h1 className="max-w-[16ch] font-display text-(length:--text-display) leading-[1.02] font-light tracking-(--tracking-display) text-balance [overflow-wrap:break-word]">
            A clearer way <br className="hidden sm:inline" />
            to read scripture
          </h1>

          <p className="mt-8 max-w-[52ch] font-serif text-(length:--text-lead) leading-relaxed text-muted-foreground text-pretty">
            The standard works, General Conference, and Come, Follow Me in one
            calm edition, with notes, study helps, and an assistant grounded
            in the text itself.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              href="/read"
              className="inline-flex h-12 items-center rounded-(--radius-card) bg-(--color-signal-fill) px-7 font-serif text-lg whitespace-nowrap text-(--color-signal-ink) transition-colors duration-(--dur-short) hover:bg-(--color-signal-fill)/90 active:translate-y-px"
            >
              Open the library
            </Link>
            <Link
              href="/ask"
              className="inline-flex h-12 items-center font-serif text-lg whitespace-nowrap text-muted-foreground underline decoration-transparent decoration-1 underline-offset-[0.3em] transition-colors duration-(--dur-short) hover:text-foreground hover:decoration-primary"
            >
              Ask a question
            </Link>
          </div>
        </section>

        <section className="mt-28 sm:mt-36">
          <div className="grid gap-x-12 gap-y-10 sm:grid-cols-2">
            <Suspense fallback={<ThisWeekCardSkeleton />}>
              <ThisWeekCard />
            </Suspense>
            <ContinueReading className="self-start" />
          </div>
        </section>

        <Ornament className="mt-24 sm:mt-32" />
        <DailyVerse className="mt-14" />
        <Ornament className="mt-14" />

        <section className="mt-28 sm:mt-36" aria-labelledby="contents-heading">
          <h2
            id="contents-heading"
            className="font-display text-(length:--text-section) leading-[1.05] font-light tracking-(--tracking-display)"
          >
            Contents
          </h2>
          <ol className="mt-10 border-b border-border">
            {SECTIONS.map(({ href, label, description }, i) => (
              <li key={href} className="border-t border-border">
                <Link
                  href={href}
                  className="group flex items-baseline gap-5 py-6 sm:gap-8"
                >
                  <span className="w-7 shrink-0 font-serif text-base text-primary italic">
                    {NUMERALS[i]}.
                  </span>
                  <span className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-8">
                    <span className="block font-display text-(length:--text-title) leading-tight tracking-tight transition-colors duration-(--dur-short) group-hover:text-primary sm:w-60 sm:shrink-0">
                      {label}
                    </span>
                    <span className="mt-1.5 block font-serif text-base leading-relaxed text-muted-foreground sm:mt-0">
                      {description}
                    </span>
                  </span>
                  <ArrowRight
                    aria-hidden
                    className="size-4 shrink-0 self-center -translate-x-1 text-primary opacity-0 transition-[opacity,transform] duration-(--dur-short) group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
                  />
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
