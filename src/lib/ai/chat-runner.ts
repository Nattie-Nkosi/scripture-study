import "server-only";
import type Groq from "groq-sdk";

import { getGroqClient, ASSISTANT_MODEL } from "./groq";

// How many times the model may search before it must answer. Two rounds is
// plenty (a reformulated follow-up search at most); the final round drops the
// tools so the loop always terminates in a written answer.
const MAX_TOOL_ROUNDS = 2;

type ToolRunner = (name: string, argsJson: string) => Promise<string>;

/** Stream a grounded answer, letting the model call retrieval tools first.
 *
 *  The common case (the open passage already answers the question) streams live
 *  in a single pass. When the model instead requests a search, that round emits
 *  no user-facing text — the panel keeps showing "Thinking…" — we run the tool,
 *  feed the results back, and stream the grounded answer on the next round.
 *
 *  `getGroqClient()` is called up front so a missing key rejects before we
 *  commit to a streaming Response (the caller can still return a clean error). */
export async function streamAssistantResponse(opts: {
  messages: Groq.Chat.Completions.ChatCompletionMessageParam[];
  tools: Groq.Chat.Completions.ChatCompletionTool[];
  runTool: ToolRunner;
  onComplete?: (full: string) => Promise<void> | void;
}): Promise<Response> {
  const groq = getGroqClient();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const work = [...opts.messages];
      let full = "";

      try {
        for (let round = 0; ; round++) {
          const offerTools = round < MAX_TOOL_ROUNDS;
          const completion = await groq.chat.completions.create({
            model: ASSISTANT_MODEL,
            temperature: 0.4,
            stream: true,
            messages: work,
            tools: offerTools ? opts.tools : undefined,
            tool_choice: offerTools ? "auto" : undefined,
          });

          // Tool-call fragments arrive across deltas, keyed by index; the name
          // lands once and the JSON arguments accumulate piece by piece.
          const calls = new Map<number, { id: string; name: string; args: string }>();
          let content = "";

          for await (const chunk of completion) {
            const delta = chunk.choices?.[0]?.delta;
            if (!delta) continue;
            if (delta.content) {
              content += delta.content;
              full += delta.content;
              controller.enqueue(encoder.encode(delta.content));
            }
            for (const tc of delta.tool_calls ?? []) {
              const cur = calls.get(tc.index) ?? { id: "", name: "", args: "" };
              if (tc.id) cur.id = tc.id;
              if (tc.function?.name) cur.name = tc.function.name;
              if (tc.function?.arguments) cur.args += tc.function.arguments;
              calls.set(tc.index, cur);
            }
          }

          // No usable tool call means the model answered — it already streamed.
          const toolCalls = [...calls.values()].filter((c) => c.id && c.name);
          if (toolCalls.length === 0) break;

          work.push({
            role: "assistant",
            content: content || null,
            tool_calls: toolCalls.map((c) => ({
              id: c.id,
              type: "function",
              function: { name: c.name, arguments: c.args },
            })),
          });
          for (const c of toolCalls) {
            const result = await opts.runTool(c.name, c.args);
            work.push({ role: "tool", tool_call_id: c.id, content: result });
          }
        }
      } catch (err) {
        controller.error(err);
        return;
      }

      controller.close();
      if (full.trim() && opts.onComplete) await opts.onComplete(full);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
