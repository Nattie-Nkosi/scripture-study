-- Reverse citation index: which General Conference talks cite which verses.
-- One row per (talk, footnote, verse-segment). A segment is either a verse
-- range (verse_start..verse_end) or a whole-chapter citation (both null).
-- Loaded by scripts/index-citations.mjs (npm run db:citations). Read by the
-- reader's "Who taught this?" panel via @gospel/db getVerseCitations().

create table if not exists talk_citations (
  id            bigint generated always as identity primary key,
  talk_id       text    not null,
  conference_id text    not null,
  year          integer not null,
  month         integer not null,
  session       text,
  title         text    not null,
  speaker       text    not null,
  volume        text    not null,
  book          text    not null,
  chapter       integer not null,
  verse_start   integer,
  verse_end     integer,
  paragraph     integer not null,
  created_at    timestamptz not null default now(),
  -- NULLS NOT DISTINCT so whole-chapter citations (verse_start/end null) still
  -- collide on re-insert, keeping `on conflict do nothing` idempotent.
  unique nulls not distinct (talk_id, book, chapter, verse_start, verse_end, paragraph)
);

-- The reader looks up by book + chapter, then filters by verse in SQL.
create index if not exists talk_citations_book_chapter
  on talk_citations (book, chapter);
