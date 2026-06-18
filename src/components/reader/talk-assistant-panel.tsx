"use client";

import { ChatPanel, type ChatMessage } from "@/components/reader/chat-panel";
import {
  loadTalkChatHistory,
  clearTalkChatHistory,
} from "@/lib/actions/talk-chat";

const SUGGESTIONS = [
  "Summarize this talk",
  "What is the main message?",
  "What scriptures does the speaker cite?",
];

export function TalkAssistantPanel({
  talkId,
  title,
  speaker,
}: {
  talkId: string;
  title: string;
  speaker: string;
}) {
  return (
    <ChatPanel
      subtitle={speaker}
      suggestions={SUGGESTIONS}
      placeholder="Ask about this talk…"
      endpoint="/api/talk-assistant"
      emptyHint={
        <>
          Ask anything about <span className="font-medium">“{title}”</span>.
          Answers stay grounded in this talk.
        </>
      }
      disclaimer={
        <>
          Study aid — <strong>not</strong> an official source of Church doctrine.
          Answers are AI-generated from this talk’s text.
        </>
      }
      loadHistory={(deviceId) => loadTalkChatHistory(deviceId, talkId)}
      clearHistory={async (deviceId) => {
        await clearTalkChatHistory(deviceId, talkId);
      }}
      buildBody={(deviceId, question, history: ChatMessage[]) => ({
        deviceId,
        talkId,
        question,
        history,
      })}
    />
  );
}
