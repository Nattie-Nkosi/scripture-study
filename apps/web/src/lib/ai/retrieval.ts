import "server-only";
import type Groq from "groq-sdk";

import { searchScriptures } from "@/lib/scripture/client";
import { searchConferenceTalks } from "@/lib/conference/client";
import { conferenceShortTitle } from "@/lib/conference/format";
import { embedText } from "@/lib/ai/embeddings";
import {
  semanticSearchScriptures,
  type SemanticHit,
} from "@gospel/db";

// Lets the grounded assistants look things up in the app's OWN library instead
// of refusing when an answer lives outside the open chapter/talk. Every result
// carries a real reference, so answers stay anchored to text the app can cite —
// no reliance on the model's own (unverifiable) memory.

const VOLUME_IDS = [
  "oldtestament",
  "newtestament",
  "bookofmormon",
  "doctrineandcovenants",
  "pearlofgreatprice",
] as const;

const MAX_RESULTS = 12;
// The fallback searches a bare name, which the API returns in canonical order,
// so it needs a wider window for the relevant verse to surface.
const FALLBACK_RESULTS = 20;
// Most verses to hand the model after blending semantic + keyword results.
const MERGE_CAP = 16;
const SNIPPET_MAX = 320;

function snippet(text: string): string {
  const t = text.trim();
  return t.length > SNIPPET_MAX ? `${t.slice(0, SNIPPET_MAX - 1)}…` : t;
}

function parseArgs(json: string): Record<string, unknown> {
  try {
    const v = JSON.parse(json);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

// The search API matches the LITERAL words in the text (AND across terms) and
// returns hits in canonical order, so a natural-language query — or one with a
// word the verse doesn't use ("killed" vs "kill") — returns nothing. When that
// happens we retry with the query's distinctive terms, then its single most
// distinctive token (usually a proper noun), so one search round still lands.
const STOPWORDS = new Set([
  "who", "whom", "what", "when", "where", "why", "how", "which", "did", "does",
  "do", "is", "are", "was", "were", "the", "a", "an", "of", "to", "in", "on",
  "and", "or", "for", "about", "with", "that", "this", "his", "her", "their",
  "my", "your", "tell", "me", "find", "there", "it", "be", "have", "has",
]);

function distinctiveTokens(query: string): string[] {
  const words = query
    .split(/\s+/)
    .map((w) => w.replace(/[’']s\b/gi, "").replace(/[^\p{L}\p{N}-]/gu, ""))
    .filter(Boolean);
  const content = words.filter(
    (w) => w.length > 2 && !STOPWORDS.has(w.toLowerCase()),
  );
  // Proper nouns first (they anchor a search best), then longer words.
  return content
    .map((w, i) => ({ w, i }))
    .sort((a, b) => {
      const ca = /^\p{Lu}/u.test(a.w) ? 1 : 0;
      const cb = /^\p{Lu}/u.test(b.w) ? 1 : 0;
      if (ca !== cb) return cb - ca;
      if (b.w.length !== a.w.length) return b.w.length - a.w.length;
      return a.i - b.i;
    })
    .map((x) => x.w);
}

/** Simpler queries to retry when the original finds nothing. */
function fallbackQueries(query: string): string[] {
  const tokens = distinctiveTokens(query);
  const out: string[] = [];
  if (tokens.length >= 2) out.push(`${tokens[0]} ${tokens[1]}`);
  if (tokens.length >= 1) out.push(tokens[0]);
  return [...new Set(out)].filter(
    (q) => q && q.toLowerCase() !== query.toLowerCase(),
  );
}

// --- search_scriptures ------------------------------------------------------

export const scriptureSearchTool: Groq.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "search_scriptures",
    description:
      "Search the Latter-day Saint standard works (Old Testament, New Testament, Book of Mormon, Doctrine and Covenants, Pearl of Great Price). Use this to find verses OUTSIDE the passage the reader is currently viewing — for example to answer who, what, or where a name, event, or teaching is when the current passage doesn't state it. This searches by MEANING as well as exact words, so you can search a topic or a short natural-language description (\"who killed Laban\", \"Nephi's brothers\", \"finding peace in trials\") or a distinctive name or phrase (\"Laban\", \"smote off his head\"). Returns matching verses with their references. Prefer searching over telling the reader something isn't covered.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            'What to look for — a topic, a short description, a name, or a phrase. E.g. "Nephi\'s siblings", "David son of Jesse", or "faith without works".',
        },
        volume: {
          type: "string",
          enum: [...VOLUME_IDS],
          description: "Optional. Restrict the search to a single volume.",
        },
      },
      required: ["query"],
    },
  },
};

type Verse = { reference: string; text: string };

/** Keyword search via the Open Scripture API, with the bare-name fallback for
 *  when a literal query matches nothing. */
async function keywordScriptureSearch(
  query: string,
  volume: string | undefined,
): Promise<{ results: Verse[]; used: string }> {
  let res = await searchScriptures(query, { limit: MAX_RESULTS, volume });
  let used = query;
  for (const alt of fallbackQueries(query)) {
    if (res.results.length > 0) break;
    res = await searchScriptures(alt, { limit: FALLBACK_RESULTS, volume });
    used = alt;
  }
  return {
    results: res.results.map((r) => ({ reference: r.reference, text: r.text })),
    used,
  };
}

/** Semantic search of the embedded corpus; empty when the DB isn't populated or
 *  the model can't load, so the keyword path still carries the answer. */
async function semanticScriptureSearch(
  query: string,
  volume: string | undefined,
): Promise<SemanticHit[]> {
  try {
    const embedding = await embedText(query);
    return await semanticSearchScriptures(embedding, { limit: MAX_RESULTS, volume });
  } catch (err) {
    console.error("[retrieval] semantic search failed:", (err as Error).message);
    return [];
  }
}

