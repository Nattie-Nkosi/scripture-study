"use server";

import { revalidatePath } from "next/cache";
import {
  deleteChapterThread,
  deleteConversation,
  deleteTalkThread,
  deleteTranslationChapter,
} from "./queries";

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

export async function deleteChapterThreadAction(
  deviceId: string,
  volume: string,
  book: string,
  chapter: number,
): Promise<boolean> {
  const ok = await deleteChapterThread(deviceId, volume, book, chapter);
  revalidatePath("/questions");
  revalidatePath("/");
  return ok;
}

export async function deleteTalkThreadAction(
  deviceId: string,
  talkId: string,
): Promise<boolean> {
  const ok = await deleteTalkThread(deviceId, talkId);
  revalidatePath("/questions");
  revalidatePath("/");
  return ok;
}
