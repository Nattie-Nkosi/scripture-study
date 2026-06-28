-- Saved conversations for the library-wide "Ask" assistant.
-- Auth is deferred, so chats are scoped to an anonymous device id. These are
-- intentionally ephemeral: a chat is auto-deleted ~1 week after it is created
-- (see ASK_RETENTION_DAYS / pruneExpired in src/lib/db/ask-conversations.ts) to
-- keep the database small. Run with: npm run db:migrate

create table if not exists ask_conversations (
  id         uuid primary key default gen_random_uuid(),
  device_id  text not null,
  title      text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ask_conversations_device_idx
  on ask_conversations (device_id, updated_at desc);

create index if not exists ask_conversations_created_idx
  on ask_conversations (created_at);

create table if not exists ask_messages (
  id              bigint generated always as identity primary key,
  conversation_id uuid not null references ask_conversations (id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  created_at      timestamptz not null default now()
);

create index if not exists ask_messages_conversation_idx
  on ask_messages (conversation_id, created_at, id);
