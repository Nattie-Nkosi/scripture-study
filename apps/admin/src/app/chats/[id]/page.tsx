import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { loadConversation } from "@/lib/queries";
import { deleteConversationAction } from "@/lib/actions";
import { fmtDateTime, shortId } from "@/lib/format";
import { Card } from "@/components/ui";
import { DeleteButton } from "@/components/delete-button";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const conv = await loadConversation(id);
  if (!conv) notFound();

  return (
    <>
      <Link
        href="/chats"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="size-4" /> Saved chats
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">{conv.title}</h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Device <span className="font-mono">{shortId(conv.deviceId)}</span> ·{" "}
            {conv.messages.length} messages · updated {fmtDateTime(conv.updatedAt)}
          </p>
        </div>
        <DeleteButton action={deleteConversationAction.bind(null, conv.id)} />
      </div>

      <div className="space-y-3">
        {conv.messages.map((m, i) => (
          <Card key={i} className="p-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {m.role}
            </p>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
              {m.content}
            </p>
          </Card>
        ))}
      </div>
    </>
  );
}
