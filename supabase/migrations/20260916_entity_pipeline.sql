-- ── Family entity pipeline switch ─────────────────────────────────────────────
-- Paste in the Supabase SQL editor. Additive, no data change.
--
-- WHY. /api/archive/entity-chat serves every family archive from one route.
-- Moving it onto the grounded pipeline (frozen layer, personal prompt scope,
-- Control B, gap reply in the reader's language) changes what a family member
-- experiences: a reference voice that answers from the record or declines,
-- instead of a companion that draws deposits out. The two live family archives
-- are not the founder's and their contributors do not all write in English. This
-- column lets the Dr Ha archive move first and each other archive move after a
-- person has read a real conversation on it in its language.
--
-- TEMPORARY. When every archive reads 'grounded', drop the column, delete
-- lib/entityContext.ts and the 'context' branch of the route, and retire the
-- fidelity eval generator that reads that builder. Recorded in
-- docs/FAMILY_ENTITY_MOVE_2026-09-16.md.
--
-- The route reads this column tolerantly (lib/familyEntity.ts
-- readEntityPipeline): before this migration is pasted every archive behaves
-- as 'context', so the deploy order does not matter.

alter table archives
  add column if not exists entity_pipeline text not null default 'context'
    check (entity_pipeline in ('context', 'grounded'));

comment on column archives.entity_pipeline is
  'Which builder answers /api/archive/entity-chat for this archive. context: lib/entityContext.ts, Opus, no verifier (pre-September 16, 2026). grounded: frozen layer, personal prompt scope, Sonnet, Control B, gap reply. Temporary; drop when every archive is grounded.';

-- To move one archive (the founder pastes, one at a time, after reading a
-- conversation on it):
--   update archives set entity_pipeline = 'grounded' where id = '<archive id>';
-- To move it back:
--   update archives set entity_pipeline = 'context' where id = '<archive id>';
