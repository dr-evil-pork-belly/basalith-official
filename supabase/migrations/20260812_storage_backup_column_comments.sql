-- Storage backup: state what storage_backup_runs.objects_manifest actually holds,
-- in the schema, where somebody reading the live database can see it.
--
-- Paste into the Supabase SQL editor. Do not run from a sandbox or the CLI.
--
-- Spec:     docs/STORAGE_BACKUP_SKELETON_2026-08.md section 4.
-- Parent:   supabase/migrations/20260808_storage_backup_manifest.sql
-- Code:     lib/inngest/storageBackupFunctions.ts, both closeRun calls.
-- Test:     lib/storageBackup.test.ts, "objects_manifest is the table count in
--           BOTH writers, never the filtered one".
--
-- ── WHAT THIS CHANGES ────────────────────────────────────────────────────────
--
-- Nothing. No table, no column, no constraint, no row. One COMMENT ON COLUMN.
-- It is metadata only and it cannot fail a running backup.
--
-- ── WHY IT IS WORTH A MIGRATION ──────────────────────────────────────────────
--
-- The parent migration declares the column as
--
--   objects_manifest     INTEGER,    -- counted in storage_backup_objects
--
-- That is a comment in a file, not a comment in the database. Anyone reading the
-- live schema through the Supabase dashboard, through information_schema, or
-- through a client that introspects, sees an untyped nullable integer with no
-- meaning attached. The only place the meaning existed was the migration file
-- and the design document, and neither travels with the database.
--
-- It became worth fixing on August 12, 2026, when a second, different count
-- appeared in the same code path. `buildSnapshotEntries` in lib/storageBackup.ts
-- filters terminated archives out of the offsite inventory snapshot, so the sync
-- now holds two numbers a few lines apart:
--
--   rows      every row read from storage_backup_objects        <- this column
--   entries   what survived the dissolution filter, and is
--             smaller the moment any archive is terminated      <- NOT this column
--
-- Writing the second one here would make a sync row disagree with a verify row,
-- because verify computes the same quantity from its own unfiltered read. Nothing
-- would catch it. This column has two writers and zero readers: the heartbeat
-- reads started_at, the rolling budget reads bytes_read_source, the scoped-seed
-- window check reads id, and no query anywhere selects *. So a wrong value raises
-- no alarm and stays invisible until somebody compares a sync row against a verify
-- row, which first happens during a dissolution, a year after the row was written.
--
-- A source-scanning test now pins both writers. This states the same thing in the
-- one place the test cannot reach, which is the database a person is looking at
-- while they try to work out whether a backup was healthy.
--
-- ── RE-RUN SAFETY ────────────────────────────────────────────────────────────
--
-- Safe to re-run whole, any number of times. COMMENT ON COLUMN replaces whatever
-- comment is there rather than erroring on a second application, which is not
-- true of the CREATE POLICY statements in the parent migration.

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. The comment.
-- ═════════════════════════════════════════════════════════════════════════════
--
-- Adjacent string literals on separate lines concatenate, which is the same
-- pattern 20260809_storage_backup_scoped_kind.sql uses for scope_archive_id.
-- They must stay on separate lines. Two literals on one line is a syntax error.

COMMENT ON COLUMN storage_backup_runs.objects_manifest IS
  'Count of EVERY row in storage_backup_objects at the moment this run read the '
  'table. Whole table. Not scoped to one archive, not filtered by anything, and '
  'not a count of what this run copied. Both writers compute it the same way and '
  'their numbers are comparable: the sync counts its snapshot read, the verify '
  'counts its load-manifest read. '
  'NOT the number of entries written to the _manifest/{date}.json inventory in '
  'B2. That snapshot excludes archives with a non-null termination_requested_at, '
  'so it is smaller than this column whenever a dissolution is in progress, and '
  'the gap between the two is the terminated rows. See buildSnapshotEntries in '
  'lib/storageBackup.ts. '
  'Rows for a terminated archive stay in storage_backup_objects, and therefore in '
  'this count, until the operator deletes them by hand at DISSOLUTION_RUNBOOK.md '
  'step 4.8. That is deliberate: the table is the map step 4.4 deletes from.';

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. VERIFICATION. Read-only. Run it and read the output.
-- ═════════════════════════════════════════════════════════════════════════════

-- 2a. The comment landed, and read it back in full rather than trusting that the
--     statement above returned COMMENT.
select col_description(c.oid, a.attnum) as objects_manifest_comment
from   pg_class c
join   pg_namespace n on n.oid = c.relnamespace
join   pg_attribute a on a.attrelid = c.oid
where  n.nspname = 'public'
  and  c.relname = 'storage_backup_runs'
  and  a.attname = 'objects_manifest';
-- expect: one row, the full text above on one line. If it is null, the statement
-- did not run. If it is truncated, one of the string literals lost its newline.

-- 2b. Which columns on this table now carry a comment, and which do not.
--     Two are expected. Every other count column is still bare, which is a known
--     gap and not a failure of this migration. See the note at the bottom.
select a.attname as column_name,
       (col_description(c.oid, a.attnum) is not null) as has_comment
from   pg_class c
join   pg_namespace n on n.oid = c.relnamespace
join   pg_attribute a on a.attrelid = c.oid
where  n.nspname = 'public'
  and  c.relname = 'storage_backup_runs'
  and  a.attnum > 0
  and  not a.attisdropped
order  by a.attnum;
-- expect 18 rows, has_comment true on exactly two:
--   objects_manifest   (this migration)
--   scope_archive_id   (20260809_storage_backup_scoped_kind.sql)

-- 2c. Nothing structural moved. The column is still a plain nullable integer.
select column_name, data_type, is_nullable, column_default
from   information_schema.columns
where  table_schema = 'public'
  and  table_name  = 'storage_backup_runs'
  and  column_name = 'objects_manifest';
-- expect: one row, integer, YES, null

-- ── 3. Rollback ──────────────────────────────────────────────────────────────
--
-- Removes the comment and nothing else. There is no reason to run this.
--
-- COMMENT ON COLUMN storage_backup_runs.objects_manifest IS NULL;

-- ── 4. WHAT THIS MIGRATION DELIBERATELY DOES NOT COMMENT, AND WHY ────────────
--
-- objects_source has the same problem, and it is worse. Read this before adding
-- a comment for it in a hurry.
--
-- The two writers do NOT agree on what objects_source means:
--
--   sync    objects_source: inScope.length          POST-filter. What the run
--                                                   actually treated as its
--                                                   source, after the archive
--                                                   scope and the dissolution
--                                                   filter both ran.
--   verify  objects_source: source.objects.length   PRE-filter. The raw walk,
--                                                   before verifyScope is
--                                                   applied.
--
-- Both are defensible in their own function. The sync's choice is documented at
-- its insert: a scoped run recording the whole walk would read as a run that lost
-- objects rather than one that excluded them. The verify's is the total the
-- three-way diff started from. But the column carries one name and the two rows
-- are not comparable, and unlike objects_manifest that is a real divergence in the
-- data rather than a hypothetical one.
--
-- It is not fixed here because fixing it means deciding which writer changes, and
-- that changes a value the backup records rather than a description of it. That is
-- a separate decision and a separate migration. Named here so it is on the record
-- and so nobody documents the ambiguity as though it were intentional consistency.