async function executeScriptureSearch(args: Record<string, unknown>): Promise<string> {
  const query = typeof args.query === "string" ? args.query.trim() : "";
  if (!query) return "No search query was provided.";
  const volume =
    typeof args.volume === "string" &&
    (VOLUME_IDS as readonly string[]).includes(args.volume)
      ? args.volume
      : undefined;

  // Semantic (by meaning) and keyword (exact names/phrases) in parallel; either
  // can come back empty and the other still answers.
  const [semantic, keyword] = await Promise.all([
    semanticScriptureSearch(query, volume),
    keywordScriptureSearch(query, volume).catch(() => ({
      results: [] as Verse[],
      used: query,
    })),
  ]);

  // Interleave the two sources so keyword's exact-name hits aren't crowded out
  // when semantic fills the list (and vice versa). Dedupe by verse text, which
  // is stable across the two sources' differing reference labels.
  const seen = new Set<string>();
  const merged: Verse[] = [];
  const add = (v: Verse) => {
    const key = v.text.trim().slice(0, 80).toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      merged.push(v);
    }
  };
  const rounds = Math.max(semantic.length, keyword.results.length);
  for (let i = 0; i < rounds; i++) {
    if (semantic[i]) add({ reference: semantic[i].reference, text: semantic[i].text });
    if (keyword.results[i]) add(keyword.results[i]);
  }

  if (merged.length === 0) {
    return `No verses found for "${query}". Tell the reader you couldn't find this in the scriptures rather than guessing.`;
  }

  const note =
    semantic.length === 0 && keyword.used !== query
      ? ` (closest match searching "${keyword.used}")`
      : "";
  const lines = merged
    .slice(0, MERGE_CAP)
    .map((r) => `${r.reference} — ${snippet(r.text)}`);
  return (
    `Verses related to "${query}"${note} — showing ${lines.length}. Read through them; the detail you need may be in any one, and you can piece an answer together across several:\n` +
    lines.join("\n")
  );
}

// --- search_talks -----------------------------------------------------------

export const talkSearchTool: Groq.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "search_talks",
    description:
      "Full-text search of General Conference talks (1971 to today). Use this to find what speakers have taught on a topic, or to find related talks beyond the one the reader is viewing. Returns matching excerpts with the talk title, speaker, and conference.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            'Words or a short phrase to search for, e.g. "spiritual momentum". Use distinctive keywords, not a full question.',
        },
        speaker: {
          type: "string",
          description: "Optional. Restrict to one speaker by name, e.g. \"Russell M. Nelson\".",
        },
      },
      required: ["query"],
    },
  },
};

async function executeTalkSearch(args: Record<string, unknown>): Promise<string> {
  const query = typeof args.query === "string" ? args.query.trim() : "";
  if (!query) return "No search query was provided.";
  const speaker =
    typeof args.speaker === "string" && args.speaker.trim()
      ? args.speaker.trim()
      : undefined;

  try {
    let res = await searchConferenceTalks(query, { limit: MAX_RESULTS, speaker });
    let used = query;
    for (const alt of fallbackQueries(query)) {
      if (res.results.length > 0) break;
      res = await searchConferenceTalks(alt, { limit: FALLBACK_RESULTS, speaker });
      used = alt;
    }
    if (res.results.length === 0) {
      return `No conference talks found for "${query}" (also tried its key terms). Tell the reader you couldn't find this rather than guessing.`;
    }
    const note = used !== query ? ` (closest match searching "${used}")` : "";
    const lines = res.results.map(
      (r) =>
        `"${r.title}" — ${r.speaker}, ${conferenceShortTitle(r.year, r.month)}: ${snippet(r.text)}`,
    );
    return (
      `Talk excerpts matching "${query}"${note} — showing ${res.results.length} of ${res.total}:\n` +
      lines.join("\n")
    );
  } catch {
    return "The talk search is unavailable right now. Answer from the talk already provided, and say you couldn't look further.";
  }
}

// --- Tool sets + dispatchers ------------------------------------------------

/** Tools offered to the scripture-chapter assistant. */
export const SCRIPTURE_TOOLS: Groq.Chat.Completions.ChatCompletionTool[] = [
  scriptureSearchTool,
];

/** Tools offered to the conference-talk assistant (talks quote scripture, so it
 *  gets both). */
export const TALK_TOOLS: Groq.Chat.Completions.ChatCompletionTool[] = [
  talkSearchTool,
  scriptureSearchTool,
];

/** Tools offered to the standalone Ask assistant — the whole library. */
export const ASK_TOOLS: Groq.Chat.Completions.ChatCompletionTool[] = [
  scriptureSearchTool,
  talkSearchTool,
];

/** Run a tool the scripture assistant requested, returning text for the model. */
export function runScriptureTool(name: string, argsJson: string): Promise<string> {
  if (name === "search_scriptures") return executeScriptureSearch(parseArgs(argsJson));
  return Promise.resolve(`Unknown tool "${name}".`);
}

/** Run a tool the talk assistant requested, returning text for the model. */
export function runTalkTool(name: string, argsJson: string): Promise<string> {
  if (name === "search_talks") return executeTalkSearch(parseArgs(argsJson));
  if (name === "search_scriptures") return executeScriptureSearch(parseArgs(argsJson));
  return Promise.resolve(`Unknown tool "${name}".`);
}

/** Run a tool the Ask assistant requested (searches the whole library). */
export function runAskTool(name: string, argsJson: string): Promise<string> {
  if (name === "search_scriptures") return executeScriptureSearch(parseArgs(argsJson));
  if (name === "search_talks") return executeTalkSearch(parseArgs(argsJson));
  return Promise.resolve(`Unknown tool "${name}".`);
}
