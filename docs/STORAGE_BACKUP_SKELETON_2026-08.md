# STORAGE BACKUP, BUILD SKELETON

**Date:** August 8, 2026
**Status:** Skeleton for approval. No code written. No branch. No deploy.
**Predecessor:** `docs/STORAGE_BACKUP_RECON_2026-08.md` (August 2, 2026)
**Provenance:** VERIFIED means live query output or a file read today. Everything in
section 0 is a live read taken August 8, 2026 against `zmoauexzjfjloqxrkuma` through the
sanctioned read-only `scripts/load-env.ts` path. The recon script was a throwaway and was
deleted after the run, per the recon doc's own instruction.

**Revision, August 8, later the same day.** Four corrections, from a second read-only pass
against the same project and the same path. `vault-files` moved from the allowlist to
EXCLUDED, so the allowlist is four buckets and in-scope volume is 377 objects and
1076.17 MB (sections 0.5 and 2), restated August 9 to 376 objects and 1073.09 MB.
`archives.termination_requested_at` confirmed live, which
section 2.1 and the section 9 copy work both depend on and section 0 had not covered
(section 0.4). The open month-to-date egress figure is in and all thresholds hold unchanged
(sections 1.1 and 6.3). And the tenet 04 draft replacement is withdrawn, because it made two
false claims, with the manual dissolution runbook specified in its place as the precondition
for any redraft (sections 9.1 and 9.4). The second probe script was also a throwaway and was
deleted after the run.

**Second revision, August 8.** The runbook from 9.4 is written, as
`docs/DISSOLUTION_RUNBOOK.md`. That is the operator document. Section 9.4 stays as the
specification it was built from. Four of the five 9.4.6 prerequisites are now settled: the
runbook exists, the dissolution log is a hand-filled table inside it, the reminder owner is
David Ha by default, and `source_row` is excluded from the B2 manifest snapshot, which
changes section 4.3. Writing the runbook found two holes in the specification and both are
fixed here. The `_manifest/` snapshots are not under an archive prefix, so 9.4.3 needed a
rule for which ones to delete, and it now has one. And the dry walk cannot be a
before-first-sync gate, because it needs a backup to exist, so **the seed is split in four,
agreed by David, at build order 9a through 9d.** The only prerequisite still open is the dry
walk itself, now correctly placed at 9b.

**Third revision, August 9.** The export reaper is committed and this branch is rebased onto
it, which closes section 0.3. The two 196.33 MB export objects are deleted. **In-scope volume
is restated to 376 objects and 1073.09 MB**, superseding the 377 and 1076.17 MB above and
everywhere else in this document. Two separate corrections produced that: the export objects
leaving, and an orphan photograph David deleted on August 8 whose now-empty prefix holds a
zero byte `.emptyFolderPlaceholder`. Sections 0.2, 2, 3.3, 6.1, and build order 9d are
updated. No threshold moves. Sections 7 and 5 are corrected for alarms A7, A9, and A10.

Two code changes came out of this revision and both are built. **The placeholder filter,
section 2.2**, because without it the first sync copies a zero byte non-file into a 90 day
lock keyed to an archive id that does not exist. And **the cron on `storage-backup-sync` is
removed**, section 3 and build order 9d, because leaving it there meant the first production
deploy seeded the entire property overnight, ahead of the dissolution dry walk, ahead of
`dissolution-purge.ts` existing, and ahead of the tenet 04 redraft. The seed is now sent by
hand at 9d. Verify and the heartbeat keep their crons. Both changes carry tests that fail if
they regress.

---

## 0. LIVE RECON, AUGUST 8. WHAT CHANGED SINCE AUGUST 2

Three deltas. Two of them move the design. Plus two live confirmations in 0.4 and 0.5 that
the design leans on and section 0 did not previously cover.

### 0.1 There are six buckets now, not five

```
=== LIVE BUCKET ROSTER (August 8, 2026) ===
vault-files          public=false  sizeLimit=52428800    created=2026-03-19T19:28:03.414Z
voice-recordings     public=false  sizeLimit=52428800    created=2026-04-13T16:21:25.920Z
photographs          public=false  sizeLimit=52428800    created=2026-03-25T17:51:48.133Z
archive-videos       public=false  sizeLimit=52428800    created=2026-04-17T21:15:30.920Z
archive-documents    public=false  sizeLimit=52428800    created=2026-04-17T21:22:01.499Z
archive-exports      public=false  sizeLimit=5368709120  created=2026-08-03T22:07:28.453Z
```

`archive-exports` was created five days ago. It is the bucket the allowlist exists to keep
out. The recon doc predates it and describes five buckets. This is the exact scenario
constraint 1 names, and it happened inside a week.

Two other changes visible here. Every content bucket now carries an explicit 50 MB
`file_size_limit`, where the recon recorded `null` on `photographs`, `archive-videos`, and
`archive-documents`. That is `20260803_storage_size_limits.sql` applied. And
`archive-exports` reads 5368709120, not the `null` its own creating migration inserts, so
the size-limits migration ran after it. Both migrations are applied live and the roster
above is the truth, not either file.

### 0.2 Object counts and bytes

```
=== OBJECT COUNTS AND BYTES PER BUCKET ===
vault-files             1 objs       4.06 MB
voice-recordings       36 objs      22.37 MB
photographs           337 objs    1009.95 MB
archive-videos          4 objs      43.85 MB
archive-documents       0 objs       0.00 MB
archive-exports         2 objs     392.67 MB
GRAND TOTAL           380 objs    1472.90 MB  (1544444282 bytes)
multipart eTags (suffix -N, so eTag is NOT content MD5): 32
objects over 50 MB: 2
  archive-exports/a38e4503-.../probe-20260804175819.zip 196.33 MB
  archive-exports/a38e4503-.../probe-20260804180747.zip 196.33 MB

=== 5 LARGEST OBJECTS ===
    196.33 MB  archive-exports/a38e4503-.../probe-20260804180747.zip
    196.33 MB  archive-exports/a38e4503-.../probe-20260804175819.zip
     12.05 MB  photographs/1783f9cf-.../1776459942752-contrib-pd4q5eb.jpeg
     11.60 MB  photographs/5040ffac-.../1779671654125-contrib-0sf9uwh.jpeg
     10.96 MB  archive-videos/1783f9cf-.../1776462511468-contrib-4e858t0.mp4
```

**In scope for the sync: 377 objects, 1076.17 MB.** That is the grand total minus
`archive-exports` and minus `vault-files`. Both are excluded, for different reasons, in
section 2. The recon's comparable figure was 376 objects and 1079.06 MB, but that basis
still counted `vault-files` and predates its exclusion. Restated on today's basis the recon
number is 375 objects and 1075.00 MB, so the delta is 2 objects and 1.17 MB, both in
`voice-recordings`. The curve is still flat.

> **SUPERSEDED, August 9.** The reading above is left as taken. Two things moved under it:
> the two `archive-exports` objects were deleted, and one orphan photograph was deleted on
> August 8 leaving a zero byte `.emptyFolderPlaceholder` that this walk counted as an object.
> **In scope is now 376 real objects and 1073.09 MB.** Full reconciliation in section 0.3.

Two numbers that bind the build:

- **The largest in-scope object is 12.05 MB.** No object needs streaming or multipart
  handling on our side. A per-object step can hold the whole thing in memory, hash it, and
  push it, with room to spare inside the 3009 MB configured for the Inngest route. The
  50 MB bucket cap keeps that true going forward.
- **32 of 380 objects carry a multipart eTag.** The recon found this on a sample. It holds
  at 8.4% of the property. eTag is change detection on the source side and nothing more.
  Re-measured August 9: **30 of 377 real objects, 8.0%,** and 30 of the 376 in scope. The
  two that left were the deleted export zips, both large enough to have been uploaded
  multipart. The deleted 3.2 MB photograph was under the threshold and carried a plain
  eTag, so it did not move this count. The argument is unchanged.

### 0.3 The export reaper is not deployed, and there are two full archive copies sitting in Storage

`git show HEAD:vercel.json` contains zero occurrences of `export-reaper`. The cron entry,
the route, and `lib/archiveExportReaper.ts` are all uncommitted working-tree changes.
Nothing on production reaps that bucket.

The two objects in `archive-exports` are 196.33 MB each, both complete unencrypted copies
of the Dr Ha archive, written August 4 by `scripts/export-probe.ts`. They are four days
old against a 7 day retention, so they are not yet overdue. They become overdue on August
11 and nothing scheduled will remove them.

This is not a backup problem and it does not block this build. It is named here because it
is live now, it is the most concentrated sensitive data on the property, and the branch
that fixes it is sitting uncommitted in the same working tree this build will branch from.

**CLOSED, August 9, 2026.** Both objects were deleted before their August 11 deadline, as an
explicit one-off rather than by the reaper, and `archive-exports` is now empty. Neither was a
family-requested export. Both were probe artifacts, which is what made deleting them
directly safe and what decoupled the deadline from the deploy schedule.

