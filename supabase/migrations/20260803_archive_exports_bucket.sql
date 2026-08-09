-- Archive export delivery bucket.
--
-- Paste into the Supabase SQL editor. Do not run from a sandbox or the CLI.
--
-- WHAT THIS BUCKET HOLDS
--
-- One zip per export request, each a complete unencrypted copy of one family's
-- entire archive. On the largest archive today that is 362 MB in a single
-- object. This is the most concentrated sensitive data on the property, which
-- is why everything below is deliberately restrictive.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THIS BUCKET IS EXCLUDED FROM ANY BACKUP SYNC. PERMANENTLY.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- docs/STORAGE_BACKUP_RECON_2026-08.md recommends an additive-only sync to
-- Backblaze B2 with Object Lock at 90 days, which by design cannot delete what
-- it has taken. If archive-exports were inside that sync, every export a family
-- requested would become a full copy of their archive that we could not delete
-- for 90 days, including after a Right of Dissolution request.
--
-- /data-ownership tenet 04 says in writing:
--     "We have no backup of your archive that survives a dissolution request."
--
-- Syncing this bucket makes that sentence false. The backup job must skip
-- 'archive-exports' by name. See lib/archiveExportStorage.ts and CLAUDE.md.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THIS BUCKET IS ON THE DISSOLUTION DELETION CHECKLIST.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- app/api/archive/terminate/route.ts sets termination_requested_at and
-- scheduled_deletion_at and sends two emails. It deletes nothing. When the
-- eventual manual deletion is performed, archive-exports/{archive_id}/ must be
-- purged along with the five content buckets.
--
-- The reaper (app/api/cron/export-reaper) caps exposure at 7 days even if that
-- checklist step is missed, which is why retention is short.

-- ── 1. The bucket ────────────────────────────────────────────────────────────
-- public = false. Every read is a service-role signed URL with a 7 day life,
-- minted by lib/inngest/exportFunctions.ts and matched to the object's own
-- reap deadline.
--
-- No file_size_limit. The largest archive is 362 MB today and the 50 MB limit
-- carried by vault-files and voice-recordings would reject every real export.

insert into storage.buckets (id, name, public, file_size_limit)
values ('archive-exports', 'archive-exports', false, null)
on conflict (id) do nothing;

-- ── 2. RLS: deliberately no policy ───────────────────────────────────────────
-- storage.objects has RLS enabled by Supabase. Adding NO policy for this bucket
-- is the access control, not an omission: with RLS on and no policy, anon and
-- authenticated are denied every operation, and only the service role, which
-- bypasses RLS, can read or write. That is exactly the posture this bucket
-- needs, because no browser session should ever touch an export object
-- directly. Families reach their file through a signed URL and nothing else.
--
-- Do not add a policy here later "so the owner can download their own export."
-- The signed URL already does that, scoped to one object and one deadline.

-- ── 3. Verification. Run these and read the output. ──────────────────────────

-- 3a. The bucket exists and is private.
select id, name, public, file_size_limit, created_at
from   storage.buckets
where  id = 'archive-exports';
-- expect: public = false

-- 3b. RLS is on for storage.objects.
select relname, relrowsecurity
from   pg_class
where  oid = 'storage.objects'::regclass;
-- expect: relrowsecurity = true

-- 3c. No policy references this bucket. An empty result is the pass condition.
select policyname, cmd, qual, with_check
from   pg_policies
where  schemaname = 'storage'
  and  tablename  = 'objects'
  and  (qual::text like '%archive-exports%' or with_check::text like '%archive-exports%');
-- expect: 0 rows

-- ── 4. Rollback, if this is ever unwound ─────────────────────────────────────
-- Objects must go before the bucket. Deleting the bucket row while objects
-- remain orphans them in S3 with no way to list or remove them from the API.
--
-- delete from storage.objects where bucket_id = 'archive-exports';
-- delete from storage.buckets where id = 'archive-exports';

-- ── 5. Not created: no table ─────────────────────────────────────────────────
-- There is deliberately no archive_exports table. Retention state lives on the
-- object itself: the reaper ages objects by storage created_at and the signed
-- URL carries the same deadline in its own exp claim. A tracking table would be
-- a second source of truth that can drift away from the bucket, which is the
-- exact failure documented in docs/STORAGE_BACKUP_RECON_2026-08.md, where 316
-- photograph rows describe files and 21 objects have no row at all.
