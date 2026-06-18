import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Ornament } from "@/components/ornament";
import { buttonVariants } from "@/components/ui/button";

const VOLUMES = [
  "Old Testament",
  "New Testament",
  "Book of Mormon",
  "Doctrine & Covenants",
  "Pearl of Great Price",
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="small-caps text-sm text-primary">A study edition</p>

        <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight text-balance sm:text-7xl">
          A clearer way to read scripture
        </h1>

        <Ornament className="my-8" />

        <p className="max-w-xl font-serif text-lg leading-relaxed text-muted-foreground text-pretty">
          A calm reader for the Bible, Book of Mormon, Doctrine and Covenants,
          and Pearl of Great Price — with plain-English clarity and a study
          assistant grounded in the verses themselves.
        </p>

        <Link
          href="/read"
          className={`${buttonVariants({ size: "lg" })} mt-9`}
        >
          Open the library <ArrowRight />
        </Link>

        <Link
          href="/talks"
          className="mt-4 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          Or read General Conference talks →
        </Link>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 small-caps text-xs text-muted-foreground">
          {VOLUMES.map((v, i) => (
            <span key={v} className="flex items-center gap-x-5">
              {i > 0 && <span className="text-primary/40">·</span>}
              {v}
            </span>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