```
=== BEFORE ===
  a38e4503-.../probe-20260804175819.zip   196.33 MB  created=2026-08-04T17:59:48.881Z
  a38e4503-.../probe-20260804180747.zip   196.33 MB  created=2026-08-04T18:09:08.918Z
  total objects: 2
=== AFTER ===
  (no objects)
  total objects: 0
```

The reaper itself is committed as of the same day, ahead of this branch, and this branch is
rebased onto it. It carries a dry-run mode and 19 test cases that did not exist when the
paragraph above was written.

Section 0.2 is restated from a live read taken August 9 after the deletion:

```
=== RECONCILED PER BUCKET, placeholders excluded (August 9, 2026) ===
vault-files             1 objs       4.06 MB
voice-recordings       36 objs      22.37 MB
photographs           336 objs    1006.87 MB  (+1 placeholder)
archive-videos          4 objs      43.85 MB
archive-documents       0 objs       0.00 MB
archive-exports         0 objs       0.00 MB
GRAND TOTAL           377 objs    1077.15 MB  (1129471244 bytes)
```

**In scope for the sync: 376 objects, 1073.09 MB** (1125215480 bytes), the four allowlist
buckets. Every figure in this document that read 377 objects and 1076.17 MB is superseded by
this pair.

#### The photographs count, reconciled

The first Aug 9 read of this bucket said 337 objects and 1006.87 MB, against 337 objects and
1009.95 MB on Aug 8. The bytes moved and the count did not, which is not a shape a single
deletion can produce. Both numbers were right and they were counting different things.

David deleted one orphan photograph in prefix `f44f1818-8f17-499d-8f27-23e286e923f7` on
August 8, 3,231,579 bytes, before the manifest migration. It was not an in-place overwrite.
The arithmetic closes exactly:

```
1055781697 bytes (Aug 9 photographs) + 3231579 (the deleted object) = 1059013276
1059013276 / 1024 / 1024 = 1009.95 MB   <- the Aug 8 figure, to the cent
```

That deletion emptied the prefix, and Supabase wrote a zero byte marker into it:

```
photographs/f44f1818-8f17-499d-8f27-23e286e923f7/.emptyFolderPlaceholder
  size=0  mimetype=application/octet-stream  created=2026-08-08T21:26:23.193Z
```

So photographs is **336 real objects plus 1 placeholder**. A walk that does not filter the
marker returns 337 and always will, which is why the count looked frozen. `f44f1818` is not
an archive. There are 9 rows in `archives` and it is not one of them, so this is an orphan
prefix that now contains nothing but its own marker.

#### This changes the sync, and section 2 has a new filter because of it

`walkBucket` in `lib/inngest/storageBackupFunctions.ts` keys on `id === null` to tell a
folder from an object. A `.emptyFolderPlaceholder` has a real id, so it is currently
returned as a real object and **would be copied to B2 on the first sync, under the 90 day
COMPLIANCE lock, with a manifest row, keyed to an archive id that does not exist.** It is
zero bytes and holds no family content, so this is not an exposure. It is a permanent
undeletable non-file in the copy of last resort, and a row that V6 pointer reconciliation
would report as an orphan on every run forever.

Nothing filters it today. A repo-wide search for `emptyFolderPlaceholder` returns no
matches outside this document. **This is open and is the one thing found here that changes
code rather than figures.** See section 2.1, which gains a second filter.

### 0.4 `archives.termination_requested_at` exists live. VERIFIED August 8

Section 2.1's dissolution filter and the section 9 copy work both rest on this column. It
was asserted from the route source, never read. Read today:

```
=== 1. archives.termination_requested_at ===
column resolves. sample row: [{"id":"1783f9cf-19b5-486e-8c84-800f85f665c0","termination_requested_at":null}]
archives with termination_requested_at NOT NULL: 0
archives total rows: 9
```

The column resolves through PostgREST, so it is live and not migration-file-only. Nine
archives, none currently under dissolution, so the filter excludes nothing today and its
first real exercise will be the first real request.

`scheduled_deletion_at` resolves live in the same read and carries the X+365 date:

```
[
  { "id": "1783f9cf-...", "termination_requested_at": null, "scheduled_deletion_at": null, "status": "active" },
  { "id": "6c0722d3-...", "termination_requested_at": null, "scheduled_deletion_at": null, "status": "active" },
  { "id": "0d405a1d-...", "termination_requested_at": null, "scheduled_deletion_at": null, "status": "active" }
]
```

Both columns come from `20260511_archive_pause_system.sql`. Both are written by
`app/api/archive/terminate/route.ts` and read by `app/api/god/data/route.ts`. Nothing
anywhere acts on either one. That is section 9.4's subject.

### 0.5 `vault-files` is not archive-scoped. VERIFIED August 8

The bucket holds exactly one object, and its path is keyed on a vault, not an archive:

```
=== 3. vault-files objects ===
  vaults/09c927a2-7b26-4851-b573-19a7d14fd780/3b7e877f-738a-40ea-a740-c869422be93e/IMG_3640.jpeg  4.06 MB  created=2026-03-19T19:28:46.558Z
```

The first path segment is the literal string `vaults`, not an archive id. The `vaults` table
has no `archive_id`:

```
select archive_id -> ERROR {"code":"42703","message":"column vaults.archive_id does not exist",
                            "hint":"Perhaps you meant to reference the column \"vaults.archivist_id\"."}
vaults columns: id, created_at, archivist_id, display_name, tier, status, essence_percent,
                storage_used_bytes, storage_limit_bytes, stripe_subscription_id, stripe_customer_id
vaults total rows: 3
```

The one object belongs to vault `09c927a2`, display name "Test Vault", `storage_used_bytes`
4255764, which matches the 4.06 MB exactly. A vault points at an `archivist_id`. There is no
path from a vault object to an archive id, in the table or in the object path. This is what
moves the bucket to EXCLUDED in section 2.

---

## 1. CONFIRMED EGRESS FIGURES

Constraint: no threshold written from memory. Both figures below were read today.

### 1.1 Supabase, the billable side

From `supabase.com/docs/guides/platform/manage-your-usage/egress`, read August 8, 2026:

> "This quota is called the Unified Egress Quota because it can be used across all
> services (Database, Auth, Storage etc.)."

| Plan | Uncached egress included | Overage | Cached egress included | Overage |
|---|---|---|---|---|
| Pro | **250 GB / mo** | **$0.09 / GB** | 250 GB / mo | $0.03 / GB |
| Free | 5 GB / mo | n/a | n/a | n/a |

Storage egress is defined as "Data sent from Supabase Storage to the client when retrieving
assets." The docs draw no distinction between a signed-URL download and a service-role
download. Both are uncached egress. A backup job downloading objects spends from the same
250 GB the product does.

**The headroom figure is in, read August 8.** The job's real headroom is 250 GB minus
whatever everything else on the project already consumes each month. Month-to-date unified
egress is **0.065 GB uncached against 250 GB**. Cached is 0.81 GB, which bills on its own
line and does not draw on the uncached quota, so it does not bear on this job. The property
consumes effectively nothing. Full headroom is available and no threshold needs adjusting.
Section 6.3 closes on this.

### 1.2 Backblaze B2, the destination side

From `backblaze.com/cloud-storage/pricing`, read August 8, 2026:

| Line | Figure |
|---|---|
| Storage | **$6.95 / TB / mo** |
| Free egress | **up to 3x average monthly data stored** |
| Egress beyond free | **$0.01 / GB** |
| Class A, B, C transactions | free on pay-as-you-go |
| Class D transactions | $0.004 per 10,000, first 2,500 per day free |

At 1073 MB stored, storage costs about **$0.0075 per month** and the free egress allowance
is about **3.22 GB per month**. Both figures are unchanged in substance by the August 9
restatement from 1076 MB. The section 1.3 arithmetic below is left on its 1.076 GB basis,
because a 3 MB shift does not move a $0.014 result.

### 1.3 A correction to the recon doc

Recon section 5 step 3 says full re-hash verification is "Free on B2 within the 3x
allowance." At weekly cadence that is false.

```
weekly full re-hash  =  1.076 GB  x  4.33 runs/mo  =  4.66 GB/mo read from B2
free allowance       =  1.076 GB  x  3            =  3.23 GB/mo
overage              =  1.43 GB   x  $0.01/GB     =  $0.014/mo
```

Fourteen tenths of a cent. The dollar figure does not change the recommendation. The claim
as written does not survive its own arithmetic, so it is corrected here rather than
carried forward.

---

## 2. SCOPE, THE ALLOWLIST

```
ALLOWLIST  (synced)                            four buckets   [August 9 basis]
  photographs         336 objs   1006.87 MB    +1 placeholder, see 2.1
  voice-recordings     36 objs     22.37 MB
  archive-videos        4 objs     43.85 MB
  archive-documents     0 objs      0.00 MB
                      ----------------------
  in scope            376 objs   1073.09 MB    (1125215480 bytes)

EXCLUDED  (named, permanent, asserted in a test)
  archive-exports       0 objs      0.00 MB    derived, and retention-managed elsewhere
  vault-files           1 obj       4.06 MB    not archive-scoped, cannot be dissolved
```

