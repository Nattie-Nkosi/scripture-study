-- Simple English translation cache (Neon / Postgres).
-- Keyed by volume / book / chapter / verse so a verse is never translated twice.
-- Run with: npm run db:migrate  (or paste into the Neon SQL editor).

create table if not exists ai_translations (
  id          bigint generated always as identity primary key,
  volume      text    not null,
  book        text    not null,
  chapter     integer not null,
  verse       integer not null,
  simple_text text    not null,
  model       text    not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (volume, book, chapter, verse)
);

create index if not exists ai_translations_chapter_idx
  on ai_translations (volume, book, chapter);
