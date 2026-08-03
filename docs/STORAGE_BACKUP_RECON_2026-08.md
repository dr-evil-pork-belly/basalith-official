# STORAGE BACKUP GAP, RECON

**Date:** August 2, 2026
**Scope:** Supabase Storage backup coverage, the existing export route, restore reality, and options.
**Status:** Recon only. Nothing was built, no branch, no deploy.
**Provenance:** VERIFIED unless marked otherwise. Every table and every quoted block in
sections 1 through 3 is live query output taken August 2, 2026 against project
`zmoauexzjfjloqxrkuma` using the service role key through `scripts/load-env.ts`, read-only.

---

## THE FINDING IN ONE PARAGRAPH

Supabase database backups exclude Storage objects. Retention is six daily physical
snapshots and August 1 is missing from the set. There is no other copy of any Storage
object anywhere. That means 376 objects totalling 1,079.06 MB, which is every photograph,
every voice recording, every video, and every voice portrait MP3 on the property, have
zero backup coverage. The existing export route does not close this, because it contains
no Storage bytes and its media links resolve to nothing on 100% of rows. There is no
Supabase product that would close it either. PITR covers Postgres only.

---

## 1. WHAT IS IN STORAGE

### Buckets

All five are private.

```
vault-files            public=false  created=2026-03-19T19:28:03.414Z  sizeLimit=52428800
voice-recordings       public=false  created=2026-04-13T16:21:25.920Z  sizeLimit=52428800
archive-videos         public=false  created=2026-04-17T21:15:30.920Z  sizeLimit=null
archive-documents      public=false  created=2026-04-17T21:22:01.499Z  sizeLimit=null
photographs            public=false  created=2026-03-25T17:51:48.133Z  sizeLimit=null
```

### Totals

```
GRAND TOTAL: 376 objects, 1,131,481,547 bytes (1079.06 MB)

photographs        337 objs   1009.95 MB   (330 jpeg, 7 jpg)
archive-videos       4 objs     43.85 MB   (4 mp4)
voice-recordings    34 objs     21.20 MB   (5 webm 10.85 MB, 29 mp3 10.36 MB)
vault-files          1 obj       4.06 MB
archive-documents    0 objs       0.00 MB
```

### Per archive

| Archive | ID | photographs | voice | video | total |
|---|---|---|---|---|---|
| The Cindy Ha Archive | `5040ffac` | 116 / 356.60 MB | 0 | 0 | 356.60 MB |
| The Hoa Le Tran Archive | `1783f9cf` | 109 / 310.79 MB | 27 / 7.69 MB | 4 / 43.85 MB | 362.33 MB |
| The Dr Ha Archive | `a38e4503` | 65 / 182.62 MB | 7 / 13.52 MB | 0 | 196.14 MB |
| The Stevens Ha Archive | `7612e230` | 46 / 156.86 MB | 0 | 0 | 156.86 MB |
| (no `archives` row) | `f44f1818` | 1 / 3.08 MB | 0 | 0 | 3.08 MB |

The Founder Test Archive (`6c0722d3`) and the four Calder duplicates hold zero objects.

### Growth

```
2026-03     2 objs       7.1 MB
2026-04   245 objs     691.9 MB
2026-05   108 objs     301.6 MB
2026-06    20 objs      77.7 MB
2026-08     1 objs       0.7 MB
```

Front-loaded on onboarding. Oldest photograph object 2026-03-27, newest 2026-06-11.
Newest object of any kind 2026-08-02. At the current curve this stays a small dataset
for years, which matters for both cost and verification strategy.

### Pointer tables

| Table | Column | Rows | Bucket | Dangling rows | Objects with no row |
|---|---|---|---|---|---|
| `photographs` | `storage_path` | 316 | photographs | **0** | **21** |
| `voice_recordings` | `storage_path` | 33 | voice-recordings | **3** | 4 (owned by `voice_portraits`) |
| `voice_portraits` | `audio_path` | 9 | voice-recordings | 0 | 0 |
| `archive_videos` | `storage_path` | 1 | archive-videos | 0 | **3** |
| `vault_files` | `storage_path` | 9 | vault-files | **8** | 0 |
| `archive_documents` | n/a | 0 | archive-documents | n/a | n/a |

