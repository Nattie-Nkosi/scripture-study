// Shared (client + server) types and constants for saved Ask chats. Kept out of
// the server-only db module so client components can import them too.

// A saved Ask chat is auto-pruned after this many days with no activity. Each
// new message resets the clock.
export const ASK_RETENTION_DAYS = 7;

export interface AskConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}
