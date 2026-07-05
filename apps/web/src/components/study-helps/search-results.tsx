import Link from "next/link";

import {
  searchStudyHelps,
  StudyHelpsApiError,
} from "@/lib/study-helps/client";
import { referenceSpans } from "@/lib/study-helps/references";
import { typeShortName } from "@/lib/study-helps/format";
import { getBookIndexById } from "@/lib/scripture/reference-index";
import { toSegments } from "@/lib/scripture/reference-linker";
import { buttonVariants } from "@/components/ui/button";
import type { StudyHelpType } from "@/lib/study-helps/types";
import { ReferenceText } from "./reference-text";

export const STUDY_HELP_PAGE_SIZE = 20;

/** Search results for the reference works, shared by the in-section search page
 *  and the global /search "Study Helps" scope. `linkFor` builds the pager URLs
 *  so each caller keeps its own route and query params. */
export async function StudyHelpSearchResults({
  q,
  type,
  page,
  offset,
  linkFor,
}: {
  q: string;
  type?: StudyHelpType;
  page: number;
  offset: number;
  linkFor: (page: number) => string;
}) {
  let data;
  try {
    data = await searchStudyHelps(q, {
      type,
      limit: STUDY_HELP_PAGE_SIZE,
      offset,
    });
  } catch (err) {
    const status = err instanceof StudyHelpsApiError ? err.status : undefined;
    return (
      <p className="mt-10 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Search is unavailable right now{status ? ` (HTTP ${status})` : ""}. Please
        try again.
      </p>
    );
  }

  if (data.results.length === 0) {
    return (
      <p className="mt-10 text-center text-sm text-muted-foreground">
        No study helps for <span className="font-medium">“{q}”</span>.
      </p>
    );
  }

  const index = await getBookIndexById();
  const shownUpTo = offset + data.results.length;

  return (
    <div className="mt-8 animate-in fade-in duration-300">
      <p className="text-sm text-muted-foreground">
        {data.total.toLocaleString()} result{data.total === 1 ? "" : "s"} ·
        showing {offset + 1}–{shownUpTo}
      </p>

      <ul className="mt-4 divide-y divide-border">
        {data.results.map((r, i) => {
          const segments = toSegments(
            r.text,
            referenceSpans(r.references, index),
          );
          return (
            <li key={`${r.entryId}-${i}`} className="py-4">
              <Link
                href={`/study-helps/${r.type}/${r.slug}`}
                className="group block rounded-md transition-colors hover:bg-accent/30"
              >
                <p className="small-caps text-xs text-muted-foreground">
                  {typeShortName(r.type)}
                </p>
                <p className="mt-0.5 font-serif text-base font-semibold text-primary text-balance">
                  {r.title}
                </p>
              </Link>
              <p className="mt-1.5 line-clamp-3 font-serif text-sm leading-relaxed text-foreground/90">
                <ReferenceText segments={segments} />
              </p>
            </li>
          );
        })}
      </ul>

      {(page > 1 || shownUpTo < data.total) && (
        <div className="mt-8 flex items-center justify-between">
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
          <span className="text-xs text-muted-foreground">Page {page}</span>
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
    </div>
  );
}
