import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="font-serif text-6xl font-semibold text-primary/70">404</p>
        <h1 className="mt-4 font-serif text-2xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="mt-2 text-muted-foreground text-pretty">
          We couldn’t find that page. It may have moved, or the link may be
          broken.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/read" className={buttonVariants()}>
            Open the library
          </Link>
          <Link href="/search" className={buttonVariants({ variant: "outline" })}>
            Search
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
