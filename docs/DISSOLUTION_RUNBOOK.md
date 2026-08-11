# DISSOLUTION RUNBOOK

**What this is.** The operator procedure for permanently deleting one archive after its
owner invokes the Right of Dissolution. Follow it in order. Do not skip verifications.

**Who this is for.** Whoever is performing the dissolution. It assumes no knowledge of how
the backup system was built. Everything you need is in this file. You do not need to read
`docs/STORAGE_BACKUP_SKELETON_2026-08.md`, which is the design document this was written
from and which records why each step exists.

**Written:** August 8, 2026.

---

## PROVENANCE, READ BEFORE YOU TRUST A COMMAND

This runbook was written before the backup system was built. Parts of it are confirmed
against live systems and parts are not. The difference is marked at every step. Nothing here
is presented as tested when it is not.

| Marker | Meaning |
|---|---|
| **CONFIRMED** | Read live against the production project on August 8, 2026. Trust it. |
| **UNPROVEN** | Correct by design but never executed. The dry walk in "Before first use" is where it becomes confirmed. |

**This runbook has never been executed.** Before the first real dissolution, walk the
day X+365 section against a disposable test archive and correct whatever is wrong. A
dissolution is a bad time to discover that a command has the wrong flag.

---

## 0. WHAT COMPLIANCE MODE MEANS, AND WHY THIS RUNBOOK IS SHAPED THE WAY IT IS

Read this even if you are in a hurry. The whole procedure follows from it.

The offsite backup is a Backblaze B2 bucket with Object Lock in **COMPLIANCE mode**, at a
90 day retention. Every copied object version carries a retain-until date, set to 90 days
after it was written.

**The retention date is absolute.** Until it passes, that version cannot be deleted by
anyone. Not by the key the backup job uses. Not by a key with full delete permission. Not
from the Backblaze web console. Not by the account owner. Not by a Backblaze support ticket.
That is what COMPLIANCE means, and it is the difference between COMPLIANCE and GOVERNANCE
mode, which does allow a privileged override. We chose the one with no override on purpose,
because a backup that an attacker or a mistake can erase is not a backup.

The consequence is the shape of this runbook:

> **We cannot delete on request. So we stop writing on request, and delete once the last
> lock has expired.**

When a dissolution is requested on day X, the archive immediately leaves the backup's scope.
No new versions are written for it. The newest version it has was written on or before
day X, so the last retention expires on or before X+90. Deletion happens at X+365, at the
end of the 12 month hold the owner was promised. By then every lock is long expired and the
deletion cannot be refused.

If the archive had stayed in scope, the backup would keep writing fresh 90 day locks right
up to X+365, and the deletion on that day would be refused on everything written in the
final 90 days. That is the failure this runbook exists to prevent.

**Two rules that follow, and that you must not work around:**

1. **Never attempt the B2 deletion early.** It will fail, and a failed delete against a
   locked version is not a partial success. Wait for the date.
2. **Never turn off Object Lock, lower the retention, or switch the bucket to GOVERNANCE
   mode to make a deletion go through.** If a deletion is being refused, something upstream
   is wrong and section 3 tells you what. Weakening the lock to force it through destroys
   the protection for every other family on the property.

---

## 1. BEFORE YOU START

### 1.1 What you need

- [ ] The **archive id**, a UUID. Every command below substitutes it. It is the only
      substitution in this document.
- [ ] Access to the **Supabase SQL editor** for project `zmoauexzjfjloqxrkuma`.
- [ ] Access to the **Backblaze B2 console** for the backup bucket.
- [ ] The repo checked out, with `.env.local` present, for the Supabase purge script.
- [ ] The **AWS CLI** installed, for the B2 commands. B2 is driven through its
      S3 compatible API.

### 1.2 Notation

Everywhere you see `ARCHIVE_ID_HERE`, replace it with the archive UUID. Nothing else in any
command changes.

Set it once per shell session so the B2 commands can be pasted without editing:

```bash
export ARCHIVE_ID="ARCHIVE_ID_HERE"
export B2_BUCKET="<the backup bucket name>"
export B2_ENDPOINT="<the B2 S3 endpoint, e.g. https://s3.us-west-004.backblazeb2.com>"
```

### 1.3 The buckets in play. CONFIRMED August 8, 2026

Six buckets exist. Five hold archive data keyed by archive id. One does not.

