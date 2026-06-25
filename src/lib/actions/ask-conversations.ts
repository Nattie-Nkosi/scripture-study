"use server";

import {
  listAskConversations,
  loadAskConversation,
  saveAskConversation,
  renameAskConversation,
  deleteAskConversation,
  type AskConversationSummary,
} from "@/lib/db/ask-conversations";
import type { ChatMessage } from "@/lib/db/chat";

export async function listSavedChats(
  deviceId: string,
): Promise<AskConversationSummary[]> {
  if (!deviceId) return [];
  try {
    return await listAskConversations(deviceId);
  } catch {
    return [];
  }
}

export async function loadSavedChat(
  deviceId: string,
  id: string,
): Promise<ChatMessage[] | null> {
  if (!deviceId || !id) return null;
  try {
    return await loadAskConversation(deviceId, id);
  } catch {
    return null;
  }
}

export async function saveChat(
  deviceId: string,
  id: string | null,
  messages: ChatMessage[],
): Promise<{ id: string; title: string } | null> {
  if (!deviceId) return null;
  try {
    return await saveAskConversation(deviceId, id, messages);
  } catch {
    return null;
  }
}

export async function renameSavedChat(
  deviceId: string,
  id: string,
  title: string,
): Promise<{ ok: boolean }> {
  if (!deviceId || !id) return { ok: false };
  try {
    return { ok: await renameAskConversation(deviceId, id, title) };
  } catch {
    return { ok: false };
  }
}

export async function deleteSavedChat(
  deviceId: string,
  id: string,
): Promise<{ ok: boolean }> {
  if (!deviceId || !id) return { ok: false };
  try {
    return { ok: await deleteAskConversation(deviceId, id) };
  } catch {
    return { ok: false };
  }
}
