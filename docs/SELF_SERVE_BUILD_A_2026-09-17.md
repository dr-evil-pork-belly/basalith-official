# Self-serve trial, slice A: build prompts. September 17, 2026.

Skeleton approved (sections 5 and 6) September 17. Three prompts, run in
order, each in its own Claude Code session in `basalith-official`. Do not
start prompt 2 until prompt 0 is merged and live. Do not start prompt 2 on a
tree that still has prompt 1's files uncommitted.

Standing rules apply to all three: no em dashes anywhere; American English;
Windows PowerShell (`Get-ChildItem`, `Select-String`); every post-response
write in a route under `after()` from `next/server`; `vercel` for preview,
never `vercel --prod`; no `git push`, no merge, no `git add .` with unrelated
untracked files; no credential reads, no bypass tokens, stop and ask if a
step seems to need one; pasted output is the gate, never "done."

---

## PROMPT 0. Backup cron to main. Read, verify, prepare. You merge.

Paste into Claude Code:

You are preparing, not merging. Read-only until the last step, which writes
one file.

Context: `lib/inngest/storageBackupFunctions.ts` on `main` defines
`storageBackupSync` with two event triggers and no cron. Commit `4d1155d` on
branch `ops/storage-backup-sync-daily-cron-2026-08-13` restores the
`0 4 * * *` cron. Inngest production, read September 17, shows the function
with the two event triggers only. `storage_backup_runs` shows the last sync
was the August 13 seed and the weekly verify has failed four times since
August 23 with `A1_MISSING`. CLAUDE.md section 6 says the cron was added
August 13. That sentence is wrong about production.

1. `git fetch --all`. `git log --oneline main..ops/storage-backup-sync-daily-cron-2026-08-13`
   and the reverse. Print both. State how many commits are on the branch
   that are not on main, and whether main has moved past the branch point
   (it has; say by how much).
2. `git diff main...ops/storage-backup-sync-daily-cron-2026-08-13 --stat`
   and the full diff. Print it. Confirm the diff touches only the trigger
   definition and CLAUDE.md, or list every other file it touches.
3. `git merge-tree` (or a scratch worktree with `git worktree add`) to test
   whether the branch merges into current main without conflict. Print the
   result. Do not merge in the working tree.
4. Read `app/api/cron/storage-backup-heartbeat/route.ts`. State exactly
   what it emails, to whom, on what condition. Say whether four consecutive
   verify failures would have produced four emails, one, or none.
5. Read `lib/inngest/storageBackupFunctions.ts` `storageBackupVerify` and
   say what `A1_MISSING` means in its alarm vocabulary and what the
   remediation is (a sync run, or something else).
6. Write `docs/BACKUP_CRON_RESTORE_2026-09-17.md`: the findings above, the
   exact commands for the founder to run (`git checkout main`,
   `git merge --no-ff ops/storage-backup-sync-daily-cron-2026-08-13`,
   `git push origin main`, which deploys), what to read on the Inngest
   function page afterward (`0 4 * * *` listed as a trigger), and the query
   to paste the morning after:

       select kind, started_at, ok, objects_source, objects_copied, error
       from storage_backup_runs order by started_at desc limit 3;

   Expected: a `sync` row dated tomorrow 04:00 UTC with `ok = true` and
   `objects_copied` at least 1. Then the Sunday verify should pass.
7. Print the file. Stop. Do not commit.

Founder: run the merge commands from that file, push, read Inngest, read
the query the next morning, paste the rows here. Then prompt 1.

---

## PROMPT 1. Close the two open doors.

Paste into Claude Code:

Small, single-purpose, own branch. Two unlinked pages create role-less
Supabase auth users today: `app/(auth)/login/page.tsx` (calls
`signInWithOtp` with no `shouldCreateUser` option; the Supabase default is
true) and `app/(auth)/register/page.tsx` (password `signUp`). Nothing links
to them (confirm with `Select-String` over `app` and `components` for
`href="/login"` and `href="/register"` outside the `(auth)` group; print the
result). The owner sign-in is `/archive-login`.

1. `git checkout main`, `git pull`, `git checkout -b close-auth-doors-2026-09-17`.
2. Delete both page files and the `(auth)` directory if it holds nothing
   else. If it holds a layout or anything else, print what is there and
   stop.
3. Add `permanentRedirect('/archive-login')` pages at `app/login/page.tsx`
   and `app/register/page.tsx` so held links do not 404.
