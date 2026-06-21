import "server-only";
import type Groq from "groq-sdk";

import { searchScriptures } from "@/lib/scripture/client";
import { searchConferenceTalks } from "@/lib/conference/client";
import { conferenceShortTitle } from "@/lib/conference/format";

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

const MAX_RESULTS = 6;
const SNIPPET_MAX = 400;

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

// --- search_scriptures ------------------------------------------------------

export const scriptureSearchTool: Groq.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "search_scriptures",
    description:
      "Full-text search of the Latter-day Saint standard works (Old Testament, New Testament, Book of Mormon, Doctrine and Covenants, Pearl of Great Price). Use this to find verses OUTSIDE the passage the reader is currently viewing — for example to answer who, what, or where a name, event, or teaching is when the current passage doesn't state it. Returns matching verses with their references. Prefer searching over telling the reader something isn't covered.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            'Words or a short phrase to search for, e.g. "David son of Jesse" or "faith without works". Use distinctive keywords, not a full question.',
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

async function executeScriptureSearch(args: Record<string, unknown>): Promise<string> {
  const query = typeof args.query === "string" ? args.query.trim() : "";
  if (!query) return "No search query was provided.";
  const volume =
    typeof args.volume === "string" &&
    (VOLUME_IDS as readonly string[]).includes(args.volume)
      ? args.volume
      : undefined;

  try {
    const res = await searchScriptures(query, { limit: MAX_RESULTS, volume });
    if (res.results.length === 0) {
      return `No verses found for "${query}". Tell the reader you couldn't find this in the scriptures rather than guessing.`;
    }
    const lines = res.results.map((r) => `${r.reference} — ${snippet(r.text)}`);
    return (
      `Verses matching "${query}" (showing ${res.results.length} of ${res.total}):\n` +
      lines.join("\n")
    );
  } catch {
    return "The scripture search is unavailable right now. Answer from the passage already provided, and say you couldn't look further.";
  }
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
    const res = await searchConferenceTalks(query, { limit: MAX_RESULTS, speaker });
    if (res.results.length === 0) {
      return `No conference talks found for "${query}". Tell the reader you couldn't find this rather than guessing.`;
    }
    const lines = res.results.map(
      (r) =>
        `"${r.title}" — ${r.speaker}, ${conferenceShortTitle(r.year, r.month)}: ${snippet(r.text)}`,
    );
    return (
      `Talk excerpts matching "${query}" (showing ${res.results.length} of ${res.total}):\n` +
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
