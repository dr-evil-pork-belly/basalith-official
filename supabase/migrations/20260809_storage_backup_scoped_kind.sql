-- Storage backup: allow kind = 'scoped' on storage_backup_runs, and record what
-- a scoped run was scoped to.
--
-- Paste into the Supabase SQL editor. Do not run from a sandbox or the CLI.
--
-- ── HOW TO RUN THIS. DO NOT PASTE THE WHOLE FILE AT ONCE ─────────────────────
--
-- Four separate runs, in this order:
--
--   1. Section 0 alone. Read the constraint name it returns before continuing.
--   2. Sections 1 through 4 together. That is the whole migration.
--   3. Sections 5a through 5d together. All four are read-only.
--   4. Sections 5e through 5j ONE BLOCK AT A TIME.
--
-- Step 4 matters. 5f, 5g, and 5h are SUPPOSED to raise an error, and in the
-- Supabase editor an error aborts every statement after it in the same run. Sent
-- as one paste, the first expected error would swallow the blocks that follow and
-- the run would look like a failed migration instead of three passing negative
-- tests. Send each block on its own and read its result before the next.
--
-- Spec:     docs/STORAGE_BACKUP_SKELETON_2026-08.md build order 9a.
-- Parent:   supabase/migrations/20260808_storage_backup_manifest.sql
-- Code:     lib/storageBackup.ts SCOPED_RUN_KIND and applyArchiveScope.
--
-- ── TWO CHANGES, TWO DIFFERENT JOBS ──────────────────────────────────────────
--
-- 1. kind = 'scoped'          carries the SAFETY property
-- 2. scope_archive_id         carries the PROVENANCE
--
-- They are not alternatives and adding the second does not soften the first.
--
-- THE SAFETY PROPERTY. Build order 9a copies one disposable archive and nothing
-- else. That run has to be incapable of reading as a full sync, because
-- app/api/cron/storage-backup-heartbeat/route.ts clears A5_SILENCE from the
-- latest ok = true run of kind 'sync' or 'seed', reading started_at and nothing
-- else. It never looks at objects_copied. A scoped run recorded as a seed would
-- report the backup healthy for 8 days having copied 6 objects out of 382. That
-- is the partial form of the failure storageBackupSync already refuses to commit
-- in its dryRun branch, which writes no run row at all for exactly this reason.
--
-- A kind the heartbeat does not query is safe by construction, with no filter
-- for anyone to remember. 'drill' already sits in this CHECK and already behaves
-- this way, so this follows an established pattern rather than inventing one.
-- A nullable scope column alone would NOT give this, because it would leave the
-- honesty of the heartbeat resting on two queries carrying .is('scope', null)
-- forever, and the first edit that forgets it silently restores the bug.
--
-- THE PROVENANCE. Which archive a scoped run targeted is derivable while the run
-- copied something, as
--   select distinct archive_id from storage_backup_objects where run_id = ...
-- but it is NOT derivable from a run that copied zero objects, because that run
-- has no rows in storage_backup_objects to join to. A zero-copy scoped run is
-- precisely the thing someone would be investigating, and it is the one case
-- where the derivation returns nothing and the intent is lost. One nullable
-- column now, or a second migration later.
--
-- The CHECK at step 4 makes the pairing structural rather than conventional: a
-- scoped run cannot be recorded without naming its target, and no other kind of
-- run may name one. Without it the column is optional, the wiring can leave it
-- null, and the gap this closes reopens in silence.
--
-- NO FOREIGN KEY on scope_archive_id, for the reason the parent migration gives
-- in its section 2a. A cascade from archives would erase the record of what a
-- run targeted at the moment the archive is deleted, which for a disposable 9a
-- archive is the moment it stops existing and the run row becomes the only
-- surviving evidence of the drill.
--
-- ── RE-RUN SAFETY ────────────────────────────────────────────────────────────
--
-- Unlike the parent migration, this one IS safe to re-run whole. Every DDL step
-- carries IF EXISTS or IF NOT EXISTS and the two constraints are dropped before
-- they are added.
--
-- storage_backup_runs is empty (verification 4g of the parent, both tables 0),
-- so both ADD CONSTRAINT statements validate against no rows and return
-- immediately. If rows exist by the time you paste this, the kind CHECK still
-- succeeds because the new list is a superset of the old one. The scope CHECK
-- would also succeed, because no existing row can be kind = 'scoped'.

