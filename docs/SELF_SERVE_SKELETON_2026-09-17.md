# Self-serve trial: the skeleton. September 17, 2026.

Build-ready spec for the front door decided in
`docs/ONBOARDING_OPERATING_MODEL_2026-09-17.md` (project copy
`claude/BASALITH_ONBOARDING_OPERATING_MODEL_2026-09-17.md`), grounded in the
read-only recon `docs/SELF_SERVE_RECON_2026-09-17.md` and the live database
reads taken September 17 through the Supabase SQL editor and the Inngest
dashboard (section 0). Approve before any build prompt runs.

Four slices, in order. Each has its own preview, its own pasted-row gate,
and its own promote. Nothing in a later slice is copy-visible until the
slice before it is live.

- Slice A. Trial start, call 1 open, proof after call 1, trial marker, cron
  and B2 gates, watch-mode notifications.
- Slice B. Trial deletion job and the day-23 email.
- Slice C. Trial to paid: owner-initiated Checkout that links, /welcome, the
  dead password cut.
- Slice D. Copy pass. /apply becomes "Begin your first call" for personal.

Out of band, before slice A, unrelated to the trial: merge
`ops/storage-backup-sync-daily-cron-2026-08-13` to main. Section 0.3.

---

## 0. What the live reads settled

### 0.1 Schema (Supabase, September 17)

- `archives.status` text, nullable, default 'active', NO CHECK. Live values:
  `active` (9), `drill` (1). `'trial'` is legal.
- `archives.tier` text, nullable, default 'estate', NO CHECK. Live values:
  `active`, `estate`, `succession`. Only `=== 'succession'` is compared in
  code.
- NOT NULL without default on `archives`: `name`, `family_name`,
  `owner_email`. The trial insert sets all three.
- `archives.owner_user_id` uuid nullable, FK to `auth.users(id)`, no ON
  DELETE action (so the auth user cannot be deleted while the archive row
  exists; delete order in slice B respects this).
- `archives.entity_pipeline` NOT NULL default 'context', CHECK context or
  grounded.
- `billing` exists (5 rows: 4 linked to the June 27 test archives, 1 orphan
  checkout that never paid). `billing.archive_id` FK ON DELETE SET NULL.
- `archive_lifecycle` exists (4 rows, all b2c active). `commercial_state`
  CHECK: prospect, active, past_due, resting, legacy,
  succession_post_transition, pending_deletion, deleted. FK to archives ON
  DELETE CASCADE.
- `stripe_events` 15 rows.
- `on_auth_user_created` trigger on `auth.users`, enabled, runs
  `public.handle_new_user()`: inserts `profiles(id, email, full_name)` ON
  CONFLICT DO NOTHING. Every trial sign-up creates a `profiles` row.

### 0.2 The cascade map

51 tables carry `archive_id`. 50 have a foreign key to `archives`:
49 `ON DELETE CASCADE`, `billing` `ON DELETE SET NULL`. The exceptions:

- `email_replies`: FK to `archives` and to `email_sessions`, both with no
  action. Blocks `delete from archives`. Delete its rows first.
- `storage_backup_objects`: no FK by design. The manifest outlives the
  archive.

Second hop, all inside the cascade: `labels`, `email_sessions`,
`owner_deposits`, `voice_recordings`, `archive_videos`, `archive_documents`,
`question_history`, `deposit_domain_scores`, `deposit_resurfacings`,
`witness_deposits`, `memory_game_*`, `contributor_*`, `successor_contexts`,
`eval_results`, `coverage_probe_results`. Every one either cascades from its
parent or is itself keyed to `archives` with CASCADE, and Postgres checks
no-action FKs at statement end, so one `delete from archives where id = $1`
after `email_replies` is clean.

Outside the cascade: `profiles` (by user id), `auth.users`, Storage objects
under `{archiveId}/` in four buckets, B2 (only if synced).

### 0.3 The backup finding

