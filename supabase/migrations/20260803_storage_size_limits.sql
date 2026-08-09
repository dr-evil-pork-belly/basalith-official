-- Storage upload size limits, so archive exports can actually be delivered.
--
-- Paste into the Supabase SQL editor. Do not run from a sandbox or the CLI.
-- STEP 1 IS A DASHBOARD ACTION AND MUST HAPPEN FIRST. SQL alone will not work.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Measured against the live project on August 3, 2026:
--
--     52428800 bytes ( 50.00 MB)  ->  accepted
--     52428801 bytes ( 50.00 MB)  ->  REJECTED  The object exceeded the maximum allowed size
--     67108864 bytes ( 64.00 MB)  ->  REJECTED  The object exceeded the maximum allowed size
--    104857600 bytes (100.00 MB)  ->  REJECTED  The object exceeded the maximum allowed size
--
-- The project's GLOBAL upload limit is exactly 50 MB. A bucket with
-- file_size_limit = null does not mean "unlimited". It means "inherit the
-- global", and the global is 50 MB. archive-exports was created with null and
-- is therefore capped at 50 MB today.
--
-- Real export sizes, measured:
--     Dr Ha        196.33 MB   ( 3.7x the limit)
--     Hoa Le Tran  264.42 MB   ( 5.3x the limit)
--     Cindy Ha     ~353 MB estimated, the largest on the property
--
-- So no export can be delivered until the global limit is raised.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE TRAP THIS FILE EXISTS TO CLOSE
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Raising the global limit raises the effective cap on EVERY bucket whose
-- file_size_limit is null. Right now that is photographs, archive-videos,
-- archive-documents, and archive-exports. Raise the global to 5 GB and a
-- contributor can upload a 5 GB "photograph" through
-- app/api/contribute/upload-media, which is a storage cost and an abuse surface
-- that nobody asked for.
--
-- So the content buckets get pinned FIRST, at exactly the 50 MB they already
-- enforce today. After that, raising the global changes nothing except
-- archive-exports. Current largest objects for reference: photographs 12.05 MB,
-- archive-videos 10.96 MB, archive-documents empty.

-- ── STEP 1. DASHBOARD, DO THIS FIRST ─────────────────────────────────────────
--
--   Supabase Dashboard -> Storage -> Settings -> "Upload file size limit"
--   Set to 5 GB.
--
-- Supabase enforces bucket file_size_limit <= the global limit, so step 3 below
-- silently fails to take effect if this has not been done. Step 4 verifies.

-- ── STEP 2. Pin the content buckets at their current effective limit ─────────
-- No behavior change. This preserves today's 50 MB cap so that step 1 does not
-- widen the upload surface on any family-facing bucket.

update storage.buckets set file_size_limit = 52428800 where id = 'photographs';
update storage.buckets set file_size_limit = 52428800 where id = 'archive-videos';
update storage.buckets set file_size_limit = 52428800 where id = 'archive-documents';

-- vault-files and voice-recordings already carry 52428800 explicitly. Untouched.

-- ── STEP 3. Raise archive-exports only ───────────────────────────────────────
-- 5 GB. Largest export today is ~353 MB, so this is roughly 14x headroom. The
-- storage recon growth curve (docs/STORAGE_BACKUP_RECON_2026-08.md) has the
-- whole property at 1.08 GB and flattening, so a single archive reaching 5 GB
-- is many years away.

update storage.buckets set file_size_limit = 5368709120 where id = 'archive-exports';

-- ── STEP 4. Verify. Read the output, do not assume. ──────────────────────────

select id, public, file_size_limit,
       round(file_size_limit / 1024.0 / 1024.0, 2) as limit_mb
from   storage.buckets
order  by id;
-- expect:
--   archive-documents   52428800      50.00
--   archive-exports   5368709120    5120.00   <- if this still reads 52428800,
--                                                 step 1 was not done
--   archive-videos      52428800      50.00
--   photographs         52428800      50.00
--   vault-files         52428800      50.00
--   voice-recordings    52428800      50.00

-- ── STEP 5. After this lands ─────────────────────────────────────────────────
-- Re-run the delivery gates from the repo root:
--
--   npx tsx scripts/export-probe.ts --upload --send
--
-- It uploads the real 196 MB Dr Ha export, signs it for 7 days, asserts the
-- signed URL's exp claim equals the object's reap deadline to the second, and
-- sends the delivery email. The probe preflights the bucket limit and will name
-- this file if the limit is still too low.
