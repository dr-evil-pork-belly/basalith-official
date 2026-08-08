-- Storage backup manifest. Two tables.
--
-- Paste into the Supabase SQL editor. Do not run from a sandbox or the CLI.
--
-- Spec:     docs/STORAGE_BACKUP_SKELETON_2026-08.md section 4, build order step 5.
-- Operator: docs/DISSOLUTION_RUNBOOK.md reads both tables during a dissolution.
--
-- WHAT THESE TABLES ARE
--
--   storage_backup_runs     one row per seed, sync, verify, or drill run
--   storage_backup_objects  one row per distinct content version copied to B2
--
-- The manifest is the record of what was taken and what it hashed to, and it
-- has to outlive the primary. That is why a JSON snapshot of it also goes to
-- B2 after every successful sync, and why the two tables are the only backup
-- state that exists. There is deliberately no third source of truth.
--
-- ORDER MATTERS. storage_backup_runs is created first, because
-- storage_backup_objects.run_id references it.
--
-- THIS IS NOT SAFE TO RE-RUN WHOLE. The CREATE TABLE statements carry
-- IF NOT EXISTS, but CREATE POLICY has no such form in Postgres 15, so a second
-- paste fails on "policy already exists" after the tables are already there.
-- That is the same property every other migration in this directory has. If you
-- need to re-run, paste the CREATE TABLE and CREATE INDEX blocks only, or drop
-- the policies first. The verification section at the bottom is always safe to
-- re-run on its own, and is read-only.

-- ── RLS CONVENTION, AND A CORRECTION TO THE SKELETON ─────────────────────────
--
-- Service-role-only. RLS enabled, PLUS an explicit service_role_full_access
-- policy, mirroring 20260502_training_pipeline.sql:34-36 and
-- 20260717_grounding_gaps.sql:41-44.
--
-- The skeleton's section 4 says "RLS on, no policy, which is the same posture
-- as archive-exports." That is wrong and this migration does not follow it.
-- "No policy" is the posture in 20260803_archive_exports_bucket.sql, which
-- governs storage.objects, a table Supabase owns and that every bucket shares.
-- A policy there cannot be scoped to one bucket without affecting the others,
-- so the correct move is to add none. That reasoning does not transfer to a
-- table we create ourselves. Every service-role table on this property carries
-- the explicit policy. This one does too.
--
-- What the policy actually does: nothing, on its own. service_role carries
-- BYPASSRLS, so the policy is never evaluated for it. What denies anon and
-- authenticated is RLS being enabled with no policy that matches them. The
-- explicit policy is carried because a table that looks different from its
-- siblings invites someone to "fix" the difference, and because it states the
-- intended access in the schema rather than only in a comment.

-- ── 1. storage_backup_runs ───────────────────────────────────────────────────
--
-- The heartbeat route reads this table and nothing else. The rolling 30 day
-- byte budget is a sum over bytes_read_source, so the budget survives a cold
-- start and cannot be lost in memory.

CREATE TABLE IF NOT EXISTS storage_backup_runs (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  kind                 TEXT        NOT NULL
    CHECK (kind IN ('seed','sync','verify','drill')),
  started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at          TIMESTAMPTZ,
  ok                   BOOLEAN,
  -- null while running, false on failure or budget abort, true on success
  objects_source       INTEGER,    -- counted in source across the allowlist
  objects_destination  INTEGER,    -- counted in B2
  objects_manifest     INTEGER,    -- counted in storage_backup_objects
  objects_copied       INTEGER,
  objects_rehashed     INTEGER,
  objects_deferred     INTEGER,    -- hit MAX_COPIES_PER_RUN, named in the log
  bytes_read_source    BIGINT      NOT NULL DEFAULT 0,  -- Supabase egress, the billable meter
  bytes_read_dest      BIGINT      NOT NULL DEFAULT 0,  -- B2 egress
  bytes_written_dest   BIGINT      NOT NULL DEFAULT 0,
  alarms               JSONB,      -- array of {code, detail}, skeleton section 7
  error                TEXT,
  continued_from       UUID        REFERENCES storage_backup_runs(id)
  -- self reference, set on a continuation run after MAX_COPIES_PER_RUN
);

-- The heartbeat's only query: latest run of a given kind.
CREATE INDEX IF NOT EXISTS idx_storage_backup_runs_kind_started
  ON storage_backup_runs(kind, started_at DESC);

-- No index for the rolling 30 day budget sum on purpose. It filters on
-- started_at across all kinds, which this index does not serve, but the table
-- gains roughly 400 rows a year and a sequential scan over that is free. Add
-- one when the row count makes it matter, not before.

ALTER TABLE storage_backup_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access" ON storage_backup_runs
  TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ── 2. storage_backup_objects ────────────────────────────────────────────────
--
-- One row per distinct content version. Additive, matching the sync. A changed
-- object gets a new row and the old row stays, because both versions exist in
-- B2 and both are restorable.