Inngest production: `Storage backup sync` triggers are
`storage/backup.sync.requested` and `storage/backup.sync.continue`. No
cron. `storage_backup_runs`: last sync is the seed, August 13, 18:35 (376
source objects, 382 manifest rows). Newest source object August 16. Weekly
verify: ok August 16; **failed August 23, 30, September 6, 13 with
`A1_MISSING`**. The daily cron on
`ops/storage-backup-sync-daily-cron-2026-08-13` (commit 4d1155d) never
reached main.

Fix, before slice A: merge that branch, deploy, confirm the Inngest function
page lists `0 4 * * *`, and read the next verify. The trial exclusion in
slice A is written against that branch's version of
`storageBackupFunctions.ts`, so the merge comes first. Also confirm the
heartbeat cron actually mailed those four failures; if the admin mailbox has
nothing since August 23, that is a second bug.

---

## 1. Slice A: trial start through proof

### 1.1 Migration (paste)

`supabase/migrations/20260917_trial_archives.sql`

    alter table archives
      add column if not exists trial_expires_at timestamptz,
      add column if not exists trial_started_at timestamptz,
      add column if not exists converted_at timestamptz;

    create index if not exists archives_trial_expires_idx
      on archives (trial_expires_at)
      where status = 'trial';

    comment on column archives.trial_expires_at is
      'Set on trial creation to trial_started_at + 30 days. Cleared on conversion. The deletion job selects on it.';

No CHECK on status is added. `'trial'` joins `active` and `drill` as a
convention, documented in CLAUDE.md section 4. Adding a CHECK now would have
to enumerate `drill`, which is a test value nobody wants enshrined.

Confirm after paste:

    select column_name, data_type, is_nullable
    from information_schema.columns
    where table_name = 'archives' and column_name like 'trial%' or column_name = 'converted_at';

### 1.2 Trial start

`app/api/trial/start/route.ts`, POST, public, no session.

Body: `{ email: string, name: string, forWhom?: 'me' | 'someone', prompt?: string }`.
`name` is the person's own name; it becomes `owner_name` and, with a
possessive, `family_name` ("Ha" from "David Ha" by last token, or the whole
name if one token). `forWhom` and `prompt` are the intent screen; stored on
`archive_applications` as a row with `apply_type = 'legacy'`, `status =
'trial'`, `referral_source = 'self-serve'` so the existing admin tooling
sees it and nothing new is invented. `subject` is null; `reason` is the
prompt text or 'trial'.

Steps, in order, each failing closed:

1. Rate limit: `checkRateLimit('trial-start:' + ip, 5, ONE_HOUR_MS)`.
   Stated as a cost guard (in-memory per instance, recon C5).
2. Normalize email (trim, lower). Reject if not a plausible address.
3. `getOrCreateAuthUser(email, 'owner')` with a new option
   `{ forceRole: true }` that sets `app_metadata.role = 'owner'` even when
   the user exists with another role (recon B4). The function change is one
   branch; existing callers pass nothing and keep current behavior.
4. If an archive already exists with `owner_user_id = user.id`, do not
   create another. Respond `{ ok: true, existing: true }` and let step 6 run.
5. Insert `archives`: `name` = `${family} Archive`, `family_name`,
   `owner_email`, `owner_name`, `owner_user_id`, `tier = 'active'`,
   `status = 'trial'`, `trial_started_at = now()`,
   `trial_expires_at = now() + 30 days`, `entity_pipeline = 'grounded'`.
   Nothing else. Defaults cover the counters.
   `grounded` on a trial is deliberate: the entity a trialist meets is the
   verified one, and the family entity move already carries the switch.
6. Insert `archive_applications` as above.
7. Under `after()`: internal notification "Trial started" (section 1.7).
8. Respond `{ ok: true }`. The page then tells them to check their mail and
   calls the existing sign-in flow.

Not in this route: sending the OTP. The page calls `signInWithOtp` with
`shouldCreateUser: false` exactly as `/archive-login` does today, after the
POST returns. The auth user now exists, so the link sends.

