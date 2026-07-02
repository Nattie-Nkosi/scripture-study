import type Groq from "groq-sdk";

import { getChapter } from "@/lib/scripture/client";
import { buildExplainMessages } from "@/lib/ai/explain";
import { streamAssistantResponse } from "@/lib/ai/chat-runner";
import { SCRIPTURE_TOOLS, runScriptureTool } from "@/lib/ai/retrieval";
import { AI_CHAT_RULES, enforceApiRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Verses of surrounding context handed to the model on each side of the target.
const CONTEXT_WINDOW = 3;

export async function POST(req: Request) {
  const limited = await enforceApiRateLimit(req, AI_CHAT_RULES);
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const book = typeof body.book === "string" ? body.book : "";
  const chapter = typeof body.chapter === "number" ? body.chapter : NaN;
  const verse = typeof body.verse === "number" ? body.verse : NaN;

  if (!book || !Number.isInteger(chapter) || !Number.isInteger(verse)) {
    return Response.json({ error: "Missing verse context." }, { status: 400 });
  }

  let chapterData;
  try {
    chapterData = await getChapter(book, chapter);
  } catch {
    return Response.json(
      { error: "Couldn’t load the verse to explain." },
      { status: 502 },
    );
  }

  const all = chapterData.chapter.verses.map((v, i) => ({ n: i + 1, text: v.text }));
  const target = all.find((v) => v.n === verse);
  if (!target) {
    return Response.json({ error: "That verse wasn’t found." }, { status: 404 });
  }

  const start = Math.max(1, verse - CONTEXT_WINDOW);
  const end = Math.min(all.length, verse + CONTEXT_WINDOW);
  const context = all.filter((v) => v.n >= start && v.n <= end);

  const messages = buildExplainMessages({
    bookTitle: chapterData.book.title,
    chapterNumber: chapterData.chapter.number,
    verseNumber: verse,
    verseText: target.text,
    context,
  });

  try {
    return await streamAssistantResponse({
      messages: messages as Groq.Chat.Completions.ChatCompletionMessageParam[],
      tools: SCRIPTURE_TOOLS,
      runTool: runScriptureTool,
      // One search round for a cross-reference, then answer.
      maxToolRounds: 1,
    });
  } catch (err) {
    console.error("[explain] groq error:", err);
    return Response.json(
      { error: "Couldn’t explain this verse right now. Please try again." },
      { status: 502 },
    );
  }
}