`archive-exports` reads empty rather than 2 objects and 392.67 MB because the reaper is
committed and the two probe artifacts are deleted, per section 0.3. It stays permanently
excluded regardless of what it holds. An empty bucket is not a reason to relax the rule.

The two exclusions are not the same exclusion and must not be collapsed into one reason in
the code comment or the test.

**`archive-exports` is excluded because it is derived and retention-managed elsewhere.**
Every object in it is a zip rebuildable from the content buckets, so backing it up stores a
second copy of data already covered. It also carries its own 7 day retention, and a backup
under a 90 day COMPLIANCE lock would outlive the retention it is supposed to respect. That
is a conflict of policy, not of scope.

**`vault-files` is excluded because section 2.1's filter cannot reach it.** Confirmed live
in section 0.5: the bucket's only object sits at `vaults/{vault_id}/{...}/IMG_3640.jpeg`,
the leading path segment is the literal string `vaults` rather than an archive id, and the
`vaults` table has no `archive_id` column at all. It keys on `archivist_id`. So there is no
expression, on the path or through the table, that answers "which archive does this object
belong to." The dissolution filter in 2.1 works by excluding an archive id prefix. Against
this bucket it has nothing to match on, and every object would stay in scope through a
dissolution and be written into a locked backup that no dissolution could target. Excluding
the bucket is the only posture consistent with tenet 04.

This is an exclusion under protest, and it should be revisited rather than settled. The
right end state is that vault objects become reachable by the dissolution filter and then
join the allowlist. Today they are unbacked, which is a real gap and is named as such in
section 11. One 4 MB object on a vault named "Test Vault" is a cheap moment to take that
gap. It will not stay cheap.

`archive-documents` is empty today and is on the allowlist anyway, so the first document
anyone uploads is covered from the moment it lands rather than from the next time someone
remembers to edit a constant.

**The roster alarm.** Every run reads `listBuckets()` and compares it against
`ALLOWLIST ∪ EXCLUDED`. A bucket in neither raises an alarm and **is not synced**. The run
continues on the allowlist. A new bucket must be a decision, and it must not be able to
join an Object Lock sync by existing. Had this been running on August 3, `archive-exports`
would have raised the alarm on August 4.

### 2.1 One filter the sync does need, and why it is not a pointer filter

Constraint 4 says do not filter the object list against the pointer tables. Agreed, and the
22 orphans are the reason. There is one filter the sync still requires, and it works on the
path prefix rather than on any pointer table.

**An archive under dissolution must leave the sync scope at request time, not at deletion
time.** With COMPLIANCE retention at 90 days, a version written today cannot be removed
until day 90. The dissolution flow is: request verified on day X, 12 month hold, permanent
deletion at X+365. If the sync keeps copying that archive's objects through the hold, it
writes fresh locked versions right up to X+365, and a deletion attempted on that day would
be refused on up to 90 more days of still-locked backup. The promise breaks on the last
step, and COMPLIANCE mode means nobody can override it, including the account root.

Dropping the archive's prefix at request time makes the newest locked version date from X.
Its retention expires at X+90, which is 275 days before the deletion is due. The lock is
never what blocks the deletion.

That is a statement about the lock, not about a deletion process. No such process exists
today. Section 9.4 specifies it.

The filter is `archives.termination_requested_at is not null`, applied to the archive id
prefix on the path. **VERIFIED August 8:** the column resolves live, section 0.4. It
excludes a whole prefix. It does not consult `photographs`, `voice_recordings`, or any
other pointer table, so an orphan object under a live archive prefix is still picked up,
and the orphan `f44f1818` prefix with no `archives` row at all is still picked up, because
no row means no termination timestamp means not excluded.

The filter is also the reason `vault-files` cannot be in scope. It matches on an archive id
prefix, and no vault object has one. Section 2's exclusion note carries that argument.

### 2.2 A second filter, found August 9: the empty folder placeholder

**BUILT, August 9.** `isEmptyFolderPlaceholder` in `lib/storageBackup.ts`, applied in
`walkBucket`. 16 cases in `lib/inngest/storageBackupWalk.test.ts`.

Supabase writes a zero byte object named `.emptyFolderPlaceholder` into a prefix that would
otherwise have no objects in it. One exists today, created the moment David deleted the last
photograph out of the `f44f1818` prefix on August 8:

```
photographs/f44f1818-8f17-499d-8f27-23e286e923f7/.emptyFolderPlaceholder
  size=0  mimetype=application/octet-stream  created=2026-08-08T21:26:23.193Z
```

`walkBucket` distinguishes a folder from an object by `id === null`. A placeholder has a
real id, so it is returned as a real object. Left alone, the first sync copies it to B2
under the 90 day COMPLIANCE lock, writes a manifest row for it, and keys that row to
`f44f1818`, which is not a row in `archives`.

It is zero bytes and it holds no family content, so this is not an exposure and it is not
urgent. It is three smaller wrongs that do not expire:

- A permanent undeletable non-file in the copy of last resort. Nothing about a placeholder
  is worth 90 days of immutability.
- A manifest row and a V6 orphan report line, on every verify run, forever.
- Precedent. Every future prefix that empties out adds another one, and the first sync is
  the cheapest moment to decide they never enter.

**The filter is a name match in `walkBucket`, skipping any entry named
`.emptyFolderPlaceholder`, and it belongs on the source walk rather than in the diff so the
object never enters `SourceObject[]` at all.** It must not be written as a zero byte filter.
A zero byte real upload is a different thing and should still be copied and still reconcile,
because a content file that has become zero bytes is a fact worth backing up and noticing.

The diff is the wrong place for a second reason worth writing down. An object filtered there
has already been counted as source. The three way diff would then see it present in the
destination and absent from source, which is the exact shape `A2_UNKNOWN_IN_DEST` exists to
alarm on, so filtering late would manufacture the alarm it was meant to avoid.

Six of the sixteen test cases are pointed the other way, at the zero byte reading rather than
the placeholder: a real object of zero bytes is kept, an object named
`.emptyFolderPlaceholder.jpg` is kept, and an object with no metadata at all is kept and
recorded as zero bytes. A filter that drops any of those is hiding a content failure in
silence, because a skipped object raises nothing.

Related, and separate: `photographs` holds 336 objects against 316 rows in the `photographs`
table, so 20 orphan objects under live archive prefixes. Those are real image bytes and they
stay in scope by design, per constraint 4 and the filter argument above. The count of 22
used elsewhere in this document predates the August 8 deletion and was never re-derived
per-bucket here.

---

## 3. JOB SHAPE

Three scheduled units. Two are Inngest functions. One is a Vercel cron route, deliberately
on a different scheduler.

| Unit | Where | Schedule | Job |
|---|---|---|---|
| `storage-backup-sync` | Inngest | **event only, no cron yet** | list, diff, copy what is new or changed |
| `storage-backup-verify` | Inngest cron | weekly `0 5 * * 0` UTC | structural diff plus full re-hash of the destination |
| `storage-backup-heartbeat` | Vercel cron route | daily `0 6 * * *` UTC | read the run log, alarm on silence |

Plus one quarterly unit, `storage-backup-drill`, Inngest cron `0 7 1 1,4,7,10 *`, covered in
section 5. Not built, see section 7 on A7.

**The sync intentionally has no cron until build order 9d.** It was specified as daily
`0 4 * * *` and shipped without it. Registering a cron-triggered sync means the first
production deploy seeds the whole property overnight, unattended, into a 90 day COMPLIANCE
lock that nobody can shorten. The per-run byte ceiling does not stop it, because 1073 MB
against a 3.5 GB ceiling passes. Build order 9a through 9d puts the dissolution dry walk,
`dissolution-purge.ts`, and the tenet 04 redraft ahead of the first write to B2, and an
unattended seed inverts all three. So the seed is sent by hand at 9d and the daily cron goes
on afterwards, as its own commit. `lib/storageBackup.test.ts` fails if a cron reappears here
before then.

When it is added, 04:00 UTC puts the sync after the 03:00 export reaper and clear of the
08:00 and 09:00 cron cluster. 05:00 Sunday is clear of `weekly-replay` at 09:00 and
`weekly-mirror` at 17:00.

Verify and the heartbeat keep their crons from day one. Neither writes to B2. Verify reads
the destination and re-hashes, and with an empty manifest it has nothing to do, so it is safe
to have running before the seed. The heartbeat reporting a red `A5_SILENCE` every day until
9d is correct, not a fault: no successful sync has happened, and that is exactly what the
alarm is for.

### 3.1 Why the heartbeat is a Vercel cron and not an Inngest function

A dead job does not report its own death. The realistic failures are the Inngest function
stopping, being unregistered by a bad deploy, or the B2 credential expiring. A Vercel cron
reading a Postgres table catches all three, because it shares no scheduler, no client, and
no credential with the thing it watches.

It does share Vercel. If the Vercel scheduler itself dies silently, both go quiet together
and nothing complains. An external dead man's switch closes that last gap for free, and it
carries no archive data, only a ping. I am not proposing one in this build. Vercel's
scheduler failing silently while the rest of the product keeps serving is a narrow case,
and 18 other crons would go quiet at the same time. Naming the residual gap rather than
papering over it.