The archive is created in this POST rather than at first sign-in (recon G1
recommended after). Reason to override: the callback is the one place a
zero-archive owner is looping today (recon B3), and creating on arrival
means a second code path that must also handle the "typed the dashboard URL
before clicking the link" case. Creating here is simpler and the cost is
one archive row per unproven mailbox. Slice B's job deletes any trial with
no sign-in within 30 days along with the rest, so the garbage collects
itself. `trial_started_at` and `last_active` (already on archives) tell the
two apart.

### 1.3 The page

`app/begin/page.tsx` and `BeginClient.tsx`. Public. The primary CTA on
/families and the home page points here in slice D; until then it is
reachable by URL only.

Screen 1: email, name, the two intent questions, one button "Begin". Copy
per section 6 (approved before build). No feature list, no price on this
screen; the price is one link away and is on the page they came from.

Screen 2 (after POST): "Check your mail. The link signs you in and opens
your first call." Resend after 30 seconds.

`app/auth/callback/route.ts`: no change. An owner with an archive goes to
`/archive/dashboard` as today.

`app/archive/dashboard/page.tsx` and `founding/page.tsx`: the zero-archive
redirect (recon B3) changes from `/archive-login` to `/begin?signed_in=1`,
and `/begin` renders a third state for a signed-in user with no archive:
"You are signed in as X. Begin your archive." with the same form minus
email. This closes the loop the recon found and is the only surface
`session.userId && !session.archiveId` ever lands on.

`FoundingBanner.tsx`: on a trial archive with zero completed calls, the
banner is the dashboard. The rest of the dashboard renders below it as
today; no new gating.

### 1.4 Proof after call 1

`app/api/archive/founding/proof/route.ts:41-44`: `!status.done` becomes
`status.completed < 1`; the 409 text becomes "Finish the first call first."

`app/archive/founding/FoundingClient.tsx`: `<ProofCard />` renders in the
"call just closed" panel (:273-290) and the "begin the next call" panel
(:292+) when `status.completed >= 1`, above the "Begin call N" button. On
`{ ready: false, reason: 'no_pairs' }` the card shows "One moment" and
retries once after five seconds; a second miss shows the existing NOTES[1].

The proof's approved words are unchanged. Nothing about "trial" appears on
the card.

`lib/foundingProof.test.ts`: one test that a status with `completed = 1`
passes the route gate (extract the predicate to `canShowProof(status)` in
`lib/foundingSequence.ts` so it is testable without the route).

### 1.5 Cron and sweep gates

Vercel crons: zero edits. Every one selects `status = 'active'` (recon E3).
A test pins this: `lib/cronGates.test.ts` greps `app/api/cron/*/route.ts`
for `.eq('status', 'active')` or `.eq('status','active')` and fails if any
route that selects from `archives` lacks it. This is the guard that keeps
fork 4 true as crons are added.

`lib/inngest/coverageFunctions.ts:111-114`: `coverageMonthlySweep` adds
`.eq('status', 'active')`.

The three surfaces that refuse non-active (recon G4):
`app/contribute/[token]/page.tsx:58`,
`app/api/mobile/contributor-session/route.ts:51`,
`app/api/archive/upload/route.ts:40`. Decision: trials may NOT invite
contributors. Leave all three as they are. The contributor invite form on
the dashboard hides on a trial (`archive.status === 'trial'`) with one line:
"Invite family once your archive is founded." The contributor loop as a
sign-up source runs from founded archives, which is where it runs today.
Upload stays refused on a trial too: photos are not part of the first call
and every photo is a B2 question.

### 1.6 B2 exclusion

Against the merged cron branch (section 0.3).

`lib/inngest/storageBackupFunctions.ts`, the `load-terminated-archives`
step: also read `select id from archives where status = 'trial'`. Throw on
a failed read exactly as the terminated read does. Pass both lists.

`lib/storageBackup.ts`: `ArchiveScope` gains `excludedArchiveIds: string[]`.
`applyArchiveScope` drops an object whose first path segment is in either
list, same `continue`. `buildSnapshotEntries` takes the union.

