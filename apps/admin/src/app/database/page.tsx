import { BadgeCheck, CircleX, FileText } from "lucide-react";

import { getDbHealth, listTranslations } from "@/lib/queries";
import { fmtDateTime, fmtNumber } from "@/lib/format";
import { deleteTranslationAction } from "@/lib/actions";
import { Badge, Card, EmptyRow, Notice, PageHeader } from "@/components/ui";
import { DeleteButton } from "@/components/delete-button";

export const dynamic = "force-dynamic";

// Reference list of migrations shipped in apps/web/migrations. They are applied
// idempotently by `npm run db:migrate`; the table health below reflects what is
// actually present in the database.
const MIGRATIONS = [
  "0001_ai_translations.sql",
  "0002_chat_messages.sql",
  "0003_verse_annotations.sql",
  "0004_talk_chat_messages.sql",
  "0005_scripture_embeddings.sql",
  "0006_ask_conversations.sql",
  "0007_ask_expiry_by_activity.sql",
  "0008_ask_conversations_rebuild.sql",
];

export default async function DatabasePage() {
  const [health, translations] = await Promise.all([
    getDbHealth(),
    listTranslations(),
  ]);

  return (
    <>
      <PageHeader
        title="Database"
        description="Schema health, the AI translation cache, and migrations."
      />

      {!health.configured && (
        <div className="mb-6">
          <Notice>
            Database not configured — set <code className="font-mono">DATABASE_URL</code>{" "}
            to see live data.
          </Notice>
        </div>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Tables
        </h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="px-4 py-2.5 font-medium">Table</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Rows</th>
                </tr>
              </thead>
              <tbody>
                {health.tables.map((t) => (
                  <tr
                    key={t.table}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs">{t.table}</td>
                    <td className="px-4 py-2.5">
                      {t.present ? (
                        <Badge tone="green">
                          <BadgeCheck className="size-3.5" /> present
                        </Badge>
                      ) : (
                        <Badge tone="red">
                          <CircleX className="size-3.5" /> missing
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {t.present ? fmtNumber(t.rows) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          AI translation cache
        </h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="px-4 py-2.5 font-medium">Chapter</th>
                  <th className="px-4 py-2.5 text-right font-medium">Verses</th>
                  <th className="px-4 py-2.5 font-medium">Model</th>
                  <th className="px-4 py-2.5 font-medium">Updated</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {translations.length === 0 ? (
                  <EmptyRow colSpan={5} label="No cached translations." />
                ) : (
                  translations.map((t) => (
                    <tr
                      key={`${t.volume}/${t.book}/${t.chapter}`}
                      className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-800/30"
                    >
                      <td className="px-4 py-2.5">
                        <span className="font-medium">{t.book}</span>{" "}
                        <span className="tabular-nums">{t.chapter}</span>
                        <span className="ml-2 font-mono text-xs text-zinc-400">
                          {t.volume}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {fmtNumber(t.verses)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                        {t.model ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                        {fmtDateTime(t.updatedAt)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <DeleteButton
                          action={deleteTranslationAction.bind(
                            null,
                            t.volume,
                            t.book,
                            t.chapter,
                          )}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Migrations
        </h2>
        <Card className="p-4">
          <ul className="space-y-1.5">
            {MIGRATIONS.map((m) => (
              <li
                key={m}
                className="flex items-center gap-2 font-mono text-xs text-zinc-600 dark:text-zinc-300"
              >
                <FileText className="size-3.5 shrink-0 text-zinc-400" />
                {m}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Applied idempotently with{" "}
            <code className="font-mono">npm run db:migrate</code>.
          </p>
        </Card>
      </section>
    </>
  );
}
