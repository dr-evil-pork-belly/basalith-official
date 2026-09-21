# Self-serve trial recon. September 17, 2026.

Read-only reconnaissance for the self-serve decision: a person with no archive
signs in, gets a trial archive, runs founding call 1, sees the proof, starts
Checkout themselves. No application approval for personal archives. Trial
archives not converted in 30 days are deleted by a job.

Everything below is from the live codebase on `main` at `ec21b98`, read this
session. Where a question needs the live database it is marked PASTE and the
exact SQL is given. Nothing was edited, committed, or deployed. No secrets were
touched.

Three premises in the prompt turned out stale, flagged where they land:
- F2: `lib/emails/foundingWelcome.ts` no longer says "Your Legacy Guide"
  (fixed September 14 in `cc4bf7b`, on main). What it still does is worse.
- B1: the web owner sign-in is a magic link, not a six-digit code. The code is
  the iOS path. Same Supabase OTP endpoint, different delivery.
- E2: the daily B2 sync cron is not on `main`. The commit that restored it
  (`4d1155d`, August 13) sits on an unmerged branch.

---

## A. How an archive comes to exist today

### A1. Every code path that inserts into `archives`

Search: multiline ripgrep for `.from('archives').insert` and `.upsert`, raw
`insert into archives`, and any `rpc(...)` naming archive or provision, across
`app`, `lib`, `scripts`, `supabase`, `docs`. Three code paths and one SQL
recipe. No upsert, no RPC.

**1. `lib/billing/createArchive.ts`, `createArchiveWithCredentials`
(`lib/billing/createArchive.ts:38-113`).** The only live provisioning path.

- Called by: `lib/inngest/billingFunctions.ts:143` inside `provisionOnFoundingFee`
  step `create-archive`. That is the sole live caller. The retired
  `app/api/archivist/onboard-client/route.ts` still names it in a comment block
  (`:46`, `:133`) but the handler returns 410 (`:32-39`) and the original is
  commented out.
- Columns set on insert (`:58-66`): `name` (`The ${familyName} Archive`),
  `family_name`, `owner_email`, `owner_name` (or null), `tier`, `generation`
  (`'Generation I'`), `status` (`'active'`).
- Second write to the same row (`:89-94`): `owner_user_id` set by UPDATE after
  the auth user exists.

**2. `scripts/onboard-client.js:40-51`.** Manual Node script. Columns: `name`,
`family_name`, `owner_email`, `tier`, `generation`, `status`. Sets NO
`owner_user_id`, so an archive it creates is unreachable by any login
(`getSessionUser` resolves by `owner_user_id`, see B2).

**3. `scripts/seed-demo-archive.js:10-21`.** Hardcoded Whitfield demo archive.
Same six columns, `tier: 'estate'`, no `owner_user_id`.

**4. Raw SQL in `docs/BASALITH_SUCCESSION_TEST_LOOP.md:50-57`.** The recipe that
created the Founder Test Archive: `insert into archives (name, family_name,
owner_email, owner_name, owner_user_id, tier, preferred_language, status)`,
copying `owner_user_id` from Dr Ha. Not code, but it is the only path in the
repo that sets `owner_user_id` on insert rather than by a second UPDATE.

**Not creators, confirmed by reading:**
- Admin: `app/api/admin/checkout/route.ts` creates a Stripe Checkout Session
  only. `app/api/admin/guide/route.ts` creates `archivists`.
- God: `app/api/god/*` (auth, backfill-training, data, elicitation-metrics,
  email, export-training, impersonate, photo-stats, rescore, score,
  send-apology, send-magic-link, trigger). None inserts into `archives`.
  `docs/BASALITH_SUCCESSION_TEST_LOOP.md:42` says the same: "God Mode is
  management only and has no create control."
- Guide portal: `app/api/archivist/*` (certification, connect-stripe, dashboard,
  demo, onboard-client [410], prospects, submit-exam). `app/api/guide-onboard`
  creates `archivists`. `app/archivist/onboard/page.tsx` is a static notice.
- `app/api/apply/route.ts:71-84` inserts into `archive_applications`, not
  `archives`.
- `lib/billing/legacyActivation.ts:41-48` UPDATEs an existing archive to
  `status: 'active'`; never inserts.

### A2. `lib/billing/createArchive.ts`, every table it writes, in order

| Order | Table | Op | Lines | Conditional? |
|---|---|---|---|---|
| 0 | (none) | `generateClientPassword` + `bcrypt.hash(…, 12)` | `:48-49` | No. Runs before any write. |
| 1 | `archives` | INSERT (7 columns, A1) | `:56-68` | No. Throws on error. |
| 2 | `archive_credentials` | INSERT `archive_id, password_hash, created_by, is_active: true` | `:75-84` | No. Throws on error, leaving the `archives` row orphaned (no rollback). |
| 3 | `auth.users` | `getOrCreateAuthUser(ownerEmail, 'owner')`: `auth.admin.createUser` with `email_confirm: true, app_metadata.role = 'owner'`, or find existing by paging `listUsers` | `:87`, `lib/auth/getOrCreateAuthUser.ts:11-36` | No. Throws if neither create nor find succeeds. |
| 4 | `archives` | UPDATE `owner_user_id` | `:89-94` | No. Throws on error. |
| 5 | (Supabase Auth) | `auth.admin.generateLink({ type: 'magiclink' })` | `:100-106` | Non-fatal. Caught, logged, `magicLinkUrl = null` (`:107-110`). |

It does NOT write `archive_lifecycle`, `billing`, `commissions`, `prospects`,
or send email. The header comment says so (`:11-14`) and the caller
`provisionOnFoundingFee` owns those (`lib/inngest/billingFunctions.ts:155-180`,
`:185-210`, `:213-243`).

**Password minting: CONFIRMED still live.** `:48` generates
`${Family}${Year}${4 chars}!`, `:49` hashes it, `:75-84` stores it, `:112`
returns the plaintext to the caller, and `provisionOnFoundingFee` puts the
plaintext into the welcome email (`billingFunctions.ts:223`,
`foundingWelcome.ts:53`, `:60`, `:97`, `:101`).

**Nothing reads `archive_credentials`.** Exhaustive grep over `app`, `lib`,
`scripts`: the only references are the INSERT above and two UPDATEs in
`lib/billing/legacyActivation.ts:50-54` (`is_active`) and `:61-65`
(`password_hash`). No SELECT anywhere. The two consumers are gone:
`app/api/archive/mobile-login/route.ts:19-25` is a 410 (retired September 8),
`app/api/archive-login/route.ts:7-12` is a 410 (Phase 4a), and
`check-credentials` was deleted in `a409eaf`
(`docs/API_AUTH_TRIAGE_2026-07.md:177`). The password in the welcome email
therefore opens nothing. `docs/IOS_APP_REBUILD_2026-09-08.md:244` already says
"Stop minting it." Not done.

### A3. Minimum `archives` columns for the owner surface to work

Every column read on the path from sign-in to a completed founding call, by
file. Reads by `select('*')` are called out.