CREATE TABLE IF NOT EXISTS storage_backup_objects (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket            TEXT        NOT NULL
    CHECK (bucket IN ('photographs','voice-recordings','archive-videos','archive-documents')),
  path              TEXT        NOT NULL,   -- full object path within the bucket
  archive_id        UUID,                   -- parsed from the path prefix, null if not a uuid
  size_bytes        BIGINT      NOT NULL,   -- real body length read, not metadata.size
  sha256            TEXT        NOT NULL,   -- computed by us, in flight, at copy time
  source_etag       TEXT,                   -- change detection only, never integrity
  source_created_at TIMESTAMPTZ,            -- storage.objects created_at at copy time
  b2_key            TEXT        NOT NULL,   -- '{bucket}/{path}'
  b2_file_id        TEXT        NOT NULL,   -- B2 version id returned by the PUT
  b2_locked_until   TIMESTAMPTZ NOT NULL,   -- retain-until sent with the PUT
  source_table      TEXT,                   -- pointer table that referenced it, null if orphan
  source_row        JSONB,                  -- the pointer row itself at copy time, null if orphan
  copied_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  run_id            UUID        NOT NULL REFERENCES storage_backup_runs(id),

  -- Idempotency key for the copy step. The step upserts on this, so an Inngest
  -- retry that re-downloads and re-pushes does not create a twin row.
  UNIQUE (bucket, path, sha256)
);

CREATE INDEX IF NOT EXISTS idx_storage_backup_objects_bucket_path
  ON storage_backup_objects(bucket, path);          -- diff lookup, every run
CREATE INDEX IF NOT EXISTS idx_storage_backup_objects_archive
  ON storage_backup_objects(archive_id);            -- dissolution purge targeting
CREATE INDEX IF NOT EXISTS idx_storage_backup_objects_run
  ON storage_backup_objects(run_id);

ALTER TABLE storage_backup_objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access" ON storage_backup_objects
  TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ── 2a. Why archive_id is not a foreign key ──────────────────────────────────
--
-- This is the one place this migration departs from
-- 20260502_training_pipeline.sql, which declares
--   archive_id UUID REFERENCES archives(id) ON DELETE CASCADE.
-- The departure is deliberate. Two reasons, and the second is the serious one.
--
-- 1. Not every object has an archives row. The f44f1818 path prefix has objects
--    in Storage and no matching archive. The sync is additive and copies
--    orphans rather than filtering against pointer tables, so a foreign key
--    would reject exactly the rows most at risk of being lost.
--
-- 2. A cascade would destroy the dissolution map at the precise moment it is
--    needed. DISSOLUTION_RUNBOOK.md step 4.4 reads this table to build the list
--    of B2 keys and version ids, and step 4.5 performs the B2 deletion from
--    that list. If deleting the archives row cascaded to here, the manifest
--    rows would be gone before the operator read them, step 4.4 would return
--    zero rows, and the honest reading of an empty result is "there is nothing
--    in B2 for this archive." The offsite copy would quietly survive a
--    dissolution that reported success, under a lock nobody can lift early.
--
--    The manifest rows are deleted explicitly, by the operator, as the last
--    step of the runbook, after the B2 deletion has been verified. Never by a
--    cascade, and never before.
--
-- Do not add a foreign key here later for tidiness.

-- ── 2b. Why bucket carries a CHECK ───────────────────────────────────────────
--
-- The CHECK is the allowlist, enforced by the database and not only by a test.
-- Skeleton section 2 excludes two buckets for two different reasons:
--   archive-exports  every object is a full unencrypted copy of one archive
--   vault-files      not archive-scoped, so no dissolution can ever target it
-- A manifest row for either one means bytes that should never have gone offsite
-- are now under a 90 day COMPLIANCE lock that nobody can lift. A rejected
-- insert throws, the Inngest step fails, and the run goes red, which is the
-- correct amount of noise for that mistake.
--
-- If vault-files ever becomes archive-scoped and joins the allowlist, alter the
-- constraint in the same migration that changes the code:
--   ALTER TABLE storage_backup_objects
--     DROP CONSTRAINT storage_backup_objects_bucket_check;
--   ALTER TABLE storage_backup_objects
--     ADD  CONSTRAINT storage_backup_objects_bucket_check
--     CHECK (bucket IN ('photographs','voice-recordings','archive-videos',
--                       'archive-documents','vault-files'));

-- ── 2c. Why source_row exists, and why it never goes to B2 ───────────────────
--
-- source_row holds the referencing pointer row as jsonb at copy time. Bytes in
-- B2 and pointers in Postgres run on different schedules and will drift, and
-- storing the row is what makes a restore a restore rather than a pile of
-- files. Null is meaningful and is not missing data: it records that the object
-- was an orphan when it was taken, which is true of 22 objects today.
--
-- It stays in Postgres. The JSON snapshot written to _manifest/{date}.json in
-- B2 carries five fields only: bucket, path, sha256, size_bytes,
-- b2_locked_until. source_row can carry a caption or a description, which is
-- archive content, and putting archive content under a 90 day offsite lock is
-- the thing this design exists to avoid doing by accident. Settled August 8.
-- Skeleton sections 4.3 and 9.4.5.

