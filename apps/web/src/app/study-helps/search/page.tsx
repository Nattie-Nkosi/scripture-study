import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, Search } from "lucide-react";

import { isStudyHelpType, typeShortName } from "@/lib/study-helps/format";
import {
  StudyHelpSearchResults,
  STUDY_HELP_PAGE_SIZE,
} from "@/components/study-helps/search-results";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { cn } from "@/lib/utils";
import type { StudyHelpType } from "@/lib/study-helps/types";

export const metadata = { title: "Search Study Helps" };

const FILTERS: { value: "" | StudyHelpType; label: string }[] = [
  { value: "", label: "All" },
  { value: "bd", label: typeShortName("bd") },
  { value: "tg", label: typeShortName("tg") },
  { value: "index", label: typeShortName("index") },
  { value: "jst", label: typeShortName("jst") },
];

type Props = {
  searchParams: Promise<{ q?: string; type?: string; page?: string }>;
};

export default async function StudyHelpsSearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const type =
    sp.type && isStudyHelpType(sp.type) ? (sp.type as StudyHelpType) : undefined;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const offset = (page - 1) * STUDY_HELP_PAGE_SIZE;

  const linkFor = (p: number) => {
    const params = new URLSearchParams({ q });
    if (type) params.set("type", type);
    if (p > 1) params.set("page", String(p));
    return `/study-helps/search?${params.toString()}`;
  };

  const filterHref = (value: "" | StudyHelpType) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (value) params.set("type", value);
    const qs = params.toString();
    return `/study-helps/search${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <Link
          href="/study-helps"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Study Helps
        </Link>

        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">
          Search Study Helps
        </h1>
        <p className="mt-2 mb-6 text-muted-foreground">
          Search the Bible Dictionary, Topical Guide, index, and Joseph Smith
          Translation.
        </p>

        <form action="/study-helps/search" method="get" className="flex flex-col gap-2 sm:flex-row">
          {type && <input type="hidden" name="type" value={type} />}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              type="search"
              defaultValue={q}
              autoFocus
              placeholder="Search the study helps…"
              aria-label="Search the study helps"
              className="w-full rounded-lg border border-input bg-card py-2.5 pr-3 pl-9 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 sm:text-sm"
            />
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const active = (type ?? "") === f.value;
            return (
              <Link
                key={f.value || "all"}
                href={filterHref(f.value)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        {q ? (
          <Suspense
            key={`${type ?? "all"}:${q}:${page}`}
            fallback={<ResultsSkeleton />}
          >
            <StudyHelpSearchResults
              q={q}
              type={type}
              page={page}
              offset={offset}
              linkFor={linkFor}
            />
          </Suspense>
        ) : (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Try a topic like{" "}
            <span className="font-medium">&ldquo;faith&rdquo;</span> or a name
            like <span className="font-medium">&ldquo;Melchizedek&rdquo;</span>.
          </p>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div className="mt-8" aria-hidden>
      <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      <ul className="mt-4 divide-y divide-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="py-4">
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3.5 w-full animate-pulse rounded bg-muted" />
          </li>
        ))}
      </ul>
    </div>
  );
}
