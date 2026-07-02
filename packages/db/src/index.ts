// @gospel/db — the shared server-only data layer for the Gospel Library apps
// (web + admin). Every export here talks to the same Neon/pgvector database
// through getSql(); callers degrade gracefully when DATABASE_URL is unset.

export { getSql, isDatabaseConfigured } from "./client";
export * from "./chat";
export * from "./talk-chat";
export * from "./embeddings";
export * from "./translations";
export * from "./summaries";
export * from "./ask-conversations";
