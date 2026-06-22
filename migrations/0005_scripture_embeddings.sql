-- Semantic-search index for the standard works.
-- Each row is one verse + its 384-dim embedding (Xenova/all-MiniLM-L6-v2).
-- Loaded by scripts/embed-corpus.mjs (npm run db:embed). Run: npm run db:migrate
-- The ANN index is built by the ingest script AFTER the bulk load, not here.

create extension if not exists vector;

create table if not exists scripture_embeddings (
  id         bigint generated always as identity primary key,
  volume     text    not null,
  book       text    not null,
  book_title text    not null,
  chapter    integer not null,
  verse      integer not null,
  reference  text    not null,
  text       text    not null,
  embedding  vector(384) not null,
  unique (volume, book, chapter, verse)
);
