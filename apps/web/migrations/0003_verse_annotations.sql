-- User highlights + notes, scoped to an anonymous device id (auth deferred).
-- One row per (device, verse); holds an optional highlight color and/or note.
-- Run with: npm run db:migrate

create table if not exists verse_annotations (
  id         bigint generated always as identity primary key,
  device_id  text    not null,
  volume     text    not null,
  book       text    not null,
  chapter    integer not null,
  verse      integer not null,
  color      text,
  note       text,
  updated_at timestamptz not null default now(),
  unique (device_id, volume, book, chapter, verse)
);

create index if not exists verse_annotations_thread_idx
  on verse_annotations (device_id, volume, book, chapter);