### 3.2 `after()` does not apply here

The serverless rule exists because post-response work dies on lambda freeze. This design
has no request-scoped async work. Inngest steps are the durable primitive and each one is
its own invocation. The heartbeat route does its read and its alarm inline and then
returns. Nothing here is fire and forget, so `after()` has nothing to wrap. Recon section 5
step 5 says the run-log write must land through `after()`. That was written for a Vercel
cron design. Moving to Inngest removes the requirement rather than satisfying it.

### 3.3 Per-object steps, and the ceiling on them

```
storage-backup-sync
  step  list-source              1 step,  reads listBuckets + recursive list on 4 buckets
  step  roster-check             1 step,  alarm if live buckets != allowlist ∪ excluded
  step  load-manifest            1 step,  current manifest rows
        ── diff in plain code, no step ──
  step  copy:{bucket}/{path}     N steps, one per new-or-changed object
  step  write-manifest-json      1 step,  manifest snapshot to B2
  step  write-run-log            1 step,  always, success or failure
```

Each `copy` step does four things in order, and the order is the point:

1. Download the object from Supabase Storage into memory.
2. Compute SHA-256 over the bytes in flight, and count the real body length.
3. PUT to B2 with Object Lock headers. Wait for the response and its `fileId`.
4. **Then** insert the manifest row.

An Inngest retry re-executes the whole step, which re-downloads one 12 MB file. That is the
cost of a retry and it is the right cost. A single wrapping step would re-download 1.08 GB
per retry against a metered egress line, which is the failure this shape exists to prevent.

The manifest row goes last because a manifest written first reports coverage that does not
exist. Step 4 inside the same step body is safe on retry: the insert is keyed on
`(bucket, path, sha256)` and upserts.

**Inngest hard limit: 1000 steps per run.** Confirmed today at
`inngest.com/docs/usage-limits/inngest`. Step output is capped at 4 MiB, which the
`list-source` step approaches only past roughly 20,000 objects.

The seed run is 376 copy steps plus 4, so 380 on the August 9 basis. That fits, with 2.6x
headroom and no more. It was 381 before the two deletions in section 0.3. It would be 381
again without the section 2.2 placeholder filter, which is built, because the placeholder
would otherwise take a copy step of its own.
So the copy list is capped at `MAX_COPIES_PER_RUN = 300`, and a run with more work than
that emits `storage/backup.sync.continue` and lets a fresh run take the rest. The seed
takes two runs. This is the mechanism that keeps the design working at 10,000 objects
instead of failing on a limit nobody remembered. Whatever is deferred gets a `log()` line
naming the count, so a capped run never reads as a complete one.

### 3.4 `storage-backup-verify`

```
  step  list-source              1
  step  list-destination         1
  step  load-manifest            1
        ── three way structural diff in plain code, no step ──
  step  rehash:{path}            N steps, download from B2, hash, compare to manifest
  step  reconcile-pointers       1
  step  write-run-log            1
```

Same 300 cap and the same continuation event. Re-hash reads from B2, not from Supabase, so
a verify run spends zero Supabase egress. That is deliberate and it is what makes weekly
verification affordable.

Change detection on the source side is size plus eTag, which is why re-hashing the source
is not needed. An in-place overwrite in Supabase changes the eTag, the daily diff sees it,
and the object is recopied as a new B2 version. The 32 multipart eTags are still usable
here, because change detection only needs the value to differ when the bytes differ, not to
equal an MD5.

### 3.5 Destination key shape

B2 key is `{bucket}/{path}`, the natural key, with B2 versioning doing the work. Every copy
records the `b2_file_id` B2 returns, which is the version identifier, and Object Lock
applies per version.

The alternative was a content-addressed key like `{bucket}/{path}#{sha256}`. Rejected. With
the natural key, a restore with no manifest at all is "download the latest version of every
key," which is the correct answer and needs no interpretation. With hash-suffixed keys, a
lost manifest leaves a pile of keys nobody can map back to a filename. The manifest should
add precision to a restore, not be load bearing for a basic one.

### 3.6 Dependency

`@aws-sdk/client-s3` is not installed. It is the one addition. B2's S3-compatible endpoint
takes it directly, so a later move to S3 is a credential and endpoint change. It is
server-only inside an Inngest function and never reaches a client bundle.

---

## 4. MANIFEST DDL

Two tables. Both service role only.

**Corrected August 8, from reading the convention rather than recalling it.** This section
said "RLS on, no policy, the same posture as `archive-exports`." That was wrong, and the
migration does not follow it. "No policy" is the right answer for `storage.objects`, which
Supabase owns and every bucket shares, where a policy cannot be scoped to one bucket without
affecting the rest. It is not the convention for a table we create.

The table convention, read live in `20260502_training_pipeline.sql:34-36` and mirrored by
`20260717_grounding_gaps.sql:41-44`, is RLS enabled **plus** an explicit
`service_role_full_access` policy. Both new tables carry it.

The access control is the same either way. `service_role` holds `BYPASSRLS`, so the policy
is never evaluated for it, and what denies anon and authenticated is RLS being on with no
policy matching them. The explicit policy is carried because every sibling table has it and
a table that looks different invites someone to change it.

Prepared for the Supabase editor as `supabase/migrations/20260808_storage_backup_manifest.sql`.
Not run from here.

### 4.1 `storage_backup_objects`

One row per distinct content version of an object. Additive, matching the sync. A changed
object gets a new row and the old row stays, because both versions exist in B2 and both are
restorable.

```
storage_backup_objects
  id                uuid        pk, default gen_random_uuid()
  bucket            text        not null      -- source bucket, allowlist member
  path              text        not null      -- full object path within the bucket
  archive_id        uuid                      -- parsed from the path prefix, null if not a uuid
  size_bytes        bigint      not null      -- real body length read, not metadata.size
  sha256            text        not null      -- computed by us, in flight, at copy time
  source_etag       text                      -- change detection only, never integrity
  source_created_at timestamptz               -- storage.objects created_at at copy time
  b2_key            text        not null      -- '{bucket}/{path}'
  b2_file_id        text        not null      -- B2 version id returned by the PUT
  b2_locked_until   timestamptz not null      -- retain-until sent with the PUT
  source_table      text                      -- pointer table that referenced it, null if orphan
  source_row        jsonb                     -- the pointer row itself at copy time, null if orphan
  copied_at         timestamptz not null default now()
  run_id            uuid        not null      -- fk storage_backup_runs(id)

  unique (bucket, path, sha256)               -- idempotency key for the copy step
  index  (bucket, path)                       -- diff lookup
  index  (archive_id)                         -- dissolution purge targeting, section 9.4.5
  index  (run_id)
```

`source_row` is the constraint from the brief. Bytes in B2 and pointers in Postgres run on
different schedules and will drift. Storing the referencing row as jsonb at copy time is
what makes a restore a restore. Null is meaningful and is not missing data: it records that
the object was an orphan when we took it, which is true of 22 objects today.

`source_table` and `source_row` are resolved by a single lookup per pointer table at the
start of the run, held in a map, and read per object. This is a decoration on the copy, not
a filter on it. The object is copied whether or not a row is found.

### 4.2 `storage_backup_runs`

```
storage_backup_runs
  id                   uuid        pk, default gen_random_uuid()
  kind                 text        not null   -- 'seed' | 'sync' | 'verify' | 'drill'
  started_at           timestamptz not null default now()
  finished_at          timestamptz
  ok                   boolean                -- null while running
  objects_source       int                    -- counted in source across the allowlist
  objects_destination  int                    -- counted in B2
  objects_manifest     int                    -- counted in storage_backup_objects
  objects_copied       int
  objects_rehashed     int
  objects_deferred     int                    -- hit MAX_COPIES_PER_RUN, named in the log
  bytes_read_source    bigint      not null default 0   -- Supabase egress, the billable meter
  bytes_read_dest      bigint      not null default 0   -- B2 egress
  bytes_written_dest   bigint      not null default 0
  alarms               jsonb                  -- array of {code, detail}, see section 6
  error                text
  continued_from       uuid                   -- fk self, set on a continuation run

  index (kind, started_at desc)               -- the heartbeat's only query
```

The heartbeat reads this table and nothing else. The rolling 30 day byte budget is a sum
over `bytes_read_source`, so it survives a cold start and cannot be lost in memory.

There is deliberately no third source of truth. `archive-exports` got no tracking table for
this reason, and that reasoning holds here with one difference: a backup manifest is not
retention state, it is the record of what was taken and what it hashed to, and it has to
outlive the primary. Which is why it is also written to B2.

### 4.3 The manifest also lives in B2

After each successful sync run, a JSON snapshot goes to `_manifest/{ISO date}.json` in the
backup bucket, under the same Object Lock. Losing the Supabase project must not lose the
map of what the backup contains.

**Settled August 8: the snapshot does not carry `source_row`.** Each snapshot lists an
archive's paths and hashes and is locked for 90 days from its write, so every snapshot taken
before a dissolution request has to be deleted at X+365 along with everything else. If it
also carried `source_row`, it would carry caption and description text, and the offsite copy
would become a shadow copy of archive content rather than an index of it. Avoided rather
than managed.