Traps worth recording:

- `voice_portraits` uses `audio_path`, not `storage_path`. All 9 rows resolve, but they
  point at only 4 distinct files. Six rows all reference
  `1783f9cf-19b5-486e-8c84-800f85f665c0/portraits/2026-05.mp3`. Duplicate rows, one file.
- The 3 dangling `voice_recordings` are not real losses. Two carry the pseudo-path
  `twilio:REf41da8e7e355d4081edb81d167d35f76` and one is
  `pending/REprobe000000000000000000000001` from a probe.
- The 8 dangling `vault_files` are all `test/placeholder.jpg` seed rows from March 17.
- `photographs.thumbnail_path` is populated on **0 of 316** rows. There is no degraded
  copy of any photograph.
- `sum(photographs.file_size)` is 927.98 MB against 1009.95 MB actually in the bucket,
  and 4 rows carry null `file_size`. The database's own size accounting is already 8% off.

### What happens to a row whose object is missing

There is no foreign key, no trigger, and no reconciliation anywhere in the codebase. The
row persists and lies. Behavior by surface:

- `/api/photos/[photoId]` and `/api/archive/gallery` call `createSignedUrl` on the missing
  path. Supabase returns `Object not found`, the code does `data?.signedUrl ?? null`, and
  the caller renders a null image. Nothing is logged and nothing alerts.
- `photographs` rows carry `ai_era_estimate`, `ai_category`, `priority_score`, and
  `story_prompt_sent_at`. After object loss you retain a complete and confident catalog
  describing photographs you no longer hold.
- The cron routes `memory-game-start`, `story-prompt-monday`, and `story-prompt-friday`
  select photographs by `priority_score` and email them to families. They would keep
  selecting dead rows and keep sending families emails with broken images, indefinitely,
  with no signal to us.

---

## 2. THE EXISTING EXPORT ROUTE

`app/api/archive/export/route.ts`. GET. Owner Supabase session only, and ownership is
re-verified against `archives.owner_user_id` at line 24, so a successor session cannot
call it. Triggered from exactly one place, the Export button in
`app/archive/preferences/PreferencesClient.tsx:176`. Returns a JSZip nodebuffer,
`maxDuration = 60`.

### It contains zero bytes of Storage

The zip holds eight JSON files plus a README. Media appears only as `downloadUrl` strings
carrying 24-hour signed URLs. Even if those links worked, the artifact is a manifest with
a 24-hour fuse, not a copy.

### The links do not work

The route guesses paths instead of reading `storage_path`. Live test:

```
=== EXPORT ROUTE PATH TEST (what the live code actually asks Storage for) ===
  real photo storage_path : a38e4503-c7d2-4af3-af8c-cacd66974e0b/1776716254039-rgz8dscvn.jpeg
  export route asks for   : a38e4503-c7d2-4af3-af8c-cacd66974e0b/850cf1da-56f5-46c6-a5c3-e3967569562b.jpg
  -> signedUrl: NULL   error: Object not found
  -> control (real path) signedUrl: OK   error: none

  real voice storage_path : a38e4503-c7d2-4af3-af8c-cacd66974e0b/1776189700549.webm
  export route asks for   : bucket 'voice_recordings' path a38e4503-.../903b187d-....m4a
  -> signedUrl: NULL   error: Object not found
  -> control (real bucket+path) signedUrl: OK   error: none
```

Quantified across the whole property:

