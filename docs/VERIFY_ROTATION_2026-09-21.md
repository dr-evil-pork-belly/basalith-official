# Verification rotation, and the security page told the truth about its auth

September 21, 2026. Three code files plus one migration. Two commits, and the
**migration must be applied before the code deploys** or the weekly verify
throws on an unknown column.

## Part 1: the security page named an authentication mechanism that did not exist

`app/security/page.tsx` said, under Access Control:

    'Owners: Authenticated via bcrypt-hashed passwords with 12 salt rounds.'

`bcrypt` appeared **exactly once in the repository**: in that string. Not a
dependency, never imported, never called. Owner sign-in is Supabase Auth with
an emailed one-time link (`signInWithOtp`, `shouldCreateUser: false`), and the
password path was retired in the Phase 4a migration. A named hashing algorithm
and a specific cost factor, for a credential the product does not have, on the
page a security-conscious buyer reads first. Dated "Last updated: September
2026."

The same section then advised:

    'Use a unique, strong password for your Basalith.'
    'Do not share your password with anyone except designated Legacy Guide contacts.'

No password exists. The Legacy Guide role was retired September 20. And it told
owners to share a credential with a third party, which is advice no security
page should carry even when the credential is real. That was also the last
Legacy Guide reference in reachable public copy.

### What it says now

Access Control describes the four mechanisms that exist: passwordless sign-in
for owners and successors, the 64-character contributor token, the iOS bearer
token verified server-side on every request, RLS at the database level, and the
edge session check that runs before a page resolves.

The contributor line no longer credits `crypto.getRandomValues`. The code uses
Node's `randomBytes(32).toString('hex')`. Same security property, different API,
and naming the wrong one is the same class of error as the bcrypt line at a
hundredth of the stakes.

Section 4 was "Multi-Factor Authentication: Not yet available," which answers
the wrong question for a product with no passwords. It now says Basalith has no
passwords, explains that sign-in rests on control of the email inbox, and gives
the advice that actually protects the account: two-factor at the email provider,
a password used nowhere else, tell us if that inbox is compromised. It ends by
saying a second factor is intended and that doing it without locking out a
family entitled to reach an archive is the part that takes care.

That last sentence is the one claim on the page I wrote rather than verified.
Confirm it matches your intent or cut it.

`privacy@basalith.xyz` on that page became `privacy@basalith.ai`. The other 24
`.xyz` addresses in public copy are a separate pass.

### Also delete this

`lib/successorAuth.ts` resolves a successor session like this:

    const raw = request.cookies.get('successor_session')?.value
    const parsed = JSON.parse(raw)
    if (!parsed.successorId || !parsed.archiveId) return null
    return parsed as SuccessorSession

No signature, no database check. A successor session is whatever JSON the
browser sends, including any archive id. **Nothing calls it**: the only
references in the repository are its own definition, and real successor auth
goes through Supabase like everyone else, with the password route at 410. So it
is not a live vulnerability. It is a loaded gun in `lib/`, with an authoritative
name, waiting for someone to import it in good faith.

    git rm lib/successorAuth.ts

## Part 2: weekly verification covered 300 of 383 objects, and never the same 300

`A8_CAPPED` has fired every Sunday since the manifest passed 300 rows. The
detail text was accurate and damning: 83 rows "were NOT re-hashed this run, and
NOTHING WILL PICK THEM UP," from an unordered read, so which 83 was undefined.

The reporting was the worse half. A8 sits in `SOFT_ALARMS`, so a run whose only
alarm was A8 closed `ok: true`, and the heartbeat reads `.eq('ok', true)`. A
permanent 22% blind spot rendered as a healthy backup, weekly, from August 14 to
today. Same shape as the month of silence: a signal technically firing and
practically invisible.

### The migration, first

    alter table storage_backup_objects
      add column if not exists last_verified_at timestamptz;

    create index if not exists storage_backup_objects_verify_order
      on storage_backup_objects (last_verified_at nulls first, b2_key);

Apply this before deploying. `load-manifest` selects the new column, so code
that ships ahead of the migration turns Sunday's verify into a thrown error.
The index is not needed by the sort, which happens in code, but it keeps any
future SQL-side ordering cheap.

### The code

`lib/inngest/storageBackupFunctions.ts`

