import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { listVolumes, ScriptureApiError } from "@/lib/scripture/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ContinueReading } from "@/components/reader/continue-reading";

export const metadata = {
  title: "Library",
};

const VOLUME_SUBTITLES: Record<string, string> = {
  oldtestament: "Genesis – Malachi",
  newtestament: "Matthew – Revelation",
  bookofmormon: "1 Nephi – Moroni",
  doctrineandcovenants: "Revelations of the Restoration",
  pearlofgreatprice: "Moses, Abraham, and more",
};

const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];

export default async function LibraryPage() {
  let volumes;
  try {
    const data = await listVolumes();
    volumes = data.volumes;
  } catch (err) {
    const status = err instanceof ScriptureApiError ? err.status : undefined;
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
          <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Couldn’t load the library{status ? ` (HTTP ${status})` : ""}. The
            scripture service may be temporarily unavailable — please try again.
          </p>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-14 sm:py-20">
        <p className="eyebrow text-primary">Library</p>
        <h1 className="mt-3 font-display text-5xl font-light tracking-tight sm:text-6xl">
          The Standard Works
        </h1>

        <ContinueReading className="mt-10" />

        <ol className="mt-12 border-y border-border">
          {volumes.map((v, i) => (
            <li key={v._id} className="border-b border-border last:border-b-0">
              <Link
                href={`/read/${v._id}`}
                className="group flex items-baseline gap-5 py-6 transition-colors"
              >
                <span className="w-8 shrink-0 font-serif text-base text-primary/70 italic">
                  {NUMERALS[i] ?? i + 1}
                </span>
                <span className="flex-1">
                  <span className="block font-display text-2xl tracking-tight transition-colors group-hover:text-primary">
                    {v.title}
                  </span>
                  {VOLUME_SUBTITLES[v._id] && (
                    <span className="mt-1 block eyebrow text-muted-foreground">
                      {VOLUME_SUBTITLES[v._id]}
                    </span>
                  )}
                </span>
                <ChevronRight className="size-5 shrink-0 translate-x-0 self-center text-muted-foreground opacity-0 transition-all group-hover:translate-x-1 group-hover:text-primary group-hover:opacity-100" />
              </Link>
            </li>
          ))}
        </ol>
      </main>
      <SiteFooter />
    </>
  );
}