```
=== export route photo path guess `{archiveId}/{photoId}.jpg` vs real storage_path ===
  MATCHES  (export link would work): 0 / 316
  MISMATCH (export link is null)   : 316 / 316
    a38e4503-c7d2-4af3-af8c-cacd66974e0b  ok=0  broken=65
    7612e230-1ab3-4faf-bca6-07e234503e37  ok=0  broken=46
    1783f9cf-19b5-486e-8c84-800f85f665c0  ok=0  broken=90
    5040ffac-70cf-4429-afa0-1047051fe0e5  ok=0  broken=115

=== export route voice path guess `{archiveId}/{recId}.m4a` vs real storage_path ===
  MATCHES: 0 / 33   (and the bucket name 'voice_recordings' does not exist either)
  distinct real extensions: mp3, webm
```

Three independent faults, each sufficient on its own:

1. **Line 91 names the bucket `voice_recordings` with an underscore.** The only bucket
   that exists is `voice-recordings` with a hyphen. Every voice link fails on this alone.
2. **The extension `.m4a` matches nothing.** Real voice files are `.webm` and `.mp3`.
3. **The `{id}` filename convention matches zero of 349 media rows.** Real paths are
   `{timestamp}-{nonce}.jpeg`.

### Also absent from the export entirely

`archive_videos`, `archive_documents`, `vault_files`, and `voice_portraits` are not
queried at all. Video and vault files do not appear in the zip in any form, not even as
metadata.

### Has it ever successfully run in production

There is no invocation log, so whether the button was ever clicked is NOT CONFIRMED. What
is VERIFIED is that it has never produced a usable media link and could not have. Every
path it constructs resolves to `Object not found` against live Storage today, and the path
conventions have not changed since March. Any export ever downloaded contained readable
JSON and `downloadUrl: null` on every photograph and every recording.

**Plainly: the export route does not cover Storage.** It is a database dump with a broken
media manifest attached. It is not a backup, and it is not a working portability
mechanism.

### Public copy check

`/terms:33` and `/privacy:195` promise "a complete export of your archive in open,
portable formats… fulfilled within 30 business days." That is a manual, human-fulfilled
promise with a 30-day window, so it is not falsified by this route being broken. But the
self-serve button in archive preferences does not deliver on it, and the README inside the
zip tells the family "Photographs are in JPEG format" and "Download links in JSON files
expire after 24 hours," which reads as though files are reachable when none are.

---

## 3. WHAT A RESTORE WOULD ACTUALLY LOOK LIKE TODAY

### Recoverable from our systems: essentially nothing

There is no second copy of any object. No backup cron exists in `vercel.json`, which
carries 18 crons, none related. The only occurrence of the word "backup" anywhere in the
codebase is marketing copy in `app/data-ownership/page.tsx:41`.

### What survives in Postgres, and what it is worth

- **33 voice transcripts** survive in `voice_recordings.transcript`. The words survive.
  The voice does not. Per CLAUDE.md the 33 source recordings are the real asset for
  rebuilding a clone on a replacement provider now that ElevenLabs is cancelled. Losing
  the bucket permanently forecloses that. The clones themselves are already gone from
  ElevenLabs servers. The MP3s in the bucket are the last artifact of two people's voices.
- **`training_pairs` and `owner_deposits`** are derived text living in Postgres. The
  entity survives a total Storage loss. That is the one genuine consolation and it is
  real. Only 7 of 165 deposits carry a `photograph_id`.
- **316 photograph rows** survive as a detailed catalog of 1,009.95 MB of family
  photographs that no longer exist. Zero rows have `thumbnail_path`, so there is not even
  a degraded copy.

### What vanishes without leaving evidence it existed

The 3 `archive-videos` objects with no DB row, 32.88 MB of contributor video on the Hoa Le
Tran archive. Nothing in Postgres records them. After the loss we would not know to look
for them, and nobody could tell that family what was lost. The same applies to the 21
unreferenced photograph objects and the orphan `f44f1818` prefix.

### The one accidental redundancy

Two `voice_recordings` rows carry `storage_path = twilio:REf41da8e7e355d4081edb81d167d35f76`,
meaning that audio was never copied into our bucket and may still sit on Twilio's servers
subject to their retention. That covers 2 phone deposits. It is not a strategy.

### Outside our systems

