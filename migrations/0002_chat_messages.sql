-- Study-assistant chat history.
-- Auth is deferred, so history is scoped to an anonymous device id (plus the
-- chapter being read). Run with: npm run db:migrate

create table if not exists chat_messages (
  id         bigint generated always as identity primary key,
  device_id  text    not null,
  volume     text    not null,
  book       text    not null,
  chapter    integer not null,
  role       text    not null check (role in ('user', 'assistant')),
  content    text    not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_thread_idx
  on chat_messages (device_id, volume, book, chapter, created_at);
