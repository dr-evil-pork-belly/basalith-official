# Backup cron restore. September 17, 2026.

The daily `storage-backup-sync` cron never reached production. This document
records what was read, proves the restoring branch merges clean and green, and
gives the founder the exact commands. Nothing here was merged, committed, or
deployed by Claude Code. The push in section 6 is a production deploy and is
the founder's to run.

## 1. What is true right now

- `lib/inngest/storageBackupFunctions.ts` on `main` (`ec21b98`) declares
  `storageBackupSync` with two event triggers and no cron (`:287-309`, comment
  "EVENT TRIGGERED ONLY, DELIBERATELY. There is no cron here yet.").
- Commit `4d1155d` (August 13, "ops: restore the daily cron on
  storage-backup-sync after the 9d seed") adds `{ cron: '0 4 * * *' }`. It sits
  on `ops/storage-backup-sync-daily-cron-2026-08-13`, a local branch with no
  `origin/` counterpart, and is not an ancestor of `main`.
- Inngest production, read September 17: `storage-backup-sync` shows the two
  event triggers only.
- `storage_backup_runs`: the last sync-kind run is the August 13 seed. The
  weekly verify has failed four times since August 23 with `A1_MISSING_IN_DEST`.
- `CLAUDE.md` section 6 says the cron was added August 13 and "a landed sync
  had to show it." That sentence describes the branch, not production. Every
  production deploy from `main` since August 14 re-registered the function
  without the cron.

## 2. Branch versus main

`git fetch --all` ran first; `main` equals `origin/main` at `ec21b98`.

```
$ git log --oneline main..ops/storage-backup-sync-daily-cron-2026-08-13
9369d1e runbook: document the expected-red verify window that section 4 causes
4d1155d ops: restore the daily cron on storage-backup-sync after the 9d seed
```

Two commits on the branch that are not on main.

```
$ git log --oneline ops/storage-backup-sync-daily-cron-2026-08-13..main | wc -l
44
$ git log --oneline ops/storage-backup-sync-daily-cron-2026-08-13..main | head -5
ec21b98 Archive dashboard cleanup: remove WeChat, milestone ladder, Wisdom Compass, photo-era stats; trim sidebar; phone line on Voice page
65243e2 Area calls: one interview aimed at one thin area, opened from the coverage map
231bbba Training: incident-interview pairs included on the interview's say-so; test artifacts never train
1c97799 Family entity: grounded pipeline behind a per-archive switch; contributor turns no longer become owner deposits
2f48f57 Personal coverage map: eight kinds of judgment, p1 probes; accuracy score retired
...
3df5488 Merge fix/verify-continuation-containment-2026-08-14: verify no longer emits its own continuation
1f16690 fix: stop storageBackupVerify emitting an unbounded continuation chain
8cf04ce docs: Inngest was registered against the old .xyz domain
```

Main has moved 44 commits past the branch point. The merge base is `143fc1d`
(August 13, "db: record the vaults RLS policy fixes applied by hand
2026-08-12"). The first commit on main after the branch point is `8cf04ce`,
the same evening; the branch was never merged and every later deploy carried
main's no-cron file.

## 3. What the branch changes

```
$ git diff main...ops/storage-backup-sync-daily-cron-2026-08-13 --stat
 docs/DISSOLUTION_RUNBOOK.md                   | 169 +++++++++++++++++++++++++-
 docs/STORAGE_BACKUP_SKELETON_2026-08.md       |  64 ++++++----
 lib/inngest/storageBackupFailureAlert.test.ts |   4 +-
 lib/inngest/storageBackupFunctions.ts         |  53 +++++---
 lib/storageBackup.test.ts                     |  32 +++--
 5 files changed, 266 insertions(+), 56 deletions(-)
```

The diff does NOT touch only the trigger definition and CLAUDE.md. It touches
five files and CLAUDE.md is not one of them. File by file:

| File | Executable change | Everything else |
|---|---|---|
| `lib/inngest/storageBackupFunctions.ts` | One line: `{ cron: '0 4 * * *' },` added at the top of `storageBackupSync.triggers`. | The 30-line comment above it rewritten to record that the 9d seed ran (376 objects, 1,125,215,480 bytes, two runs) and why the cron is safe now; one sentence in the `alertOnCrash` doc comment. `storageBackupVerify` untouched. |
| `lib/storageBackup.test.ts` | The guard `'storage-backup-sync declares no cron trigger'` (which fails the suite if a cron appears) is replaced by its inverse, `'storage-backup-sync declares the daily cron'`, asserting `cron:\s*'0 4 \* \* \*'` on the source. The verify test gains `not.toMatch(/cron:\s*'0 4 \* \* \*'/)`. Block renamed `both jobs keep their schedules`. | Comment rewritten. |
| `lib/inngest/storageBackupFailureAlert.test.ts` | None. | Three lines of header comment ("now that the daily cron is on"). |
| `docs/DISSOLUTION_RUNBOOK.md` | None (docs). | New section 1.6, 124 lines: the `A10_MANIFEST_MISSING_IN_DEST` window that section 4 itself opens between step 4.5 and 4.8, how to tell it from real loss, and the note that alert mail was landing in spam as of August 13. Step 2.2 rewritten from "waiting for a nightly run would wait forever" to "the daily cron went on August 13." A pointer to 1.6 at the top of section 4. |
| `docs/STORAGE_BACKUP_SKELETON_2026-08.md` | None (docs). | Schedule table row for the sync flips to `daily 0 4 * * * UTC, on since August 13, 2026`; the "GATE PASSED" record for 9b through 9d; the 9d step marked DONE with the seed numbers. |

The full diff was printed in the terminal on September 17 and is reproducible
with `git diff main...ops/storage-backup-sync-daily-cron-2026-08-13`. Nothing
in it touches the verify function, the heartbeat, B2 credentials, or any
customer-facing route.

Two of the docs sentences are dated August 13 and will read as if the cron has
been on for five weeks. They will be true from the moment the push lands. No
edit is needed before merging.

## 4. Merge test

```
$ git merge-tree --write-tree --name-only main ops/storage-backup-sync-daily-cron-2026-08-13
55e5745c3b1c0b471537e2d3d375ae8669f8769d
exit=0
```

Exit 0 and a tree id with no conflicted-file list: the branch merges into
current `main` without conflict. Checks on that tree:

- `git diff --stat main 55e5745` lists exactly the five files above, 266/56.
  Nothing else changes.
- Main's own edits since the branch point in the same two code files
  (`storageBackupFunctions.ts` +103, `storageBackup.test.ts` +83, both from the
  August 14 verify-continuation fix) sit in other regions and survive intact.
- In the merged file, `storageBackupSync.triggers` is `'0 4 * * *'` plus the
  two events (`:325-327`), and `storageBackupVerify` keeps `'0 5 * * 0'` plus
  its two events (`:716-718`).

The merged tree was then checked out into a detached scratch worktree in the
session scratchpad (not the repo working tree), `node_modules` junctioned in,
and the full suite run:

```
 Test Files  30 passed (30)
      Tests  606 passed (606)
```

The three storage backup files alone: 3 files, 135 tests, green. The scratch
worktree and its junction were removed afterward; `git worktree list` shows
only the main checkout, on `main`, clean apart from untracked docs.

## 5. The heartbeat, and why four failed verifies did not mean four emails

`app/api/cron/storage-backup-heartbeat/route.ts`, Vercel cron `0 6 * * *`
(`vercel.json`), authenticated by `CRON_SECRET` as a Bearer header or `?secret=`
(`:46-54`). It reads and never writes, repairs, or triggers (`:14-15`).

What it does (`:59-84`): reads the newest `ok = true` row of kind `sync`, of
kind `seed`, and of kind `verify` from `storage_backup_runs`; takes the newer of
sync and seed as "last successful sync"; runs `checkSilence`
(`lib/storageBackup.ts:688-716`), which raises `A5_SILENCE` when the last
successful sync is older than `SILENCE_SYNC_DAYS = 8` (or never) and,
separately, when the last successful verify is older than
`SILENCE_VERIFY_DAYS = 10` (or never).

What it emails (`:86-104`): if either line fires, **one** email per run, from
`RESEND_FROM_EMAIL` to `ADMIN_EMAIL`, subject `[basalith] storage backup is
silent`, body a `<pre>` of `A5_SILENCE: <detail>` lines plus "last successful
sync" and "last successful verify" timestamps. It answers 200 either way so
Vercel does not retry and resend (`:117-120`).

**Four consecutive verify failures: neither four emails nor one.** The heartbeat
never counts failures; it measures the age of the last success. Two lines have
been firing on their own clocks:

- Sync line: the last successful sync-kind run is the August 13 seed. Eight days
  later, August 21, the sync line started firing and has fired every morning
  since. About 27 emails by today.
- Verify line: the four failures since August 23 imply the August 16 verify was
  green (NOT CONFIRMED, the query in section 8 shows it). Ten days after that,
  August 26, the verify line joined the same daily email.

So: one email per day since about August 21, both alarm lines in each from
about August 26. If none of those reached the inbox, the cause is upstream of
this route: the branch's runbook 1.6 records that mail from the alert sender
was landing in spam at the admin address as of August 13, and an unset or
mismatched `CRON_SECRET` would make every heartbeat call a 401 visible in the
Vercel cron log. Either is readable there; neither is a reason to change the
route.

Separately from the heartbeat, `storageBackupVerify` emails on its own failure:
`alertAdmin('storage backup verify FAILED', …)` when a hard alarm closes the run
(`storageBackupFunctions.ts`, the verify `closeRun` block), subject
`[basalith] storage backup verify FAILED`. The function has `retries: 2`, each
attempt is a fresh invocation with its own `alertState`, so one red Sunday can
send up to three of those. Four Sundays, up to twelve. Same sender, same
address, same spam question.

## 6. What A1_MISSING_IN_DEST means, and the remediation

Vocabulary: `ALARM.A1_MISSING_IN_DEST` (`lib/storageBackup.ts:149`), skeleton
section 7 table: "Object in source, absent from B2 after a completed sync",
hard, red. Raised by `storageBackupVerify` when `threeWayDiff(...).inSourceNotDest`
is non-empty (`storageBackupFunctions.ts`, the block after `scoped-seed-window`):
every key in the Supabase source walk of the four allowlist buckets, with
terminated archives removed by `applyArchiveScope`, that does not appear in the
current-version listing of the B2 bucket. Detail line from `a1MissingDetail`
(`storageBackup.ts:195-203`): `N object(s) in source, absent from B2: <up to 20
keys>`. The seed-window sentence is not appended, because a successful seed
exists.

It is hard because it is not in `SOFT_ALARMS = [A4_UNKNOWN_BUCKET, A8_CAPPED]`
(`:58-62`), so the run closes `ok = false` and the function throws.

What it means this time: every object written to `photographs`,
`voice-recordings`, `archive-videos`, or `archive-documents` since the August
13 seed (founding-call voice turns, uploaded photographs, contributor uploads)
is in Supabase and has never been copied, because no sync has run since the
seed. The alarm is correct. The backup has been stale for five weeks and the
verify said so four times.

Remediation: **a sync run.** Not a verify change, not a B2 change, not a
manifest change. Two ways to get one:

1. The cron. Merge and push (section 7). The first run is at 04:00 UTC the next
   morning.
2. By hand, if it should not wait for 04:00: on the Inngest dashboard, send
   `storage/backup.sync.requested` with data `{}`. Only after the production
   deploy has landed and the Inngest app page reads
   `https://basalith.ai/api/inngest` again (CLAUDE.md section 6, the preview
   repoint trap). Do not send it from a preview window.

Either way the sync copies what `diffSourceAgainstManifest` reports as new. If
more than `MAX_COPIES_PER_RUN = 300` objects accumulated, the first run copies
300, closes `ok = true` with the soft `A8_CAPPED`, and emits
`storage/backup.sync.continue` for the rest; the Sunday verify is green only once
the continuation has finished. The next verify then finds `inSourceNotDest`
empty and closes green, which clears the heartbeat's verify line ten days
later at the latest and its sync line the following morning.

## 7. Commands for the founder

The push is a production deploy. It ships exactly the five files in section 3
and nothing else, because `main` equals `origin/main` and the merged tree was
checked file by file.

```
git branch --show-current            # expect: main
git status --short                   # expect: only untracked docs/*.md, nothing modified
git fetch --all
git checkout main
git pull --ff-only origin main       # expect: Already up to date.
git merge --no-ff ops/storage-backup-sync-daily-cron-2026-08-13 -m "Merge ops/storage-backup-sync-daily-cron-2026-08-13: restore the daily 0 4 * * * cron on storage-backup-sync (never reached production)"
npm test                             # expect: 30 files, 606 tests, green
git push origin main                 # PRODUCTION DEPLOY. Takes basalith.ai.
```

Do not run `vercel` (preview) between the push and the production deploy
landing; a preview sync repoints the production Inngest app to the preview URL
until the next production deploy puts it back.

After the cron is confirmed on the Inngest page (section 8), one follow-up
commit corrects `CLAUDE.md` section 6. The sentence

> A signature change is what makes a real change visible: adding the daily cron
> to `storage-backup-sync` on August 13, 2026 altered its trigger list, so a
> landed sync had to show it.

should become

> A signature change is what makes a real change visible: the daily cron on
> `storage-backup-sync` was written August 13, 2026 on a branch that was never
> merged, and reached production on September 17, 2026 (`docs/BACKUP_CRON_RESTORE_2026-09-17.md`).
> Its trigger list changed on that deploy, so a landed sync had to show it.

That is a second push to main and therefore a second production deploy of a
docs-only change; it is safe because main will resolve to the merge commit plus
one file.

## 8. What to read afterward

**Vercel.** The deployment for the merge commit carries
`basalith-official-git-main-…vercel.app`, `basalith.ai`, and `www.basalith.ai`,
status Ready.

**Inngest, the app page.** The commit shown must be the merge commit. If it
still shows `ec21b98` the deploy sync did not land (the standing check in
CLAUDE.md section 6); resync from the Inngest dashboard before anything else.

**Inngest, the function page.** `Storage backup sync` (`storage-backup-sync`)
lists three triggers: `0 4 * * *`, `storage/backup.sync.requested`,
`storage/backup.sync.continue`. `Storage backup verify` still lists
`0 5 * * 0` and its two events. If the cron is absent, the merged file did not
deploy; read the Vercel build for the commit.

**First fire.** 04:00 UTC the next morning: September 18 at 04:00 UTC is
September 17 at 21:00 PDT. If the push lands after 04:00 UTC on the 18th, the
first fire is the 19th.

**The morning after, paste in the Supabase editor:**

```sql
select kind, started_at, ok, objects_source, objects_copied, error
from storage_backup_runs order by started_at desc limit 3;
```

Expected: the top row is `kind = 'sync'`, `started_at` at 04:00 UTC that
morning, `ok = true`, `objects_copied` at least 1, `error` null. A second
`sync` row a few minutes later with `continued_from` set is fine and expected if
more than 300 objects were waiting. `objects_copied = 0` with `ok = true` means
nothing new was in source, which contradicts four A1 alarms; stop and read the
run's `alarms` and the Inngest run log before trusting it.

Then Sunday September 20 at 05:00 UTC the verify runs. The same query, or:

```sql
select kind, started_at, ok, alarms, error
from storage_backup_runs
where kind = 'verify'
order by started_at desc limit 5;
```

Expected: the newest verify row `ok = true`, `alarms` null, and the four red
rows from August 23 through September 13 below it, each with
`A1_MISSING_IN_DEST` in `alarms` (or, if the rehash loop threw first, a null
`alarms` and the thrown message in `error`; runbook 1.6 explains that shape).
The heartbeat's `[basalith] storage backup is silent` email stops the morning
of September 18 for the sync line and September 21 for the verify line.

## 9. Not done here, on purpose

- The merge, the push, the Inngest read, and the query. Founder's.
- `CLAUDE.md` section 6. Corrected only after the cron is confirmed live, as
  its own commit (section 7).
- The heartbeat's inbox problem. Whether alert mail reaches anyone is a
  Resend and mailbox question, readable from the Vercel cron log and the
  Resend dashboard, and outside this change.
- Any further edit to the branch. It merges clean and green as it stands.