The photographs were uploaded by families from their own phones, so originals plausibly
still exist on four families' devices. That is their copy, not ours. Recovering it means
telephoning four families, admitting we lost their archive, and asking them to re-upload
several hundred photographs, at which point every AI label, era estimate, duplicate
cluster, and priority score is wrong or must be rebuilt. For a product whose promise is
permanence, that is not a restore. It is a disclosure.

### The failure mode that makes this worse than it sounds

A Postgres backup restore reinstates the `storage.objects` metadata rows along with the
pointer tables, because that metadata lives in the database. The result is a database
fully confident the files exist and an S3 layer that is empty. The application does not
fail loudly in that state. It renders nulls and keeps emailing families.

**Point-in-time recovery on the database actively produces this inconsistency rather than
resolving it.**

---

## 4. OPTIONS FOR A RECURRING BACKUP

### The decisive constraint

The threat is not disk failure. Supabase Storage sits on S3 with its own durability. The
realistic loss paths are:

1. A `.remove()` in our own code, or a manual delete in the dashboard, hitting the wrong
   prefix. The service role key is held by every API route and Storage delete is not gated
   by RLS for it. `app/api/archive/save`, `app/api/archive/upload`, and
   `app/api/contribute/upload-media` all hold that authority.
2. Supabase Storage has no object versioning enabled. A delete is immediate and
   unrecoverable.
3. An account-level event: billing lapse, credential compromise, or vendor action against
   the project.

The `archive_videos` table already shows what silent Storage drift looks like on this
property: 4 objects, 1 row.

### Option A. Second Supabase project

Free tier caps Storage at 1 GB and we are at 1.08 GB, so this is Pro at **$25/mo**. No
server-side copy exists between projects, so each object must be downloaded and
re-uploaded through our own compute.

Protects against a bad delete scoped to the primary project. Does not protect against
anything at the account level, which is the same billing relationship, the same login, and
the same vendor. Effort is moderate and roughly equal to Option B, so it costs meaningfully
more for strictly less protection. Its only real advantage is that no new vendor appears
on the subprocessor list.

### Option B. S3 or Backblaze B2

FROM DOCS on pricing, to confirm at signup. At 1.08 GB the storage line item is noise.
Backblaze B2 lists around $6/TB/month, roughly **$0.01/mo**, subject to their account
minimum. S3 Standard lists around $0.023/GB/month, roughly **$0.03/mo**. The point is not
the exact figure. At this volume the cost is a rounding error and stays under a few
dollars a month for years at the current growth curve.

The differentiator is egress. B2 gives free egress up to 3x stored bytes. S3 charges
roughly $0.09/GB. That matters because verification and any real restore are egress
events, and 3x free egress means we can afford to re-download and re-hash the entire
backup on every run.

Protects against all three loss paths. Different vendor, different account, different
credential. With Object Lock or versioning enabled it also protects against our own backup
job going rogue and propagating a delete, which is the case that matters. Effort is
moderate: one cron route that walks the five buckets, diffs against a manifest, and
uploads what is new. Both are S3-compatible, so `@aws-sdk/client-s3` works against either
and switching later is a config change.

### Option C. Supabase's own paid options

This is the important finding. **Supabase sells no product that backs up Storage objects.**
The PITR add-on covers Postgres write-ahead logs only. Physical backups cover the
database. Storage objects are explicitly out of scope, which is what the backup page
already says.

Buying up the Supabase plan, adding PITR, or paying for longer retention does not move
this risk at all. Worse, per section 3, PITR restores `storage.objects` metadata and
thereby manufactures the confident-database-empty-bucket state. There is no amount of
money payable to Supabase that closes this gap.

---

## 5. VERIFICATION

### A useful finding from recon

The Storage list API returns `eTag` per object:

```json
"metadata": { "eTag": "\"e7b9a5eda22359e94fd4be25073f3484\"",   "size": 3028677, ... }
"metadata": { "eTag": "\"31847c878dee58232e2fe1dfe7aeb155-2\"", "size": 6459206, ... }
```