4. `npx tsc --noEmit`. Print the result.
5. `git add -A` (confirm with `git status --short` that only these files are
   staged; if anything else is untracked, do not stage it and say so).
6. `git commit -m "Close the unlinked /login and /register pages; redirect to /archive-login"`.
7. `vercel`. Print the preview URL. On the preview, `/login` and
   `/register` must 308 to `/archive-login`. Print the curl output with
   `-I`.
8. Stop. Do not merge or push.

Founder: merge to main when the preview reads right.

---

## PROMPT 2. Slice A build.

Paste into Claude Code after prompts 0 and 1 are on main:

You are building slice A of `docs/SELF_SERVE_SKELETON_2026-09-17.md`. Read
that file in full first, then `docs/SELF_SERVE_RECON_2026-09-17.md`
sections A, B, C, E, F, then CLAUDE.md. The skeleton is approved; its
section 5 decisions and section 6 copy are final. Where this prompt and the
skeleton disagree, the skeleton wins and you say so.

Branch: `git checkout main`, `git pull`, `git checkout -b trial-2026-09-17`.

Build order, with a `git commit` after each numbered step so the branch
reads as a sequence. Run `npx tsc --noEmit` and the test file for each step
before its commit.

### Step 1. Migration and the trial lib

- `supabase/migrations/20260917_trial_archives.sql` exactly as skeleton 1.1.
  The founder pastes it; you do not run it.
- `lib/trial.ts`:
  - `TRIAL_DAYS = 30`.
  - `deriveFamilyName(name: string): string` (last whitespace token, or the
    whole trimmed name if one token; title-case the first letter; never
    empty, fall back to 'Founder').
  - `trialWindow(now = new Date()): { startedAt: string; expiresAt: string }`.
  - `isTrial(archive: { status?: string | null }): boolean`.
  - `canShowProof(status: { completed: number }): boolean` returns
    `completed >= 1`. Move it here from wherever the route computes it
    today; `lib/foundingSequence.ts` may re-export it.
- `lib/trial.test.ts`: 6 tests (two-token name, one-token name, empty name,
  the window arithmetic, isTrial true and false, canShowProof at 0 and 1).

### Step 2. Auth user creation with forced role

- `lib/auth/getOrCreateAuthUser.ts`: add an options argument
  `{ forceRole?: boolean }`. When the user already exists and `forceRole`
  is true, `auth.admin.updateUserById(id, { app_metadata: { ...existing, role } })`
  regardless of the existing role. Existing behavior when the option is
  absent is byte for byte unchanged; print the diff to prove it.
- `lib/auth/getOrCreateAuthUser.test.ts` if a test file exists for it;
  otherwise a test that pins the default path does not call update when a
  role is present. If the module cannot be tested without a Supabase
  client, say so and skip; do not write a mock that pretends.

### Step 3. Trial start route

- `app/api/trial/start/route.ts`, POST, exactly as skeleton 1.2, steps 1
  through 8. `maxDuration = 30`. Use `checkRateLimit` from
  `lib/apiSecurity.ts`. Email normalization: trim, lowercase, must match a
  plain address shape (one @, a dot after it); no library.
- Existing-archive check (step 4 of 1.2) is by `owner_user_id`, not by
  email.
- The `archive_applications` insert: `name`, `email`, `apply_type =
  'legacy'`, `status = 'trial'`, `referral_source = 'self-serve'`,
  `reason` = prompt text or 'trial', `subject` null, `notes` = the forWhom
  value. Print the live column list from the recon A4 result beside the
  insert to prove every NOT NULL column is set.
- `lib/internalNotify.ts` per skeleton 1.7. The "Trial started" send runs
  under `after()`.
- No OTP send from this route.

### Step 4. /begin

- `app/begin/page.tsx` (server: reads session; if signed in with an archive,
  redirect to `/archive/dashboard`; if signed in without one, render the
  third state; else the public form).
- `app/begin/BeginClient.tsx`: the three states from skeleton 1.3 with the
  section 6 copy verbatim. After a successful POST, call
  `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false,
  emailRedirectTo: origin + '/auth/callback' } })` exactly as
  `/archive-login` does, then show screen 2. Resend after 30 seconds.
  The signed-in-no-archive state POSTs the same route with the session's
  email and skips the OTP.
- Styling: match `/archive-login`. Read that page and reuse its classes.
  No new design tokens.