-- ═════════════════════════════════════════════════════════════════════════════
-- 0. RUN THIS FIRST, ON ITS OWN, AND READ IT BEFORE GOING FURTHER.
-- ═════════════════════════════════════════════════════════════════════════════
--
-- Step 1 drops the kind constraint by name. The name below is Postgres's default
-- for an inline column CHECK, {table}_{column}_check, and the parent migration
-- declared it inline, so it should be storage_backup_runs_kind_check.
--
-- If it is NOT, do not continue. DROP CONSTRAINT IF EXISTS against a wrong name
-- is a SILENT no-op: step 2 would then add a second CHECK while the original
-- stayed in force, both would be evaluated with AND, and an insert of 'scoped'
-- would still be rejected. The migration would report success and change
-- nothing. Substitute the real name into step 1 if this returns something else.

select con.conname,
       pg_get_constraintdef(con.oid) as definition
from   pg_constraint con
join   pg_class rel   on rel.oid = con.conrelid
join   pg_namespace n on n.oid  = rel.relnamespace
where  n.nspname = 'public'
  and  rel.relname = 'storage_backup_runs'
  and  con.contype = 'c'
order  by con.conname;
-- expect exactly one row:
--   storage_backup_runs_kind_check
--   CHECK ((kind = ANY (ARRAY['seed'::text, 'sync'::text, 'verify'::text, 'drill'::text])))

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. Drop the old kind constraint.
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE storage_backup_runs
  DROP CONSTRAINT IF EXISTS storage_backup_runs_kind_check;

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. Add it back with 'scoped'.
-- ═════════════════════════════════════════════════════════════════════════════
--
-- Named explicitly rather than left inline, so the name is a fact in this file
-- and the next person to change it does not have to rediscover it in step 0.

ALTER TABLE storage_backup_runs
  ADD CONSTRAINT storage_backup_runs_kind_check
  CHECK (kind IN ('seed','sync','verify','drill','scoped'));

-- ═════════════════════════════════════════════════════════════════════════════
-- 3. Record what a scoped run was scoped to.
-- ═════════════════════════════════════════════════════════════════════════════
--
-- Nullable, because it is null for every kind except 'scoped'. No foreign key,
-- see the header.

ALTER TABLE storage_backup_runs
  ADD COLUMN IF NOT EXISTS scope_archive_id UUID;

COMMENT ON COLUMN storage_backup_runs.scope_archive_id IS
  'The single archive a kind=scoped run was restricted to. Null for every other '
  'kind. Not a foreign key on purpose: deleting the archive must not erase the '
  'record of the run that targeted it. Set by the sync from the '
  'storage/backup.sync.requested event, never inferred.';

-- ═════════════════════════════════════════════════════════════════════════════
-- 4. Tie the two together, so neither can drift from the other.
-- ═════════════════════════════════════════════════════════════════════════════
--
-- A scoped run MUST name its target, and nothing else may name one. Both halves
-- matter. Without the first, the wiring can insert kind = 'scoped' with a null
-- target and the provenance gap reopens silently. Without the second, a 'seed'
-- carrying a scope_archive_id would read as a full seed that was secretly
-- partial, which is the original failure wearing the other mask.
--
-- Both sides of the equality are non-nullable booleans, kind because the column
-- is NOT NULL and the right side because IS NOT NULL never yields null, so there
-- is no three valued logic hiding in this constraint.
--
-- If a future scoped run is ever scoped to something other than one archive, a
-- bucket for instance, alter this constraint in the SAME migration that changes
-- the code. Same rule the parent migration states for the bucket CHECK.

ALTER TABLE storage_backup_runs
  DROP CONSTRAINT IF EXISTS storage_backup_runs_scope_matches_kind;

ALTER TABLE storage_backup_runs
  ADD CONSTRAINT storage_backup_runs_scope_matches_kind
  CHECK ((kind = 'scoped') = (scope_archive_id IS NOT NULL));

-- ═════════════════════════════════════════════════════════════════════════════
-- 5. VERIFICATION. Run everything below and read the output.
-- ═════════════════════════════════════════════════════════════════════════════

-- 5a. The column landed, nullable, uuid, no default.
select column_name, data_type, is_nullable, column_default
from   information_schema.columns
where  table_schema = 'public'
  and  table_name  = 'storage_backup_runs'
  and  column_name = 'scope_archive_id';
-- expect: one row, uuid, YES, null

-- 5b. The table is now 18 columns. The parent migration's 4a expected 17.
select count(*) as columns
from   information_schema.columns
where  table_schema = 'public' and table_name = 'storage_backup_runs';
-- expect: 18

