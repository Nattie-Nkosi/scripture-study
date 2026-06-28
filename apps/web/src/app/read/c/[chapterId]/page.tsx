import { notFound, redirect } from "next/navigation";

import { getChapterById } from "@/lib/scripture/client";
import { ScriptureApiError } from "@/lib/scripture/client";

type Props = { params: Promise<{ chapterId: string }> };

// Resolves a chapter id (e.g. "1nephi2", used by prev/next links) to the
// canonical /read/{volume}/{book}/{chapter} URL.
export default async function ChapterRedirect({ params }: Props) {
  const { chapterId } = await params;

  let data;
  try {
    data = await getChapterById(chapterId);
  } catch (err) {
    if (
      err instanceof ScriptureApiError &&
      err.status !== undefined &&
      err.status < 500
    ) {
      notFound();
    }
    throw err;
  }

  redirect(`/read/${data.volume._id}/${data.book._id}/${data.chapter.number}`);
}
