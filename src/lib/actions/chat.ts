"use server";

import { getChatHistory, type ChatMessage } from "@/lib/db/chat";

export async function loadChatHistory(
  deviceId: string,
  volume: string,
  book: string,
  chapter: number,
): Promise<ChatMessage[]> {
  if (!deviceId) return [];
  try {
    return await getChatHistory(deviceId, volume, book, chapter);
  } catch {
    return [];
  }
}
