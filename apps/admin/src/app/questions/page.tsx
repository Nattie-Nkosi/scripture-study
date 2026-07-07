import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import { listQuestions, type QuestionRow } from "@/lib/queries";
import {
  chapterLabel,
  fmtDateTime,
  fmtNumber,
  shortId,
  sourceLabel,
  type QuestionSource,
} from "@/lib/format";
import { Badge, Card, EmptyRow, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const SOURCES: { value: QuestionSource; label: string }[] = [
  { value: "ask", label: "Ask" },
  { value: "chapter", label: "Chapter" },
  { value: "talk", label: "Talk" },
];

function isSource(v: string | undefined): v is QuestionSource {
  return v === "ask" || v === "chapter" || v === "talk";
}

function sourceTone(source: QuestionSource): "zinc" | "green" | "amber" {
  return source === "ask" ? "zinc" : source === "chapter" ? "green" : "amber";
}

function contextLabel(r: QuestionRow): string {
  if (r.source === "ask") return r.title ?? "Ask";
  if (r.source === "chapter") return chapterLabel(r.book ?? "", r.chapter);
  return r.talkId ?? "—";
}

function threadHref(r: QuestionRow): string {
  if (r.source === "ask") return `/chats/${r.threadId}`;
  if (r.source === "chapter") {
    return `/questions/thread?${new URLSearchParams({
      source: "chapter",
      device: r.deviceId,
      volume: r.volume ?? "",
      book: r.book ?? "",
      chapter: String(r.chapter ?? ""),
    })}`;
  }
  return `/questions/thread?${new URLSearchParams({
    source: "talk",
    device: r.deviceId,
    talkId: r.talkId ?? "",
  })}`;
}

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; source?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const source = isSource(sp.source) ? sp.source : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { rows, total } = await listQuestions({
    source,
    search: q,
    limit: PAGE_SIZE,
    offset,
  });

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (params: Record<string, string>) =>
    `/questions?${new URLSearchParams({
      ...(q ? { q } : {}),
      ...(source ? { source } : {}),
      ...params,
    })}`;

  return (
    <>
      <PageHeader
        title="Questions"
        description={`${fmtNumber(total)} reader question${total === 1 ? "" : "s"} across the Ask, chapter, and talk assistants.`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-1">
        <FilterTab href={buildTabHref(q, undefined)} active={!source}>
          All
        </FilterTab>
        {SOURCES.map((s) => (
          <FilterTab
            key={s.value}
            href={buildTabHref(q, s.value)}
            active={source === s.value}
          >
            {s.label}
          </FilterTab>
        ))}
      </div>

      <form method="get" className="mb-4 flex items-center gap-2">
        {source && <input type="hidden" name="source" value={source} />}
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search question text…"
            className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Search
        </button>
        {q && (
          <Link
            href={buildTabHref("", source)}
            className="rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Clear
          </Link>
        )}
      </form>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="px-4 py-2.5 font-medium">Source</th>
                <th className="px-4 py-2.5 font-medium">Question</th>
                <th className="px-4 py-2.5 font-medium">Context</th>
                <th className="px-4 py-2.5 font-medium">Device</th>
                <th className="px-4 py-2.5 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <EmptyRow
                  colSpan={5}
                  label={q ? "No questions match that search." : "No questions yet."}
                />
              ) : (
                rows.map((r, i) => (
                  <tr
                    key={i}
                    className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-800/30"
                  >
                    <td className="px-4 py-2.5">
                      <Badge tone={sourceTone(r.source)}>{sourceLabel(r.source)}</Badge>
                    </td>
                    <td className="max-w-md px-4 py-2.5">
                      <Link
                        href={threadHref(r)}
                        className="block truncate text-zinc-900 hover:underline dark:text-zinc-100"
                        title={r.content}
                      >
                        {r.content}
                      </Link>
                    </td>
                    <td className="max-w-[12rem] truncate px-4 py-2.5 text-zinc-600 dark:text-zinc-300">
                      {contextLabel(r)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      {shortId(r.deviceId)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                      {fmtDateTime(r.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">
            Page {page} of {pageCount}
          </span>
          <div className="flex items-center gap-2">
            <PageLink href={buildHref({ page: String(page - 1) })} disabled={page <= 1}>
              <ChevronLeft className="size-4" /> Prev
            </PageLink>
            <PageLink
              href={buildHref({ page: String(page + 1) })}
              disabled={page >= pageCount}
            >
              Next <ChevronRight className="size-4" />
            </PageLink>
          </div>
        </div>
      )}
    </>
  );
}

function buildTabHref(q: string, source: QuestionSource | undefined): string {
  const params = new URLSearchParams({
    ...(q ? { q } : {}),
    ...(source ? { source } : {}),
  });
  const qs = params.toString();
  return qs ? `/questions?${qs}` : "/questions";
}

function FilterTab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      }`}
    >
      {children}
    </Link>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-300 dark:border-zinc-800 dark:text-zinc-600">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
    >
      {children}
    </Link>
  );
}