The snapshot is exactly five fields per object, and nothing else:

```
bucket           source bucket, allowlist member
path             full object path within the bucket
sha256           computed by us at copy time
size_bytes       real body length read
b2_locked_until  retain-until sent with the PUT
```

`source_row`, `source_table`, and `source_created_at` stay in Postgres only. What is lost by
excluding them is the ability to reconstruct pointer rows from the offsite copy alone, in
the case where Postgres is gone entirely. That is the right trade. A restore from B2 alone
recovers every byte and every filename, which is the job of a backup. Recovering captions
without a database is not worth putting caption text under a 90 day lock in a second
jurisdiction.

`b2_file_id` is deliberately absent too. It is the version identifier B2 itself assigns, so
it is recoverable from a version listing of the bucket and does not need to be carried in a
file stored inside that same bucket. Section 9.4.5.

---

## 5. VERIFICATION

Six checks. The first three prove the bytes are present and identical. Only the fourth
proves they are reachable and usable. That distinction is honest and it belongs in anything
we ever say to a family about this.

**V1. Manifest at write time.** SHA-256 computed by us over the bytes as they stream,
recorded with the real body length. Source eTag stored alongside and explicitly not used as
an integrity check. 30 of the 377 objects on the property carry a multipart eTag, measured
August 9, so this is not a theoretical concern.

**V2. Structural diff, every run, three ways.** Source path set, destination path set, and
manifest path set, compared pairwise.
- In source, absent from destination: **hard alarm**. This is the failure the system exists
  to catch.
- In destination, absent from the manifest: **alarm**. Something other than this job is
  writing to the backup bucket.
- In the manifest, absent from destination: **hard alarm**. Object Lock should make this
  impossible, so it firing means the lock is not doing what we believe.
- In source, absent from the manifest: normal. That is the copy list.
- In destination, absent from source: normal and expected. Additive-only means deletions do
  not propagate. Counted and reported, never acted on.

**V3. Full re-hash, weekly.** 1.08 GB is under the 5 GB threshold, so weekly. Reads from B2.
Costs about $0.014 a month per section 1.3. Revisit to monthly when stored volume passes
5 GB, which is years out on the current curve.

**V4. Restore drill, quarterly.** Three objects pulled from B2 to a scratch path, one
photograph, one webm, one mp4. Two halves:
- Programmatic, in the job: assert the JPEG SOI and EOI markers, the webm EBML header, and
  the mp4 `ftyp` box. Bytes that were written but are not decodable fail here.
- Human, in the alert email: three signed links and one line asking you to open one. The
  job cannot prove a file is viewable. A person looking at it can.

This is the step that catches a credential that expired silently, a path prefix that
drifted, and a lock policy that changed under us.

**V5. Alarm on silence at 8 days.** Covered in section 6, alarm A5.

**V6. Pointer reconciliation, both directions, reported every verify run.** Dangling rows
and orphan objects, per bucket, in the run log. This would have surfaced the 3 unreferenced
video objects in April. It is reporting, not filtering. Nothing is skipped because of it.

---

## 6. BYTE BUDGET AND THRESHOLDS

The spend cap is off. The old failure mode was loud, free, and self limiting. The new one
bills quietly. This job is the largest egress consumer on the property and nothing sits
above it. So the ceiling is inside the job.

Two meters, because two vendors bill separately and only one of them matters.

### 6.1 Meter 1, Supabase egress. The one that can hurt.

Bytes read from Supabase Storage, counted from real response body length, accumulated in
the run row as the run proceeds.

What normal looks like:

```
initial seed          1073 MB    once, flagged 'seed', exempt from the per-run ceiling
daily sync, typical    < 1 MB    list responses only, nothing new to copy
daily sync, busy day     78 MB   the worst single month since March was June at 77.7 MB
weekly verify             0 MB   reads from B2, not from Supabase
```

Expected monthly total in steady state: **under 100 MB**. In a heavy onboarding month like
April 2026: **under 700 MB**. Against a 250 GB allowance.

Proposed thresholds:

| Control | Value | Derivation | Fires in normal operation |
|---|---|---|---|
| `PER_RUN_SOURCE_BYTE_CEILING` | **3.5 GB** | ~3x the 1.08 GB full property volume, rounded up | No. Normal run is under 1 MB. Would need 3.2 full re-reads in one run. |
| `ROLLING_30D_SOURCE_BYTE_CEILING` | **25 GB** | 10% of the confirmed 250 GB Pro allowance | No. Normal month is under 100 MB, so 250x headroom. |
| Supabase usage alert (dashboard) | **50 GB** MTD unified egress | 20% of 250 GB | No, unless something unrelated to this job runs away. |

The per-run ceiling stops a runaway inside one run. It is not sufficient alone: 30 daily
runs at 3.5 GB is 105 GB a month, which is 42% of the plan and would not trip anything. So
the rolling 30 day ceiling is the one that actually bounds the month. It sums
`bytes_read_source` over the last 30 days of `storage_backup_runs` and is checked before
the first copy step and again every 25 copies.

On breach: **abort the run, write the run row with `ok = false` and the alarm, and alert.**
Not throttle, not continue with a warning. A job reading gigabytes it should not read is a
bug, and the correct response to a bug of unknown shape is to stop.

The Supabase dashboard alert is the backstop for the case where the job's own accounting is
what broke, and it lags the spend by design. **Set it before the job moves a byte**, not
after the seed.

### 6.2 Meter 2, B2 egress. Tracked, not enforced.

```
weekly full re-hash    4.66 GB/mo   against a 3.23 GB free allowance
quarterly drill        < 25 MB
overage cost           $0.014/mo
```

Recorded in `bytes_read_dest` for the honesty of the number. No ceiling, because a ceiling
that fires at a penny of exposure is noise, and the free allowance grows with stored volume
so the ratio does not worsen as the property grows. Revisit if a full re-hash ever costs
more than a dollar a month.

### 6.3 The headroom number, closed August 8

This item is closed. Month-to-date unified egress read from the org billing page on
August 8 is **0.065 GB uncached against the 250 GB allowance**. Cached egress is 0.81 GB,
billed on a separate line at a separate rate, and it does not draw on the uncached quota,
so it is not relevant to this job.

0.065 GB is 0.026% of the allowance. The plan allowance and the actual headroom are the
same number for practical purposes, which is the assumption every threshold in 6.1 was
drafted against. **All three thresholds hold as drafted.** No halving, no rework.

One thing this number does say. Steady-state property egress is near zero, so once this job
runs, the job is not merely the largest consumer on the property, it is close to the only
one. Anything that shows up on the Supabase usage graph after the seed is this job or a new
bug. That makes the 50 GB dashboard alert in 6.1 sharper than it looked when drafted, and it
is a reason to set it before the seed rather than after.

---

## 7. FAILURE ALERTING

Every alarm is a row in `storage_backup_runs.alarms` and an email to `ADMIN_EMAIL` through
Resend, matching the `alertAdmin` shape already in `lib/inngest/exportFunctions.ts`. Alarm
send failures are caught and logged and never mask the original failure, same as there.

| Code | Trigger | Severity | Run outcome |
|---|---|---|---|
| `A1_MISSING_IN_DEST` | Object in source, absent from B2 after a completed sync | hard | red |
| `A2_UNKNOWN_IN_DEST` | Object in B2, absent from the manifest | hard | red |
| `A3_HASH_MISMATCH` | Re-hash differs from the manifest. Object named. | hard | red |
| `A4_UNKNOWN_BUCKET` | Live bucket not in allowlist ∪ excluded | alarm | continues on the allowlist, run stays green, alarm sent |
| `A5_SILENCE` | No successful sync in 8 days, or no successful verify in 10 days | hard | heartbeat run is red |
| `A6_BUDGET_EXCEEDED` | Per-run or rolling 30 day source byte ceiling breached | hard | aborted, red |
| `A7_DRILL_FAILED` **(specified, not implemented)** | A drill object failed its structural decode | hard | red |
| `A8_CAPPED` | `MAX_COPIES_PER_RUN` reached, work deferred to a continuation | notice | green, count logged |
| `A9_ALLOWLIST_BUCKET_MISSING` | Allowlist bucket absent from `listBuckets`. Buckets named. | hard | red |
| `A10_MANIFEST_MISSING_IN_DEST` | Manifest row with no object in B2 | hard | red |

`A4` does not fail the run on purpose. A new bucket appearing is a thing to know about
within a day, not a reason to stop backing up the four buckets on the allowlist. It must
never be silent and it must never auto-include.

`A9` is the deliberate mirror of `A4` and goes the other way. An unknown bucket appearing
is a decision to make later. An allowlist bucket disappearing from the roster is a partial
property, and syncing it as if it were whole is worse than not syncing: the absent bucket's
objects drop out of the source listing, so the diff reads them as deletions rather than as
an outage. This job does not propagate deletions, so nothing in B2 would be lost, but the
run would report green over a backup that silently stopped covering a whole bucket. Hard
and red.

