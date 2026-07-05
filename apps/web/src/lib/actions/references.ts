"use server";

import { collectReferenceSpans } from "@/lib/scripture/reference-linker";

/** A scripture reference found in assistant text, resolved to a reader URL. */
export type ScriptureReference = { label: string; url: string };

const MAX_INPUT = 20000;

/** The scripture references cited in an assistant answer, in order of first
 *  appearance and de-duplicated by reader target — used to list the sources
 *  beneath the answer rather than highlighting them inline. Returns an empty
 *  list on any failure. */
export async function extractScriptureReferences(
  text: string,
): Promise<ScriptureReference[]> {
  if (!text || text.length > MAX_INPUT) return [];

  try {
    const spans = await collectReferenceSpans(text);
    spans.sort((a, b) => a.start - b.start);

    const out: ScriptureReference[] = [];
    const seen = new Set<string>();
    let cursor = 0;
    for (const s of spans) {
      if (s.start < cursor || s.end <= s.start) continue; // overlapping / invalid
      cursor = s.end;
      if (seen.has(s.url)) continue;
      seen.add(s.url);
      out.push({ label: text.slice(s.start, s.end), url: s.url });
    }
    return out;
  } catch {
    return [];
  }
}
