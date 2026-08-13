-- APPLIED BY HAND in the Supabase SQL editor on 2026-08-12, and verified live.
-- THIS FILE IS THE RECORD, NOT THE MECHANISM. Re-running it is safe but
-- unnecessary. Every statement drops before it creates.
--
-- Vaults subsystem: close three RLS policies that let any authenticated user
-- read, or write into, another tenant's vault.
--
-- Recon:  seal-memory cross-tenant write recon, 2026-08-12.
-- Code:   app/api/curator/accept-invite/route.ts, app/api/curator/seal-memory/route.ts,
--         app/api/dashboard/add-milestone/route.ts
-- Routes: the matching write-path fixes are commit 811a216 on
--         fix/vaults-write-path-tenant-scoping-2026-08-13.
--
-- NOTE ON THIS SUBSYSTEM. No table here has DDL anywhere in supabase/migrations.
-- All seven tables (vaults, vault_files, profiles, curators, essence_sessions,
-- milestones, vault_notifications) were created in the Supabase dashboard. This
-- is the first migration file that touches any of them. It changes policies only
-- and asserts nothing about columns or constraints it did not verify.
--
--
-- ── FINDING 1. profiles UPDATE had no WITH CHECK ─────────────────────────────
--
--   policy: "own profile update", UPDATE, {public}, USING (auth.uid() = id)
--
--   A missing WITH CHECK defaults to the USING expression, so the updated row had
--   to stay the caller's own. Nothing constrained the other columns. Any
--   authenticated user could set their own profiles.vault_id to any vault id,
--   from the browser, with the anon client.
--
--   Two read policies grant access off that value:
--     vault_files "curator read"          -> vault_id IN (SELECT vault_id FROM profiles WHERE id = auth.uid())
--     vaults "curators read their vault"  -> id IN (same)
--
--   So any authenticated user could read any vault's file records and vault row.
--   No invite, no token, no API route involved.
--
--   Worse, app/api/curator/seal-memory/route.ts gates on
--   profiles.vault_id === body.vault_id. An attacker who can set
--   profiles.vault_id controls both sides of that comparison, so fixing the
--   route's write path while this policy stood would have fixed nothing.
--
--   PROVEN LIVE before the fix. Acting as an authenticated non-archivist
--   (89e07a72-2df4-4ca7-9d59-acec57ecf8a0) against another archivist's vault
--   (09c927a2-7b26-4851-b573-19a7d14fd780), this returned the updated row:
--
--     begin;
--       set local role authenticated;
--       set local request.jwt.claims = '{"sub":"89e07a72-...","role":"authenticated"}';
--       update profiles set vault_id = '09c927a2-...' where id = '89e07a72-...'
--       returning id, role, vault_id;
--     rollback;
--
--   After this migration the same statement returns zero rows.
--
--   That test user's role already read 'archivist', so the exposure was never
--   limited to curator accounts.
--
--
-- ── FINDING 2. curators SELECT leaked every pending invite token ─────────────
--
--   policy: "curators: readable by vault archivist or token", SELECT, {public}
--   qual:   (invite_accepted = false)
--           OR (vault_id IN (SELECT id FROM vaults WHERE archivist_id = auth.uid()))
--           OR (profile_id = auth.uid())
--
--   The first disjunct had no vault scoping and no user scoping at all. Any
--   authenticated user could select every unaccepted curators row in the
--   database, invite_token included.
--
--   Not provable live on 2026-08-12 because zero pending invites existed
--   (select count(*) from curators where invite_accepted = false -> 0). It would
--   have leaked the moment an invite was issued.
--
--   accept-invite runs on the service role and does not need this policy to read
--   the row, so removing the disjunct costs the redemption path nothing.
--
--
-- ── FINDING 3. essence_sessions INSERT had no vault scoping ──────────────────
--
--   policy: "essence_sessions: curator insert", INSERT, {public}
--   with_check: (curator_id = auth.uid())
--
--   That confirms who is inserting and says nothing about which vault the row
--   lands in. A curator could insert session rows tagged with any vault_id
--   directly from the browser. Those rows are read at
--   app/(curator)/curator/essence/page.tsx:326 filtered on vault_id, so injected
--   rows land in another vault's session count.
--
--   Lower severity than 1 and 2: it inflates a count rather than mutating
--   another tenant's row. Fixed in the same pass because it is the same class.
--
--   Note the fix depends on finding 1 being fixed. The new with_check trusts
--   profiles.vault_id, and that value is only trustworthy because it can no
--   longer be self-assigned. The two changes hold each other up.
--
--
-- ── WHAT THIS DOES NOT FIX ───────────────────────────────────────────────────
--
-- The write-path defects are code, not policy, and shipped separately in 811a216:
--   1. accept-invite did not compare the invite email to user.email.
--   2. seal-memory updated vault_files by id with no vault_id scope.
--   3. add-milestone accepted a beneficiary_id from any vault.
--
-- Still open on this subsystem, none of it addressed here:
--   - storage_path is client-constructed and trusted verbatim at
--     app/api/dashboard/upload/route.ts:52. Whether the vault-files bucket has a
--     prefix-scoped Storage policy is NOT CONFIRMED.
--   - The handle_new_user trigger on auth.users is unread. invite-curator puts
--     role and vault_id into Auth invite metadata, so if that trigger copies
--     raw_user_meta_data into profiles it is a second writer to the tenant key.
--   - profiles has no INSERT policy and nothing in the repo inserts into it.
--     Row creation is presumably that trigger.