| Bucket | Holds | In this runbook |
|---|---|---|
| `photographs` | Archive photos | **Yes.** Delete. |
| `voice-recordings` | Archive audio | **Yes.** Delete. |
| `archive-videos` | Archive video | **Yes.** Delete. |
| `archive-documents` | Archive documents | **Yes.** Delete. Empty as of August 2026. |
| `archive-exports` | Full export zips | **Yes.** Delete. Not backed up offsite, so Supabase only. |
| `vault-files` | Vault uploads | **No.** See below. |

**Why `vault-files` is not on the list.** Its objects are keyed to a vault, not an archive.
The path is `vaults/{vault_id}/...`, and the `vaults` table has no `archive_id` column at
all. There is no way to determine which archive a vault object belongs to, so there is
nothing here for a dissolution to target. Confirmed live August 8, 2026. If that ever
changes, this runbook changes with it.

**In the offsite B2 backup, only four buckets appear:** `photographs`, `voice-recordings`,
`archive-videos`, `archive-documents`. `archive-exports` is never backed up offsite, and
`vault-files` is not backed up at all. The B2 key for an object is `{bucket}/{path}`, so an
archive's photos live under the B2 prefix `photographs/{archive_id}/`.

### 1.4 Before first use, once, ever

- [ ] Read 1.5, so the red verify that follows 9a is expected rather than investigated.
- [ ] Walk section 4 against a disposable test archive with real objects in it, and correct
      every command that does not work as written. Record the date of that walk here:

      Dry walk completed on: ________________  by: ________________

### 1.5 The alarm you will see during the drill, and the date it must stop

Between build order 9a and 9d the weekly verify goes red every Sunday, on purpose. This
section exists because it was written before 9a was run, not after the first email arrived.

**What fires.** `storage-backup-verify`, Inngest cron `0 5 * * 0`, raises
`A1_MISSING_IN_DEST`. After 9a the manifest holds the disposable archive alone while the
source still holds the whole property, so the three way diff reports every other object as
present in source and absent from B2. That is roughly 376 objects.

**What it does.** A1 is a hard alarm. It is not in `SOFT_ALARMS`, so the run closes
`ok = false`, sends the admin email, and then throws. `storage-backup-verify` carries
`retries: 2`, so one Sunday produces up to three red runs and three emails. Expect that.
It is one fault reported three times, not three faults.

**A5 as well.** A red verify never records a successful verify, so the heartbeat keeps
reporting `A5_SILENCE` on the verify side for the whole window. The sync side stays silent
too, because a scoped run carries `kind = 'scoped'` and the heartbeat counts only `sync`
and `seed`. Neither is a second problem.

**How to tell it is the expected one.** The email says so itself. While the window is open,
A1's detail carries a sentence beginning `EXPECTED DURING THIS WINDOW ONLY`, generated from
`storage_backup_runs` rather than from anyone's memory of the date. The condition is exactly
this: a successful `kind = 'scoped'` run exists and no successful `kind = 'seed'` run does.

**The rule, and it has no exceptions.**

- A1 **without** that sentence is real. Treat it as the failure the backup exists to catch.
- A1 **with** that sentence, after 9d has run, is real too. The sentence cannot appear once
  a successful seed exists, so reading one means either something wrote a seed row that did
  not seed, or the window query is wrong. Both are worse than the alarm.
- A1 is never "fine." It is expected inside one named window, which closes at 9d.

**When it stops.** At the first successful `kind = 'seed'` run. If A1 still fires on the
Sunday after 9d, the seed did not cover the property, and that is the alarm working.

**Close this out.** Record the window, so nobody reconstructs it from memory later:

      9a scoped run completed on:  ________________
      9d full seed completed on:   ________________
      First green verify after 9d: ________________

---

## 2. DAY X. THE REQUEST

**Trigger.** The owner confirms termination. `POST /api/archive/terminate` sets
`termination_requested_at` and `scheduled_deletion_at`, then emails the owner and the admin
address. **That admin email is the only notification that a dissolution has started.** If it
is missed, nothing else raises a hand. Treat it as a page, not as a newsletter.

**CONFIRMED:** that route records intent and sends mail. It deletes nothing. No code
anywhere on the property deletes archive content. Every deletion in this runbook is manual
and is performed by you.

### Step 2.1. Read the archive's state and record the dates

Run in the Supabase SQL editor:

```sql
select id,
       name,
       owner_name,
       tier,
       status,
       termination_requested_at,
       scheduled_deletion_at,
       (termination_requested_at + interval '90 days')  as earliest_lock_expiry,
       (termination_requested_at + interval '365 days') as deletion_due
from   archives
where  id = 'ARCHIVE_ID_HERE';
```

