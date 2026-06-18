import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { listVolumes, ScriptureApiError } from "@/lib/scripture/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

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
        <main className="mx-auto w-full max-w-3xl px-4 py-16">
          <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Couldn’t load the library{status ? ` (HTTP ${status})` : ""}. The
            scripture service may be temporarily unavailable — please try again.
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:py-16">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          The Standard Works
        </h1>
        <p className="mt-2 text-muted-foreground">
          Choose a volume to begin reading.
        </p>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {volumes.map((v) => (
            <li key={v._id}>
              <Link
                href={`/read/${v._id}`}
                className="group flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent/40 hover:shadow-sm active:translate-y-0"
              >
                <span>
                  <span className="block font-serif text-lg font-medium">
                    {v.title}
                  </span>
                  {VOLUME_SUBTITLES[v._id] && (
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {VOLUME_SUBTITLES[v._id]}
                    </span>
                  )}
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}
