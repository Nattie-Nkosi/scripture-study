"use server";

import {
  getAnnotations,
  upsertAnnotation,
  type VerseAnnotation,
} from "@/lib/db/annotations";

export async function loadAnnotations(
  deviceId: string,
  volume: string,
  book: string,
  chapter: number,
): Promise<VerseAnnotation[]> {
  if (!deviceId) return [];
  try {
    return await getAnnotations(deviceId, volume, book, chapter);
  } catch {
    return [];
  }
}

export async function saveAnnotation(
  deviceId: string,
  volume: string,
  book: string,
  chapter: number,
  verse: number,
  color: string | null,
  note: string | null,
): Promise<{ ok: boolean }> {
  if (!deviceId) return { ok: false };
  try {
    await upsertAnnotation(deviceId, volume, book, chapter, verse, color, note);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
