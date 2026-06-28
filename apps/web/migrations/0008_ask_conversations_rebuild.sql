-- Rebuild the Ask saved-chat tables. An earlier (non-migration) version of these
-- tables existed in some databases with degraded columns: `id` ended up as plain
-- text with no default and ask_messages.id lost its identity sequence, so inserts
-- failed the NOT NULL on id. Because 0006/0007 use `create table if not exists`,
-- they could not repair that — so drop and recreate cleanly. Safe because these
-- chats are ephemeral (auto-pruned after a week) and carry no critical data.
-- Run with: npm run db:migrate

drop table if exists ask_messages;

drop table if exists ask_conversations;

create table ask_conversations (
  id         uuid primary key default gen_random_uuid(),
  device_id  text not null,
  title      text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ask_conversations_device_idx
  on ask_conversations (device_id, updated_at desc);

create index ask_conversations_updated_idx
  on ask_conversations (updated_at);

create table ask_messages (
  id              bigint generated always as identity primary key,
  conversation_id uuid not null references ask_conversations (id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  created_at      timestamptz not null default now()
);

create index ask_messages_conversation_idx
  on ask_messages (conversation_id, created_at, id);
