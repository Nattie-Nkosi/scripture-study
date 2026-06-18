"use server";

import {
  getTalkChatHistory,
  deleteTalkChatHistory,
} from "@/lib/db/talk-chat";
import type { ChatMessage } from "@/lib/db/chat";

export async function loadTalkChatHistory(
  deviceId: string,
  talkId: string,
): Promise<ChatMessage[]> {
  if (!deviceId) return [];
  try {
    return await getTalkChatHistory(deviceId, talkId);
  } catch {
    return [];
  }
}

export async function clearTalkChatHistory(
  deviceId: string,
  talkId: string,
): Promise<{ ok: boolean }> {
  if (!deviceId) return { ok: false };
  try {
    await deleteTalkChatHistory(deviceId, talkId);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
