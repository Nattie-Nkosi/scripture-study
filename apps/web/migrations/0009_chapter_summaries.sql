-- Chapter summary cache (Neon / Postgres).
-- A chapter's AI summary is the same for every reader, so cache it once keyed by
-- book / chapter and never regenerate it. Run with: npm run db:migrate
-- (The unique (book, chapter) constraint doubles as the lookup index.)

create table if not exists chapter_summaries (
  id           bigint generated always as identity primary key,
  book         text    not null,
  chapter      integer not null,
  summary_text text    not null,
  model        text    not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (book, chapter)
);
