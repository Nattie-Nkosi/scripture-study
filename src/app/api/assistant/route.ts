import type Groq from "groq-sdk";

import { getGroqClient, ASSISTANT_MODEL } from "@/lib/ai/groq";
import { getChapter } from "@/lib/scripture/client";
import { buildGroundedMessages } from "@/lib/ai/assistant";
import { saveChatMessage } from "@/lib/db/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const history = Array.isArray(body.history)
    ? (body.history as { role: "user" | "assistant"; content: string }[])
    : [];

  if (!question) {
    return Response.json({ error: "A question is required." }, { status: 400 });
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

  const groq = getGroqClient();
  let completion;
  try {
    completion = await groq.chat.completions.create({
      model: ASSISTANT_MODEL,
      temperature: 0.4,
      stream: true,
      messages: messages as Groq.Chat.Completions.ChatCompletionMessageParam[],
    });
  } catch (err) {
    console.error("[assistant] groq error:", err);
    return Response.json(
      { error: "The assistant is unavailable right now. Please try again." },
      { status: 502 },
    );
  }

  const encoder = new TextEncoder();
  let full = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of completion) {
          const delta = chunk.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            full += delta;
            controller.enqueue(encoder.encode(delta));
          }
        }
      } catch (err) {
        controller.error(err);
        return;
      }
      controller.close();
      if (full.trim()) {
        await saveChatMessage(deviceId, volume, book, chapter, "assistant", full);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
