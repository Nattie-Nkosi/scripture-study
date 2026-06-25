-- Switch Ask-chat expiry from creation time to last activity: pruning now runs
-- on updated_at (bumped on every saved turn) instead of created_at, so an
-- actively-used chat survives. Swap the supporting index to match.
-- Run with: npm run db:migrate

drop index if exists ask_conversations_created_idx;

create index if not exists ask_conversations_updated_idx
  on ask_conversations (updated_at);