`lib/storageBackup.test.ts`: one test, a trial id's object is dropped from
the kept set and from the snapshot, a converted archive's object is kept.

On conversion (slice C) `status` leaves 'trial' and the next run copies as
new. On deletion (slice B) nothing was ever in B2.

Voice recordings from a trial's founding turns still land in Supabase
Storage under `{archiveId}/` in `voice-recordings`; they are simply never
synced. The purge in slice B removes them.

### 1.7 Watch-mode notifications

`lib/internalNotify.ts`: one helper,
`notifyInternal({ subject, text, html? })`, sending from
`Basalith <davidha@basalith.xyz>` to
`Array.from(new Set(['mrdavidha@gmail.com', ADMIN_EMAIL]))`. The founding
completion internal email (`answer/route.ts:263-271`) moves onto it in the
same commit so there is one convention (recon F1: both scopes to both
addresses). `/api/apply` is not touched; its convention is different and it
is not this slice.

Three sends, all under `after()` in routes, plain in Inngest:
- Trial started: from `/api/trial/start`. Name, email, forWhom, prompt,
  archive id, link to the god view.
- Call 1 complete: from `/answer` when `state.founding.call === 1` closes.
  Archive name, deposit count, turns, link.
- Paid: from `provisionOnFoundingFee` (slice C).

No owner email from any of these. The owner's mail in slice A is the OTP
link and the existing call-3 completion email.

### 1.8 Files, slice A

New: `supabase/migrations/20260917_trial_archives.sql`,
`app/api/trial/start/route.ts`, `app/begin/page.tsx`,
`app/begin/BeginClient.tsx`, `lib/trial.ts` (family name derivation,
expiry math, `isTrial(archive)`), `lib/trial.test.ts`,
`lib/internalNotify.ts`, `lib/cronGates.test.ts`.

Changed: `lib/auth/getOrCreateAuthUser.ts` (`forceRole`),
`app/api/archive/founding/proof/route.ts`, `lib/foundingSequence.ts`
(`canShowProof`), `app/archive/founding/FoundingClient.tsx`,
`app/archive/dashboard/page.tsx`, `app/archive/founding/page.tsx`,
`app/archive/components/FoundingBanner.tsx`,
`app/archive/dashboard/DashboardClient.tsx` (contributor invite hidden on
trial), `app/api/archive/b2b-question/answer/route.ts` (call 1 notify, helper
adoption), `lib/inngest/coverageFunctions.ts`,
`lib/inngest/storageBackupFunctions.ts`, `lib/storageBackup.ts`,
`lib/storageBackup.test.ts`, `lib/foundingProof.test.ts`, `CLAUDE.md`
section 4 (trial status convention, /begin, the cron gate test).

### 1.9 Preview and gate, slice A

    git checkout -b trial-2026-09-17
    git add -A
    git commit -m "Self-serve trial: /begin, trial archives, proof after call 1, cron and B2 gates"
    vercel

Paste the migration first. Then on the preview, with a fresh mailbox you
control (not one that owns or contributes to any archive):

1. /begin. Fill it in. Submit. Internal "Trial started" email arrives.
2. The sign-in link arrives. Click it. Land on /archive/dashboard with the
   Founding banner at the top. No loop.
3. Begin call 1. Answer to completion (10 to 25 turns, one voice turn).
4. The proof card renders in the post-call panel. One grounded panel with
   your opener answered and the deposit under it, one declined. Internal
   "Call 1 complete" email arrives.
5. Reload. Card still there. Begin call 2 is offered.
6. Sign out, sign in again with the same link flow. Dashboard, not /begin.
7. A second mailbox that is already a contributor on Cindy's archive: run
   /begin. The link signs in and lands on the dashboard (role forced to
   owner). my-archives shows both the owned trial and the contributed
   archive.

