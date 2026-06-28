import "server-only";
import type Groq from "groq-sdk";

import { getGroqClient, ASSISTANT_MODEL } from "./groq";
import { NOTICE_PREFIX } from "./stream-markers";

// How many times the model may search before it must answer. Two rounds is
// plenty (a reformulated follow-up search at most); the final round drops the
// tools so the loop always terminates in a written answer.
const MAX_TOOL_ROUNDS = 2;

type ToolRunner = (name: string, argsJson: string) => Promise<string>;

type Call = { id: string; name: string; args: string };

// Llama on Groq is unreliable at native tool calls: it often emits a call as
// TEXT in the content stream (`<function=search_scriptures>{…}</function>`), and
// sometimes emits malformed syntax (a missing `>`) that Groq itself rejects with
// a `tool_use_failed` 400 — handing the botched call back in `failed_generation`.
// This lenient matcher recovers the call from any of those forms (the `>` and
// the closing tag are both optional) so the search still runs.
const FUNCTION_TAG =
  /<function\s*=\s*([a-zA-Z0-9_]+)\s*>?\s*(\{[\s\S]*?\})\s*(?:<\/function>)?/g;
const TOOL_CALL_TAG = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g;

function parseTextualToolCalls(text: string): { name: string; args: string }[] {
  const out: { name: string; args: string }[] = [];

  FUNCTION_TAG.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = FUNCTION_TAG.exec(text)) !== null) {
    out.push({ name: m[1], args: m[2] });
  }

  TOOL_CALL_TAG.lastIndex = 0;
  while ((m = TOOL_CALL_TAG.exec(text)) !== null) {
    try {
      const obj = JSON.parse(m[1].trim());
      const name = typeof obj?.name === "string" ? obj.name : "";
      if (!name) continue;
      const args = obj.arguments ?? obj.parameters ?? {};
      out.push({ name, args: typeof args === "string" ? args : JSON.stringify(args) });
    } catch {
      // Not valid JSON — ignore this block.
    }
  }

  return out;
}

function toCalls(round: number, parsed: { name: string; args: string }[]): Call[] {
  return parsed.map((t, i) => ({ id: `call_${round}_${i}`, name: t.name, args: t.args }));
}

/** Remove any leaked tool-call tags from a final answer (belt-and-suspenders for
 *  a model that emits one even when no tools were offered). */
function stripToolTags(content: string): string {
  return content
    .replace(FUNCTION_TAG, "")
    .replace(TOOL_CALL_TAG, "")
    .replace(/<\/?function[^>]*>/g, "")
    .replace(/<\/?tool_call>/g, "")
    .trim();
}

/** The model's failed tool-call generation, when Groq rejects it with a 400. */
function failedGeneration(err: unknown): string | null {
  const e = err as {
    code?: string;
    error?: { code?: string; failed_generation?: string };
  };
  const code = e?.error?.code ?? e?.code;
  if (code !== "tool_use_failed") return null;
  return typeof e?.error?.failed_generation === "string"
    ? e.error.failed_generation
    : "";
}

/** Seconds to wait, from a 429's `retry-after` header, if present. */
function retryAfterSeconds(err: unknown): number | null {
  const h = (err as { headers?: unknown }).headers;
  let raw: string | null = null;
  if (h && typeof (h as Headers).get === "function") {
    raw = (h as Headers).get("retry-after");
  } else if (h && typeof h === "object") {
    raw = (h as Record<string, string>)["retry-after"] ?? null;
  }
  const secs = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(secs) && secs > 0 ? secs : null;
}

/** A rough, human wait like "about 17 minutes" or "about 2 hours". */
function humanizeWait(secs: number): string {
  const mins = Math.ceil(secs / 60);
  if (mins < 60) return `about ${mins} minute${mins === 1 ? "" : "s"}`;
  const hours = Math.round(mins / 60);
  return `about ${hours} hour${hours === 1 ? "" : "s"}`;
}

/** A reader-facing message for an error that surfaces mid-stream, so we can show
 *  something calm and explanatory instead of aborting the response (which the
 *  client sees as a dropped request / 500). */
