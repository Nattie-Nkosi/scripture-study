import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { loadChapterThread, loadTalkThread } from "@/lib/queries";
import {
  deleteChapterThreadAction,
  deleteTalkThreadAction,
} from "@/lib/actions";
import { fmtDateTime, shortId, sourceLabel } from "@/lib/format";
import { Badge, Card } from "@/components/ui";
import { DeleteButton } from "@/components/delete-button";

export const dynamic = "force-dynamic";

export default async function ThreadPage({
  searchParams,
}: {
  searchParams: Promise<{
    source?: string;
    device?: string;
    volume?: string;
    book?: string;
    chapter?: string;
    talkId?: string;
  }>;
}) {
  const sp = await searchParams;

  const thread =
    sp.source === "chapter"
      ? await loadChapterThread(
          sp.device ?? "",
          sp.volume ?? "",
          sp.book ?? "",
          Number(sp.chapter),
        )
      : sp.source === "talk"
        ? await loadTalkThread(sp.device ?? "", sp.talkId ?? "")
        : null;

  if (!thread) notFound();

  const deleteAction =
    sp.source === "chapter"
      ? deleteChapterThreadAction.bind(
          null,
          sp.device ?? "",
          sp.volume ?? "",
          sp.book ?? "",
          Number(sp.chapter),
        )
      : deleteTalkThreadAction.bind(null, sp.device ?? "", sp.talkId ?? "");

  return (
    <>
      <Link
        href="/questions"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="size-4" /> Questions
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge tone={thread.source === "chapter" ? "green" : "amber"}>
              {sourceLabel(thread.source)}
            </Badge>
            <h1 className="text-xl font-semibold tracking-tight">{thread.context}</h1>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Device <span className="font-mono">{shortId(thread.deviceId)}</span> ·{" "}
            {thread.messages.length} messages
          </p>
        </div>
        <DeleteButton action={deleteAction} redirectTo="/questions" />
      </div>

      <div className="space-y-3">
        {thread.messages.map((m, i) => (
          <Card key={i} className="p-4">
            <p className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              <span>{m.role}</span>
              <span className="font-normal normal-case">{fmtDateTime(m.createdAt)}</span>
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
