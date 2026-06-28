import Link from "next/link";
import { CloudOff } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Offline",
};

export default function OfflinePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-5 py-20 text-center sm:py-28">
        <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <CloudOff className="size-7" />
        </span>
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          You&rsquo;re offline
        </h1>
        <p className="mt-3 max-w-prose font-serif leading-relaxed text-muted-foreground">
          This page needs a connection to load. Chapters and talks you&rsquo;ve
          already opened stay available offline — and your notes, highlights, and
          bookmarks are safe on this device.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/read"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            Open the library
          </Link>
          <Link
            href="/study"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            My study
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
