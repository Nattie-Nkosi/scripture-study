import type Groq from "groq-sdk";

import { getTalk } from "@/lib/conference/client";
import { conferenceShortTitle } from "@/lib/conference/format";
import { buildTalkGroundedMessages } from "@/lib/ai/talk-assistant";
import { streamAssistantResponse } from "@/lib/ai/chat-runner";
import { TALK_TOOLS, runTalkTool } from "@/lib/ai/retrieval";
import {
  MAX_QUESTION_CHARS,
  clampHistory,
  normalizeQuestion,
  questionTooLong,
} from "@/lib/ai/chat-input";
import { AI_CHAT_RULES, enforceApiRateLimit } from "@/lib/rate-limit";
import { saveTalkChatMessage } from "@gospel/db";

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
  const talkId = typeof body.talkId === "string" ? body.talkId : "";
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

  try {
    return await streamAssistantResponse({
      messages: messages as Groq.Chat.Completions.ChatCompletionMessageParam[],
      tools: TALK_TOOLS,
      runTool: runTalkTool,
      onComplete: (full) => saveTalkChatMessage(deviceId, talkId, "assistant", full),
    });
  } catch (err) {
    console.error("[talk-assistant] groq error:", err);
    return Response.json(
      { error: "The assistant is unavailable right now. Please try again." },
      { status: 502 },
    );
  }
}
