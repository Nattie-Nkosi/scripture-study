import type Groq from "groq-sdk";

import { getChapter } from "@/lib/scripture/client";
import { buildGroundedMessages } from "@/lib/ai/assistant";
import { streamAssistantResponse } from "@/lib/ai/chat-runner";
import { READER_TOOLS, runScriptureTool } from "@/lib/ai/retrieval";
import {
  MAX_QUESTION_CHARS,
  clampHistory,
  normalizeQuestion,
  questionTooLong,
} from "@/lib/ai/chat-input";
import { AI_CHAT_RULES, enforceApiRateLimit } from "@/lib/rate-limit";
import { saveChatMessage } from "@gospel/db";

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

  const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
  const volume = typeof body.volume === "string" ? body.volume : "";
  const book = typeof body.book === "string" ? body.book : "";
  const chapter = typeof body.chapter === "number" ? body.chapter : NaN;
  const question = normalizeQuestion(body.question);
  const history = clampHistory(body.history);

  if (!question) {
    return Response.json({ error: "A question is required." }, { status: 400 });
  }
  if (questionTooLong(question)) {
    return Response.json(
      { error: `Please shorten your question to ${MAX_QUESTION_CHARS} characters or fewer.` },
      { status: 400 },
    );
  }
  if (!book || !Number.isInteger(chapter)) {
    return Response.json({ error: "Missing chapter context." }, { status: 400 });
  }

  let chapterData;
  try {
    chapterData = await getChapter(book, chapter);
  } catch {
    return Response.json(
      { error: "Couldn’t load the chapter text to answer from." },
      { status: 502 },
    );
  }

  const verses = chapterData.chapter.verses.map((v, i) => ({
    n: i + 1,
    text: v.text,
  }));

  const messages = buildGroundedMessages({
    bookTitle: chapterData.book.title,
    chapterNumber: chapterData.chapter.number,
    verses,
    history,
    question,
  });

  // Persist the user's message before we start (best effort).
  await saveChatMessage(deviceId, volume, book, chapter, "user", question);

  try {
    return await streamAssistantResponse({
      messages: messages as Groq.Chat.Completions.ChatCompletionMessageParam[],
      tools: READER_TOOLS,
      runTool: runScriptureTool,
      onComplete: (full) =>
        saveChatMessage(deviceId, volume, book, chapter, "assistant", full),
    });
  } catch (err) {
    console.error("[assistant] groq error:", err);
    return Response.json(
      { error: "The assistant is unavailable right now. Please try again." },
      { status: 502 },
    );
  }
}
