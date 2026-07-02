import type Groq from "groq-sdk";

import { getChapter } from "@/lib/scripture/client";
import { buildSummaryMessages } from "@/lib/ai/summarize";
import { streamAssistantResponse } from "@/lib/ai/chat-runner";
import { SCRIPTURE_TOOLS, runScriptureTool } from "@/lib/ai/retrieval";
import { AI_CHAT_RULES, enforceApiRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  if (!book || !Number.isInteger(chapter)) {
    return Response.json({ error: "Missing chapter context." }, { status: 400 });
  }

  let chapterData;
  try {
    chapterData = await getChapter(book, chapter);
  } catch {
    return Response.json(
      { error: "Couldn’t load the chapter to summarize." },
      { status: 502 },
    );
  }

  const verses = chapterData.chapter.verses.map((v, i) => ({ n: i + 1, text: v.text }));

  const messages = buildSummaryMessages({
    bookTitle: chapterData.book.title,
    chapterNumber: chapterData.chapter.number,
    verses,
  });

  try {
    return await streamAssistantResponse({
      messages: messages as Groq.Chat.Completions.ChatCompletionMessageParam[],
      tools: SCRIPTURE_TOOLS,
      runTool: runScriptureTool,
      // The chapter is fully in context; it summarizes without searching, but
      // the loop always offers a tool (gpt-oss rejects an empty tool set).
      maxToolRounds: 1,
    });
  } catch (err) {
    console.error("[summarize] groq error:", err);
    return Response.json(
      { error: "Couldn’t summarize this chapter right now. Please try again." },
      { status: 502 },
    );
  }
}
