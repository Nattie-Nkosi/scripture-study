import type Groq from "groq-sdk";

import { buildAskMessages } from "@/lib/ai/ask-assistant";
import { streamAssistantResponse } from "@/lib/ai/chat-runner";
import { ASK_TOOLS, runAskTool } from "@/lib/ai/retrieval";
import {
  MAX_QUESTION_CHARS,
  clampHistory,
  normalizeQuestion,
  questionTooLong,
} from "@/lib/ai/chat-input";
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

  const messages = buildAskMessages({ history, question });

  try {
    return await streamAssistantResponse({
      messages: messages as Groq.Chat.Completions.ChatCompletionMessageParam[],
      tools: ASK_TOOLS,
      runTool: runAskTool,
      // Allow one reformulation: the model can search, read the results, and
      // search again (e.g. follow a name it just found) before answering. The
      // final answer round runs with tools disabled and streams live.
      maxToolRounds: 2,
    });
  } catch (err) {
    console.error("[ask] groq error:", err);
    return Response.json(
      { error: "The assistant is unavailable right now. Please try again." },
      { status: 502 },
    );
  }
}