**Verify:** exactly one row. `termination_requested_at` is not null. `scheduled_deletion_at`
is about 365 days out. If `termination_requested_at` is null, the request did not land and
there is nothing to dissolve. Stop and find out why.

- [ ] Row returned, dates recorded in the log in section 6.

### Step 2.2. Confirm the backup has stopped taking this archive

The backup sync excludes any archive with a non-null `termination_requested_at`. It is
automatic. This step confirms it worked, because every date in this runbook depends on it.

**CONFIRMED August 9, 2026.** The filter is `applyArchiveScope` in `lib/storageBackup.ts`,
applied in `lib/inngest/storageBackupFunctions.ts` between the source walk and the diff, on
every run, seed and sync alike, and on the dry run too. The terminated list is read fresh at
the start of each run, and a failed read throws rather than defaulting to an empty list,
because an empty list is indistinguishable from "nobody has asked to be forgotten." Covered
by `lib/storageBackup.test.ts`. Until August 9 this paragraph stated an intention rather
than code, and the sync would have copied a terminated archive like any other.

**Two things it does not do.** It does not remove what is already in B2. The sync is
additive, so objects copied before the request keep their locks and come out only through
section 4. And an object with no uuid prefix in its path is deliberately kept, because it
has no archives row and can never be the subject of a termination request.

**Wait for the next sync, or trigger one.** After build order 9d adds the daily cron the
sync runs at 04:00 UTC. Until then `storage-backup-sync` carries no cron and nothing runs on
its own, so waiting for a nightly run would wait forever. Send
`storage/backup.sync.requested` with `{}` and let it finish. Either way, confirm a sync has
actually completed after the request timestamp before trusting the query below. Then run:

```sql
select count(*) as rows_written_since_request
from   storage_backup_objects
where  archive_id = 'ARCHIVE_ID_HERE'
  and  copied_at > (select termination_requested_at
                    from   archives
                    where  id = 'ARCHIVE_ID_HERE');
```

**Verify: the result must be 0.**

If it is not 0, the exclusion filter is broken. **This is an incident, not a date to
adjust.** Every new row is a fresh 90 day lock, and if the writing continues, the deletion
at X+365 will be refused. Stop the backup sync, fix the filter, and only then continue. Do
not proceed on the assumption that it will sort itself out.

- [ ] Result is 0.

### Step 2.3. Read the real lock expiry date. Do not calculate it

X+90 is a rule of thumb and it is often wrong. The true date is the latest retention across
the objects actually copied. An object copied two days before the request expires at X+88.
An object copied in the hours between the request and the next sync run expires later than
X+90.

**Read the value. Never compute it.**

```sql
select count(*)                as manifest_rows,
       min(copied_at)          as first_copied,
       max(copied_at)          as last_copied,
       max(b2_locked_until)    as last_lock_expires,
       sum(size_bytes)         as total_bytes
from   storage_backup_objects
where  archive_id = 'ARCHIVE_ID_HERE';
```

Also catch any row whose archive id was not parsed out of the path, which would otherwise be
invisible to every query in this runbook:

```sql
select count(*) as unparsed_rows_for_this_archive
from   storage_backup_objects
where  archive_id is null
  and  path like 'ARCHIVE_ID_HERE/%';
```

**Verify:** the second query returns 0. If it does not, those rows belong to this archive but
carry a null `archive_id`, and every `where archive_id = ...` query below will miss them.
Note the count in the log and use the `path like` form as well as the `archive_id` form
throughout section 4.

- [ ] `last_lock_expires` recorded in the log.
- [ ] `manifest_rows` recorded in the log.
- [ ] Unparsed row count is 0, or noted in the log.

### Step 2.4. Set the reminders

- [ ] Calendar reminder on the `last_lock_expires` date from step 2.3, for the section 3
      checkpoint.
- [ ] Calendar reminder on `scheduled_deletion_at` from step 2.1, for the section 4
      deletion.
- [ ] Both reminders owned by a **named person**, not a shared mailbox. A shared mailbox is
      how a reminder gets read by everyone and acted on by nobody.

**Today the named person is David Ha.** If nobody else has been named by the time a
dissolution runs, it is David Ha.

**If the named owner is unavailable when a reminder fires, the deletion is still due on the
date.** Reassign it. Do not let it slip.

### Step 2.5. Open the log entry

