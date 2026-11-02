import "server-only";
import type Groq from "groq-sdk";

import { searchScriptures } from "@/lib/scripture/client";
import {
  getConference,
  getLatestConference,
  searchConferenceTalks,
} from "@/lib/conference/client";
import { conferenceShortTitle } from "@/lib/conference/format";
import { searchStudyHelps } from "@/lib/study-helps/client";
import { typeName } from "@/lib/study-helps/format";
import type { StudyHelpType } from "@/lib/study-helps/types";
import type {
  ConferenceSearchOptions,
  ConferenceSearchResult,
} from "@/lib/conference/types";
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
      "Full-text search of General Conference talks (1971 to today). Use this to find what speakers have taught on a topic, or to find related talks beyond the one the reader is viewing. Returns one excerpt per talk, newest talks first, with the talk title, speaker, and conference. Narrow by conference or year when the reader asks about a particular or recent conference.",
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
        conference: {
          type: "string",
          description: 'Optional. Restrict to one conference by id, "YYYY-04" (April) or "YYYY-10" (October), e.g. "2024-10".',
        },
        year: {
          type: "integer",
          description: "Optional. Restrict to talks given in this year.",
        },
        start_year: {
          type: "integer",
          description: "Optional. Only talks from this year onward, e.g. for recent teachings.",
        },
      },
      required: ["query"],
    },
  },
};

// Excerpts pulled from each end of the hit list before collapsing to talks.
const TALK_WINDOW = 40;
// Of the talks handed back, how many come from the newest end.
const TALK_NEWEST = 8;
const CONFERENCE_ID = /^\d{4}-(04|10)$/;

function yearArg(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isInteger(n) && n >= 1971 && n <= 2100 ? n : undefined;
}

function conferenceArg(v: unknown): string | undefined {
  return typeof v === "string" && CONFERENCE_ID.test(v.trim()) ? v.trim() : undefined;
}

function uniqueTalks(hits: ConferenceSearchResult[], seen: Set<string>): ConferenceSearchResult[] {
  const out: ConferenceSearchResult[] = [];
  for (const h of hits) {
    if (seen.has(h.talkId)) continue;
    seen.add(h.talkId);
    out.push(h);
  }
  return out;
}

// The API returns hits oldest first, one per matching paragraph, so a plain
// first page is all 1970s talks. Read both ends of the list, collapse to one
// excerpt per talk, and lead with the newest.
async function searchTalksBothEnds(
  query: string,
  opts: ConferenceSearchOptions,
): Promise<{ results: ConferenceSearchResult[]; total: number }> {
  const head = await searchConferenceTalks(query, { ...opts, limit: TALK_WINDOW });
  const tail =
    head.total > TALK_WINDOW
      ? (await searchConferenceTalks(query, { ...opts, limit: TALK_WINDOW, offset: head.total - TALK_WINDOW })).results
      : [];
  const newest = uniqueTalks([...head.results, ...tail].reverse(), new Set()).slice(0, TALK_NEWEST);
  const oldest = uniqueTalks(head.results, new Set(newest.map((t) => t.talkId)));
  const results = [...newest, ...oldest]
    .slice(0, MAX_RESULTS)
    .sort((a, b) => b.year - a.year || b.month - a.month);
  return { results, total: head.total };
}

async function executeTalkSearch(args: Record<string, unknown>): Promise<string> {
  const query = typeof args.query === "string" ? args.query.trim() : "";
  if (!query) return "No search query was provided.";
  const speaker =
    typeof args.speaker === "string" && args.speaker.trim()
      ? args.speaker.trim()
      : undefined;
  const opts: ConferenceSearchOptions = {
    speaker,
    conference: conferenceArg(args.conference),
    year: yearArg(args.year),
    startYear: yearArg(args.start_year),
  };

  try {
    let res = await searchTalksBothEnds(query, opts);
    let used = query;
    for (const alt of fallbackQueries(query)) {
      if (res.results.length > 0) break;
      res = await searchTalksBothEnds(alt, opts);
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
      `Talks matching "${query}"${note}, newest first — showing ${res.results.length} talks from ${res.total} matching passages:\n` +
      lines.join("\n")
    );
  } catch {
    return "The talk search is unavailable right now. Answer from the talk already provided, and say you couldn't look further.";
  }
}

// --- list_conference_talks --------------------------------------------------

export const conferenceTalksTool: Groq.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "list_conference_talks",
    description:
      "List every talk in one General Conference, by session, with its title and speaker. Leave conference empty for the most recent conference. Use this for questions like who spoke, what the talks were, or an overview of a conference.",
    parameters: {
      type: "object",
      properties: {
        conference: {
          type: "string",
          description: 'Optional. Conference id, "YYYY-04" or "YYYY-10". Omit for the most recent conference.',
        },
      },
    },
  },
};

async function executeConferenceTalks(args: Record<string, unknown>): Promise<string> {
  try {
    const id = conferenceArg(args.conference) ?? (await getLatestConference())._id;
    const conf = await getConference(id, true);
    const sessions = conf.sessions.map((s) => {
      const talks = (s.talks ?? []).map(
        (t) => `- "${t.title}" — ${t.speaker}${t.role ? `, ${t.role}` : ""}`,
      );
      return `${s.name}:\n${talks.join("\n")}`;
    });
    return `${conf.title} (id ${conf._id}):\n\n${sessions.join("\n\n")}`;
  } catch {
    return "Couldn't load that conference's talks. Tell the reader you couldn't look it up rather than guessing.";
  }
}

/** Today's date and the newest conference, so "the latest conference" means
 *  the one actually in the library rather than whatever the model last saw. */