-- ── 3. Not created, on purpose ───────────────────────────────────────────────
--
-- No trigger, no RPC, no view. The sync writes rows directly through the
-- service role from inside an Inngest step. Nothing else writes here.
--
-- No retention or cleanup job on either table. storage_backup_objects rows are
-- removed only by the operator during a dissolution. storage_backup_runs rows
-- are never removed, because they are counts and byte totals that name no
-- archive and list no object, and they are the evidence the backup was working
-- across any period anyone later asks about.

-- ═════════════════════════════════════════════════════════════════════════════
-- 4. VERIFICATION. Run everything below after the DDL and read the output.
-- ═════════════════════════════════════════════════════════════════════════════

-- 4a. Both tables exist with the expected shape.
select table_name, count(*) as columns
from   information_schema.columns
where  table_schema = 'public'
  and  table_name in ('storage_backup_objects','storage_backup_runs')
group  by table_name
order  by table_name;
-- expect: storage_backup_objects 15, storage_backup_runs 17

-- 4b. RLS is enabled on both.
select c.relname, c.relrowsecurity
from   pg_class c
join   pg_namespace n on n.oid = c.relnamespace
where  n.nspname = 'public'
  and  c.relname in ('storage_backup_objects','storage_backup_runs')
order  by c.relname;
-- expect: 2 rows, relrowsecurity = true on both

-- 4c. The service_role policy is present on both.
select tablename, policyname, roles, cmd
from   pg_policies
where  schemaname = 'public'
  and  tablename in ('storage_backup_objects','storage_backup_runs')
order  by tablename;
-- expect: 2 rows, both service_role_full_access, roles = {service_role}, cmd = ALL

-- 4d. Indexes, including the unique idempotency key.
select tablename, indexname
from   pg_indexes
where  schemaname = 'public'
  and  tablename in ('storage_backup_objects','storage_backup_runs')
order  by tablename, indexname;
-- expect 7 rows:
--   storage_backup_objects  idx_storage_backup_objects_archive
--   storage_backup_objects  idx_storage_backup_objects_bucket_path
--   storage_backup_objects  idx_storage_backup_objects_run
--   storage_backup_objects  storage_backup_objects_bucket_path_sha256_key
--   storage_backup_objects  storage_backup_objects_pkey
--   storage_backup_runs     idx_storage_backup_runs_kind_started
--   storage_backup_runs     storage_backup_runs_pkey

-- 4e. CHECK constraints. PostgREST cannot expose these, so this query is the
--     only way to confirm they landed. CLAUDE.md section 5.
select rel.relname as table_name,
       con.conname,
       pg_get_constraintdef(con.oid) as definition
from   pg_constraint con
join   pg_class rel   on rel.oid = con.conrelid
join   pg_namespace n on n.oid  = rel.relnamespace
where  n.nspname = 'public'
  and  rel.relname in ('storage_backup_objects','storage_backup_runs')
  and  con.contype = 'c'
order  by rel.relname, con.conname;
-- expect the bucket CHECK on storage_backup_objects listing exactly
--   photographs, voice-recordings, archive-videos, archive-documents
-- and the kind CHECK on storage_backup_runs listing
--   seed, sync, verify, drill
-- If archive-exports or vault-files appears in the bucket CHECK, STOP.

-- 4f. Foreign keys. The point of this one is what is ABSENT.
select rel.relname as table_name,
       con.conname,
       pg_get_constraintdef(con.oid) as definition
from   pg_constraint con
join   pg_class rel   on rel.oid = con.conrelid
join   pg_namespace n on n.oid  = rel.relnamespace
where  n.nspname = 'public'
  and  rel.relname in ('storage_backup_objects','storage_backup_runs')
  and  con.contype = 'f'
order  by rel.relname, con.conname;
-- expect exactly 2 rows:
--   storage_backup_objects  run_id         -> storage_backup_runs(id)
--   storage_backup_runs     continued_from -> storage_backup_runs(id)
--
-- If a third row shows archive_id referencing archives, STOP and read section
-- 2a. A cascade from archives deletes the dissolution map before the operator
-- can read it, and the offsite copy survives the dissolution.

-- 4g. Both tables are empty. Nothing has run yet.
select 'storage_backup_objects' as table_name, count(*) as rows from storage_backup_objects
union all
select 'storage_backup_runs',                  count(*)         from storage_backup_runs;
-- expect: 0 and 0

-- ── 5. Rollback, if this is ever unwound ─────────────────────────────────────
--
-- Objects first. storage_backup_objects.run_id references storage_backup_runs,
-- so dropping runs first fails on the dependency.
--
-- Do not run this once a sync has happened. Dropping storage_backup_objects
-- while objects exist in B2 destroys the only map of what is in the backup and
-- the only list the dissolution runbook can delete from. The B2 copies would
-- remain, locked, unlistable against any record of what they are.
--
-- drop table if exists storage_backup_objects;
-- drop table if exists storage_backup_runs;
