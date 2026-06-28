-- Study-assistant chat history for General Conference talks.
-- Mirrors chat_messages (0002) but a talk thread is keyed by its talk id
-- (e.g. "2024-04-13holland") rather than volume/book/chapter.
-- Run with: npm run db:migrate

create table if not exists talk_chat_messages (
  id         bigint generated always as identity primary key,
  device_id  text    not null,
  talk_id    text    not null,
  role       text    not null check (role in ('user', 'assistant')),
  content    text    not null,
  created_at timestamptz not null default now()
);

create index if not exists talk_chat_messages_thread_idx
  on talk_chat_messages (device_id, talk_id, created_at);
