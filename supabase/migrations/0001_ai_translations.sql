-- Simple English translation cache.
-- Keyed by volume / book / chapter / verse so a verse is never translated twice.
-- Run this in the Supabase SQL editor (or `supabase db push`).

create table if not exists public.ai_translations (
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
  on public.ai_translations (volume, book, chapter);

-- Keep updated_at fresh on upsert.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ai_translations_set_updated_at on public.ai_translations;
create trigger ai_translations_set_updated_at
  before update on public.ai_translations
  for each row execute function public.set_updated_at();

-- RLS: the server writes with the service-role key (which bypasses RLS).
-- Translations are derived public text, so allow anonymous reads; block
-- anonymous writes.
alter table public.ai_translations enable row level security;

drop policy if exists "ai_translations read" on public.ai_translations;
create policy "ai_translations read"
  on public.ai_translations for select
  to anon, authenticated
  using (true);