- `app/archive/dashboard/page.tsx:12` and `app/archive/founding/page.tsx:12`:
  the zero-archive redirect target becomes `/begin?signed_in=1`.

### Step 5. Proof after call 1

- `app/api/archive/founding/proof/route.ts`: replace the `!status.done`
  gate with `!canShowProof(status)`; 409 text "Finish the first call
  first."
- `app/archive/founding/FoundingClient.tsx`: `<ProofCard />` renders in the
  post-call panel and the begin-next-call panel when
  `canShowProof(status)`, above the Begin button. On
  `{ ready: false, reason: 'no_pairs' }` show "One moment" and retry once
  after 5000 ms; on a second miss show the existing NOTES[1]. The completed
  panel keeps the card where it is.
- Under the card, on a trial archive only (`isTrial`), render the section 6
  line "Found your archive to keep going." as plain text with no button
  (the button arrives in slice C).
- `lib/foundingProof.test.ts`: one test through `canShowProof`.

### Step 6. Gates

- `lib/inngest/coverageFunctions.ts` `coverageMonthlySweep` select: add
  `.eq('status', 'active')`.
- `lib/cronGates.test.ts`: reads every `app/api/cron/*/route.ts`, and for
  each file that contains `.from('archives')` asserts it also contains
  `.eq('status', 'active')` (allow the no-space variant). Print the list of
  files it checks and the result. If any cron fails the assertion today,
  do not edit that cron; report it and make the test skip it by name with a
  comment, because a cron change is its own slice.
- `app/archive/dashboard/DashboardClient.tsx`: the contributor invite
  control hides when `archive.status === 'trial'`, replaced by the one line
  "Invite family once your archive is founded." Find the control by reading
  the file; print the lines you change.
- `FoundingBanner.tsx`: on a trial with zero completed calls, the banner
  copy leads with "Your first call is ready." Otherwise unchanged.

### Step 7. B2 exclusion

Against the merged cron branch (prompt 0 is on main by now; confirm with
`git log --oneline -5 main` and print it).

- `lib/storageBackup.ts`: `ArchiveScope` gains `excludedArchiveIds:
  string[]`; `applyArchiveScope` drops an object whose first path segment
  is in `terminatedArchiveIds` or `excludedArchiveIds`; `buildSnapshotEntries`
  takes the union. Every existing call site passes `excludedArchiveIds: []`
  so behavior is unchanged until step 7b.
- `lib/inngest/storageBackupFunctions.ts`: the load-terminated step also
  reads `select id from archives where status = 'trial'`, throws on a
  failed read the same way, and passes the list as `excludedArchiveIds`.
- `lib/storageBackup.test.ts`: one test per skeleton 1.6.

### Step 8. Call 1 complete notification, helper adoption

- `app/api/archive/b2b-question/answer/route.ts`: inside the existing
  `after()` for founding completion, add the "Call 1 complete" internal
  send when `state.founding.call === 1` closes. Move the existing call-3
  internal send (:263-271) onto `notifyInternal`. The owner email is
  untouched.
- Print the diff of this file in full.

### Step 9. CLAUDE.md

Section 4: one paragraph on `/begin`, the trial status convention
(`status = 'trial'`, no CHECK, `trial_expires_at`), the cron gate test, the
B2 exclusion, and that trials cannot invite contributors or upload. Section
6: correct the August 13 backup cron sentence to say it reached main on
September 17.

### Step 10. Tests, preview, output

- Full local suite over the modules touched. Print the count.
- `vercel`. Print the preview URL.
- Write `docs/TRIAL_SLICE_A_2026-09-17.md`: files new and changed with one
  line each, the migration to paste, the preview test script from skeleton
  1.9 steps 1 through 7 with nothing added, the pasted-row queries from
  skeleton 1.9 verbatim, rollback (`vercel rollback`; the migration is
  additive and stays), and known limits. Print it.
- `git status --short`. Every file must be on the branch and committed.
  Stop. Do not merge or push.

Founder: paste the migration, run the preview script with a fresh mailbox,
paste the rows here. Then promote.

---

## What the founder does, in order

1. Prompt 0. Merge the backup branch, push, confirm the Inngest trigger,
   paste the next-morning query.
2. Prompt 1. Merge when the preview 308s.
3. Prompt 2. Paste the migration when the branch is written. Run the
   preview script. Paste the rows. Promote.
4. Delete the preview's trial archive by hand (skeleton 1.9, last
   paragraph) or leave it for slice B's job to prove itself on.