-- ═════════════════════════════════════════════════════════════════════════════
-- 1. profiles: stop a user changing their own tenant key
-- ═════════════════════════════════════════════════════════════════════════════
--
-- Dropped rather than narrowed. Nothing in the repo updates a profile from the
-- browser. The only writer is app/api/curator/accept-invite/route.ts, which uses
-- supabaseAdmin and bypasses RLS. A policy with no legitimate consumer should not
-- exist.
--
-- If a future surface needs users to edit their own display fields, add a policy
-- back with an explicit WITH CHECK pinning role and vault_id:
--
--   CREATE POLICY "own profile update" ON profiles FOR UPDATE TO authenticated
--     USING      (auth.uid() = id)
--     WITH CHECK (auth.uid() = id
--                 AND role     IS NOT DISTINCT FROM (SELECT p.role     FROM profiles p WHERE p.id = auth.uid())
--                 AND vault_id IS NOT DISTINCT FROM (SELECT p.vault_id FROM profiles p WHERE p.id = auth.uid()));
--
-- Do not add that back without a surface that needs it.

DROP POLICY IF EXISTS "own profile update" ON profiles;


-- ═════════════════════════════════════════════════════════════════════════════
-- 2. curators: remove the unscoped invite_accepted disjunct
-- ═════════════════════════════════════════════════════════════════════════════
--
-- The remaining two disjuncts are the real access paths: the vault's archivist,
-- and the curator's own row.
--
-- Note curators carries a second, overlapping SELECT policy, "curator reads own
-- record" (profile_id = auth.uid()), which is a subset of this one. Postgres ORs
-- permissive policies, so leaving both is harmless. Not consolidated here,
-- because removing a policy this migration did not create is a wider change than
-- the finding requires.

DROP POLICY IF EXISTS "curators: readable by vault archivist or token" ON curators;

CREATE POLICY "curators: readable by vault archivist or curator"
  ON curators FOR SELECT TO public
  USING (
    vault_id IN (SELECT id FROM vaults WHERE archivist_id = auth.uid())
    OR profile_id = auth.uid()
  );


-- ═════════════════════════════════════════════════════════════════════════════
-- 3. essence_sessions: scope the insert to the caller's own vault
-- ═════════════════════════════════════════════════════════════════════════════
--
-- app/api/curator/seal-memory/route.ts inserts on the service role and bypasses
-- this policy entirely, so the route is unaffected. This constrains direct
-- browser inserts, which nothing in the repo performs.

DROP POLICY IF EXISTS "essence_sessions: curator insert" ON essence_sessions;

CREATE POLICY "essence_sessions: curator insert"
  ON essence_sessions FOR INSERT TO public
  WITH CHECK (
    curator_id = auth.uid()
    AND vault_id IN (SELECT vault_id FROM profiles WHERE id = auth.uid())
  );


-- ═════════════════════════════════════════════════════════════════════════════
-- 4. VERIFICATION. Read-only. Results recorded from the 2026-08-12 run.
-- ═════════════════════════════════════════════════════════════════════════════

