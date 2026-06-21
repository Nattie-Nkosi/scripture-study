import type Groq from "groq-sdk";

import { buildAskMessages } from "@/lib/ai/ask-assistant";
import { streamAssistantResponse } from "@/lib/ai/chat-runner";
import { ASK_TOOLS, runAskTool } from "@/lib/ai/retrieval";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  const history = Array.isArray(body.history)
    ? (body.history as { role: "user" | "assistant"; content: string }[])
    : [];

  if (!question) {
    return Response.json({ error: "A question is required." }, { status: 400 });
  }

  const messages = buildAskMessages({ history, question });

  try {
    return await streamAssistantResponse({
      messages: messages as Groq.Chat.Completions.ChatCompletionMessageParam[],
      tools: ASK_TOOLS,
      runTool: runAskTool,
    });
  } catch (err) {
    console.error("[ask] groq error:", err);
    return Response.json(
      { error: "The assistant is unavailable right now. Please try again." },
      { status: 502 },
    );
  }
}