The second carries a `-2` suffix, meaning multipart upload, meaning that eTag is not the
content MD5. **eTag is usable for change detection on the source side but cannot serve as
a cross-provider integrity check.** Verification needs our own hash computed at copy time.

### The design

1. **Manifest at write time.** For every object copied, stream the bytes once, compute
   SHA-256 in flight, and record `(bucket, path, size, sha256, source_etag, copied_at)`.
   Store the manifest both in a Postgres table and as a JSON object inside the backup
   bucket, so the manifest survives loss of the primary.
2. **Structural diff every run.** List source, list destination, and compare the path set,
   object count, and byte total three ways against the manifest. An object present in
   source and absent in destination is a hard alarm. An object in the destination that is
   not in the manifest is also an alarm, because it means something else is writing there.
3. **Content verification.** At 376 objects and 1.08 GB, re-download the entire
   destination and re-hash against the manifest on every run. Free on B2 within the 3x
   allowance, about $0.09 on S3. Do this now while it is affordable rather than building
   sampling logic you will need to trust later. Add a rolling-sample fallback with an
   explicit log line naming what was skipped only once full verification stops being cheap.
4. **Proof of restorability, quarterly.** Pull 3 objects from the backup to a scratch path,
   one photo, one webm, one mp4, and actually open them. This is the step that catches a
   credential that has silently expired, a path prefix that drifted, and bytes that were
   written but are not decodable. Not a full restore, but it exercises the whole chain.
5. **Alarm on silence, not just on failure.** The common failure is a job that quietly
   stops running. Write a row per run and have something complain when the newest row is
   older than 8 days. This must land through `after()` from `next/server` per the
   serverless rule, or the verification record dies on lambda freeze and the backup
   system's health signal is itself unreliable.
6. **Reconcile pointers, both directions.** Each run should report dangling rows and
   orphan objects the way this recon did. It would have flagged the 3 unreferenced videos
   back in April.

### The honest framing

Steps 1 through 3 prove the bytes are present and identical. Only step 4 proves they are
reachable and usable. A backup verified only structurally is a strong guess, not a
certainty, and should not be described to a family as more than that.

---

## 6. THE CREDENTIAL QUESTION

No credential was created, handled, or read during this recon beyond the sanctioned
read-only `scripts/load-env.ts` path.

### What would be required, for David to create

For Option B on B2: an account, one private bucket, and one application key scoped to that
single bucket with `listBuckets`, `listFiles`, `readFiles`, `writeFiles`, and **explicitly
not `deleteFiles`**. That last part is the whole point. A write-only key means a
compromised Vercel environment or a bug in our own backup job cannot destroy the backup.
Expiry and lifecycle get managed from the B2 console with a credential that never touches
our infrastructure.

Values: `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET`, `B2_ENDPOINT`. Equivalent on S3
with an IAM user whose policy grants `PutObject`, `GetObject`, and `ListBucket`, and denies
`DeleteObject`.

Where they live: Vercel project environment variables, production scope, plus `.env.local`
for any local verification run. Never in the repo, never logged, never echoed. Creating the
key is a stop-and-ask under CLAUDE.md section 1 regardless.

### Three consequences that are not technical

- **Subprocessor disclosure.** `/security` renders an `INFRA` table of where data lives,
  and `/privacy:146` says Basalith runs on "a small number of named service providers." A
  backup vendor is a subprocessor and belongs in both. That is a copy change, not an
  afterthought.
- **The dissolution promise.** `/data-ownership:41` currently says: *"We have no backup of
  your archive that survives a dissolution request."* Today that is trivially true because
  there is no backup. The moment one exists with Object Lock, that sentence becomes false
  unless dissolution explicitly purges the backup. **Object Lock retention must therefore
  be shorter than the 12-month dissolution hold in `/privacy:195`. 90 days is the
  recommendation:** far longer than any realistic window for noticing an accidental delete,
  and comfortably inside the 12-month hold.
