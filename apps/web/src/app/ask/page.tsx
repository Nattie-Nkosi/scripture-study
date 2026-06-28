import { SiteHeader } from "@/components/site-header";
import { AskChat } from "@/components/ask/ask-chat";

export const metadata = {
  title: "Ask",
  description:
    "Ask anything about the scriptures and General Conference — answered from the text in this app, with references.",
};

export default function AskPage() {
  return (
    <>
      <SiteHeader />
      {/* Fill the viewport below the sticky header; the chat manages its own
          scroll. dvh keeps the composer reachable on mobile browser chrome. */}
      <main
        className="w-full"
        style={{ height: "calc(100dvh - 3.5rem - env(safe-area-inset-top))" }}
      >
        <AskChat />
      </main>
    </>
  );
}
