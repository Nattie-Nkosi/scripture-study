import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, Search } from "lucide-react";

import {
  listEntries,
  fetchStudyHelpOrNotFound,
} from "@/lib/study-helps/client";
import {
  isStudyHelpType,
  typeName,
  typeBlurb,
} from "@/lib/study-helps/format";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { buttonVariants } from "@/components/ui/button";

const PAGE_SIZE = 90;

type Props = {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params;
  if (!isStudyHelpType(type)) notFound();
  return { title: typeName(type) };
}

export default async function BrowseWorkPage({ params, searchParams }: Props) {
  const { type } = await params;
  if (!isStudyHelpType(type)) notFound();
  const work = type;

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const data = await fetchStudyHelpOrNotFound(() =>
    listEntries(work, PAGE_SIZE, offset),
  );

  const shownUpTo = offset + data.entries.length;
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  const linkFor = (p: number) =>
    `/study-helps/${work}${p > 1 ? `?page=${p}` : ""}`;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 sm:py-16">
        <Link
          href="/study-helps"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Study Helps
        </Link>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight">
              {typeName(work)}
            </h1>
            <p className="mt-1.5 max-w-lg font-serif text-muted-foreground text-pretty">
              {typeBlurb(work)}
            </p>
          </div>
          <Link
            href={`/study-helps/search?type=${work}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Search /> Search
          </Link>
        </div>

        <p className="mt-6 small-caps text-xs text-muted-foreground">
          {data.total.toLocaleString()} entries · page {page} of{" "}
          {totalPages.toLocaleString()}
        </p>

        <ul className="mt-4 columns-2 gap-x-8 border-t border-border pt-4 sm:columns-3">
          {data.entries.map((entry) => (
            <li key={entry._id} className="break-inside-avoid">
              <Link
                href={`/study-helps/${work}/${entry.slug}`}
                className="block truncate rounded py-1.5 font-serif text-sm text-foreground/90 transition-colors hover:text-primary"
                title={entry.title}
              >
                {entry.title}
              </Link>
            </li>
          ))}
        </ul>

        {(page > 1 || shownUpTo < data.total) && (
          <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
            {page > 1 ? (
              <Link
                href={linkFor(page - 1)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages.toLocaleString()}
            </span>
            {shownUpTo < data.total ? (
              <Link
                href={linkFor(page + 1)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Next →
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