- **Nothing currently deletes anything.** `app/api/archive/terminate/route.ts` only sets
  `termination_requested_at` and `scheduled_deletion_at` and sends two emails. No code
  deletes archive content anywhere. Whoever performs the eventual manual deletion needs the
  backup in their checklist from day one, or the first dissolution silently breaks the
  promise on `/data-ownership`.

---

## RECOMMENDATION

**Backblaze B2, additive-only weekly sync, Object Lock at 90 days, full-hash verification
every run.**

### Named tradeoffs

- **Against Option A, a second Supabase project.** A costs $25/mo against B's roughly $0
  and protects against a strictly smaller set of events, because it shares an account, a
  login, and a vendor with the thing it is protecting. A's only real win is that no new
  name goes on the subprocessor list. That is not worth the correlated blast radius.
- **Against Option C.** Not a real option. There is no Supabase product that backs up
  Storage. Confirming this is the single most useful outcome of this recon, because it
  means waiting for a plan upgrade to fix this is waiting forever.
- **B2 against S3.** B2's free egress up to 3x stored is what makes full re-hash
  verification free rather than a line item, and it is what keeps an actual restore from
  being a surprise bill. The cost is vendor weight. AWS is the name an enterprise prospect
  expects to see on a security page and B2 is not. Both are S3-compatible, so if a
  `/security` conversation with an enterprise client ever makes that a problem, moving is a
  credential and endpoint change, not a rewrite. Take the operational property now and
  treat the vendor name as a future, cheap decision.
- **Additive-only, never mirroring deletes.** The cost is that intentionally deleted
  objects linger in the backup for up to 90 days, which is precisely why retention must sit
  inside the dissolution hold window. The benefit is that the failure mode named at the top,
  an accidental delete or a bad migration on our side, cannot propagate. A mirroring sync
  would faithfully replicate the disaster within a week and is worse than no backup,
  because it carries the reassurance without the protection.

### Do alongside, but do not let it delay the backup

The export route is broken for 100% of media on 100% of archives. It is a portability
promise that does not work, and its output is what a family would be handed if we ever
needed one. It is a smaller job than the backup and independently worth fixing.

---

## LOGGED, NOT TOUCHED

Found during this recon. Each needs its own session. None were fixed.

| Finding | Detail |
|---|---|
| Export route media links | 0/316 photos, 0/33 voice. Wrong bucket name, wrong extension, wrong path convention. |
| Orphan video objects | 3 objects in `archive-videos`, 32.88 MB, no DB row. Invisible to every surface. |
| `vault_files` seed rows | 8 rows pointing at `test/placeholder.jpg`, from March 17. |
| Orphan photo prefix | `f44f1818-8f17-499d-8f27-23e286e923f7`, 1 object, 3.08 MB, no `archives` row. |
| Duplicate portrait rows | 6 `voice_portraits` rows all pointing at Hoa `2026-05.mp3`. |
| `getPhotoUrl` builds a public URL | `lib/storage.ts:10` constructs `/object/public/photographs/...`, but recon confirms the `photographs` bucket is `public=false`. Callers include `app/api/game/[sessionId]` and `app/api/contribute/answer`. |
| 21 unreferenced photo objects | In the `photographs` bucket, not referenced by any `photographs` row. |
| `photographs.file_size` drift | Sums to 927.98 MB against 1009.95 MB actually stored. 4 rows null. |

---

## HOW TO REPRODUCE

Four throwaway scripts were used and deleted after the run. To redo this, write a script
importing `./load-env`, create a service-role client, and:

1. `sb.storage.listBuckets()` for the bucket roster.
2. Recursive `sb.storage.from(bucket).list(prefix, { limit: 1000 })`, treating an entry
   with `id === null` as a folder, to walk every object. Read `metadata.size`,
   `metadata.mimetype`, and `metadata.eTag`.
3. Select each pointer table and diff its path column against the walked object set in
   both directions.
4. To retest the export route's paths, call `createSignedUrl` with the constructed guess
   and with the real `storage_path` as a control.

Do not leave these scripts in `scripts/`. They are recon, not tooling.