- [ ] Add a row to the dissolution log in section 6, commit it, and push.

**Do not create the B2 deletion key yet.** It is created on the day it is used and not
before. See section 5.

---

## 3. THE LOCK EXPIRY CHECKPOINT. AROUND DAY X+90

Use the `last_lock_expires` date from step 2.3, not literally X+90.

**Nothing is deleted on this day. Nothing is required of the owner or the family. This is a
checkpoint, not an action.** Its entire purpose is to catch a problem while there are still
nine months to fix it, rather than at X+365 when there are none.

### Step 3.1. Confirm every lock has expired

```sql
select count(*) as still_locked
from   storage_backup_objects
where  archive_id = 'ARCHIVE_ID_HERE'
  and  b2_locked_until > now();
```

**Verify: 0.** If it is not 0, read the next step before doing anything.

- [ ] Result is 0, or step 3.2 says it is still fine.

### Step 3.2. The check that actually matters

A lock that has not expired yet is only a problem if it expires **after** the deletion is
due. This query is the real test:

```sql
select count(*) as locks_past_deletion_date
from   storage_backup_objects o
join   archives a on a.id = o.archive_id
where  o.archive_id = 'ARCHIVE_ID_HERE'
  and  o.b2_locked_until > a.scheduled_deletion_at;
```

**Verify: the result must be 0.**

If it is not 0, the backup wrote to this archive after the request and the deletion at X+365
will be refused on those objects. Raise it now.

There is no way to remove the lock. The only remedies are to wait past the last retention
before completing the deletion, which delays the promised date, or to accept that the final
deletion happens in two parts. Both are conversations to have with the owner, and both are
far better had nine months early than on the day. Record the decision in the log.

- [ ] Result is 0, or the exception is recorded in the log with a decision and a date.

### Step 3.3. Confirm the sync is still leaving the archive alone

Re-run step 2.2. Nine months is long enough for a deploy to reintroduce the bug.

- [ ] Result is 0.

---

## 4. DAY X+365. THE DELETION

This is the only section that destroys anything. Work top to bottom. **Do not reorder it.**

The order is: primary data, then backup, then the manifest last. The manifest is the map you
use to perform the B2 deletion, so deleting it early strands the step that needs it.

### Step 4.0. Confirm you are on or past the date

```sql
select id,
       scheduled_deletion_at,
       now() as now,
       (now() >= scheduled_deletion_at) as ok_to_proceed
from   archives
where  id = 'ARCHIVE_ID_HERE';
```

**Verify:** `ok_to_proceed` is `true`. If it is false, stop. You are early.

- [ ] `ok_to_proceed` is true.

### Step 4.1. Delete the objects from Supabase Storage

**UNPROVEN.** The script below has not been run. Prove it in the dry walk.

Do not use the SQL editor for this. `delete from storage.objects` removes the database row
that points at a file and can leave the file itself behind in the storage backend. That
would leave you with a dissolution that reports success and bytes that still exist. Use the
Storage API, which deletes both.

Save this as `scripts/dissolution-purge.ts`:

```ts
/**
 * Deletes one archive's objects from Supabase Storage across the five
 * archive-scoped buckets. Dissolution only. See docs/DISSOLUTION_RUNBOOK.md.
 *
 *   npx tsx scripts/dissolution-purge.ts <archive-id>             lists, deletes nothing
 *   npx tsx scripts/dissolution-purge.ts <archive-id> --confirm   deletes
 */
import './load-env'
import { createClient } from '@supabase/supabase-js'

const BUCKETS = [
  'photographs',
  'voice-recordings',
  'archive-videos',
  'archive-documents',
  'archive-exports',
] as const

const archiveId = process.argv[2]
const confirmed = process.argv.includes('--confirm')

if (!archiveId || !/^[0-9a-f-]{36}$/i.test(archiveId)) {
  console.error('usage: npx tsx scripts/dissolution-purge.ts <archive-uuid> [--confirm]')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

async function walk(bucket: string, prefix: string, out: string[]): Promise<void> {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 })
  if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`)
  for (const entry of data ?? []) {
    const full = prefix ? `${prefix}/${entry.name}` : entry.name
    // A folder placeholder has a null id. A real object does not.
    if ((entry as { id?: string | null }).id === null) await walk(bucket, full, out)
    else out.push(full)
  }
}

