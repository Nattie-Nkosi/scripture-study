import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import { listConversations } from "@/lib/queries";
import { fmtDateTime, fmtNumber, shortId } from "@/lib/format";
import { deleteConversationAction } from "@/lib/actions";
import { Card, EmptyRow, PageHeader } from "@/components/ui";
import { DeleteButton } from "@/components/delete-button";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function ChatsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { rows, total } = await listConversations({
    search: q,
    limit: PAGE_SIZE,
    offset,
  });

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (p: number) =>
    `/chats?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader
        title="Saved chats"
        description={`${fmtNumber(total)} saved Ask conversation${total === 1 ? "" : "s"} across all devices. Auto-pruned 7 days after last activity.`}
      />

      <form method="get" className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by title…"
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
            href="/chats"
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
                <th className="px-4 py-2.5 font-medium">Title</th>
                <th className="px-4 py-2.5 font-medium">Device</th>
                <th className="px-4 py-2.5 text-right font-medium">Msgs</th>
                <th className="px-4 py-2.5 font-medium">Updated</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <EmptyRow colSpan={5} label={q ? "No chats match that search." : "No saved chats yet."} />
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-800/30"
                  >
                    <td className="max-w-xs px-4 py-2.5">
                      <Link
                        href={`/chats/${r.id}`}
                        className="block truncate font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                      >
                        {r.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      {shortId(r.deviceId)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-zinc-600 dark:text-zinc-300">
                      {fmtNumber(r.messageCount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                      {fmtDateTime(r.updatedAt)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <DeleteButton action={deleteConversationAction.bind(null, r.id)} />
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
            <PageLink href={buildHref(page - 1)} disabled={page <= 1}>
              <ChevronLeft className="size-4" /> Prev
            </PageLink>
            <PageLink href={buildHref(page + 1)} disabled={page >= pageCount}>
              Next <ChevronRight className="size-4" />
            </PageLink>
          </div>
        </div>
      )}
    </>
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