The selection is now a total order over `(last_verified_at, b2_key)`, least
recently verified first, nulls first so a freshly seeded manifest drains its
oldest debt without a special case. `b2_key` breaks ties, so two runs over
identical state pick identically.

The sort is in code rather than in the query deliberately. The full manifest is
still needed below for `manifestKeys` and the three way diff, so ordering in SQL
would mean either a second query or an `ORDER BY` a later edit could silently
drop. In code it sits next to the slice it feeds, where it cannot be separated
from its reason.

A new `record-verification` step stamps what was re-hashed. Without it the sort
reads identical state every week and the rotation does not rotate, which would
be the old bug wearing an `ORDER BY`. A mismatch still stamps: the object was
verified, the answer was bad, and A3 is what says so. Leaving it unstamped would
make the worst object in the manifest the one the rotation keeps re-reading and
never moves past. One chunked step after the loop, not 300 writes inside it,
because those would be 300 more Inngest steps against the same 1000-step limit
the cap exists to respect. If the run dies before the stamp, the work is redone
next week, which is the cheap direction to fail.

### The alarms now mean different things

`A8_CAPPED` stays soft and becomes what its name says: this run hit its cap.
With rotation that is normal and permanent, so it carries a forecast instead of
a warning, including how many runs full coverage takes and how many rows have
never been re-hashed.

`A11_VERIFY_STALE` is new and hard, and must stay out of `SOFT_ALARMS`. It
fires on the rows this run is not covering, when either the oldest deferred
object is past the window, meaning runs have been failing, or full coverage now
needs more runs than the window allows, meaning the corpus outgrew a single
weekly pass.

    export const VERIFY_STALE_DAYS = 28

That number encodes capacity rather than comfort. At `MAX_COPIES_PER_RUN` of
300, a 28 day window covers 1,200 objects. Under that the rotation holds the
invariant alone. Over it, no ordering helps, and the honest fix is a second
weekly run or a larger cap, which is what A11's detail says. The cap itself is
protecting the Inngest 1000-step-per-run limit, which is why raising it is a
decision and not a default.

The August 14 comment block that read "WHAT THIS DOES NOT FIX" now reads "WHAT
THIS DID NOT FIX, AND WHAT DID," and the original diagnosis is kept underneath
it, because it is still the best description of the defect's shape.

## Run it

Migration into the Supabase SQL editor first. Confirm the column:

    select column_name, data_type from information_schema.columns
    where table_name = 'storage_backup_objects' and column_name = 'last_verified_at';

Then:

    npx tsc --noEmit
    npx vitest run lib/storageBackup.test.ts
    git checkout -b verify-rotation
    git rm lib/successorAuth.ts
    git add app/security/page.tsx lib/storageBackup.ts lib/inngest/storageBackupFunctions.ts
    git add docs/VERIFY_ROTATION_2026-09-21.md docs/COPY_INTEGRITY_AUDIT_2026-09-21.md
    git commit -m "Verification rotation: last_verified_at, deterministic order, A11 staleness alarm; security page describes the auth that exists"
    git checkout main
    git merge verify-rotation
    git push origin main

## Verified here

Both changed library files compile with no new diagnostics: the five that remain
under `--noResolve` are missing Inngest types and appear identically in the
unedited file. Braces and parens balanced. No live `manifest.slice(0, MAX)`
remains; the two textual hits are both inside comments. A11 is absent from
`SOFT_ALARMS`. The security page carries no `bcrypt`, no `salt rounds`, no
`getRandomValues`, no `Legacy Guide`, no `basalith.xyz`, and no em dash in
emitted copy. CRLF on all three files.

## Not verified here

The first rotated run, Sunday September 27 at 05:00 UTC. Read it with:

    select kind, started_at, ok, alarms from storage_backup_runs
    where kind = 'verify' order by started_at desc limit 2;

Expect `ok = true` with A8 only, its detail reporting 83 deferred and a two run
forecast. Then confirm the rotation actually moved:

    select count(*) filter (where last_verified_at is null)      as never_verified,
           count(*) filter (where last_verified_at is not null)  as verified,
           min(last_verified_at) as oldest, max(last_verified_at) as newest
    from storage_backup_objects;

After the first run expect 300 verified and 83 never. After the second, 383
verified, 0 never, and two distinct stamps a week apart. If `never_verified`
stays at 83 across two Sundays, the write-back is not landing and the rotation
is not rotating.
