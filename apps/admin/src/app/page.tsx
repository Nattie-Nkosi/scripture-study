import Link from "next/link";
import { BadgeCheck, CircleX } from "lucide-react";

import { getOverview } from "@/lib/queries";
import { fmtNumber } from "@/lib/format";
import { Badge, Card, Notice, PageHeader, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const o = await getOverview();

  return (
    <>
      <PageHeader
        title="Overview"
        description="Live metrics across the Gospel Library database."
      />

      {!o.configured && (
        <div className="mb-6">
          <Notice>
            <p className="font-medium">Database not configured.</p>
            <p className="mt-0.5">
              Set <code className="font-mono">DATABASE_URL</code> in this app&apos;s{" "}
              <code className="font-mono">.env.local</code> to see live data.
            </p>
          </Notice>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Assistant usage
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Link href="/chats" className="contents">
            <Stat
              label="Saved chats"
              value={fmtNumber(o.conversations)}
              sub={`across ${fmtNumber(o.conversationDevices)} devices`}
            />
          </Link>
          <Link href="/questions?source=ask" className="contents">
            <Stat label="Ask messages" value={fmtNumber(o.askMessages)} />
          </Link>
          <Link href="/questions?source=chapter" className="contents">
            <Stat
              label="Chapter chats"
              value={fmtNumber(o.chatMessages)}
              sub={`across ${fmtNumber(o.chatDevices)} devices`}
            />
          </Link>
          <Link href="/questions?source=talk" className="contents">
            <Stat label="Talk chats" value={fmtNumber(o.talkMessages)} />
          </Link>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Content &amp; index
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Link href="/embeddings" className="contents">
            <Stat
              label="Embedded verses"
              value={fmtNumber(o.embeddings)}
              sub={`${fmtNumber(o.embeddingVolumes)} volumes`}
            />
          </Link>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Semantic index
            </p>
            <p className="mt-3">
              {o.hnswIndex ? (
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
          <Link href="/database" className="contents">
            <Stat
              label="AI translations"
              value={fmtNumber(o.translations)}
              sub={`${fmtNumber(o.translatedChapters)} chapters cached`}
            />
          </Link>
          <Stat
            label="Translated chapters"
            value={fmtNumber(o.translatedChapters)}
          />
        </div>
      </section>
    </>
  );
}