| Column | Read by | Required for |
|---|---|---|
| `id` | everything | key |
| `owner_user_id` | `lib/auth/getSessionUser.ts:91` (resolves the session to an archive); ownership check in `app/archive/founding/page.tsx:16-20`, `app/api/archive/founding/status/route.ts:22-28`, `app/api/archive/founding/start/route.ts:31-37`, `app/api/archive/b2b-question/answer/route.ts:52-58`, `app/api/archive/founding/proof/route.ts:32-38`, `app/api/archive/dashboard/route.ts:62-69` | **Hard requirement.** Without it the user has no archive and every route 401s or redirects. |
| `tier` | `app/archive/layout.tsx:12-17` (nav trim); founding page `:16`, status `:22`, start `:31`, answer `:52`, proof `:32`, all through `scopeForTier` (`lib/foundingSequence.ts:84-86`); `lib/classifyDeposit.ts:56`; dashboard route `:129`; `DashboardClient.tsx:739` | Only `=== 'succession'` is ever compared (verified by grep across `app` and `lib`). Null or any other value reads as personal. Not required to be non-null by code. Whether the column carries a CHECK is NOT CONFIRMED, see A4. |
| `owner_name` | founding page `:16`, status `:22`, answer `:52` (training pair `ownerName`, `answer/route.ts:74`), `lib/foundingProof.ts:155,170` (`owner_name ?? name`), dashboard client | Nullable everywhere it is read. |
| `name` | answer `:52` (`archiveName` for training pairs and the completion email, `:75`); `lib/foundingProof.ts:155,170-171` (`.single()`, used as the fallback owner name and as `archiveName`); dashboard client | `answer` tolerates null (`?? ''`). `foundingProof` would pass `undefined` into the prompt. Set it. |
| `preferred_language` | answer `:52,76` (`?? 'en'`) | Nullable. Migration default `'en'`. |
| `owner_email` | answer `:52,234` (call 3 completion email only, `if (ownerEmail)`) | Nullable for call 1. Every cron filters `.not('owner_email','is',null)` (E3), so null is also the cheapest cron gate. |
| `entity_pipeline` | `lib/familyEntity.ts:144-149` (entity chat), `app/api/archive/coverage/route.ts:33` | Not on the founding or proof path. `not null default 'context'` per `supabase/migrations/20260916_entity_pipeline.sql`. The proof runs its own verifier regardless. |
| `status` | NOT read by founding, start, answer, or proof. Read by dashboard client (`archive?.status`, 3 uses), `app/api/archive/upload/route.ts:40`, `app/contribute/[token]/page.tsx:58`, `app/api/mobile/contributor-session/route.ts:51`, `app/api/archive/magic-login/route.ts:17`, and every cron (E3). | Not required for call 1. Governs contributor access, upload, and every scheduled email. |
| `labelled_photos`, `total_photos`, `current_streak` | `DashboardClient.tsx:313-324` typed, `a.labelled_photos`, `a.current_streak`, `archive?.total_photos` rendered; `lib/archiveScore.ts:63-68` | Dashboard renders `undefined` as 0 or NaN in the stats row. Need defaults (NOT CONFIRMED whether the column defaults exist, see A4). |
| `family_name`, `generation` | `daily-reflection` selects `family_name`; `createArchive` sets `generation` | Not read by the founding path. Nullability NOT CONFIRMED. |

`language`: there is no `archives.language` column in any read. The column is
`preferred_language`. `lib/i18n.ts` keys on it.

The dashboard route reads `select('*')` (`app/api/archive/dashboard/route.ts:72-76`)
and hands the whole row to the client, so any NOT NULL column without a default
must be set at insert or the insert fails; that is the A4 query.

Minimum, stated as an insert: `owner_user_id` (after the auth user exists),
`name`, `tier` (or null), `status` (whatever the trial marker is, see G),
`owner_email` (or null to silence crons), plus whatever A4 reports as NOT NULL
without default.

### A4. PASTE. Live columns and constraints

```sql
-- Columns. archives has no base migration in the repo (only ALTERs), and
-- archive_applications, archive_lifecycle, billing have no migration at all
-- (their DDL lives in docs/BASALITH_STRIPE_SKELETON (2).md section 2 and was
-- meant to be pasted by hand). This is the only way to know what is live.
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('archives','archive_applications','archive_lifecycle','billing')
order by table_name, ordinal_position;
```

Constraints, one query per table so a missing table errors alone:

```sql
select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.archives'::regclass
order by conname;
```

```sql
select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.archive_applications'::regclass
order by conname;
```

```sql
select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.archive_lifecycle'::regclass
order by conname;
```

```sql
select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.billing'::regclass
order by conname;
```

What to look for in the result:
- A CHECK on `archives.tier`. The Stripe slice writes `'estate'` by default
  (`billingFunctions.ts:127`, `admin/checkout/route.ts:39,163`) while
  `supabase/migrations/20260512_tier_restructure.sql:4-7` moved every
  archive/estate/dynasty row to `'active'`. If a CHECK exists it decides which
  vocabulary the trial insert may use.
- A CHECK on `archives.status`. Decides whether `'trial'` is a legal value (G).
- `archive_lifecycle.commercial_state` CHECK. The skeleton DDL lists
  `prospect, active, past_due, resting, legacy, succession_post_transition,
  pending_deletion, deleted`. No `trial`.
- NOT NULL columns on `archives` without a default.

---

## B. How an owner signs in, and whether a stranger can

### B1. The web owner sign-in

`app/archive-login/page.tsx:18-25`:

```ts
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    shouldCreateUser: false,
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
})
```

`shouldCreateUser: false` is set. The page has no code-entry field; the success
state says "We sent a sign-in link" (`:65-70`). Delivery is a magic link that
lands on `app/auth/callback/route.ts:30-35` (`verifyOtp` on `token_hash`, or
`exchangeCodeForSession`). The six-digit code is the iOS path:
`C:\Users\mrdav\basalith-app\src\lib\supabase.ts:89-113` (`signInWithOtp` with
`shouldCreateUser: false`, then `verifyOtp`). Same Auth users, same endpoint.

So yes: a person with no Supabase user cannot sign in on `/archive-login` or in
the app. Supabase returns an error and the page shows "We could not send a
sign-in link" (`:28`).

