import type Groq from "groq-sdk";

import { getGroqClient, ASSISTANT_MODEL } from "@/lib/ai/groq";
import { getTalk } from "@/lib/conference/client";
import { conferenceShortTitle } from "@/lib/conference/format";
import { buildTalkGroundedMessages } from "@/lib/ai/talk-assistant";
import { saveTalkChatMessage } from "@/lib/db/talk-chat";

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
  const talkId = typeof body.talkId === "string" ? body.talkId : "";
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const history = Array.isArray(body.history)
    ? (body.history as { role: "user" | "assistant"; content: string }[])
    : [];

  if (!question) {
    return Response.json({ error: "A question is required." }, { status: 400 });
  }
  if (!talkId) {
    return Response.json({ error: "Missing talk context." }, { status: 400 });
  }

  let talk;
  try {
    talk = await getTalk(talkId);
  } catch {
    return Response.json(
      { error: "Couldn’t load the talk text to answer from." },
      { status: 502 },
    );
  }

  const messages = buildTalkGroundedMessages({
    title: talk.title,
    speaker: talk.speaker,
    role: talk.role,
    session: talk.session,
    conferenceTitle: conferenceShortTitle(talk.year, talk.month),
    paragraphs: talk.content.paragraphs.map((p) => p.text),
    history,
    question,
  });

  // Persist the user's message before we start (best effort).
  await saveTalkChatMessage(deviceId, talkId, "user", question);

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
    console.error("[talk-assistant] groq error:", err);
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
        await saveTalkChatMessage(deviceId, talkId, "assistant", full);
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
