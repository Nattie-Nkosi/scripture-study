import { BadgeCheck, CircleX, Terminal } from "lucide-react";

import { getCorpusStatus } from "@/lib/queries";
import { fmtNumber } from "@/lib/format";
import { Badge, Card, EmptyRow, PageHeader, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function EmbeddingsPage() {
  const { volumes, total, hnswIndex } = await getCorpusStatus();

  return (
    <>
      <PageHeader
        title="Embeddings"
        description="Status of the pgvector scripture corpus used for semantic search."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Embedded verses" value={fmtNumber(total)} />
        <Stat label="Volumes" value={fmtNumber(volumes.length)} />
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Semantic index
          </p>
          <p className="mt-3">
            {hnswIndex ? (
              <Badge tone="green">
                <BadgeCheck className="size-3.5" /> HNSW built
              </Badge>
            ) : (
              <Badge tone="amber">
                <CircleX className="size-3.5" /> Not built
              </Badge>
            )}
          </p>
        </Card>
      </div>

      <Card className="mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="px-4 py-2.5 font-medium">Volume</th>
                <th className="px-4 py-2.5 text-right font-medium">Chapters</th>
                <th className="px-4 py-2.5 text-right font-medium">Verses</th>
              </tr>
            </thead>
            <tbody>
              {volumes.length === 0 ? (
                <EmptyRow colSpan={3} label="No verses embedded yet." />
              ) : (
                volumes.map((v) => (
                  <tr
                    key={v.volume}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs">{v.volume}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {fmtNumber(v.chapters)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {fmtNumber(v.verses)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <Terminal className="mt-0.5 size-5 shrink-0 text-zinc-400" />
          <div className="min-w-0">
            <h2 className="font-medium">Build or refresh the corpus</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Embedding runs a local model against the scripture API and can take
              many minutes, so it runs from the command line, not this page. It is
              idempotent and resumable — re-running only fills in what is missing.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-zinc-900 px-4 py-3 text-xs text-zinc-100 dark:bg-black">
              <code>{`npm run db:migrate   # once, sets up tables\nnpm run db:embed     # embed the standard works`}</code>
            </pre>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Validate on a subset first:{" "}
              <code className="font-mono">npm run db:embed -- --volume=bookofmormon</code>
            </p>
          </div>
        </div>
      </Card>
    </>
  );
}