export async function conferenceContext(): Promise<string> {
  const today = new Date().toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" });
  try {
    const latest = await getLatestConference();
    return (
      `Today is ${today}. The most recent General Conference in this library is the ${latest.title} (id ${latest._id}). ` +
      `When the reader asks about the latest, most recent, or last conference, they mean this one: use list_conference_talks for who spoke and what the talks were, and search_talks with conference "${latest._id}" for what was taught. ` +
      "Your own memory of recent conferences is out of date, so rely on these tools for anything recent."
    );
  } catch {
    return `Today is ${today}.`;
  }
}

// --- search_study_helps -----------------------------------------------------

const STUDY_HELP_TYPE_IDS = ["bd", "tg", "index", "jst"] as const;

export const studyHelpsSearchTool: Groq.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "search_study_helps",
    description:
      "Search the Latter-day Saint scripture study helps — the Bible Dictionary (concise articles on biblical people, places, and subjects), the Topical Guide and Triple Combination Index (scripture citations gathered by topic), and the Joseph Smith Translation (the Prophet's inspired Bible revisions). Use this for a definition, background, or topical cross-references that explain a term, name, or subject rather than a single verse — e.g. what a word means, who a person was, or where to find a topic across scripture. Returns matching entries with the work they come from and their title.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            'A term, name, or topic to look up, e.g. "faith", "Melchizedek", or "baptism for the dead".',
        },
        type: {
          type: "string",
          enum: [...STUDY_HELP_TYPE_IDS],
          description:
            "Optional. Restrict to one work: bd (Bible Dictionary), tg (Topical Guide), index (Triple Combination Index), or jst (Joseph Smith Translation).",
        },
      },
      required: ["query"],
    },
  },
};

async function executeStudyHelpsSearch(args: Record<string, unknown>): Promise<string> {
  const query = typeof args.query === "string" ? args.query.trim() : "";
  if (!query) return "No search query was provided.";
  const type =
    typeof args.type === "string" &&
    (STUDY_HELP_TYPE_IDS as readonly string[]).includes(args.type)
      ? (args.type as StudyHelpType)
      : undefined;

  try {
    let res = await searchStudyHelps(query, { limit: MAX_RESULTS, type });
    let used = query;
    for (const alt of fallbackQueries(query)) {
      if (res.results.length > 0) break;
      res = await searchStudyHelps(alt, { limit: FALLBACK_RESULTS, type });
      used = alt;
    }
    if (res.results.length === 0) {
      return `No study helps found for "${query}" (also tried its key terms). Tell the reader you couldn't find this rather than guessing.`;
    }
    const note = used !== query ? ` (closest match searching "${used}")` : "";
    const lines = res.results.map(
      (r) => `${typeName(r.type)} — ${r.title}: ${snippet(r.text)}`,
    );
    return (
      `Study-help entries matching "${query}"${note} — showing ${res.results.length} of ${res.total}:\n` +
      lines.join("\n")
    );
  } catch {
    return "The study-helps search is unavailable right now. Answer from what you already have, and say you couldn't look further.";
  }
}

// --- Tool sets + dispatchers ------------------------------------------------

/** Base scripture tool for the inline reader features (explain a verse,
 *  summarize a chapter) that stay anchored to the open passage. */
export const SCRIPTURE_TOOLS: Groq.Chat.Completions.ChatCompletionTool[] = [
  scriptureSearchTool,
];

/** Tools for the in-reader, passage-grounded features (the chapter assistant and
 *  the verse "explain") — the base scripture search plus the study helps, so they
 *  can define terms and follow topical cross-references. */
export const READER_TOOLS: Groq.Chat.Completions.ChatCompletionTool[] = [
  scriptureSearchTool,
  studyHelpsSearchTool,
];

/** Tools offered to the conference-talk assistant (talks quote scripture, so it
 *  gets both). */
export const TALK_TOOLS: Groq.Chat.Completions.ChatCompletionTool[] = [
  talkSearchTool,
  conferenceTalksTool,
  scriptureSearchTool,
  studyHelpsSearchTool,
];

/** Tools offered to the standalone Ask assistant — the whole library. */
export const ASK_TOOLS: Groq.Chat.Completions.ChatCompletionTool[] = [
  scriptureSearchTool,
  talkSearchTool,
  conferenceTalksTool,
  studyHelpsSearchTool,
];

/** Run a tool the scripture assistant requested, returning text for the model. */
export function runScriptureTool(name: string, argsJson: string): Promise<string> {
  if (name === "search_scriptures") return executeScriptureSearch(parseArgs(argsJson));
  if (name === "search_study_helps") return executeStudyHelpsSearch(parseArgs(argsJson));
  return Promise.resolve(`Unknown tool "${name}".`);
}

/** Run a tool the talk assistant requested, returning text for the model. */
export function runTalkTool(name: string, argsJson: string): Promise<string> {
  if (name === "search_talks") return executeTalkSearch(parseArgs(argsJson));
  if (name === "list_conference_talks") return executeConferenceTalks(parseArgs(argsJson));
  if (name === "search_scriptures") return executeScriptureSearch(parseArgs(argsJson));
  if (name === "search_study_helps") return executeStudyHelpsSearch(parseArgs(argsJson));
  return Promise.resolve(`Unknown tool "${name}".`);
}

/** Run a tool the Ask assistant requested (searches the whole library). */
export function runAskTool(name: string, argsJson: string): Promise<string> {
  if (name === "search_scriptures") return executeScriptureSearch(parseArgs(argsJson));
  if (name === "search_talks") return executeTalkSearch(parseArgs(argsJson));
  if (name === "list_conference_talks") return executeConferenceTalks(parseArgs(argsJson));
  if (name === "search_study_helps") return executeStudyHelpsSearch(parseArgs(argsJson));
  return Promise.resolve(`Unknown tool "${name}".`);
}