`A7` is the one row in this table with no code behind it. The other nine are emitted by
`lib/inngest/storageBackupFunctions.ts` today. A7 belongs to the quarterly restore drill in
section 5, **V4**, which is specified there in full and has not been built: the programmatic
half asserting the JPEG SOI and EOI markers, the webm EBML header, and the mp4 `ftyp` box,
and the human half putting three signed links in the alert email. Until V4 exists, nothing
can raise A7, which means the failure it names, bytes that were written but are not
decodable, is currently uncaught. V2 and V3 prove the bytes are present and identical. Only
V4 proves they are usable, and that distinction is the reason the drill is in the plan
rather than being treated as covered by re-hashing.

`A10` fires in `storage-backup-verify`, not in the sync. Object Lock is supposed to make a
manifest row with no object in B2 impossible, so it firing is not a copy that went missing.
It is evidence that the retention lock is not doing what the design assumes, which is the
one belief the entire additive-only posture rests on. Hard and red, and it is the alarm
that should trigger a look at the bucket's lock configuration rather than a re-run.

Every failure path throws so the run is red in Inngest rather than quietly green, which is
the pattern `buildArchiveExportJob` already uses.

**No B2 credential means throw.** Not skip, not no-op. A backup job that quietly does
nothing when a credential is missing is the silence failure with extra steps.

---

## 8. WHAT YOU CREATE, AND WHAT I NEVER TOUCH

Per the brief and CLAUDE.md section 1, the key is yours. I will not handle it, read it, or
ask for its value.

**Bucket creation, and one thing that cannot be undone later.** B2 Object Lock must be
enabled **at bucket creation**. It cannot be turned on afterward. If the bucket is created
without it, the fix is a new bucket and a re-seed.

Recommended: set a **bucket default retention of 90 days in COMPLIANCE mode**, and have the
job **also** send explicit `x-amz-object-lock-mode` and `x-amz-object-lock-retain-until-date`
headers on every PUT. Two layers on purpose. A bug that drops the header still gets the
bucket default, and a bucket misconfiguration is still caught by the explicit header.

**Key scope.** One bucket. `listBuckets`, `listFiles`, `readFiles`, `writeFiles`,
`writeFileRetentions`, `readFileRetentions`. Explicitly **not** `deleteFiles`. This is the
job's key and it is the only key any code holds.

**CORRECTED August 11, 2026, and the correction matters.** This section previously specified
`listBuckets`, `listFiles`, `readFiles`, `writeFiles` and nothing more. A key with those four
capabilities **cannot create the compliance lock this entire design rests on.** Every PUT
sends `x-amz-object-lock-mode` and `x-amz-object-lock-retain-until-date`, which B2 gates
behind `writeFileRetentions`. Without it every write fails with `AccessDenied: not entitled`.
`readFileRetentions` is required too, because DISSOLUTION_RUNBOOK.md step 2.3 reads the real
expiry off the object rather than calculating it.

The spec was wrong from the day it was written and looked complete, because nothing had ever
written to B2 and no test can catch a capability a vendor grants. Build order 9a is what
surfaced it, on six synthetic files on a disposable archive, with nothing locked and nothing
to unpick. Had the split seed not existed, the first PUT of 376 family objects would have
been the discovery.

Deletion at the end of a dissolution is performed by a **second key that does not exist yet
and must not be created now.** It is created at dissolution time, used by hand, and revoked
the same day. It never enters Vercel, `.env.local`, or this repo. Section 9.4.4 specifies
it. The reason for two keys rather than one broader key is that the job's key must remain
incapable of destroying the backup.

**Environment variables**, Vercel production scope plus `.env.local` for local verification:

```
B2_KEY_ID
B2_APPLICATION_KEY
B2_BUCKET
B2_ENDPOINT
B2_REGION
```

**Supabase dashboard, before the job moves a byte:** the 50 GB month-to-date unified egress
usage alert from section 6.1.

---

## 9. THE COPY CHANGES, AND TWO OF THEM ARE A GATE

One is disclosure and can ship alongside. Two block the first sync, and they are the same
gate seen from two ends: the copy cannot be written until the process it describes exists.
Section 9.4 specifies that process.

### 9.1 Blocking: `/data-ownership` tenet 04 is falsified by this build

Live copy, `app/data-ownership/page.tsx`, Right of Dissolution:

> "Dissolution is irreversible. We have no backup of your archive that survives a
> dissolution request."

> "We maintain no shadow copy, no training residual, and no commercial derivative of
> deleted archives."

Both sentences are true today only because no backup exists. The moment the first sync
completes, "we have no backup of your archive" is false in the plain reading, and it is
false for the content buckets, not only for the export bucket the existing exclusion
handles.

Half the mechanism is fine. Section 2.1 removes a dissolving archive from scope at request
time, so the newest locked version dates from X and its retention expires at X+90, well
inside the hold. What is missing is the other half: something has to actually delete the
bytes, and nothing does.

**The draft replacement previously in this section is withdrawn. It made two false claims.**
Recording both, because each points at a different missing piece.

