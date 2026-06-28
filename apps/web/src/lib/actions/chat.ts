"use server";

import {
  getChatHistory,
  deleteChatHistory,
  type ChatMessage,
} from "@gospel/db";

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

export async function clearChatHistory(
  deviceId: string,
  volume: string,
  book: string,
  chapter: number,
): Promise<{ ok: boolean }> {
  if (!deviceId) return { ok: false };
  try {
    await deleteChatHistory(deviceId, volume, book, chapter);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