async function main() {
  let grandTotal = 0

  for (const bucket of BUCKETS) {
    const paths: string[] = []
    await walk(bucket, archiveId, paths)

    console.log(`\n${bucket}: ${paths.length} object(s) under ${archiveId}/`)
    for (const p of paths) console.log(`  ${p}`)
    grandTotal += paths.length
    if (!paths.length) continue

    if (!confirmed) continue

    // remove() takes up to 1000 paths per call.
    for (let i = 0; i < paths.length; i += 500) {
      const batch = paths.slice(i, i + 500)
      const { error } = await supabase.storage.from(bucket).remove(batch)
      if (error) throw new Error(`remove ${bucket}: ${error.message}`)
      console.log(`  deleted ${batch.length}`)
    }

    // Verify this bucket is empty for the prefix before moving to the next.
    const after: string[] = []
    await walk(bucket, archiveId, after)
    if (after.length) throw new Error(`${bucket}: ${after.length} object(s) survived deletion`)
    console.log(`  verified empty`)
  }

  console.log(`\n${confirmed ? 'DELETED' : 'WOULD DELETE'} ${grandTotal} object(s) total`)
  if (!confirmed) console.log('Dry run. Re-run with --confirm to delete.')
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
```

Run the dry pass first, always:

```bash
npx tsx scripts/dissolution-purge.ts ARCHIVE_ID_HERE
```

- [ ] Dry output read. The object count looks like this archive and not like the whole
      property. **Paste the output into the log.**

Then delete:

```bash
npx tsx scripts/dissolution-purge.ts ARCHIVE_ID_HERE --confirm
```

- [ ] Every bucket reports `verified empty`. **Paste the output into the log.**

### Step 4.2. Verify Supabase Storage independently

The script checks its own work. Check it again from a different angle, in the SQL editor:

```sql
select bucket_id, count(*) as remaining
from   storage.objects
where  name like 'ARCHIVE_ID_HERE/%'
group  by bucket_id
order  by bucket_id;
```

**Verify: zero rows returned.** Any row is an object the script missed.

- [ ] Zero rows.

### Step 4.3. Delete the archive's Postgres rows

**NOT SPECIFIED IN THIS DOCUMENT. OWED ITS OWN DOCUMENT.**

The archive's rows span many tables, including but not limited to `archives`,
`owner_deposits`, `training_pairs`, `question_history`, `mirror_reflections`,
`incident_sessions`, `deposit_domain_scores`, `grounding_gaps`, `voice_recordings`,
`successors`, `email_reply_sessions`, `archive_lifecycle`, and `billing`.

**No cascade map has been written, and one is not invented here.** Guessing at a delete
order would either fail on foreign keys or, worse, succeed while leaving rows behind in
tables nobody remembered. Either outcome is worse than an honest gap.

- [ ] This step is **blocked** until a Postgres dissolution document exists. Record it as
      outstanding in the log. **The dissolution is not complete without it,** and the log
      entry must not be marked complete while this box is unchecked.

Continue to step 4.4. The backup deletion does not depend on this step.

### Step 4.4. Get the B2 delete list from the manifest

Use the manifest as the authority for what to delete. Do not delete by prefix scan alone.

```sql
select b2_key,
       b2_file_id,
       b2_locked_until,
       size_bytes
from   storage_backup_objects
where  archive_id = 'ARCHIVE_ID_HERE'
   or  (archive_id is null and path like 'ARCHIVE_ID_HERE/%')
order  by b2_key, b2_locked_until;
```

Export the result as CSV. It is your work list, and your record of what should be gone when
you are done.

**Why `b2_file_id` and not just `b2_key`.** The backup bucket is versioned. A file changed
three times has three versions under one key. Deleting by key alone removes the newest
version and leaves the older ones in place, and those older versions are complete copies of
earlier content. **That is the failure mode that leaves a partial archive behind after a
dissolution that reported success.** `b2_file_id` is the version identifier B2 returned
when the version was written. Always delete by key and version together.

- [ ] CSV exported. Row count matches `manifest_rows` from step 2.3.

### Step 4.5. Delete the versions from B2

**UNPROVEN.** Prove these commands in the dry walk.

Authenticate with the deletion key from section 5. Confirm you are pointed at the right
bucket before deleting anything:

```bash
aws s3api list-object-versions \
  --bucket "$B2_BUCKET" \
  --prefix "photographs/$ARCHIVE_ID/" \
  --endpoint-url "$B2_ENDPOINT" \
  --output json
```

- [ ] Output lists this archive's objects and nothing else.

Repeat that listing for each of the four backed up buckets, changing only the prefix:

```
photographs/$ARCHIVE_ID/
voice-recordings/$ARCHIVE_ID/
archive-videos/$ARCHIVE_ID/
archive-documents/$ARCHIVE_ID/
```

Delete one version:

```bash
aws s3api delete-object \
  --bucket "$B2_BUCKET" \
  --key "photographs/$ARCHIVE_ID/example.jpeg" \
  --version-id "THE_B2_FILE_ID" \
  --endpoint-url "$B2_ENDPOINT"
```

To work through the whole list per bucket, replacing `photographs` with each bucket in turn:

```bash
for PREFIX in "photographs" "voice-recordings" "archive-videos" "archive-documents"; do
  echo "=== $PREFIX ==="
  aws s3api list-object-versions \
    --bucket "$B2_BUCKET" \
    --prefix "$PREFIX/$ARCHIVE_ID/" \
    --endpoint-url "$B2_ENDPOINT" \
    --query '[Versions,DeleteMarkers][][].{Key:Key,VersionId:VersionId}' \
    --output text | while read -r KEY VERSION; do
      [ -z "$KEY" ] && continue
      echo "deleting $KEY $VERSION"
      aws s3api delete-object \
        --bucket "$B2_BUCKET" \
        --key "$KEY" \
        --version-id "$VERSION" \
        --endpoint-url "$B2_ENDPOINT"
    done
done
```

The loop covers `DeleteMarkers` as well as `Versions`. A delete marker is itself a version
and the prefix is not empty until they are gone too.

**If a delete is refused with an access or retention error,** the version is still locked.
Do not force it and do not weaken the bucket. Go back to section 3.2. Record which key and
version was refused, and its `b2_locked_until` from the CSV.

- [ ] Every row in the step 4.4 CSV has been deleted, or is recorded in the log as refused
      with a reason.

### Step 4.6. Delete the stale manifest snapshots from B2

The backup writes a full inventory snapshot to `_manifest/{date}.json` after each successful
sync. **These are not under the archive's prefix, so step 4.5 did not touch them,** and
every snapshot written before day X lists this archive's paths and hashes.

They contain no captions and no descriptions, by design. They carry only bucket, path,
sha256, size, and lock expiry. But a per-file inventory of a dissolved archive is still a
record of that archive, so it goes.

**Delete every snapshot dated before this archive's `termination_requested_at`. Keep every
snapshot dated after it.**

Nothing is lost by this. Each snapshot is a full inventory, not a delta, and the manifest is
additive, so a newer snapshot contains everything an older one did for every archive still
live. Snapshots written after day X do not list this archive at all, because it left scope
on day X.

```bash
aws s3api list-object-versions \
  --bucket "$B2_BUCKET" \
  --prefix "_manifest/" \
  --endpoint-url "$B2_ENDPOINT" \
  --query '[Versions,DeleteMarkers][][].{Key:Key,VersionId:VersionId}' \
  --output text
```

Delete only the entries whose date in the filename is **earlier than**
`termination_requested_at`, one at a time, using the same `delete-object` call as step 4.5.

- [ ] Snapshots older than the request date are gone.
- [ ] At least one snapshot newer than the request date still exists. **If you have deleted
      every snapshot, you have destroyed the offsite inventory for every other family on the
      property.** Stop and raise it.

### Step 4.7. Verify B2 is empty for this archive

```bash
for PREFIX in "photographs" "voice-recordings" "archive-videos" "archive-documents"; do
  echo -n "$PREFIX: "
  aws s3api list-object-versions \
    --bucket "$B2_BUCKET" \
    --prefix "$PREFIX/$ARCHIVE_ID/" \
    --endpoint-url "$B2_ENDPOINT" \
    --query 'length([Versions,DeleteMarkers][][])' \
    --output text
done
```

**Verify: every line reads `0` or `None`.**

This is the step that catches a delete call that returned success against a still locked
version. Do not take the deletion on trust. **Paste this output into the log.**

- [ ] All four prefixes empty.

### Step 4.8. Delete the manifest rows. Last, and only now

The manifest rows are themselves a record of the archive. Each row carries the object path,
which usually contains the original filename, along with the size, the hash, and the
timestamp. Leaving them behind means the bytes are gone but a per-file index of the family's
archive is still in the database. Tenet 04 promises no shadow copy. That table is one.

Count first:

```sql
select count(*) as rows_to_delete
from   storage_backup_objects
where  archive_id = 'ARCHIVE_ID_HERE'
   or  (archive_id is null and path like 'ARCHIVE_ID_HERE/%');
```

- [ ] The count matches the CSV from step 4.4.

Then delete:

```sql
delete from storage_backup_objects
where  archive_id = 'ARCHIVE_ID_HERE'
   or  (archive_id is null and path like 'ARCHIVE_ID_HERE/%');
```

Verify:

```sql
select count(*) as should_be_zero
from   storage_backup_objects
where  archive_id = 'ARCHIVE_ID_HERE'
   or  (archive_id is null and path like 'ARCHIVE_ID_HERE/%');
```

- [ ] Result is 0.

**Do not delete anything from `storage_backup_runs`.** Those rows are per-run counts and
byte totals. They name no archive and list no object, so they are not a shadow copy. They
are the evidence that the backup was working correctly across the period, including across
this dissolution. Deleting them destroys the audit trail and protects nobody.

### Step 4.9. Revoke the deletion key

- [ ] The B2 deletion key from section 5 is **revoked in the Backblaze console.** The
      dissolution is not complete until it is gone.
- [ ] Removed from the password manager.
- [ ] Revocation date recorded in the log.

### Step 4.10. Close out

- [ ] Log entry in section 6 completed, including the outstanding Postgres step from 4.3.
- [ ] Log committed and pushed.

### What remains after all of this, and why it is not a gap you can close

Deleting the manifest rows today does not remove them from Supabase's own database
snapshots, which roll off on Supabase's schedule and not ours. The same is true of the
archive's primary rows. This is a known residual, it applies equally to every deletion this
company performs, and no step in this runbook changes it. It is recorded here so that nobody
reading this document later believes the deletion reached further than it did, and so that
customer-facing copy is never written as though it did.

---

## 5. THE DELETION CREDENTIAL

**The backup job's key cannot perform any deletion in this runbook, and must never be
changed so that it can.**

That key is scoped to `listBuckets`, `listFiles`, `readFiles`, `writeFiles`,
`writeFileRetentions`, `readFileRetentions`, deliberately without `deleteFiles`. It is the
key that runs unattended every day. Because it cannot delete, no bug in the backup job and no
compromise of the Vercel environment can destroy the copy of last resort. That property is
worth more than the convenience of using one key for everything.

`writeFileRetentions` sets a retention, it does not shorten or remove one, and a COMPLIANCE
retention cannot be reduced by any key including the account root. So it does not weaken the
paragraph above. **CORRECTED August 11, 2026:** the two retention capabilities were absent
from the original spec, which meant the job key could not create the lock at all. Every write
failed `AccessDenied: not entitled`. Found by the build order 9a drill.

So the deletion uses a **second, separate B2 application key**, and it lives under these
rules:

- [ ] **Created on the day of the deletion. Not before.** It is not a standing credential. A
      permanently live delete key on the backup bucket is the single most dangerous
      credential on the property.
- [ ] Scoped to the **one backup bucket**, with `deleteFiles` added to the same permissions
      the job key has, which as of August 11, 2026 means `listBuckets`, `listFiles`,
      `readFiles`, `writeFiles`, `writeFileRetentions`, `readFileRetentions`, plus
      `deleteFiles`.
- [ ] **Never in Vercel. Never in `.env.local`. Never committed to the repo.** No code path
      takes it. It is typed by a person into a shell or the console and used for the minutes
      the deletion takes.
- [ ] **Held in David's password manager** for the duration, with the creation date recorded
      in the log.
- [ ] **Revoked the same day, as step 4.9.** Revocation is a step, not an intention.

This is deliberately inconvenient. A dissolution should be a rare, deliberate, logged act
performed by a person who meant to perform it. The credential shape is what makes any other
kind of dissolution hard.

---

## 6. THE DISSOLUTION LOG

Fill in one block per dissolution, by hand, in this file. Commit and push after each edit.

**Never put personal data in this log.** Archive id, dates, counts, and operator name only.
No owner names, no email addresses, no filenames, no content. The log is in git, and git is
forever, which is the point of using it and also the reason to keep it thin.

### Entry template. Copy this block for each dissolution

```
ARCHIVE ID:                 ________________________________________
Termination requested (X):  ____________________
Scheduled deletion (X+365): ____________________
Manifest rows at request:   ____________________
Last lock expires:          ____________________   (READ, not calculated. Step 2.3)
Unparsed rows:              ____________________   (step 2.3, expect 0)

DAY X
  [ ] 2.1 state read                     date: __________  by: __________
  [ ] 2.2 sync stopped, result 0         date: __________  by: __________
  [ ] 2.3 dates read and recorded        date: __________  by: __________
  [ ] 2.4 reminders set, owner: __________________________
  [ ] 2.5 log entry opened

LOCK EXPIRY CHECKPOINT
  [ ] 3.1 still_locked = 0               date: __________  by: __________
  [ ] 3.2 locks_past_deletion_date = 0   date: __________  by: __________
  [ ] 3.3 sync still excluding, 0        date: __________  by: __________
  Exceptions and decisions: _____________________________________________

DAY X+365
  [ ] 4.0 date confirmed                 date: __________  by: __________
  [ ] 4.1 Supabase Storage purged        objects deleted: __________
  [ ] 4.2 SQL verify, zero rows
  [ ] 4.3 Postgres rows                  BLOCKED, no cascade document. Outstanding.
  [ ] 4.4 delete list exported           rows: __________
  [ ] 4.5 B2 versions deleted            versions deleted: __________
  [ ] 4.6 stale snapshots deleted        snapshots deleted: __________
  [ ] 4.7 B2 verified empty, all four prefixes
  [ ] 4.8 manifest rows deleted          rows: __________
  [ ] 4.9 deletion key revoked           created: __________ revoked: __________
  [ ] 4.10 closed out

  Refused deletions, if any: ____________________________________________
  Pasted output attached below: yes / no

STATUS:  [ ] complete   [ ] complete except Postgres rows   [ ] in progress
```

### Entries

*No dissolution has been performed. This section is empty as of August 8, 2026.*

---

## APPENDIX A. WHY THE LOG IS A DOCUMENT AND NOT A DATABASE TABLE

**Recommendation: keep the log here, in this file, in git.** A Postgres table was considered
and rejected. Four reasons, in order of weight.

**1. A table in that database would be recording the deletion of things in that same
database.** The dissolution log has to survive everything it describes, and it has to be
readable if the project is lost. Putting the record of a deletion into the system being
deleted from is the wrong shape. Git is a separate system, hosted separately, with its own
backups.

**2. Git already provides what an audit log needs, for free.** Every edit is timestamped,
attributed to an author, immutable once pushed, and diffable. A Postgres table would need a
migration, an RLS policy, a way to write to it, and something to prevent it being edited
silently after the fact. That is real work to reproduce something git does by existing.

**3. The volume does not justify a table.** Nine archives exist and zero dissolutions have
been performed. A table optimizes reading and querying many rows. There will not be many
rows, and nobody will query them. They will be read one at a time, by a person, during the
event they describe.

**4. The operator is already in this file.** They are working through a checklist here. A
log in the same document is filled in as they go. A log in a separate database is filled in
afterward from memory, or not at all.

**The one real cost, and the mitigation.** Git history is visible to anyone with repo
access, so the log must never carry personal data. That constraint is stated at the top of
section 6 and it is not optional. Archive id, dates, counts, and operator name are enough to
prove a dissolution was performed correctly, and none of them identify a family.

**When to revisit.** If dissolutions become frequent enough that anyone wants to query them
in aggregate, or if the operator is ever somebody without repo access, this trade flips. At
that point build the table, and keep this file as the procedure.

---

## APPENDIX B. QUICK REFERENCE

**Supabase project ref:** `zmoauexzjfjloqxrkuma`

**Buckets to purge in Supabase:** `photographs`, `voice-recordings`, `archive-videos`,
`archive-documents`, `archive-exports`

**Bucket prefixes to purge in B2:** `photographs/{archive_id}/`,
`voice-recordings/{archive_id}/`, `archive-videos/{archive_id}/`,
`archive-documents/{archive_id}/`, plus stale `_manifest/` snapshots

**Not touched by a dissolution:** `vault-files`, because it is not archive-scoped.
`storage_backup_runs`, because it is counts only.

**Object path shape:** `{archive_id}/{filename}` inside each bucket.
**B2 key shape:** `{bucket}/{archive_id}/{filename}`.

**Object Lock:** COMPLIANCE, 90 days, no override by anyone.

**The order that must not change:** Supabase Storage, then Postgres rows when that document
exists, then B2 versions, then the manifest rows last.

**The design document behind this runbook:** `docs/STORAGE_BACKUP_SKELETON_2026-08.md`
section 9.4. Read it if you need to know why, not what.

**If this runbook and the skeleton disagree, this runbook wins,** because it is the one being
held during the event. Fix this file first, then reconcile the skeleton.
