import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          Read the scriptures, clearly.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground text-pretty">
          A calm, modern reader for the LDS standard works — with AI-powered
          Simple English and a study assistant grounded in the actual verse text.
        </p>

        <Link
          href="/read"
          className={`${buttonVariants({ size: "lg" })} mt-8`}
        >
          Open the library <ArrowRight />
        </Link>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border px-3 py-1">Old & New Testament</span>
          <span className="rounded-full border px-3 py-1">Book of Mormon</span>
          <span className="rounded-full border px-3 py-1">Doctrine & Covenants</span>
          <span className="rounded-full border px-3 py-1">Pearl of Great Price</span>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
