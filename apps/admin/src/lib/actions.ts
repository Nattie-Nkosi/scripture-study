"use server";

import { revalidatePath } from "next/cache";
import { deleteConversation, deleteTranslationChapter } from "./queries";

export async function deleteConversationAction(id: string): Promise<boolean> {
  const ok = await deleteConversation(id);
  revalidatePath("/chats");
  revalidatePath("/");
  return ok;
}

export async function deleteTranslationAction(
  volume: string,
  book: string,
  chapter: number,
): Promise<boolean> {
  const ok = await deleteTranslationChapter(volume, book, chapter);
  revalidatePath("/database");
  revalidatePath("/");
  return ok;
}