Then paste:

    select id, status, tier, owner_email, owner_user_id, trial_started_at,
           trial_expires_at, entity_pipeline
    from archives where status = 'trial' order by created_at desc;

    select id, status, state->'founding' as founding,
           jsonb_array_length(state->'probeHistory') as turns
    from incident_sessions where archive_id = '<trial>' order by created_at desc;

    select count(*) filter (where included_in_training) as included, count(*) as pairs
    from training_pairs where archive_id = '<trial>';

    select id, email, status, apply_type, referral_source
    from archive_applications where email = '<trial email>';

    select id from profiles where id = '<owner_user_id>';

    select raw_app_meta_data->>'role' as role from auth.users where id = '<owner_user_id>';

And for the B2 gate, after sending `storage/backup.sync.requested` by hand
on the preview's Inngest environment (or waiting for the cron once merged):

    select bucket, path from storage_backup_objects
    where archive_id = '<trial>';
    -- expected: zero rows

    select kind, started_at, ok, objects_source, objects_copied
    from storage_backup_runs order by started_at desc limit 2;

Promote. The trial archive from the preview is deleted by hand after
promote (slice B's job does not exist yet): `email_replies` first, then the
archives row, then the Storage prefix, then the profiles row, then the auth
user.

---

## 2. Slice B: the deletion job

Not built until slice A is live and one trial has been walked end to end.

### 2.1 The job

`lib/inngest/trialFunctions.ts`, two functions.

`trialWarn`: cron `0 15 * * *` (08:00 Pacific). Selects
`status = 'trial' and trial_expires_at between now() + 6 days and now() + 8 days and warned_at is null`.
Sends the owner one email (section 6) and sets `warned_at` (one more
column, in the slice B migration). Idempotent on the column.

`trialExpire`: cron `0 16 * * *`. Selects
`status = 'trial' and trial_expires_at < now()`. For each, one step per
archive, in this order, each step idempotent:

1. `update archives set termination_requested_at = now() where id = $1 and termination_requested_at is null`.
   This is what `dissolution-purge.ts` and the B2 filter key on.
2. Storage: the purge script's logic lifted into `lib/storagePurge.ts`
   (bucket list from `lib/storageBackup.ts` ALLOWLIST plus
   `archive-exports`), delete every object under `{archiveId}/`. The
   script becomes a thin caller of the lib.
3. `delete from email_replies where archive_id = $1`.
4. `delete from archives where id = $1`. The cascade runs.
5. If the auth user owns no other archive (`archives.owner_user_id`), is
   not in `contributors` by email, is not in `successors` or `archivists`
   by `auth_user_id`: `delete from profiles where id = $1`, then
   `auth.admin.deleteUser(id)`. Otherwise leave the user and the profile.
6. Internal notification "Trial expired and deleted": id, email domain
   only, deposit count at deletion, whether the user was deleted.

Also delete the `archive_applications` row created at trial start
(`status = 'trial'` and matching email). It is not under the cascade.

A trial that converts (slice C) leaves `status = 'trial'`, so it never
selects. A trial the owner terminates by hand through
`/api/archive/terminate` gets the 365-day path that already exists; the
expiry job must skip any archive whose `scheduled_deletion_at` is set, so
the two paths never race. One `and scheduled_deletion_at is null` on the
select.

### 2.2 Copy consequence

Only after `trialExpire` has run in production against a real expired trial
and the pasted rows show the archive gone does any copy say "deleted after
30 days." Until then /begin says nothing about retention beyond "Your first
call is yours. Found the archive to keep it."

### 2.3 Gate, slice B

Create a trial on the preview, set `trial_expires_at = now() - 1 hour` by
hand, send the cron event. Paste: the archives row gone, zero rows in
`owner_deposits`, `incident_sessions`, `training_pairs`, `email_replies`
for that id, zero Storage objects under the prefix, the profiles row gone,
`auth.users` row gone, the internal email received. Then the same with a
user who also contributes to another archive: archive gone, user and
profile kept.

---

## 3. Slice C: trial to paid

### 3.1 Owner-initiated Checkout

`app/api/archive/checkout/route.ts`, POST, owner session required
(`getSessionUser`, archive from session, `status = 'trial'` required, 409
otherwise). Body: `{ billingPeriod: 'year' | 'month', partner?: string }`.
Creates the Checkout session with the same two line items as the admin
route (`b2c_founding` plus `b2c_active_year` or `_month`), `customer_email`
= `archive.owner_email`, and metadata in both places:
`{ archive_id, segment: 'b2c', tier: 'active', source: 'trial', partner }`.
No `application_id`, no `family_name`, no `guide_id`.
`success_url = ${siteUrl}/archive/founded?session_id=…`,
`cancel_url = ${siteUrl}/archive/founding`.

The admin route is unchanged for succession and for anyone the founder
onboards by hand.

### 3.2 Provisioning links

`lib/inngest/billingFunctions.ts` `provisionOnFoundingFee`: before step 5,
read `archive_id` from the subscription metadata. When present:

- skip `createArchiveWithCredentials` entirely;
- `update archives set status = 'active', converted_at = now(), trial_expires_at = null, stripe_customer_id, stripe_subscription_id, subscription_status = 'active' where id = $1 and status = 'trial'`;
- write `billing.archive_id`, `founding_paid_at`;
- upsert `archive_lifecycle` as today;
- no commission row (no guide);
- welcome email is the converted-trial variant (section 6): no password,
  no "your founding is complete," no Guide name. Points at
  /archive/founding to continue with call 2 or 3, or at the dashboard if
  the sequence is done;
- internal "Paid" notification.

The `family_name` and owner-email throws (:132-137) move inside the
application branch so a metadata-linked run does not trip them.

Idempotency is the same as today: the `where status = 'trial'` on the
update makes a replay a no-op, and `billing.archive_id` already set means
the linkage step skips.

The `checkout.session.completed` handler in `webhook/route.ts:90-99`
(legacy `archiveId` path) is left as is; the new metadata key is
`archive_id`, and the handler reads `archiveId`. Keep them distinct on
purpose and note it in CLAUDE.md. When the legacy path is confirmed
unused, it is deleted in its own commit.

### 3.3 /welcome and /archive/founded

`app/welcome/page.tsx`: `permanentRedirect('/archive/dashboard')`. The
admin checkout's `success_url` has pointed at a 404 since it was written;
this is the smallest true fix and the admin route's own success page can
be designed when a stranger pays through it.

`app/archive/founded/page.tsx`: owner session required. Reads
`session_id`, confirms the Checkout session belongs to this archive
(metadata `archive_id` equals the session's archive), renders "Your archive
is founded" and the next step. If the webhook has not landed yet
(`status` still 'trial'), says "A moment while we confirm" and polls
`/api/archive/founding/status` every five seconds up to a minute, then
shows the dashboard link regardless. Nothing is written by this page.

### 3.4 The password cut

`lib/billing/createArchive.ts`: remove the password generation, the
`archive_credentials` insert, and the `password` return. Rename to
`createArchive`. Update the sole caller. `foundingWelcome.ts` loses the
"Password Login" block and the `password` field. `archive_credentials` stays
as a table (annotate over delete); `legacyActivation.ts:50-65` stops
writing to it. A comment in the migration folder records that the table is
dead as of this commit.

### 3.5 Live keys

Gated on corp formation as before. Slice C is built and gated on test keys.
`LIVE_PRICES` stays empty until the founder fills it.

### 3.6 Gate, slice C

Preview, test keys, Stripe CLI forwarding. A trial from slice A with call 1
done: click "Found your archive" on the completion panel, pay with the test
card, land on /archive/founded, see the confirmation. Paste: the archives
row with `status = 'active'`, `converted_at`, `trial_expires_at` null, the
Stripe ids; the `billing` row linked; the `archive_lifecycle` row; NO
second archives row for that email; `stripe_events` dedup on a replay; the
welcome email with no password; the internal "Paid" email. Then send
`storage/backup.sync.requested` and paste that the converted archive's
voice objects now appear in `storage_backup_objects`.

---

## 4. Slice D: copy

After A, B, and C are live. One pass, one preview, founder reads every
page.

- /families and the home page: primary CTA "Begin your first call" to
  /begin. /apply stays for business.
- /apply: personal toggle removed; the page is the business door with two
  CTAs, "Talk with us" (the form) and "Begin your first call" (to /begin
  with `?scope=business`, which sets `tier = 'succession'` on the trial so
  the business seeds serve; the scoping call still gates payment and the
  successor).
- /pricing: the founding deliverables list already rewritten September 15;
  add one line under The Founding that the first call is free and the
  archive is founded on payment. No retention claim until slice B is
  proven.
- /faq "How do I begin": rewritten to the trial.
- /begin copy finalized (section 6).
- `lib/demoPersonas/index.ts:94` SESSION_CAP_CARD loses "Your Legacy
  Guide" (public demo, recon F2).
- `app/api/apply/route.ts:153` admin notice: "approve and schedule the
  Founding Session" becomes "reply within 48 hours."

---

## 5. Decisions taken in this skeleton, beyond the operating model

1. Archive created at trial start (POST), not at first sign-in. Reason in
   1.2.
2. Trials cannot invite contributors or upload photos. Founded archives
   can. Reason in 1.5.
3. Trials run on `entity_pipeline = 'grounded'`. Reason in 1.2.
4. `tier = 'active'` for personal trials, `'succession'` for business
   trials from /apply. The Stripe slice's `'estate'` default is corrected in
   slice C to `'active'`.
5. The zero-archive state lands on /begin, not on a new dashboard state.
6. No CHECK on `archives.status`. Convention documented; `cronGates.test.ts`
   is the guard.
7. Internal notifications: both scopes to both addresses, one helper.
   `/api/apply` untouched.
8. Slice B's user deletion is conditional on the user owning nothing else
   and holding no other role.

## 6. Copy to approve before slice A builds

/begin, screen 1, eyebrow: "The first call."
Heading: "Tell us about the hardest call you ever made."
Body: "Fifteen to thirty minutes, by voice or typed, on your own time.
Nothing you say has to be important. When you are done, your archive
answers one question in your own words and declines one it has no
grounds for. That is how you know it is you."
Fields: Your name. Your email. This archive is for: me / someone I am
helping. What brought you here (optional, one line).
Button: "Begin."
Under the button: "Your first call is yours. Found the archive to keep it."

/begin, screen 2: "Check your mail. The link signs you in and opens your
first call." Resend link after 30 seconds.

/begin, signed-in with no archive: "You are signed in as {email}. Begin
your archive." Same fields minus email.

Founding completion panel, trial, after call 1 (below the proof card):
"Found your archive to keep going." Button to Checkout (slice C; until
then the button is absent and the panel offers call 2 as today).

Trial warning email, day 23 (slice B): subject "Seven days left on your
first call." Body: your archive at {name} holds {n} deposits from your
first call. It is deleted on {date} unless you found it. One button, one
export link. No urgency words beyond the date.

Converted welcome (slice C): subject "Your archive is founded." Body: the
archive name, what is in it so far, the next call, the dashboard. No
Guide, no password, no "complete."

Internal notifications carry no copy rules beyond no em dashes.

## 7. Not in this skeleton

- The async dyad for succession (operating model step 8).
- The scheduling link for the first-read call (step 7). It goes on the
  call-3 completion panel in slice D as a plain link to whatever calendar
  the founder uses; no build.
- Onboarding triggers from the lifecycle recon (step 6). The trial expiry
  in slice B is the only timer this skeleton adds.
- `monthly-accuracy` emailing the retired number. Its own cycle, flagged
  September 17.
- `app/(auth)/login` and `/register` (recon B1). They create role-less
  users today and are unlinked. Delete both in their own commit before
  slice A promotes; a trial keyed on a POST is safe either way, but there
  is no reason to leave two open doors.