**False claim 1: "holds no object longer than 90 days."** This confuses a retention floor
with a retention ceiling. COMPLIANCE retention is a *minimum*. It sets the date before which
a version cannot be deleted. It sets no date after which anything is deleted. The sync is
additive and deletes nothing, by design, per section 5 V2 ("deletions do not propagate,
counted and reported, never acted on"). So an object under a live archive persists in B2
indefinitely, which is exactly what a backup is for. The sentence describes the opposite of
the system we are building, and it would have been the most checkable sentence on the page
and false on the first check.

**False claim 2: "the deletion we perform at the end of that hold."** It points at a process
that does not exist. Three separate confirmations:
- `app/api/archive/terminate/route.ts` sets `termination_requested_at` and
  `scheduled_deletion_at` 365 days out, sends two emails, and deletes nothing. Read today.
- Nothing anywhere reads `scheduled_deletion_at` to act on it. The only other reference on
  the property is `app/api/god/data/route.ts`, which displays it.
- The B2 key specified in section 8 deliberately has no `deleteFiles`, so the job could not
  perform the deletion even if something told it to.
- There is no runbook. Zero hits for "runbook" across `docs/`, `app/`, `lib/`, `scripts/`.

So the draft would have promised a family a deletion performed by nobody, on a date nothing
watches, using a credential scoped to make it impossible. That is precisely the class of
sentence the standing integrity rule exists to stop, and this build would have introduced
it while claiming to fix one.

**The order of work is: runbook first, copy second.** Section 9.4 specifies the runbook.
Once it exists and has been walked once, the tenet 04 sentence gets redrafted to point at
it, and the redraft will be checkable because there will be something to check. Drafting the
copy now would be writing the promise before the thing it promises.

Until then the existing tenet 04 copy stays as it is, and **the first sync does not run.**
This is still the gate. It has moved from "approve a sentence" to "specify and staff a
process," which is more work and is the correct amount of work.

### 9.2 Not blocking: subprocessor disclosure

`/privacy` line 149 through 155 lists Supabase, Vercel, Anthropic, OpenAI, Stripe, Resend,
Twilio. `/security` line 58 renders an `INFRA` table with Database, File storage, and
Application. B2 belongs in both. Proposed rows:

- `/privacy`: `{ name: 'Backblaze', role: 'Offsite backup of archive files. Servers located in the United States.' }`
- `/security` INFRA: `{ label: 'File backup', value: 'Backblaze B2 (offsite, write-only key)' }`

Confirm the B2 region at bucket creation before the "United States" phrasing ships.

### 9.3 Now blocking: the dissolution checklist

This was drafted as "not blocking." That was wrong, and 9.1 is why. The checklist is not a
nice-to-have alongside the copy change, it is the thing the copy change has to describe.
Promoted to blocking and specified in full in 9.4.

### 9.4 The manual dissolution runbook

Nothing in this section is built. It is a specification for a document and a human process,
both of which have to exist before any real archive is backed up and before tenet 04 is
redrafted. The exact sequencing, which is not a single gate, is in 9.4.6 and build order 9.

Two standing facts frame it. `app/api/archive/terminate/route.ts` deletes nothing, it only
records intent. And COMPLIANCE mode means the retention date is absolute: no key, no
console, and no support ticket removes a locked version early. The runbook therefore is not
"delete on request." It is "stop writing on request, then delete once the last lock has
expired."

#### 9.4.1 Day X, request time

Triggered by the owner-confirmed POST to `/api/archive/terminate`, which sets
`termination_requested_at` and `scheduled_deletion_at` and emails the owner and
`ADMIN_EMAIL`. The admin email is the only notification that a dissolution has started, so
it is the runbook's entry point and must not be allowed to become noise.

Same-day actions:
1. Record the archive id, `termination_requested_at`, and the computed X+90 and X+365 dates
   in the dissolution log. That log does not exist yet and is part of this specification.
   A row per dissolution, retained after completion as the record that it was completed.
2. Confirm the next sync run excludes the prefix. The 2.1 filter is automatic, so this is a
   verification and not an action: after the following 04:00 UTC run, confirm no new
   `storage_backup_objects` rows carry that `archive_id`. If any do, the filter is broken
   and every date below shifts.
3. Note the latest `b2_locked_until` across that archive's manifest rows. **That value, not
   X+90, is the real lock expiry date.** X+90 is only correct if the last copy happened on or
   before X. A copy made two days before the request is locked until X+88, and one made in
   the hours between the request and the next sync run is locked later than X+90. Read the
   value, do not compute it.
4. Set two calendar reminders, on the date from step 3 and on X+365, both owned by a named
   person rather than by a shared mailbox.

#### 9.4.2 Day X+90, or whatever step 3 said

Nothing is deleted on this day and nothing is required of the operator. It is a checkpoint,
not an action. Confirm that the retention on the archive's newest version has expired and
that the deletion at X+365 will therefore not be refused. If a version is still locked past
X+365 at this point, the sync kept writing after the request, and that is an incident to
raise immediately rather than a date to adjust. Catching it here leaves nine months to fix
it. Catching it at X+365 leaves none.

#### 9.4.3 Day X+365, the deletion

Performed by hand, in this order. Primary data first, backup second, manifest last. Each
step is verified before the next begins, because the manifest is the map used to perform
the step after it and destroying it early strands the rest.

1. **Supabase Storage.** Delete the archive's objects under the archive id prefix in each
   of the four allowlist buckets, plus `archive-exports`. Five buckets in total. Not
   `vault-files`, which holds nothing archive-scoped, per 0.5.
2. **Supabase Postgres.** Delete the archive's rows. Out of scope for this document and
   owed its own specification, since the row set spans every table in section 5 of
   CLAUDE.md and no cascade map has been written.
3. **B2.** Delete every version of every key under that archive's prefix in the backup
   bucket. Use the manifest, not a prefix scan, as the authority for what to delete: query
   `storage_backup_objects where archive_id = $1`, and delete by `b2_key` and `b2_file_id`
   together. Deleting by key alone removes the latest version and leaves older versions
   behind, which is the failure mode B2 versioning creates and the one that would leave a
   partial archive in place after a dissolution reported complete.
4. **Verify B2 is empty for that prefix.** List by prefix, including all versions, and
   confirm zero objects. A delete call that returned success on a still-locked version is
   the case this catches.
5. **Then, and only then, the manifest rows.** Below.

#### 9.4.4 The credential, and where it lives

The job's key cannot do this and must not be changed so it can. Section 8 scopes it to
`listBuckets`, `listFiles`, `readFiles`, `writeFiles`, `writeFileRetentions`,
`readFileRetentions`, explicitly without `deleteFiles`, so that a bug in the sync cannot
destroy the backup. That property is worth more than the convenience of one key.

Note that `writeFileRetentions` lets the job SET a retention, not shorten or remove one. A
COMPLIANCE retention cannot be reduced by any key, including the account root, so adding it
does not weaken the property above.

So the deletion needs a **second, separate B2 application key** with `deleteFiles` on the
one backup bucket. Its handling rules:

- **Created at dissolution time and revoked when the dissolution completes.** It is not a
  standing credential. A permanently live delete key on the backup bucket is the single
  worst credential on the property, because it is the one that can destroy the copy of last
  resort.
- **Never in Vercel. Never in `.env.local`. Never in this repo.** No code path takes it. It
  is used by a human, from a local shell or the B2 console, and it exists only for the
  minutes that use takes.
- **Held in David's password manager** for the duration, alongside the dissolution log entry
  that records when it was created and when it was revoked.
- **Revocation is a step in the runbook, not an intention.** The dissolution is not complete
  until the key is gone, and the log records that.

This is deliberately inconvenient. A dissolution should be a rare, deliberate, logged act
performed by a person who meant to perform it, and the credential shape should make any
other kind of dissolution hard.

#### 9.4.5 The manifest rows are themselves a shadow copy

This is the part most likely to be missed, so it is stated plainly. Deleting the bytes from
B2 does not complete the dissolution while `storage_backup_objects` still holds that
archive's rows.

Those rows are not neutral metadata. Per section 4.1, each row carries `path`, which
frequently contains the original filename, `size_bytes`, `sha256`, `source_created_at`, and
`source_row`, which is **the referencing pointer row itself, stored as jsonb at copy time**.
For a photograph that row can carry a caption, a description, a date, and a person
reference. That is archive content, not a checksum. Tenet 04 says "no shadow copy." A table
holding a per-file inventory of a dissolved archive, with captions, is a shadow copy in the
plain reading, and it would survive in Postgres and in every Postgres backup after the
bytes were gone.

So:

- **Delete `storage_backup_objects where archive_id = $1` as the final step of 9.4.3,** after
  the B2 deletion is verified and not before. The `(archive_id)` index in 4.1 exists for
  this query.
- **Retain the `storage_backup_runs` rows.** They are counts and byte totals with no
  per-object detail and no archive identification, so they are not a shadow copy, and they
  are the record that the backup was operating correctly across the period. Deleting them
  destroys evidence without protecting anything.
- **The B2 manifest snapshots in `_manifest/{ISO date}.json` are the same problem, in the
  same bucket, under the same lock.** Section 4.3 puts a JSON snapshot of the manifest into
  B2 after each successful sync. Every snapshot written before the request lists that
  archive's paths and hashes, and they are locked for 90 days from each write. So the
  snapshots must be included in the 9.4.3 deletion, which means their own retention has to
  have expired, and it has by X+365 on the same argument as everything else.
- **Added August 8, from writing the runbook: the snapshots are not under an archive
  prefix, so the deletion needs its own rule.** `_manifest/{ISO date}.json` sits at the
  bucket root and inventories every archive at once. Deleting "this archive's prefix" does
  not touch it, and deleting all snapshots would destroy the offsite inventory for every
  other family. The rule is **delete every snapshot dated before `termination_requested_at`
  and keep every snapshot dated after it.** Nothing is lost. Each snapshot is a full
  inventory rather than a delta, and the manifest is additive, so a newer snapshot is a
  superset of an older one for every archive still live. Snapshots written after day X do
  not list the dissolving archive at all, because it left scope on day X. This was a real
  hole in 9.4.3 as originally written, which said to include the snapshots without saying
  which ones.
- **Settled August 8: the snapshot carries five fields and `source_row` is not one of
  them.** `bucket`, `path`, `sha256`, `size_bytes`, `b2_locked_until`. Caption and
  description text never leaves Postgres, so it never goes under a 90 day lock offsite and
  never has to be deleted from B2 at all. This was an open decision on section 4.3 and is
  now closed there.
- **Postgres backups are the residual and are not solvable by this runbook.** Deleting the
  manifest rows today does not remove them from Supabase's own snapshots of the database,
  which roll off on Supabase's schedule and not ours. This is the same residual that already
  applies to the archive's primary rows, so dissolution does not make it worse. It is named
  here so that the redrafted tenet 04 copy does not accidentally claim otherwise.

#### 9.4.6 What has to exist, and when

1. ~~This runbook written as a standalone operator document.~~ **Written August 8 as
   `docs/DISSOLUTION_RUNBOOK.md`.** That file is the operator document and is what gets
   followed during a dissolution. This section stays as the specification it was built from
   and as the record of why it exists. The two will drift. When they conflict, the runbook
   is the one someone is holding at the time, so fix the runbook first and reconcile this
   section after.
2. ~~The dissolution log.~~ **Done.** It is a table inside the runbook, filled in by hand.
   The reasoning for a document over a database table is in the runbook's own appendix.
3. ~~A named owner for the X+90 and X+365 reminders.~~ **Settled August 8. David Ha,** as
   the standing default until someone else is named, recorded in the runbook at step 2.4.
   The runbook also states that an unavailable owner does not move the date. The reminder
   gets reassigned, not deferred.
4. ~~A decision on `source_row` in the B2 manifest snapshot.~~ **Settled August 8.
   Excluded.** Sections 4.3 and 9.4.5.
5. One dry walk of the X+365 deletion against a disposable test archive, so the first real
   dissolution is not the first execution. **Still open, and it is the one that matters.**

**Item 5 breaks the heading, and the fix is in build order.** The dry walk proves the
deletion commands against real B2 versions and real manifest rows. Neither exists until a
sync has run. So the dry walk cannot happen before the first sync, and this list cannot be
titled "what has to exist before the first sync" while it contains item 5. That was an
error in the first draft of this section.

Resolving it by relaxing the gate would be wrong. Tenet 04 goes false the moment a real
family's archive lands in B2, so the copy has to be accurate before that, and the copy
points at a runbook that item 5 is what proves.

**The resolution is to split the seed. Agreed by David, August 8.** Sync one purpose-built
disposable archive first, walk the full deletion against it, land the copy, and only then
seed the real property. No family's archive is ever in the backup while tenet 04 is false,
and the runbook is proven by execution before it is pointed at in public. Build order steps
9a through 9d.

Items 1 through 4 remain true gates before any sync at all. Item 5 is a gate before the
**real** seed and before the copy lands.

Only then does the tenet 04 sentence get redrafted, and it gets redrafted to describe this
process, with the dates and the actor it actually has.

---

## 10. BUILD ORDER

Nothing moves a byte until steps 1 through 4 are done.

1. You create the B2 bucket with Object Lock enabled at creation, COMPLIANCE, 90 day
   default retention. You create the scoped key with `listBuckets`, `listFiles`, `readFiles`,
   `writeFiles`, `writeFileRetentions`, `readFileRetentions`, and without `deleteFiles`. The
   two retention capabilities were missing from this step until August 11, 2026, and without
   them every PUT fails `AccessDenied: not entitled`. You set the five
   environment variables. You do **not** create the deletion key from 9.4.4.
2. You set the Supabase 50 GB usage alert.
3. ~~Paste the month-to-date unified egress.~~ **Done August 8.** 0.065 GB uncached against
   250 GB. Thresholds rechecked and unchanged. Section 6.3.
4. **The dissolution runbook, items 1 through 4 of 9.4.6.** ~~Written as a standalone
   operator document, with the dissolution log, a named reminder owner, and the `source_row`
   decision.~~ **All four done August 8**, as `docs/DISSOLUTION_RUNBOOK.md`. The fifth item,
   the dry walk, cannot happen here because it needs a backup to exist. It moves to 9b. The
   tenet 04 redraft moves with it, to 9c.
5. Migration prepared for you to paste. Two tables, RLS on, no policy. You run it. You paste
   the verification output.
6. Sync and verify functions, registered in `app/api/inngest/route.ts`. Heartbeat route in
   `app/api/cron/storage-backup-heartbeat`, added to `vercel.json` crons, covered by the
   existing `cron-auth.test.ts` gate.
7. Test asserting the allowlist is exactly the four buckets, that `archive-exports` and
   `vault-files` are both in EXCLUDED, and that a bucket absent from `ALLOWLIST ∪ EXCLUDED`
   raises `A4` and is not synced. The two exclusions get separate assertions with their
   separate reasons in the test names, so that a later change cannot silently reclassify one
   as the other.
8. Dry run against preview with copying disabled. Paste the diff output. This proves the
   list, the diff, and the roster check without moving a byte or writing a lock.
9. **The seed is split in four. Agreed by David, August 8. Do not collapse it back into one
   run.** The reason is in 9.4.6: tenet 04 is false from the moment a real family's archive
   is in B2, and the sentence that replaces it points at a runbook nobody has executed. This
   sequence means no family's archive is ever in the backup while the copy is wrong.

   - **9a. Seed one disposable archive only.** Purpose-built, a handful of throwaway files,
     created for this and nothing else. Do not repurpose Founder Test or Dr Ha. Dr Ha holds
     real founder content, including rows flagged `test_artifact` that may not be test data,
     and neither is disposable. Paste the run row.
   - **9b. Walk the full X+365 deletion against it, following
     `docs/DISSOLUTION_RUNBOOK.md` exactly as written.** Set its `termination_requested_at`,
     confirm the sync drops it, then run every command in the runbook's section 4 for real.
     This is where `dissolution-purge.ts` gets written and committed, where the `aws s3api`
     commands stop being UNPROVEN, and where the 90 day lock gets tested by trying a delete
     that should be refused before the retention expires. Correct the runbook wherever it is
     wrong. Sign and date its section 1.4. Paste the output.
   - **9c. Redraft `/data-ownership` tenet 04 to point at the proven runbook.** You approve
     it. It lands. Only now is there a sentence backed by something that has been executed.
   - **9d. Seed the real property, 376 objects and 1073.09 MB, `kind = 'seed'`,** exempt
     from the per-run ceiling. Paste the run row and the object count. If the count comes
     back 377, the section 2.2 placeholder filter has regressed and a zero byte non-file
     just went under a 90 day lock.

     **The seed is sent by hand. `storage-backup-sync` carries no cron.** It is event
     triggered only, so nothing seeds on its own, and this step is where the first write to
     B2 happens on purpose rather than overnight. Send `storage/backup.sync.requested` with
     `{ "kind": "seed" }`. Run it once with `{ "dryRun": true }` first: a dry run writes
     nothing at all, not even a run row, so it cannot let the heartbeat read the backup as
     healthy while nothing has been copied.

     Adding the daily `0 4 * * *` cron is a separate commit, after this run is green and the
     runbook is signed. A test in `lib/storageBackup.test.ts` fails if a cron reappears on
     the sync before then.

   The cost is one extra seed run and a throwaway archive. Against 1073 MB and a $0.0075
   monthly storage line, that is nothing. The thing it buys is that the first execution of
   the deletion procedure is never a real family's dissolution.
10. First verify run. Paste the three way diff and the re-hash result.
11. Preview deploy. You promote. Branch merges to main the same session.

---

## 11. OPEN, NOT THIS SESSION

Carried from the brief, plus what today's recon added.

- ~~The export reaper is uncommitted and not deployed. Two 196 MB unencrypted full copies of
  the Dr Ha archive become overdue on August 11.~~ **Closed August 9.** Reaper committed and
  live, both objects deleted. Section 0.3.
- **This repo is git-wired and was never CLI-only. Every push to `main` since February 2026
  was a production deploy.** FINDING, August 9, 2026. Not a backup finding. Recorded here
  because this is the open list that gets read, and because it changes how the last step of
  build order 11 is executed.

  CLAUDE.md section 1 said "`git push` does NOT deploy this repo." A memory said the same,
  citing a June 19 check. Both were false and both were acted on. Pushing
  `ce856a5..b384519` to `main` produced `dpl_DUnVS84QSzQMBKE2uGnEyrcAn2as`, target
  production, status Ready, created 09:33:51 PDT roughly twenty seconds after the push,
  carrying `basalith.ai`, `www.basalith.ai`, and
  `basalith-official-git-main-dr-evil-pork-bellys-projects.vercel.app`. Nobody ran
  `vercel --prod` for it. The `git-main` alias is the tell: a CLI deploy never carries it.

  The scope is not recent. `git reflog show origin/main` holds **362 `update by push`
  entries**, the oldest at **2026-02-20 20:46 PDT**. The Vercel project was created
  **2026-02-20 20:49:23**, three minutes later. The repo and the project were wired up in
  the same sitting. 46 of those pushes fall after June 16, the oldest date a surviving
  `basalith-official-git-*` alias proves git integration was live.

  So every session that pushed to `main` was deploying to production at push time,
  whatever it believed it was doing. A session that pushed before promoting had already
  shipped; the later `vercel --prod` was a second deploy of code that was already live.

  **Consequence for the July promote-then-merge rule.** "After any `vercel --prod`, merge
  the deployed branch to `main` in the same session" is not bookkeeping. The merge push is
  itself a second production deploy. It is safe only when `main` fast-forwards to exactly
  the commit that was promoted, which is the normal case and was the case on August 9
  (`b384519`, clean fast-forward, no merge commit). If `main` would carry anything the
  promoted build did not, the push ships it, unreviewed and unpromoted.

  Two things this finding does not establish. The Git connection date is not readable from
  the CLI, since `vercel project inspect` exposes no Git field; it needs the Vercel
  dashboard under Settings → Git. And whether historical `main` pushes produced production
  rather than preview builds is inferred from Vercel's model and the project timeline, not
  measured, because `gh` is not on PATH and the GitHub deployment history was not read.

  No fix proposed. CLAUDE.md sections 1 and 2 and
  `docs/BASALITH_SUCCESSION_TEST_LOOP.md` are corrected to state what is true.
  `BUILD_CONTEXT.md` working rule 6 and the B2B pivot doc's standing rules carry the same
  false claim and are not in this repo, so they are still wrong.
- **`vault-files` is now unbacked, and that is a gap, not a resolution.** Excluded in
  section 2 because no vault object can be tied to an archive id, so the dissolution filter
  cannot reach it. One 4 MB object on a "Test Vault" today, so the exposure is near zero and
  this is the cheap moment. The fix is to make vault objects resolvable to an archive, by a
  column on `vaults` or by a path change, after which the bucket joins the allowlist. Until
  then a real vault upload is stored in one place only.
- ~~The `source_row` field in the B2 manifest snapshot.~~ **Settled August 8. Excluded.**
  The snapshot carries `bucket`, `path`, `sha256`, `size_bytes`, and `b2_locked_until` and
  nothing else, so caption and description text never goes offsite and never goes under a
  90 day lock. Sections 4.3 and 9.4.5.
- **Deleting an archive's Postgres rows has no cascade map.** Section 9.4.3 step 2 is
  deliberately left unspecified. It is owed its own session and it is not a backup problem,
  but a dissolution is not complete without it.
- Spend cap posture. Disabling the cap removed the read-only failsafe from every loop, cron,
  and retry path on the project, not just this one.
- Supabase's six day snapshot set is missing August 1. A vendor reliability finding that
  undermines the assumption that Postgres is covered.
- Orphan reconciliation. 22 objects and 98 MB on the Hoa archive. The sync copies them. The
  reconciliation is still owed.
- `anniversary-triggers` selects a column that does not exist.
- Verifier variance. Control B lands `basis=deposit` on a designed-to-refuse chip roughly
  1 in 73.