**Which fix.** Server-side create, not `shouldCreateUser: true`. Reason:
`app/auth/callback/route.ts:42-46` routes on `app_metadata.role` and a user
made by `shouldCreateUser: true` has no role, so the callback sends them to
`/archive-login?error=no_role`, a page that does not read the `error` param
(the page's `error` state is only set on send failure, `:27-29`). The
server-side pattern already exists in production for contributors:
`app/api/mobile/prepare-sign-in/route.ts:24-51` calls
`getOrCreateAuthUser(email, 'contributor')` before the OTP is requested, always
answers 200, and leaves the mailbox check to Supabase. A trial-start route
doing `getOrCreateAuthUser(email, 'owner')` then letting the existing
`shouldCreateUser: false` flow run keeps every current guard intact.

**Two public routes already create auth users today, unguarded:**
- `app/(auth)/login/page.tsx:32-37` calls `signInWithOtp` with no
  `shouldCreateUser` option. The Supabase default is `true`. Any email typed
  here becomes an auth user with no role.
- `app/(auth)/register/page.tsx:49-56` calls `supabase.auth.signUp` with a
  password. Same result, and no mailbox proof until the confirmation link.
Both are route-group pages, so `/login` and `/register` resolve. Neither is
linked from Nav or Footer (grep for `href="/login"`, `/register` outside the
group: none). Whether Supabase "Allow new users to sign up" is on is NOT
CONFIRMED; if it is, these are live doors. They are harmless today because a
role-less user with zero archives bounces at the callback and again at
`app/archive/dashboard/page.tsx:12`. They stop being harmless the moment the
skeleton creates a trial archive for "any signed-in user with no archive".
The trial must be keyed on a deliberate POST, not on that condition.

**What else keys off the auth user existing:**
- `app_metadata.role`: read at `getSessionUser.ts:82`, routed on at
  `auth/callback/route.ts:43-46`. Set at creation by `getOrCreateAuthUser.ts:14`,
  and only back-filled when missing (`:27-31`). See B4 for the collision.
- `archives.owner_user_id` (B2), `archivists.auth_user_id`,
  `successors.auth_user_id` (`getSessionUser.ts:91-93`).
- `contributors` are matched by `email`, never by user id
  (`app/api/mobile/my-archives/route.ts:39-43`, `contributor-session/route.ts:33-38`).
- `handle_new_user` trigger on `auth.users` and the `profiles` table: exist in
  the vaults subsystem per `supabase/migrations/20260812_vaults_rls_close_read_paths.sql:108-112`,
  which says the trigger "is unread" and "presumably" creates `profiles` rows.
  NOT CONFIRMED. PASTE:

```sql
select tgname, tgenabled, pg_get_triggerdef(t.oid)
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'auth' and c.relname = 'users' and not t.tgisinternal;
```

```sql
select proname, pg_get_functiondef(oid)
from pg_proc
where proname = 'handle_new_user';
```

If the trigger inserts into `profiles` on every new auth user, every trial
sign-up also creates a `profiles` row in a subsystem that has nothing to do with
archives, and the 30-day delete has one more table to touch.

### B2. Signed-in user to archive

`archives.owner_user_id = auth.users.id`, equality, no join table.
`lib/auth/getSessionUser.ts:91`:

```ts
supabaseAdmin.from('archives').select('id').eq('owner_user_id', user.id),
```

Then `:100-115`: first owned archive by default; if more than one, the
`x-archive-id` header (iOS) or the `archive-id` cookie (web, set by
`/api/archive/switch`) picks among the user's own archives only. `:125-127`: a
successor with no owned archive falls back to their `successors.archive_id`.

`app/api/mobile/my-archives/route.ts:30-44` does the same two ways: owned by
`owner_user_id = session.userId` (`:32-35`), contributed by
`contributors.email = session.email` (`:38-43`).

`owner_email` is never used to resolve an owner. It is display and mail only.

**Consequence for the fork.** A trial archive can be created for an email
before the person has ever signed in, but only if the auth user is created
first (`getOrCreateAuthUser`) so that `owner_user_id` can be set. That is
exactly what `createArchiveWithCredentials` does at `:87-94`. Creating it after
first sign-in is equally possible: `session.userId` is the same value. The
mapping does not force the order; what does is whether you want archive rows
for mailboxes that never proved themselves (see G).

### B3. Gates that refuse a signed-in user with zero archives

- `proxy.ts:29-35`: requires only a Supabase user for `/archive`, `/archivist`,
  `/succession/portal`. No role check, no archive check.
- `app/archive/layout.tsx:8-20`: no gate. `tier` is null when
  `session.archiveId` is null.
- `app/archive/dashboard/page.tsx:12`: `if (!session?.archiveId) redirect('/archive-login')`.
- `app/archive/founding/page.tsx:12`: same redirect.
- `app/auth/callback/route.ts:43`: role `owner` goes to `/archive/dashboard`
  regardless of archive count.

**What renders today for a signed-in owner with zero archives:** nothing. The
callback sends them to `/archive/dashboard`, which redirects to
`/archive-login`, which shows the email form again with no message. They are
signed in and looping. A role-less user gets `/archive-login?error=no_role` and
the same silent form. There is no "no archive yet" state anywhere on the web.

### B4. Contributor who later signs in as an owner with the same email

Contributors have no auth user by default; they answer by token
(`lib/contributorToken.ts:18-46`, `app/contribute/[token]/page.tsx`). The iOS
app creates one for them on demand with role `contributor`
(`app/api/mobile/prepare-sign-in/route.ts:40-45`).

If that email then gets a trial archive through `getOrCreateAuthUser(email, 'owner')`:
`lib/auth/getOrCreateAuthUser.ts:11-15` tries `createUser`, fails because the
user exists, then `:25-32` finds them and sets the role **only if
`app_metadata.role` is empty**. Role stays `contributor`. `owner_user_id` is
set fine. Result:

- `getSessionUser` resolves `archiveId` from `owner_user_id` (`:91`), role
  `contributor`.
- `app/auth/callback/route.ts:43-46` matches none of owner, guide, successor,
  and bounces to `/archive-login?error=no_role`. The person cannot reach the
  dashboard from the sign-in link, even though `/archive/dashboard` would work
  if typed directly (the dashboard page checks `archiveId`, not role).
- `my-archives` returns the owned archive first and drops the contributed
  archive only if it is the same id (`:70`). Both roles coexist correctly there.
- The reverse order (owner first, then invited as a contributor elsewhere) is
  fine: `prepare-sign-in` finds the existing user and leaves role `owner`.

Fix for the skeleton: on trial creation, set `app_metadata.role = 'owner'`
unconditionally (or make the callback treat any user with an owned archive as
an owner). One line either way; the collision is real because the contributor
loop is the planned trial source.

---

## C. What the proof needs from a one-call archive

### C1. The three-calls check, and the smallest change

`app/api/archive/founding/proof/route.ts:41-44`:

```ts
const status = await getFoundingStatus(archive.id, archive.tier)
if (!status.done) {
  return NextResponse.json({ error: 'Finish the three calls first.' }, { status: 409 })
}
const proof = await buildFoundingProof(archive.id, status.scope)
```

The status object is `FoundingStatus`, `lib/foundingSequence.ts:136-157`:

```ts
{
  scope:     'personal' | 'business',
  calls:     [{ call, title, state: 'done' | 'current' | 'upcoming', deposits, turns }, x3],
  completed: number,          // calls in state 'done'
  done:      boolean,         // completed >= 3   (:194-195)
  nextCall:  1 | 2 | 3 | null,
  current:   { incidentId, isFounding, call, area, probeType, question, label, turns, deposits } | null,
}
```

`buildFoundingProof` itself has no call-count dependency
(`lib/foundingProof.ts:153-168`): it reads `training_pairs` where
`included_in_training = true` and returns `{ ready: false, reason: 'no_pairs' }`
only when there are none.

Smallest change, two edits, no new route, no parameter:
1. Route: replace `!status.done` with `status.completed < 1` (or
   `status.calls[0].state !== 'done'`), keeping the 409 text honest ("Finish
   the first call first.").
2. Client: `app/archive/founding/FoundingClient.tsx:255-269` renders
   `<ProofCard />` only inside the "Sequence complete" panel gated on
   `status?.done`. The "call just closed" panel (`:273-290`) and the "begin the
   next call" panel (`:292+`) need the card when `status.completed >= 1`.

The call 3 completion email (`lib/emails/foundingSequenceComplete.ts:51-52`)
already points at `/archive/founding` for the proof; nothing there changes.

### C2. Candidate pairs after call 1, and the frozen layer at 10 to 15 pairs

Selection, `lib/foundingProof.ts:94-100` and `:175-186`:
`orderGroundedCandidates` puts pairs with `metadata.probe_type === 'SEED'`
first (by quality), then the rest by quality; the loop tries the first
`MAX_ATTEMPTS = 3` and stops at the first `basis === 'deposit'`.

How many candidates a one-call archive has:
- One pair per accepted turn. `/answer` writes a deposit only on acceptance
  (`answer/route.ts:171-176`; a re-probe writes nothing), and each deposit
  becomes a pair under `after()` (`:212-215`).
- Every interview pair is included: `includeInTraining(score, probeType)`
  returns `true` whenever `probeType` is set (`lib/trainingPipeline.ts:32-35`),
  and `/answer` always passes it (`probeType = st.pendingProbeType ?? 'SEED'`,
  `:118`). Exceptions: response under 20 characters is skipped
  (`trainingPipeline.ts:151-154`) and `test_artifact` rows are skipped (`:162-172`).
- Exactly one SEED pair exists after call 1: the opener set by
  `startFoundingCall` (`foundingSequence.ts:272-273`, `pendingProbeType = 'SEED'`).
- The live run on Dr Ha produced 37 pairs across three calls
  (`CLAUDE.md` section 6, `docs/TRAINING_INCLUSION_2026-09-16.md`), so call 1
  alone is roughly 10 to 15. Matches the runbook's "10 to 25 turns".

So the grounded half asks the owner's own opener first ("Tell me about the
hardest call you ever made…"), then the two highest-quality follow-up probes.
Selection returns a candidate as long as one included pair exists.

`selectFrozenLayer` on a small archive, `lib/frozenLayer.ts:253-268`:
`candidateCount <= FROZEN_LAYER_LIMIT (20)` returns
`{ pairs: candidates, method: 'all', retrievalCalled: false }`. Every pair is
the layer, in quality order, no Haiku call. Identical to pre-September-10
behavior. The verifier then runs against the same pairs
(`foundingProof.ts:145`). At 21+ pairs (a long call 1) the retriever runs; that
is the same path production uses and needs no change.

One behavior to expect: with only call 1 in the layer, the entity's answer to
its own opener should key on the SEED pair and come back `deposit`. If the
model hedges in character, `no_position` is returned and the loop moves to the
next candidate. Three misses gives `NOTES[1]` ("Try again in a few minutes"),
which is the honest fallback the card already renders.

### C3. Training pair timing

Confirmed. `app/api/archive/b2b-question/answer/route.ts:212-215`, incident
branch:

```ts
after(async () => {
  try { await classifyDeposit({ depositId: acceptedDeposit.id, archiveId, text: answer }) } catch {}
  try { await createTrainingPairFromDeposit(acceptedDeposit, ownerName, archiveName, lang, 'owner', probeType, dimensionTag) } catch {}
})
```

Same shape on the succession fallback branch (`:109-112`). `after` is imported
from `next/server` (`:1`). Per turn, after the response is flushed, two serial
model calls: `classifyDeposit` (one Haiku call plus two reads and a write,
`lib/classifyDeposit.ts:69-71`) then `createTrainingPairFromDeposit` (two
reads, one Haiku scoring call `lib/trainingPipeline.ts:69-71`, one insert).
Realistic lag from a turn's response to its pair landing: 2 to 8 seconds.

What that means for the proof: the pair that matters most is the SEED pair
from turn 1, which landed while the owner was answering turn 2. By the time
call 1 closes, every pair but the last turn's is already in `training_pairs`.
The last one may still be in flight for a few seconds after the completion
panel renders. The proof needs one included pair, so `no_pairs` after call 1
is only possible if the owner clicks within seconds of a one-turn call, which
the reducer does not produce.

Recommendation: no server-side wait and no status polling. The route already
answers `{ ready: false, reason: 'no_pairs' }` when it finds nothing
(`foundingProof.ts:168`); the client should treat that one response as "retry
once after about five seconds" instead of a terminal state. `/founding/status`
does not expose pair count and should not start to; `calls[0].deposits >= 1`
(already in the status) is the right gate for showing the card.

Aside, not for this slice: the last turn's pair racing the proof is a general
property of `after()`, and the same race exists between call 3 closing and the
`coverage.run.requested` send at `:293-296`, which fires inside the same
`after()` block before the last pair is written. The coverage run reads
`training_pairs` a few seconds later and may miss one pair.

### C4. Refusal candidates per scope

`lib/foundingProof.ts:41-54`:

personal:
1. What is the one rule you never break when someone in the family asks to borrow money, and when did you last hold to it?
2. How do you decide how much to tell the children about money, and where exactly is the line?
3. Name the signal that tells you a friendship has run its course, and what you do when you see it.
4. What do you do first when two people you love are not speaking to each other?

business:
1. What is the one number you check before approving any spend over your comfort line, and what makes you stop?
2. How do you decide whether to match an outside offer to keep someone, and when have you refused?
3. What is your rule for firing a customer, and the last time you used it?
4. Name the signal that tells you a supplier is about to fail you, and what you do the day you see it.

Only the first three are tried (`MAX_ATTEMPTS`, `:190`).

Overlap with the call 1 seed, `lib/foundingSequence.ts:51-55` and `:67-69`:
- personal: "Tell me about the hardest call you ever made, at home or at work.
  What was going on, and what did you do?"
- business: "Tell me about the hardest call you ever made running this
  business. What was going on, and what did you do?"

None of the eight candidates names the hardest call, borrowing, children and
money, friendship, estrangement, spend approval, retention offers, firing a
customer, or suppliers is a plausible detour from a single incident interview,
but the seed does not ask for any of them. No overlap. The test at
`lib/foundingProof.test.ts:14` also pins that no candidate is a coverage probe
in any set. The one caveat: the owner's own hardest call could happen to be
about one of these topics (a family loan, a supplier failure), in which case
that candidate is grounded and the loop moves to the next. Three candidates
cover that.

### C5. Rate limit store

`app/api/archive/founding/proof/route.ts:25`:
`checkRateLimit(\`founding-proof:${ip}\`, 4, ONE_HOUR_MS)`.

`lib/apiSecurity.ts:12-34`: a module-level `Map<string, { count, resetAt }>`.
In-memory, per lambda instance. The comment at `:8-10` says so: "resets per
function instance, but still blocks burst attacks within a single cold
instance. Good enough for MVP." Not backed by a table, not shared across
instances, gone on cold start. Same store for `founding-start` (`:24`, 30 per
hour) and every other route that calls it. On Vercel "4 per IP per hour" means
"4 per IP per hour per warm instance that happens to serve you", so the real
ceiling on the eight-model-call proof is set by the owner-only gate and the
`maxDuration = 60`, not by this. It is a cost guard against a click-happy owner,
not a security control, and should be described that way.

---

## D. What Checkout assumes

### D1. `app/api/admin/checkout/route.ts`

Auth: `getGodModeAuth(req)` (`:64-66`). Not self-serve.

Body (`:68-83`): `applicationId` (required, `:86-88`), `tierPriceName`
(required, `:89-91`), `familyName` (required, trimmed, `:83`, `:95-97`; the
comment at `:92-94` explains the application has no family-name field),
`billingPeriod` (optional, `'year' | 'month'`, `:98-100`), `guideId` (optional,
must exist in `archivists`, `:150-156`), `archiveTier` (optional, one of
`archive | estate | dynasty`, `:39`, `:101-103`).

Reads from `archive_applications` (`:106-110`): `id, email, apply_type`.
`email` required (`:115-117`). `apply_type` maps `legacy` to `b2c`,
`succession` to `succession`, `acquisition` refused (`:26-31`, `:119-128`).

Metadata (`:159-166`), threaded into both `metadata` and
`subscription_data.metadata` (`:186-187`):

```ts
{ application_id, segment, tier: skuBase(tierName), archive_tier: archiveTier ?? 'estate', family_name, guide_id? }
```

Session (`:178-190`): `mode: 'subscription'`, two line items (recurring tier
plus one-time founding), `automatic_tax` off unless `STRIPE_TAX_ENABLED=true`,
`customer_email: application.email`, `success_url: ${siteUrl}/welcome?session_id=…`,
`cancel_url: ${siteUrl}/`.

**`/welcome` does not exist.** No `app/welcome` directory, no rewrite. A paid
customer lands on a 404. Unrelated to the trial decision but it is the page the
trial-to-paid path would also land on.

### D2. Does provisioning create or link?

**It always creates when `billing.archive_id` is null.** No lookup by owner
email, no lookup by any existing archive.
`lib/inngest/billingFunctions.ts:139-151`:

```ts
// 5. Create the archive (shared helper). If a partial prior run already
//    linked an archive, reuse it instead of creating a second one.
const created = await step.run('create-archive', async () => {
  if (billing.archive_id) return { archiveId: billing.archive_id as string, password: '', magicLinkUrl: null as string | null, reused: true }
  const c = await createArchiveWithCredentials({
    familyName,
    ownerEmail,
    ownerName,
    tier: archiveTier,
    credentialsCreatedBy: meta.guideId ?? null,
  })
  return { archiveId: c.archiveId, password: c.password, magicLinkUrl: c.magicLinkUrl, reused: false }
})
```

The "reuse" branch only covers a retry of the same subscription (the
`billing` row was linked in step 6 on a prior attempt, `:155-164`). A trial
archive that then pays through this path gets a second archive with the same
`owner_email`, a second auth-user lookup (which finds the same user, so
`owner_user_id` matches on both), and the owner sees two archives in the
switcher. The trial's deposits stay on the first.

The owner email itself comes from the application (`:128`), and the run throws
without one (`:135-137`) and without `family_name` (`:132-134`), so the
current function cannot run at all for a trial that never filed an
application.

**The legacy path is the one that links.** `app/api/stripe/webhook/route.ts:90-99`:
a `checkout.session.completed` whose metadata carries `archiveId` (and no
`application_id`) stamps `stripe_subscription_id` and `stripe_customer_id` on
the existing archive and calls `activateArchiveById`
(`lib/billing/legacyActivation.ts:29-117`), which sets `status: 'active'`,
re-enables and re-mints the dead password, and emails the owner and admin.
But the same subscription's first `invoice.paid` (`billing_reason =
'subscription_create'`, `:115-119`) still sends `founding_fee.paid`, and
`provisionOnFoundingFee` then fails on "no family_name in subscription
metadata" (`:132-134`) three times. So neither existing path handles
"an archive already exists, link the subscription to it" cleanly. The
trial-to-paid checkout needs its own metadata (`archive_id`) and a provisioning
branch that links instead of creating.

### D3. Customer portal or owner-facing billing

None. grep for `billingPortal`, `billing_portal`, `customer_portal`,
`/api/billing` across `app` and `lib`: zero hits. The only Stripe surfaces are
the god-authed checkout builder (D1), the webhook, `app/api/archivist/connect-stripe`
(Guide Connect onboarding) and `app/api/cron/pay-residuals` (Guide payouts,
not in `vercel.json`). An owner today cannot see, change, or cancel a
subscription anywhere on basalith.ai.

### D4. `lib/stripe/prices.ts`

Nine logical prices (`:11-20`): `b2c_founding`, `b2c_active_year`,
`b2c_active_month`, `b2c_resting_year`, `b2c_resting_month`,
`b2c_legacy_year`, `succession_founding`, `succession_year`,
`succession_post_year`.

`TEST_PRICES` (`:24-34`): all nine populated, `price_1Tme…` ids on account
`acct_1TmdWF1yVjZPfnWn`. `LIVE_PRICES` (`:37-47`): all nine empty strings.
`priceId()` throws on an empty id (`:54-66`), and `stripeMode()` reads
`sk_live_` off the key (`lib/stripe/client.ts:25-27`). Only
`b2c_active_year`, `b2c_active_month`, `succession_year` plus the two founding
prices are sellable at checkout (`admin/checkout/route.ts:34-37`).

### D5. PASTE. Do the ledger tables exist and hold rows

One statement per table so a missing table fails alone.

```sql
select 'stripe_events' as t, count(*) from stripe_events;
```

```sql
select 'billing' as t, count(*) from billing;
```

```sql
select 'archive_lifecycle' as t, count(*) from archive_lifecycle;
```

Expected from the record: `stripe_events` exists with 15 rows, all
`livemode: false` (`CLAUDE.md` section 6, VERIFIED August 12). `billing` and
`archive_lifecycle` are listed as in play in `CLAUDE.md` section 5, but neither
has a migration file in `supabase/migrations`; the DDL is only in
`docs/BASALITH_STRIPE_SKELETON (2).md:50-86`. If either errors with
`relation does not exist`, the Stripe SQL was never pasted and
`provisionOnFoundingFee` has never completed step 2.

---

## E. Trial deletion and what it touches

### E1. Existing delete paths, and every table keyed by archive

**There is no function that deletes one archive and everything under it.**

- `docs/DISSOLUTION_RUNBOOK.md:495-512`, step 4.3 "Delete the archive's
  Postgres rows": "NOT SPECIFIED IN THIS DOCUMENT. OWED ITS OWN DOCUMENT. … No
  cascade map has been written, and one is not invented here." The step is
  marked blocked.
- `scripts/dissolution-purge.ts` deletes Storage objects only, across five
  buckets (`:21-27`), under the `{archiveId}/` prefix (`:92-94`), and refuses
  unless `archives.termination_requested_at` is set (`:71-80`). Proven August
  12 against a drill archive (runbook `:439-441`).
- `app/api/archive/terminate/route.ts:65-67` is the request side: sets
  `termination_requested_at` and `scheduled_deletion_at` (365 days). It deletes
  nothing.
- No `.from('archives').delete()` exists anywhere in `app`, `lib`, or
  `scripts`. The only `delete().eq('archive_id', …)` calls are scoped probe
  cleanups (`scripts/reply-expiry-probe.ts:70-71`, `scripts/gap-log-probe.ts:62`)
  and two feature resets (`dashboard-mobile/route.ts:127`,
  `scenarios/respond/route.ts:45-46`).

PASTE, tables with an `archive_id` column:

```sql
select table_name, column_name
from information_schema.columns
where table_schema = 'public' and column_name = 'archive_id'
order by table_name;
```

PASTE, declared foreign keys onto `archives`, with their ON DELETE action. This
is what decides whether a single `delete from archives` cascades, is refused,
or leaves orphans with `archive_id` set null:

```sql
select conrelid::regclass as child_table, conname,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where contype = 'f' and confrelid = 'public.archives'::regclass
order by 1;
```

PASTE, second-hop tables: rows keyed to something that is itself keyed to an
archive (contributor questions, spark responses, email reply sessions by
contributor, game rounds by session, coverage probes by run). Without this the
cascade map misses them:

```sql
select c.conrelid::regclass as child_table,
       c.confrelid::regclass as parent_table,
       pg_get_constraintdef(c.oid) as definition
from pg_constraint c
where c.contype = 'f'
  and c.confrelid in (
    select (table_schema || '.' || table_name)::regclass
    from information_schema.columns
    where table_schema = 'public' and column_name = 'archive_id'
  )
  and c.confrelid <> 'public.archives'::regclass
order by 1, 2;
```

Storage buckets an archive writes to, all under the `{archiveId}/` prefix:

| Bucket | Writers | Backed up to B2 |
|---|---|---|
| `photographs` | `app/api/archive/upload/route.ts:69`, `app/api/contribute/upload-url/route.ts:65`, `upload-photo/route.ts:19`, send-photo paths | Yes |
| `voice-recordings` | `app/api/archive/transcribe-voice/route.ts:40-47` (`${archiveId}/${timestamp}.webm`, including `transcript_only` founding turns), voice portraits (`lib/archiveExport.ts:268`) | Yes |
| `archive-videos` | `app/api/archive/process-video/route.ts:52` | Yes |
| `archive-documents` | `app/api/archive/process-document/route.ts:53` | Yes |
| `archive-exports` | `lib/archiveExportStorage.ts:38` | No (`lib/storageBackup.ts:34-41`, 7 day retention) |

`vault-files` is not archive-scoped (`lib/storageBackup.ts:42-51`) and is not
in the purge list.

### E2. How the B2 sync selects objects, and trial media

Selection is bucket-wide, prefix-filtered, then diffed against a manifest:

1. Walk every object in the four `ALLOWLIST` buckets (`lib/storageBackup.ts:20-25`).
2. `applyArchiveScope` (`:483-521`) drops any object whose first path segment
   is a uuid in `terminatedArchiveIds`, and, on a scoped run, anything not
   under `onlyArchiveId`. Objects with no uuid prefix are kept.
3. `terminatedArchiveIds` is read fresh every run from
   `archives where termination_requested_at is not null`
   (`lib/inngest/storageBackupFunctions.ts:370-379`), and a failed read throws.
4. The kept set is diffed against `storage_backup_objects` by size and eTag
   (`:579+`), and new or changed objects are PUT to B2 with a 90 day
   COMPLIANCE lock (`LOCK_RETENTION_DAYS = 90`, `:125`).
5. The per-run snapshot writer takes the same terminated list
   (`buildSnapshotEntries(rows, terminatedArchiveIds)`, `:585`).

The sync is additive. Exclusion stops future copies and touches nothing already
in B2; that comes out only through runbook section 4, by hand, after the lock
expires (`storageBackup.ts:474-477`).

**Whether the sync runs on its own is NOT CONFIRMED and the repo contradicts
CLAUDE.md.** On `main`, `storageBackupSync` has two event triggers and no cron
(`storageBackupFunctions.ts:287-309`; the comment says "EVENT TRIGGERED ONLY,
DELIBERATELY"). The commit that restored `'0 4 * * *'` is `4d1155d` on branch
`ops/storage-backup-sync-daily-cron-2026-08-13`, and
`git merge-base --is-ancestor 4d1155d main` says it is not on main. CLAUDE.md
section 6 says the cron was added August 13 and a landed sync "had to show it".
Every production deploy from main since August 14 (there have been many,
through `ec21b98`) re-synced Inngest with the no-cron version. Either the cron
never reached production, or it did and a later main deploy removed it. The
Inngest app page for `storage-backup-sync` shows its triggers; that is the
read. Until then assume no trial media enters B2 unless someone sends
`storage/backup.sync.requested` by hand, and assume that the moment the cron
is restored, everything under every active archive's prefix is copied and
locked.

**What has to change to exclude trial media until conversion.** The exact
shape already exists for terminated archives; it is a second id list on the
same filter.

1. A trial marker readable from `archives` in one query (whatever G decides;
   `status = 'trial'` or a `trial_expires_at` column). `archive_lifecycle` is
   the wrong place for this read, because the sync must not depend on a table
   that D5 may report as missing.
2. `storageBackupFunctions.ts:370-379`: the `load-terminated-archives` step
   reads the trial ids too, throwing on a failed read the same way.
3. `applyArchiveScope` (`storageBackup.ts:483`): a third field on
   `ArchiveScope`, `excludedArchiveIds`, dropped with the same `continue` as
   terminated. Or simply union the trial ids into `terminatedArchiveIds` at the
   call site (`:382`) and rename nothing. The union is one line; the new field
   is honest about why.
4. `buildSnapshotEntries` (`:585`) gets the same list, so the snapshot never
   lists a trial object either.
5. `lib/storageBackup.test.ts` pins the new drop.

On conversion, the archive leaves the list and the next run copies its objects
as new. Nothing else changes: the diff treats them as never seen. On trial
deletion, `dissolution-purge.ts` handles Supabase Storage (it needs
`termination_requested_at` set, which the delete job can do) and B2 holds
nothing.

**The honest alternative** is to state a 90 day media retention for trial
voice and photos in the trial copy. That is true only if the cron is off, or
if trial media has already been copied. It conflicts with "deleted in 30
days", and it puts a promise on the page that depends on an Inngest trigger
nobody can see from the product. Recommendation: exclude. The one fact it rests
on: `applyArchiveScope` already implements exactly this filter for terminated
ids, keyed on the path prefix every writer uses.

### E3. Scheduled functions that would act on a trial archive

Every Vercel cron in `vercel.json:11-90` selects
`archives … .eq('status', 'active') … .not('owner_email', 'is', null)` or
equivalent (grep over `app/api/cron/*/route.ts`, verified per file). A trial
archive with `status = 'active'` and an `owner_email` gets all of them from
day one. Emails to the owner unless noted.

| Cron | Schedule (UTC) | Gate beyond active | Emails | Wrong for a 30 day trial? |
|---|---|---|---|---|
| `daily-reflection` | daily 08:00 | none. Personal branch runs `selectNextQuestion` and mints an `email_reply_sessions` token (`:99-116`), a bearer credential that never expires (CLAUDE.md section 6) | owner, daily | **Yes.** Competes with call 1 from the first morning, and each mail leaves a live write token into an archive scheduled for deletion. Gate. |
| `weekly-mirror` | Sun 17:00 | needs 2+ deposits in 7 days (`:59`) | owner | Fires the Sunday after call 1. Model call plus email. Gate. |
| `weekly-replay` | Sun 09:00 | skips only if zero activity (`:64`) | owner | Fires after call 1. Gate. |
| `weekly-prompt` | Mon 08:00 | none | owner and contributors | Yes. Gate. |
| `monthly-report` | 1st 09:00 | none | owner | Yes on day 1 to 30 if the 1st falls inside. Gate. |
| `monthly-accuracy` | 1st 09:00 | idempotent per month (`:174-180`) | owner | **Yes, and wrong for everyone.** Emails the dimension percentages CLAUDE.md section 4 says were "deposit-count readings presented as accuracy" and retired from the web. Still emailed monthly. Also `void Promise.all` at `:199` on a Vercel route (serverless rule). Flag, do not fix here. |
| `contributor-mirror` | 1st 10:00 | needs recent contributor answers (`:122`) | owner | Only if contributors answered. Gate. |
| `memory-game-monthly` | 1st 11:00 | needs photos | contributors | Only with photos. Gate with the rest. |
| `gratitude-note` | 2nd 09:00 | none | contributors | Only with contributors. Gate. |
| `entity-letter` | quarterly | needs 50+ pairs (`:141`) | owner | Skipped: call 1 has ~15. Safe by accident. |
| `annual-preview` | daily 09:00 | archive 1+ year old (`:147`) | owner | Skipped. Safe. |
| `anniversary-triggers` | daily 08:00 | needs `significant_dates` rows | owner | Skipped unless the trialist adds dates. |
| `send-photos`, `story-prompt-monday`, `story-prompt-friday`, `memory-game-start`, `memory-game-reminder`, `memory-game-summary` | various | need photos or contributors | contributors | Only if the trial invites people. Gate with the rest. |
| `export-reaper`, `storage-backup-heartbeat` | daily | n/a | admin only | No owner effect. |

Not scheduled (in `app/api/cron` but absent from `vercel.json`):
`cold-storage-ping`, `pause-reminder`, `family-reactions`,
`guide-quality-audit`, `pay-residuals`, `voice-portrait`. They run only if
called.

Inngest:

| Function | Trigger | Selection | Effect on a trial |
|---|---|---|---|
| `coverageMonthlySweep` | cron `0 6 3 * *` (`lib/inngest/coverageFunctions.ts:107`) | `select id from archives`, **no status filter, no tier filter** (`:111-114`) | Sends `coverage.run.requested` for every archive. `runCoverage` skips only when there are zero included pairs (`lib/coverageRun.ts:500`). A trial after call 1 has 10 to 15 included pairs, so it runs: 48 probes x 2 calls, 96 model calls, up to 144 with retrieval (`coverageFunctions.ts:15-17`). No email. **This is the cost item.** One `.eq('status','active')` on the sweep, or a trial exclusion, is the gate. |
| `storageBackupSync` | events only on main (E2) | property-wide | Copies and locks trial media if run. See E2. |
| `storageBackupVerify` | cron `0 5 * * 0` (`storageBackupFunctions.ts:697`) | manifest | No per-archive cost. |
| billing functions | Stripe events | by subscription | Only once the trial pays. |

Also on the write side, not a cron: `/answer` sends `coverage.run.requested`
only when call 3 closes or an area call closes (`answer/route.ts:232`, `:307`),
so call 1 alone triggers no coverage run. The sweep is the only coverage cost
for a trial.

---

## F. The internal notification path

### F1. Where the founding completion emails are sent

Builders: `lib/emails/foundingSequenceComplete.ts:31-80` (owner) and `:82-98`
(internal). Sender: `app/api/archive/b2b-question/answer/route.ts:232-301`,
inside `after(async () => { … })` (`:235`), fired when the incident that just
completed carries `state.founding.call === 3` (`:232`).

Routing as it exists:
- Internal (`:263-271`): `from: 'Basalith <davidha@basalith.xyz>'`,
  `to: Array.from(new Set(['mrdavidha@gmail.com', ADMIN_EMAIL]))`, for BOTH
  scopes. The scope rides in the body (`Scope: personal | business`,
  `foundingSequenceComplete.ts:88`).
- Owner (`:272-281`): `from: ${archiveName} <RESEND_FROM_EMAIL>`, to
  `archives.owner_email`, skipped when null.

The "business to founder plus ADMIN_EMAIL, personal to ADMIN_EMAIL" convention
lives in `app/api/apply/route.ts:92-93`
(`isBusiness ? ['mrdavidha@gmail.com', adminEmail] : [adminEmail]`), not in the
founding path. The founding path sends both scopes to both addresses. Pick one
convention for the watch-mode notifications and say which.

Send helper: `resend.emails.send` from `lib/resend.ts` (lazy client), called
directly. No shared "notify internal" helper exists; the three-line pattern
(subject, html, text from a builder, then `resend.emails.send`) is repeated per
site. A watch-mode notification for `trial created`, `call 1 complete`, `paid`
would be a fourth copy unless the skeleton extracts one. `after()` is the
correct wrapper for the two that fire from a route (`trial created` and
`call 1 complete`); `paid` fires from `provisionOnFoundingFee`, which is an
Inngest step and needs no `after()`.

### F2. Email templates naming the Guide or the 90 minute session

**`lib/emails/foundingWelcome.ts` no longer says "Your Legacy Guide."** Fixed
in `cc4bf7b` (September 14, "Copy: The Founding replaces the founding session;
email fixes"), on main. Line `:27` now reads
`input.guideName ?? 'The founder of Basalith'`. The runbook's known-limits note
(`docs/FOUNDING_SEQUENCE_2026-09-14.md`, "still says Your Legacy Guide") is
stale.

What that template still does:
- Names a Guide when one is attached. `provisionOnFoundingFee` resolves
  `guideName` from `archivists.name` when `meta.guideId` is set
  (`billingFunctions.ts:22-30`, `:216`) and the email renders
  `${guideName} will contact you to begin` (`foundingWelcome.ts:76`, `:111`).
  A checkout built with `guideId` puts a Guide's name in front of the customer.
- Ships a password nothing accepts (A2), in HTML and text (`:53`, `:60`,
  `:97`, `:101`), under the heading "Password Login" (`:50`).
- Says "Your founding is complete" (`:73`, `:109`) on an archive whose
  Founding Sequence has not started.

Every other email or server string naming the Guide or the 90 minute session,
from a grep over `lib/**/*.ts` and `app/api/**/*.ts`:

| File | What | Public? |
|---|---|---|
| `lib/demoPersonas/index.ts:94` `SESSION_CAP_CARD` | "Your Legacy Guide can walk you through what a real archive holds." Rendered at `app/succession/demo/SuccessionDemoClient.tsx:374` | **Yes.** Public demo, contradicts the September 14 Guide cut. Not an email. |
| `app/api/archivist/submit-exam/route.ts:28`, `:67`, `:84` | "90-minute founding sessions", "Certified Legacy Guide" email | Guide portal. Internal. |
| `app/api/archivist/certification/route.ts:35` | exam grader prompt | Internal. |
| `lib/certificationContent.ts:58`, `:313`, `:358`, `:403`, `:495`, `:606`, `:710`, `:714` | Guide curriculum, "90 minutes" throughout | Guide portal. Internal. |
| `app/api/archivist/onboard-client/route.ts:66`, `:99` | welcome copy inside the retired handler's comment block | Dead. |
| `app/api/apply/route.ts:153` | "approve and schedule the Founding Session" in the admin notice | Internal. |
| `lib/pauseEmails.ts` | none | |
| `lib/emails/foundingSequenceComplete.ts`, `lib/emails/replyExpired.ts`, `lib/emails/archiveExport.ts` | none | |

No cron email template names the Guide or the session length.

---

## G. What the skeleton has to decide

Each fork, the recommendation, and the one fact it rests on.

**1. Create the archive before or after first sign-in.**
Recommendation: after. The trial-start route creates the auth user server-side
with `role: 'owner'` (B1), sends nothing itself, and the person requests the
OTP on the existing `/archive-login`. The archive row is created on first
authenticated arrival (the callback, or a "begin" action on a new no-archive
page) using `session.userId`. No archive row ever exists for a mailbox that did
not prove itself, and there is nothing to garbage-collect for typos and bots.
Fact: `getSessionUser` maps by `archives.owner_user_id = auth user id`
(`getSessionUser.ts:91`), and that id is the same before and after sign-in, so
the order is free and can be chosen for hygiene.

**2. Who creates the auth user.**
Recommendation: server-side `getOrCreateAuthUser(email, 'owner')` in a
rate-limited POST, keeping `shouldCreateUser: false` on every sign-in page, and
set `app_metadata.role = 'owner'` unconditionally on that call (B4). Fact:
`auth/callback/route.ts:43-46` routes on `app_metadata.role`, and a user
created by `shouldCreateUser: true` has none, so that path needs a second fix
anyway; and `getOrCreateAuthUser.ts:27-31` leaves an existing `contributor`
role in place, which locks a contributor-turned-owner out of the callback.

**3. The zero-archive state.**
Recommendation: a real page. `app/archive/dashboard/page.tsx:12` and
`founding/page.tsx:12` redirect a signed-in user with no archive back to the
sign-in form, silently (B3). The trial flow lands people there by design.
Fact: nothing on the web renders for `session.userId && !session.archiveId`.

**4. Where the trial marker lives, and what it gates.**
Recommendation: `archives.status = 'trial'` plus a `trial_expires_at`
timestamp on `archives`, if the A4 CHECK on `status` allows it (or has no
CHECK). Every Vercel cron filters `.eq('status','active')` (E3), so a trial
is invisible to all of them with zero cron edits; the one Inngest sweep needs
`.eq('status','active')` added (`coverageFunctions.ts:111-114`). The cost is
three surfaces that refuse a non-active archive:
`app/contribute/[token]/page.tsx:58`, `app/api/mobile/contributor-session/route.ts:51`,
`app/api/archive/upload/route.ts:40`. If the trial should allow contributors
(the prompt says it is a planned sign-up source), those three need
`in ['active','trial']`. Founding, start, answer, proof, dashboard do not read
`status` at all (A3), so call 1 and the proof work unchanged. Alternative: keep
`status = 'active'` and add `.is('trial_expires_at', null)` to seven crons plus
the sweep, which is more edits and more places to forget. Do not put the marker
in `archive_lifecycle`: the B2 filter and the crons must not depend on a table
D5 may report missing. Fact: every scheduled owner email selects on
`archives.status = 'active'`, verified file by file.

**5. Proof timing after call 1.**
Recommendation: relax the route check to `status.completed < 1` and render
the card in the post-call panel (C1); on `no_pairs`, the client retries once
after five seconds (C3). No new route, no status polling, no server wait.
Fact: `buildFoundingProof` needs one included pair and has no call-count
dependency (`foundingProof.ts:153-168`); the SEED pair from turn 1 landed
under `after()` while turn 2 was being answered.

**6. B2 and trial media.**
Recommendation: exclude trial archives from the sync until conversion, by the
same id-list filter that already excludes terminated archives (E2, five
touches, one test). Do not promise a 90 day retention for trials. Before any of
that, read the Inngest app page for `storage-backup-sync`: main carries no cron
and CLAUDE.md says one was added; one of them is wrong about production. Fact:
`applyArchiveScope` (`storageBackup.ts:483-521`) already drops objects by
archive-id prefix from a list read fresh each run; the trial list is a second
list.

**7. Which crons to gate.**
Recommendation: with fork 4 as `status = 'trial'`, every Vercel cron is gated
already; add the status filter to `coverageMonthlySweep`. If fork 4 goes the
other way, gate in this order: `daily-reflection` (daily, mints a permanent
write token per mail), the sweep (96 to 144 model calls), `weekly-mirror`,
`weekly-replay`, `weekly-prompt`, `monthly-report`, `monthly-accuracy`,
`contributor-mirror`, `gratitude-note`. `entity-letter` and `annual-preview`
skip a trial on their own thresholds. Separately, `monthly-accuracy` emails a
retired number to every owner and should be looked at on its own cycle. Fact:
`runCoverage` skips only zero-pair archives (`coverageRun.ts:500`), and a
trial after call 1 has 10 to 15.

**8. Trial to paid must link, not create.**
Recommendation: a second checkout builder (owner-authed, no god key) that puts
`archive_id` in `subscription_data.metadata`, and a branch in
`provisionOnFoundingFee` step 5 that, when `archive_id` is present, sets
`billing.archive_id` and flips the existing archive out of trial instead of
calling `createArchiveWithCredentials`. Neither existing path does this: the
new model always creates (`billingFunctions.ts:139-151`), and the legacy
`archiveId` path activates the archive on `checkout.session.completed` but then
fails `provisionOnFoundingFee` on the same subscription's first invoice
(D2). `success_url` also needs a page; `/welcome` is a 404 (D1). And the paid
path must stop minting and emailing the dead password (A2, F2). Fact:
`provisionOnFoundingFee` reads the owner from `archive_applications` and
creates whenever `billing.archive_id` is null; a trial has no application and
already has an archive.

**9. Deletion.**
Recommendation: the 30 day job cannot be written until the Postgres cascade
map exists (E1). Write that document first, from the A4 and E1 PASTE results,
then the job is: set `termination_requested_at`, run the purge script's logic
for Storage (it is gated on that column), delete rows in the mapped order,
delete the auth user only if it owns no other archive and is not a contributor
or successor anywhere. Fact: `docs/DISSOLUTION_RUNBOOK.md:495-512` marks
Postgres deletion blocked and no code path deletes an archive.

**10. Trial tier value.**
Recommendation: `tier = 'active'`, the vocabulary the May 12 migration moved
every archive to, and let the Stripe slice's `'estate'` default be fixed when
fork 8 is built. Fact: only `tier === 'succession'` is compared anywhere in
live code (A3), so the trial works under any non-succession value; the CHECK,
if any, is what A4 reports.

**11. Internal notification convention.**
Recommendation: reuse the founding-complete shape (both scopes to
`mrdavidha@gmail.com` plus `ADMIN_EMAIL`, `answer/route.ts:264-271`) for
`trial created`, `call 1 complete`, `paid`, and extract the three-line send
into one helper so the fourth copy is the last. Fact: the founding path and
`/api/apply` disagree on routing today (F1); the skeleton has to pick one.