-- 5c. Exactly TWO check constraints, and no leftover third.
--     The count matters as much as the content. Three rows means step 0 was
--     ignored, the old kind constraint is still live, and 'scoped' is still
--     rejected no matter what step 2 appeared to do.
select con.conname,
       pg_get_constraintdef(con.oid) as definition
from   pg_constraint con
join   pg_class rel   on rel.oid = con.conrelid
join   pg_namespace n on n.oid  = rel.relnamespace
where  n.nspname = 'public'
  and  rel.relname = 'storage_backup_runs'
  and  con.contype = 'c'
order  by con.conname;
-- expect exactly two rows:
--   storage_backup_runs_kind_check            listing seed, sync, verify, drill, scoped
--   storage_backup_runs_scope_matches_kind    ((kind = 'scoped'::text) = (scope_archive_id IS NOT NULL))

-- 5d. No foreign key was added by accident.
select con.conname, pg_get_constraintdef(con.oid) as definition
from   pg_constraint con
join   pg_class rel   on rel.oid = con.conrelid
join   pg_namespace n on n.oid  = rel.relnamespace
where  n.nspname = 'public'
  and  rel.relname = 'storage_backup_runs'
  and  con.contype = 'f'
order  by con.conname;
-- expect exactly one row, continued_from -> storage_backup_runs(id).
-- If scope_archive_id appears here referencing archives, STOP and read the
-- header. A cascade erases the record of the run that targeted the archive.

-- 5e. Positive test. A scoped run naming its target is accepted.
--     Rolled back, so nothing persists. Run the whole block together.
BEGIN;
  INSERT INTO storage_backup_runs (kind, scope_archive_id)
  VALUES ('scoped', '00000000-0000-0000-0000-000000000000');
  select id, kind, scope_archive_id, ok from storage_backup_runs where kind = 'scoped';
  -- expect: one row, ok is null because the run never closed
ROLLBACK;

-- 5f. Negative test. A scoped run with no target is refused.
--     SUPPOSED to error. If it inserts cleanly, step 4 did not land and a scoped
--     run can be recorded without saying what it covered.
BEGIN;
  INSERT INTO storage_backup_runs (kind) VALUES ('scoped');
ROLLBACK;
-- expect: ERROR, violates check constraint "storage_backup_runs_scope_matches_kind"

-- 5g. Negative test. A seed carrying a target is refused.
--     The other half of the biconditional. A partial run wearing a full kind is
--     the failure this whole migration exists to prevent.
BEGIN;
  INSERT INTO storage_backup_runs (kind, scope_archive_id)
  VALUES ('seed', '00000000-0000-0000-0000-000000000000');
ROLLBACK;
-- expect: ERROR, violates check constraint "storage_backup_runs_scope_matches_kind"

-- 5h. Negative test. The kind CHECK still discriminates.
--     If this inserts cleanly, step 1 dropped more than it should have.
BEGIN;
  INSERT INTO storage_backup_runs (kind) VALUES ('not-a-kind');
ROLLBACK;
-- expect: ERROR, violates check constraint "storage_backup_runs_kind_check"

-- 5i. Control. An ordinary sync still inserts, so the constraints above are not
--     simply rejecting everything.
BEGIN;
  INSERT INTO storage_backup_runs (kind) VALUES ('sync');
  select id, kind, scope_archive_id from storage_backup_runs where kind = 'sync';
  -- expect: one row, scope_archive_id null
ROLLBACK;

-- 5j. Nothing above was actually written.
select kind, count(*) from storage_backup_runs group by kind order by kind;
-- expect: 0 rows, the table is still empty

-- ── 6. Rollback, if this is ever unwound ─────────────────────────────────────
--
-- Only safe while no run row carries kind = 'scoped'. Check 5j first. Dropping
-- the column while such a row exists destroys the record of what that run
-- covered, and removing 'scoped' from the kind CHECK then fails validation on
-- the row itself, which is the correct behaviour and not a problem to work
-- around.
--
-- ALTER TABLE storage_backup_runs
--   DROP CONSTRAINT IF EXISTS storage_backup_runs_scope_matches_kind;
-- ALTER TABLE storage_backup_runs
--   DROP COLUMN IF EXISTS scope_archive_id;
-- ALTER TABLE storage_backup_runs
--   DROP CONSTRAINT IF EXISTS storage_backup_runs_kind_check;
-- ALTER TABLE storage_backup_runs
--   ADD  CONSTRAINT storage_backup_runs_kind_check
--   CHECK (kind IN ('seed','sync','verify','drill'));
