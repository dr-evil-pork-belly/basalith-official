-- Who asked. October 6, 2026.
-- Record: docs/ENTITY_ACCESS_2026-10-06.md.
-- Writer: app/api/archive/entity-chat/route.ts, the contributor branch.
--
-- WHY. An owner can now let one contributor at a time put questions to the
-- Basalith. entity_conversations has stored every question and answer since
-- the table was made, with the archive and nothing about the asker. Once
-- anyone but the owner can ask, a row that does not say who asked cannot be
-- read back to the owner as "what your family asked", and that cannot be
-- repaired later for rows already written. So the column goes in before the
-- first relative asks.
--
-- Null means the owner asked (every row to date, and every owner row after).
-- A contributor's rows carry their contributors.id.
--
-- Additive. One nullable column and one partial index. No existing row
-- changes. Pasted by hand into the Supabase SQL editor; never run from the CLI
-- or a script. The route writes tolerantly: before this is pasted it saves the
-- rows without the column, exactly as it does today, so the deploy order does
-- not matter. Rows written in that gap have no asker and cannot be attributed.
--
-- ON DELETE SET NULL, not CASCADE: contributors are deactivated, not deleted,
-- in normal use (status = 'inactive'). If a contributors row is ever deleted
-- by hand, the owner keeps the conversation and loses only the name on it.
-- When a whole archive is deleted both tables go in the same cascade from
-- archives, as they do now.

alter table entity_conversations
  add column if not exists contributor_id uuid references contributors(id) on delete set null;

create index if not exists entity_conversations_asker
  on entity_conversations (archive_id, contributor_id, created_at desc)
  where contributor_id is not null;

comment on column entity_conversations.contributor_id is
  'Who asked. Null is the owner. Set by /api/archive/entity-chat for a contributor granted access by the owner (archives.contributor_entity_access).';

-- Confirm after paste. Paste the output of all three back.
--
--   -- 1. The column exists, is nullable, and is a uuid.
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_name = 'entity_conversations' and column_name = 'contributor_id';
--
--   -- 2. No existing row was touched. Expect with_asker = 0 right after paste.
--   select count(*) as total, count(contributor_id) as with_asker
--   from entity_conversations;
--
--   -- 3. RLS is still on for the table, and the policies are what they were.
--   select c.relrowsecurity, p.polname, p.polroles::regrole[]
--   from pg_class c left join pg_policy p on p.polrelid = c.oid
--   where c.relname = 'entity_conversations';
--
-- Read before deploy, not part of this migration. It answers the one live
-- question this change raises: does any Basalith have access switched on
-- today, and would the grounded rule close it.
--
--   select id, name, tier, status, entity_pipeline,
--          contributor_entity_access,
--          coalesce(array_length(entity_preview_contributor_ids, 1), 0) as listed
--   from archives
--   where contributor_entity_access is distinct from 'none'
--      or entity_pipeline = 'grounded'
--   order by name;