function friendlyMessage(err: unknown): string {
  const e = err as { status?: number; error?: { error?: { code?: string } } };
  const status = e?.status;
  const code = e?.error?.error?.code;

  if (status === 429 || code === "rate_limit_exceeded") {
    const secs = retryAfterSeconds(err);
    const when = secs
      ? `It should be available again in ${humanizeWait(secs)} — please try your question then.`
      : "Please give it a little while, then try your question again.";
    return (
      "The study assistant runs on a free AI service that allows a limited " +
      "amount of use each day, and today's allowance is used up for now. " +
      when
    );
  }
  if (status === 503 || status === 529 || status === 502) {
    return (
      "The study assistant is busy right now. This usually clears up quickly — " +
      "please wait a moment and try your question again."
    );
  }
  return (
    "Something went wrong reaching the study assistant. This is usually " +
    "temporary — please try your question again in a moment."
  );
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Emit the answer in small chunks so it still reveals progressively (we buffer
 *  each round to vet it before showing anything, so we can't pass tokens live). */
async function emitChunked(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  text: string,
): Promise<void> {
  const CHUNK = 24;
  for (let i = 0; i < text.length; i += CHUNK) {
    controller.enqueue(encoder.encode(text.slice(i, i + CHUNK)));
    if (i + CHUNK < text.length) await delay(10);
  }
}

// Tool-call tags the model can leak even when no tools are offered. While the
// final answer streams live, we must never let one — or a partial prefix of one
// — reach the reader, so the streamer holds back a short tail until it resolves
// and stops emitting once a tag actually opens.
const SENTINEL_HEADS = ["<function", "<tool_call"] as const;
const MAX_SENTINEL_HEAD = 10;

/** The offset from which `buf` might be starting to build a sentinel head;
 *  everything from there on is held back until the next delta resolves it. */
function partialSentinelStart(buf: string): number {
  const from = Math.max(0, buf.length - MAX_SENTINEL_HEAD);
  for (let i = from; i < buf.length; i++) {
    const tail = buf.slice(i);
    if (SENTINEL_HEADS.some((h) => h.startsWith(tail))) return i;
  }
  return buf.length;
}

/** Streams a final answer to the reader token-by-token while guarding against a
 *  leaked tool-call tag: clean text flushes immediately, a partial-tag tail is
 *  held back, and once a full tag opens the remainder is dropped (and stripped
 *  from the returned text). Tools are disabled on this turn, so a tag here is a
 *  rare model slip, not a real call. */
function makeAnswerStreamer(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
) {
  let buf = "";
  let sent = 0;
  let blocked = false;

  function emitTo(idx: number) {
    if (idx > sent) {
      controller.enqueue(encoder.encode(buf.slice(sent, idx)));
      sent = idx;
    }
  }

  return {
    push(text: string) {
      if (!text) return;
      buf += text;
      if (blocked) return;
      let head = -1;
      for (const h of SENTINEL_HEADS) {
        const idx = buf.indexOf(h, sent);
        if (idx !== -1 && (head === -1 || idx < head)) head = idx;
      }
      if (head !== -1) {
        emitTo(head);
        blocked = true;
        return;
      }
      emitTo(partialSentinelStart(buf));
    },
    finish(): string {
      if (!blocked) emitTo(buf.length);
      return stripToolTags(buf);
    },
  };
}

/** Stream a grounded answer, letting the model call retrieval tools first.
 *
 *  Each round is buffered, not streamed live: we read the whole turn, decide
 *  whether it's a tool call or the final answer, run any searches, and only then
 *  reveal the vetted answer. Tool calls are recovered from the native field, from
 *  text in the content, or from `failed_generation` when Groq 400s on malformed
 *  syntax — so a flaky tool call never leaks a raw tag or 500s the request. The
 *  final round drops the tools so the loop always ends in a written answer.
 *
 *  `getGroqClient()` is called up front so a missing key rejects before we
 *  commit to a streaming Response (the caller can still return a clean error). */
export async function streamAssistantResponse(opts: {
  messages: Groq.Chat.Completions.ChatCompletionMessageParam[];
  tools: Groq.Chat.Completions.ChatCompletionTool[];
  runTool: ToolRunner;
  onComplete?: (full: string) => Promise<void> | void;
  /** How many tool-offered rounds to allow before the model must answer. The
   *  answer round (tools disabled) streams live, so a caller that wants live
   *  streaming after a single search pass can set this to 1. */
  maxToolRounds?: number;
}): Promise<Response> {
  const groq = getGroqClient();
  const encoder = new TextEncoder();
  const maxRounds = opts.maxToolRounds ?? MAX_TOOL_ROUNDS;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const work = [...opts.messages];
      let full = "";
      let toolsDisabled = false; // set after an unrecoverable tool failure

      try {
        for (let round = 0; ; round++) {
          const offerTools = !toolsDisabled && round < maxRounds;

          const native = new Map<number, Call>();
          let content = "";
          let calls: Call[] = [];
          let fromTool = false; // calls came from a tool turn (drop any preamble)

          // With tools disabled this round is the final answer: stream it live.
          // Tool-offered rounds stay buffered so a preamble that turns out to be
          // a tool call (or an ungrounded guess) never reaches the reader.
          const answerStreamer = offerTools
            ? null
            : makeAnswerStreamer(controller, encoder);

          try {
            const completion = await groq.chat.completions.create({
              model: ASSISTANT_MODEL,
              temperature: 0.4,
              stream: true,
              messages: work,
              tools: offerTools ? opts.tools : undefined,
              tool_choice: offerTools ? "auto" : undefined,
            });

            for await (const chunk of completion) {
              const delta = chunk.choices?.[0]?.delta;
              if (!delta) continue;
              if (delta.content) {
                content += delta.content;
                answerStreamer?.push(delta.content); // live when tools are off
              }
              for (const tc of delta.tool_calls ?? []) {
                const cur = native.get(tc.index) ?? { id: "", name: "", args: "" };
                if (tc.id) cur.id = tc.id;
                if (tc.function?.name) cur.name = tc.function.name;
                if (tc.function?.arguments) cur.args += tc.function.arguments;
                native.set(tc.index, cur);
              }
            }
          } catch (err) {
            // Groq rejected a malformed tool call — recover it from the payload.
            const failed = offerTools ? failedGeneration(err) : null;
            if (failed === null) throw err;
            const recovered = toCalls(round, parseTextualToolCalls(failed));
            if (recovered.length === 0) {
              toolsDisabled = true; // give up on tools; answer plainly next round
              continue;
            }
            calls = recovered;
            fromTool = true;
          }

          // Tools were disabled, so this round was the final answer, already
          // streamed live above. No tool-call detection needed.
          if (answerStreamer) {
            const answer = answerStreamer.finish();
            if (answer) {
              full = answer;
            } else {
              full = "(No response — please try again.)";
              await emitChunked(controller, encoder, full);
            }
            break;
          }

          // Native tool call, else a text-format call in the streamed content.
          if (calls.length === 0) {
            calls = [...native.values()].filter((c) => c.id && c.name);
            if (calls.length > 0) fromTool = true;
            else if (offerTools) {
              const textual = toCalls(round, parseTextualToolCalls(content));
              if (textual.length > 0) {
                calls = textual;
                fromTool = true;
              }
            }
          }

          if (calls.length === 0) {
            full = stripToolTags(content) || "(No response — please try again.)";
            await emitChunked(controller, encoder, full);
            break;
          }

          // Record the tool-call turn (drop any preamble, which tends to be the
          // model's ungrounded guess) and run the tools.
          work.push({
            role: "assistant",
            content: fromTool ? null : content || null,
            tool_calls: calls.map((c) => ({
              id: c.id,
              type: "function",
              function: { name: c.name, arguments: c.args },
            })),
          });
          for (const c of calls) {
            const result = await opts.runTool(c.name, c.args);
            work.push({ role: "tool", tool_call_id: c.id, content: result });
          }
        }
      } catch (err) {
        // A mid-stream failure (e.g. Groq 429 rate limit) would otherwise abort
        // the response — the client sees a dropped request and a 500 is logged.
        // Instead, surface a calm message in the stream and close cleanly. The
        // error is left out of `onComplete`, so it's never saved as a real turn.
        console.error("[chat-runner] stream error:", err);
        try {
          // NOTICE_PREFIX marks this as a system notice so the client renders it
          // as a warning rather than a normal answer.
          await emitChunked(controller, encoder, NOTICE_PREFIX + friendlyMessage(err));
          controller.close();
        } catch {
          try {
            controller.close();
          } catch {
            // Stream already torn down — nothing more we can do.
          }
        }
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
