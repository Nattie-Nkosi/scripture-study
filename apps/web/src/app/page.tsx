import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookMarked,
  Bookmark,
  CalendarDays,
  Library,
  Mic,
  Sparkles,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Ornament } from "@/components/ornament";
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
    icon: Library,
    description:
      "The standard works — Old Testament through the Pearl of Great Price.",
  },
  {
    href: "/talks",
    label: "General Conference",
    icon: Mic,
    description: "Talks from 1971 to today, by conference or by speaker.",
  },
  {
    href: "/come-follow-me",
    label: "Come, Follow Me",
    icon: CalendarDays,
    description: "The weekly home- and church-study curriculum.",
  },
  {
    href: "/study-helps",
    label: "Study Helps",
    icon: BookMarked,
    description:
      "Bible Dictionary, Topical Guide, index, and Joseph Smith Translation.",
  },
  {
    href: "/ask",
    label: "Ask",
    icon: Sparkles,
    description: "A study assistant grounded in the scriptures and talks.",
  },
  {
    href: "/study",
    label: "My study",
    icon: Bookmark,
    description: "Your highlights, notes, and bookmarks in one place.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-6 py-16 text-center sm:py-24">
        <div className="flex max-w-2xl flex-col items-center">
          <p className="small-caps text-sm text-primary">A study edition</p>

          <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight text-balance sm:text-7xl">
            A clearer way to read scripture
          </h1>

          <Ornament className="my-8" />

          <p className="max-w-xl font-serif text-lg leading-relaxed text-muted-foreground text-pretty">
            The standard works, General Conference, and the weekly Come, Follow
            Me lessons — in a calm, readable edition. Highlight and take notes,
            look things up in the study helps, and ask a study assistant
            grounded in the text itself.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/read" className={buttonVariants({ size: "lg" })}>
              Open the library <ArrowRight />
            </Link>
            <Link
              href="/ask"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Ask a question
            </Link>
          </div>
        </div>

        <ul className="mt-16 grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map(({ href, label, icon: Icon, description }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex h-full flex-col items-start rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/40"
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                  <Icon className="size-5" />
                </span>
                <span className="mt-3 font-display text-lg font-semibold tracking-tight transition-colors group-hover:text-primary">
                  {label}
                </span>
                <span className="mt-1 font-serif text-sm leading-relaxed text-muted-foreground">
                  {description}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-12 flex w-full max-w-md flex-col gap-3 text-left">
          <Suspense fallback={<ThisWeekCardSkeleton />}>
            <ThisWeekCard />
          </Suspense>
          <ContinueReading />
          <DailyVerse />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
