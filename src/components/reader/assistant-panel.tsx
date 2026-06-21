"use client";

import { ChatPanel, type ChatMessage } from "@/components/reader/chat-panel";
import { loadChatHistory, clearChatHistory } from "@/lib/actions/chat";

const SUGGESTIONS = [
  "Summarize this chapter",
  "Explain the first verse in plain terms",
  "What are the main themes here?",
];

export function AssistantPanel({
  volume,
  book,
  chapter,
  bookTitle,
}: {
  volume: string;
  book: string;
  chapter: number;
  bookTitle: string;
}) {
  const label = `${bookTitle} ${chapter}`;

  return (
    <ChatPanel
      subtitle={label}
      suggestions={SUGGESTIONS}
      placeholder="Ask about this chapter…"
      endpoint="/api/assistant"
      emptyHint={
        <>
          Ask anything about <span className="font-medium">{label}</span>. Answers
          start here and can look up related passages across the scriptures.
        </>
      }
      disclaimer={
        <>
          Study aid — <strong>not</strong> an official source of Church doctrine.
          Answers are AI-generated from this chapter and the scriptures it cites.
        </>
      }
      loadHistory={(deviceId) =>
        loadChatHistory(deviceId, volume, book, chapter)
      }
      clearHistory={async (deviceId) => {
        await clearChatHistory(deviceId, volume, book, chapter);
      }}
      buildBody={(deviceId, question, history: ChatMessage[]) => ({
        deviceId,
        volume,
        book,
        chapter,
        question,
        history,
      })}
    />
  );
}