-- 4a. Policy state across all three tables.
select tablename, policyname, cmd, roles, qual, with_check
from   pg_policies
where  schemaname = 'public'
  and  tablename in ('profiles','curators','essence_sessions')
order  by tablename, policyname;
--
-- CONFIRMED 2026-08-12:
--   profiles          no row with cmd = 'UPDATE'. Four remain: two SELECT
--                     (own profile read, users read own profile) and two ALL
--                     service-role policies.
--   curators          five policies. The word 'invite_accepted' appears in no
--                     SELECT qual.
--   essence_sessions  the curator insert with_check names BOTH curator_id and
--                     vault_id.

-- 4b. RLS is on for the whole subsystem.
select tablename, rowsecurity
from   pg_tables
where  schemaname = 'public'
  and  tablename in ('vaults','vault_files','profiles','curators',
                     'essence_sessions','milestones','vault_notifications');
-- CONFIRMED 2026-08-12: rowsecurity true on all seven.

-- 4c. Finding 1 closed, proven as a real user inside a transaction that rolls
--     back. Replace both placeholders with the same real auth user id, one who
--     is NOT the archivist of the vault selected.
--
--   select id, email from auth.users limit 10;
--   select id, archivist_id from vaults limit 10;
--
-- begin;
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"USER_ID_HERE","role":"authenticated"}';
--
--   update profiles set vault_id = 'VAULT_ID_HERE'
--   where  id = 'USER_ID_HERE'
--   returning id, role, vault_id;
--
-- rollback;
--
-- CONFIRMED 2026-08-12: returned the updated row BEFORE this migration,
-- zero rows AFTER.

-- 4d. Finding 2 closed. Same user, same shape.
--
-- begin;
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"USER_ID_HERE","role":"authenticated"}';
--
--   select id, vault_id, invite_token, invite_accepted
--   from   curators where invite_accepted = false;
--
-- rollback;
--
-- NOT PROVABLE 2026-08-12: zero pending invites existed, so an empty result
-- proved nothing either way. Re-run this the next time an invite is pending.

-- 4e. Legitimate access survives. Run as an archivist who owns a vault.
--
-- begin;
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"ARCHIVIST_USER_ID","role":"authenticated"}';
--   select count(*) as curators_visible from curators;
--   select count(*) as files_visible    from vault_files;
-- rollback;
--
-- CONFIRMED 2026-08-12 as 917dde62-bfba-4aac-bb82-90e1ce9aa1a6, archivist of
-- vault 09c927a2-7b26-4851-b573-19a7d14fd780: curators_visible 1,
-- files_visible 9. Legitimate access intact.


-- ── 5. Rollback ──────────────────────────────────────────────────────────────
--
-- Restores all three policies as they were. Running this reopens every path
-- described at the top of this file. There is no reason to run it.
--
-- CREATE POLICY "own profile update" ON profiles FOR UPDATE TO public
--   USING (auth.uid() = id);
--
-- DROP POLICY IF EXISTS "curators: readable by vault archivist or curator" ON curators;
-- CREATE POLICY "curators: readable by vault archivist or token"
--   ON curators FOR SELECT TO public
--   USING (invite_accepted = false
--          OR vault_id IN (SELECT id FROM vaults WHERE archivist_id = auth.uid())
--          OR profile_id = auth.uid());
--
-- DROP POLICY IF EXISTS "essence_sessions: curator insert" ON essence_sessions;
-- CREATE POLICY "essence_sessions: curator insert"
--   ON essence_sessions FOR INSERT TO public
--   WITH CHECK (curator_id = auth.uid());


-- ── 6. AFTER THIS RAN ────────────────────────────────────────────────────────
--
-- Exercise the curator invite flow end to end before considering this closed.
-- The browser-side curator pages read curators, vaults, and vault_files with the
-- anon client, and section 2 narrows what a curator sees of the curators table.
-- If /join or the curator portal breaks, the break is real and tells you a
-- surface depended on the unscoped read. Report it rather than reverting.
--
-- app/(auth)/join/page.tsx:34 reads vaults through a curators lookup keyed on
-- invite_token, unauthenticated. Confirm whether that read runs before or after
-- sign-in. If it runs unauthenticated it was never using these policies as an
-- authenticated user and is unaffected. If it runs after sign-in, it is the most
-- likely thing to break.
