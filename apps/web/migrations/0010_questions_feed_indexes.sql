-- Indexes for the admin "Questions" feed, which unions the user-role rows of the
-- three assistant tables and sorts them newest-first. Partial indexes on
-- (created_at desc) where role = 'user' are small (they skip assistant rows) and
-- let each union branch return its questions already ordered, so the merge +
-- limit avoids a full scan and sort. Run with: npm run db:migrate

create index if not exists chat_messages_questions_idx
  on chat_messages (created_at desc) where role = 'user';

create index if not exists talk_chat_messages_questions_idx
  on talk_chat_messages (created_at desc) where role = 'user';

create index if not exists ask_messages_questions_idx
  on ask_messages (created_at desc) where role = 'user';
