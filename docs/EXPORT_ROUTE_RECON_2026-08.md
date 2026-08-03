# ARCHIVE EXPORT ROUTE, RECON

**Date:** August 3, 2026
**Scope:** `app/api/archive/export/route.ts`. Size reality, what the zip contains, the path
fix, delivery options, and whether each satisfies the public promise.
**Status:** Recon only. Nothing was built, no branch, no deploy.
**Provenance:** VERIFIED unless marked otherwise. Every table and quoted block below is live
query output taken August 3, 2026 against project `zmoauexzjfjloqxrkuma` using the service
role key through `scripts/load-env.ts`, read-only. Vercel platform limits are marked
FROM DOCS and are the one thing here that was not confirmed by live query.

---

## THE DECISION, ANSWERED UP FRONT

**Bytes in the zip. Not a manifest.** But not streamed from the request either.

A manifest of signed URLs cannot satisfy "a complete export in open, portable formats"
under any expiry, because the artifact is not the archive. It is a pointer to the archive
held on our infrastructure, which is the exact dependency `/data-ownership` tenet 01 says
does not exist.

Streaming bytes from the export request cannot work at 362 MB. Not because of the download
from Storage, which is fast enough, but because the function stays alive for the duration
of the *family's* download. At 10 Mbps that is 290 seconds of held function on a single
non-resumable stream, and a stall restarts from zero.

The shape that works is a background job that writes a real zip to Storage and emails a
signed link. Detail and tradeoffs in sections 4 and 7.

**Two findings that were not in the brief and change the scope.** Both are in section 2.

1. `training-pairs.json` ships `[]` on every archive on every export, because the route
   selects a column that does not exist. That is 154 rows across the property, and it is
   the one file the README singles out as portable to another model.
2. The same class of bug is live in the `anniversary-triggers` cron, which runs daily and
   errors on every run.

---

## 1. SIZE REALITY

### Per archive, all five buckets

```
=== PER-ARCHIVE TOTAL BYTES, ALL FIVE BUCKETS (Aug 3 2026) ===
1783f9cf  The Hoa Le Tran Archive     140 objs     362.33 MB   photographs=109/310.79MB  voice-recordings=27/7.69MB  archive-videos=4/43.85MB
5040ffac  The Cindy Ha Archive        116 objs     356.60 MB   photographs=116/356.60MB
a38e4503  The Dr Ha Archive            72 objs     196.14 MB   photographs=65/182.62MB  voice-recordings=7/13.52MB
7612e230  The Stevens Ha Archive       46 objs     156.86 MB   photographs=46/156.86MB
vaults  (no archives row)               1 objs       4.06 MB   vault-files=1/4.06MB
f44f1818  (no archives row)             1 objs       3.08 MB   photographs=1/3.08MB
TOTAL: 376 objs  1079.06 MB  (1131481547 bytes)
```

Hoa Le Tran at 362.33 MB is confirmed as the largest, and it is the only archive holding
video. Cindy Ha is 5.73 MB behind it on photographs alone.

### Largest single object

```
=== LARGEST SINGLE OBJECTS (top 12) ===
   12.05 MB  photographs       image/jpeg   1783f9cf-.../1776459942752-contrib-pd4q5eb.jpeg
   11.60 MB  photographs       image/jpeg   5040ffac-.../1779671654125-contrib-0sf9uwh.jpeg
   10.96 MB  archive-videos    video/mp4    1783f9cf-.../1776462511468-contrib-4e858t0.mp4
   10.96 MB  archive-videos    video/mp4    1783f9cf-.../1776462982735-contrib-42cusv9.mp4
   10.96 MB  archive-videos    video/mp4    1783f9cf-.../1776463209934-contrib-gy74q3m.mp4
   10.96 MB  archive-videos    video/mp4    1783f9cf-.../1776463513143-contrib-jex6td5.mp4
    9.54 MB  photographs       image/jpeg   5040ffac-.../1779671654399-contrib-cw2zceb.jpeg

=== SIZE DISTRIBUTION ===
  n=376  min=0.00MB  p50=2.74MB  p90=4.81MB  p99=10.96MB  max=12.05MB
  objects > 10 MB: 6
  objects >  4 MB: 64
```

**The largest single object is 12.05 MB.** Note that on its own it already exceeds the
buffered response limit discussed below. 64 objects, 17% of the property, are over 4.5 MB
individually.

### The two limits, as they apply to this project

**Duration.** `route.ts:7` declares `export const maxDuration = 60`. `vercel.json` does not
list the export route, so 60 seconds is what applies today. The ceiling available is higher:
`vercel.json` already sets 300 on `/api/cron/voice-portrait` and `/api/cron/weekly-mirror`,
and those deploy, which confirms this project is not on the 60-second Hobby cap.
`.vercel/project.json` carries `"orgId":"team_Uug8WTwFMMwVI1kT7MvdXf0g"`, a team org, which
is a paid plan. So 300 seconds is demonstrably reachable. FROM DOCS, Vercel allows higher
than 300 on Pro by configuration.

**Response size.** FROM DOCS, NOT CONFIRMED against this project: Vercel caps a buffered
function response body at 4.5 MB. Streaming responses are not subject to that cap.

The current route returns a buffered response and says so explicitly:

```ts
return new Response(zipBuffer.buffer as ArrayBuffer, {
  headers: {
    'Content-Type':        'application/zip',
    'Content-Disposition': `attachment; filename="basalith-archive-${exportDate}.zip"`,
    'Content-Length':      String(zipBuffer.length),
  },
})
```

An explicit `Content-Length` on a fully materialized buffer is the buffered shape. The cap
applies.

**Can a 362 MB zip be returned at all?** Not in the current shape, and not close. The reason
the route has never hit the limit is that it ships no media, so its output is tiny:

```
=== JSON payload weight: what the 8 JSON files actually cost ===
  1783f9cf  deposits=16 training=0 voice=27 photos=90 contribs=2 dates=0 convos=6
      total JSON bytes (pretty-printed): 45095 (0.04 MB)
  a38e4503  deposits=80 training=0 voice=5 photos=65 contribs=2 dates=0 convos=10
      total JSON bytes (pretty-printed): 69011 (0.07 MB)
```

Adding a single real photograph to that response would put it near or over the cap. The
current route is under the limit only because it is empty.

If you want the 4.5 MB figure confirmed rather than assumed, the cheap test is a preview
deploy of a throwaway route returning a 10 MB buffered body. That is a deploy decision, not
mine to make.

### Measured throughput, and why compression is pointless

Real download from Supabase Storage, 15 objects off the Hoa Le Tran archive:

```
=== REAL STORAGE DOWNLOAD THROUGHPUT (sample of the largest archive) ===
  sequential: 15 objs, 42.14 MB in 19915 ms = 2.12 MB/s
  parallel(8): 15 objs, 42.14 MB in 8086 ms = 5.21 MB/s

  EXTRAPOLATION for Hoa Le Tran, 362.33 MB / 140 objects:
    at sequential rate: 171.2 s  (download only)
    at parallel(8) rate: 69.5 s  (download only)
    NOTE: measured from a Windows dev machine, not a Vercel lambda in us-east.
          Lambda-to-Supabase is likely faster. Treat as a floor, not a ceiling.
```

That floor already exceeds the current 60-second budget before any zipping or any transfer
to the family. A lambda co-located with Storage will do better, possibly much better, and I
cannot measure that without deploying. So treat the download leg as solvable and do not
build the decision on it.

Compression, however, is measured and decisive:

```
=== ZIP COMPRESSION GAIN ON REAL MEDIA ===
  8 real JPEGs: raw 20.49 MB -> DEFLATE level 6 20.43 MB
  ratio: 99.7% of original. compression time 1248 ms
  same 8 with STORE (no compression): 20.49 MB, 60 ms
```

DEFLATE level 6 saves 0.3% and costs 20x the CPU time. Extrapolated to 362 MB that is
roughly 22 seconds of pure compression to save about 1 MB. The mime mix explains it:

```
  image/jpeg          338 objs    1014.01 MB
  video/mp4             4 objs      43.85 MB
  audio/webm, mp3, mpeg, m4a  34 objs   21.20 MB
```

100% of the bytes are already-compressed formats. **Any zip built here must use STORE, not
DEFLATE.** The current route uses `level: 6`. That is a straight loss of a third of the
60-second budget for nothing.

---

## 2. WHAT THE CURRENT ROUTE PRODUCES

### Structure

```
basalith-export/
  archive-info.json
  README.txt
  deposits/deposits.json
  training-pairs/training-pairs.json
  voice-recordings/recordings.json
  photographs/photos.json
  contributors/contributors.json
  significant-dates/dates.json
  entity-conversations/conversations.json
```

Nine files. Zero bytes of Storage. Media appears only as a `downloadUrl` string per row.

### The README, verbatim

This is what a family was told. Reproduced exactly from `route.ts:128-157`.

```
BASALITH ARCHIVE EXPORT
Generated: 2026-08-03
Archive: The Dr Ha Archive

Your data belongs to you.

This export contains everything Basalith has stored for your archive in open,
readable formats.

FILES INCLUDED:
  archive-info.json          Archive metadata
  deposits/                  All owner deposits (prompts and responses)
  training-pairs/            Entity training data (prompt/completion pairs)
  voice-recordings/          Voice recording metadata and download links
  photographs/               Photograph metadata, captions, and download links
  contributors/              Family contributors (no emails or tokens)
  significant-dates/         Important dates in your archive
  entity-conversations/      Entity chat history (last 500 exchanges)

ABOUT YOUR DATA:
  Training pairs can be used to fine-tune any compatible language model.
  Voice recordings are in M4A format and can be used with any voice synthesis platform.
  Photographs are in JPEG format.
  Download links in JSON files expire after 24 hours.

For questions: hello@basalith.xyz
Security concerns: security@basalith.ai

Heritage Nexus Inc.
```

Six claims in that text are false as written:

| README says | Reality |
|---|---|
| "everything Basalith has stored for your archive" | Nine tables and four buckets are absent. Table below. |
| "Training pairs can be used to fine-tune any compatible language model" | The file is `[]` on every archive. See below. |
| "Voice recordings are in M4A format" | Real formats are webm and mp3. One m4a object exists on the whole property. |
| "Photographs are in JPEG format" | True of the bytes, but no bytes are in the zip and 0/316 links resolve. |
| "download links" (voice and photographs) | `downloadUrl` is null on 316/316 photos and 33/33 recordings. |
| "Download links in JSON files expire after 24 hours" | Implies they work until then. They never worked. |

The tone problem is worse than the factual one. "Your data belongs to you" sits three lines
above a list of files that do not contain the family's photographs, their voice, or their
video.

### NEW FINDING: two of the eight JSON files are silently empty

The route's eight queries, run verbatim against Dr Ha:

```
=== THE EXPORT ROUTE'S EIGHT QUERIES, RUN VERBATIM AGAINST Dr Ha ===

archives               rows=   1  ok
owner_deposits         rows=  80  ok
training_pairs         rows=   0  ERROR: column training_pairs.dimension does not exist
voice_recordings       rows=   5  ok
photographs+labels     rows=  65  ok
contributors           rows=   2  ok
significant_dates      rows=   0  ERROR: column significant_dates.label does not exist
entity_conversations   rows=  10  ok
```

`route.ts:41` selects `dimension` from `training_pairs`. That column does not exist. The
live columns are:

```
training_pairs: id, created_at, archive_id, source_id, source_type, prompt, completion,
system_prompt, quality_score, specificity_score, authenticity_score, trainability_score,
length_score, word_count, included_in_training, training_run_id, language, metadata
```

Per CLAUDE.md section 5, dimension tags live inside the `metadata` jsonb, not in a column.

**Why this fails silently.** `Promise.allSettled` treats a Supabase error as a *fulfilled*
promise carrying `{data: null, error}`. The `get()` helper at `route.ts:49-50` then does
`r.value.data ?? []`. An errored query becomes an empty array with nothing logged. The zip
ships a well-formed, valid, empty JSON file and neither the family nor we can tell.

What that costs:

```
=== training_pairs per archive: what training-pairs.json silently drops ===
  Hoa Le Tran    training_pairs rows = 17  -> export ships []
  Dr Ha          training_pairs rows = 60  -> export ships []
  Cindy Ha       training_pairs rows = 23  -> export ships []
  Stevens Ha     training_pairs rows = 13  -> export ships []
  Founder Test   training_pairs rows = 41  -> export ships []
```

154 rows. This is the file the README names as the portable asset, and it is the one thing
in the export that would genuinely let a family take the entity elsewhere. It has never
contained a single row.

`significant_dates.label` is the same defect but currently costs nothing, because the table
holds 0 rows property-wide. The column bisect:

```
=== significant_dates: bisecting the real column names ===
  label        MISSING      date_type    exists      month        exists
  day          exists       year         exists      notes        exists
  active       exists       archive_id   exists
  title        MISSING      name         MISSING     occasion     MISSING
```

`supabase/migrations/20260512_retention_mechanics.sql:14` adds `label` and
`notify_annually`. Neither exists live. Both are MISSING. This is the migration drift
CLAUDE.md section 6 already warns about, on a second table.

### NEW FINDING, OUT OF SCOPE: the same bug is live in a daily cron

`app/api/cron/anniversary-triggers/route.ts:147` selects the same non-existent `label`:

```
=== anniversary-triggers cron line 147, run verbatim ===
  rows=0  ERROR: column significant_dates.label does not exist

=== same select without `label` ===
  rows=0  ok
```

That cron runs `0 8 * * *` per `vercel.json`. It errors every morning. The impact is
currently zero because `significant_dates` has no rows either way, so no anniversary email
has ever been owed. But the moment a date is added, the feature stays dead and nothing
says so. **Logged, not touched. It needs its own session.**

### What is absent from the export entirely

Verified against the route's eight queries. None of these are read.

| Absent | Rows | Objects | Bytes |
|---|---|---|---|
| `archive_videos` | 1 | 4 in bucket | 43.85 MB |
| `archive_documents` | 0 | 0 | 0 |
| `voice_portraits` | 9 | 4 distinct files | 4.10 MB |
| `vault_files` | 9 | 1 real, 8 are `test/placeholder.jpg` | 4.06 MB |
| `mirror_reflections` | 12 | n/a | n/a |
| `incident_sessions` | 4 | n/a | n/a |
| `deposit_domain_scores` | 303 | n/a | n/a |
| `successors` | 2 | n/a | n/a |
| `archive_lifecycle` | 4 | n/a | n/a |

The video omission is the sharp one. 43.85 MB of contributor video on the Hoa Le Tran
archive appears in the export in no form at all, not even as a filename.

`vault_files` is a special case and probably should stay out. It links through
`vault_id` to `vaults`, and `vaults` has **no `archive_id` column**:

```
  vaults columns: id, created_at, archivist_id, display_name, tier, status,
                  essence_percent, storage_used_bytes, storage_limit_bytes,
                  stripe_subscription_id, stripe_customer_id
```

Vault files belong to a Legacy Guide, not to an archive owner. Putting them in an owner's
export would be a data exposure, not a fix. Flagging rather than assuming.

---

## 3. THE PATH FIX

### Every constructed path, and what it should read instead

**Voice, `route.ts:87-97`.** Three independent faults plus a fourth nobody has named.

```ts
const { data } = await supabaseAdmin.storage.from('voice_recordings').createSignedUrl(
  `${archiveId}/${r.id}.m4a`, 86400
)
```

| Fault | Current | Correct |
|---|---|---|
| Bucket name | `voice_recordings` (underscore) | `voice-recordings` (hyphen). The underscore bucket does not exist. |
| Path | `${archiveId}/${r.id}.m4a` | read `voice_recordings.storage_path` |
| Extension | `.m4a` | not applicable once the column is read. Real objects are webm and mp3. |
| **Select** | `route.ts:42` never fetches `storage_path` | the column must be added to the select before it can be read |

That fourth row is the one that matters for implementation. The fix is not a one-line path
change, because the data the fix needs is not in the result set.

There is also a row-level trap. 3 of 33 `voice_recordings` carry values that are not
Storage paths at all:

```
  sample storage_path = "twilio:REf41da8e7e355d4081edb81d167d35f76"
```

Two are `twilio:` pseudo-paths and one is `pending/REprobe...`. These must be skipped by an
explicit check and reported as such, not passed to `createSignedUrl` and silently nulled.
Nulling them is how the current defect stayed invisible for five months.

**Photographs, `route.ts:102-112`.**

```ts
const { data: signed } = await supabaseAdmin.storage.from('photographs').createSignedUrl(
  `${archiveId}/${p.id}.jpg`, 86400
)
```

| Fault | Current | Correct |
|---|---|---|
| Bucket name | `photographs` | correct, no change |
| Path | `${archiveId}/${p.id}.jpg` | read `photographs.storage_path` |
| Extension | `.jpg` | not applicable. Real objects are 330 `.jpeg` and 7 `.jpg`. |
| **Select** | `route.ts:43` never fetches `storage_path` | must be added to the select |

Live sample confirming the real convention is `{timestamp}-{nonce}.jpeg`:

```
  photographs   rows=316  col=storage_path  bucket=photographs
      sample storage_path = "a38e4503-c7d2-4af3-af8c-cacd66974e0b/1776716254039-rgz8dscvn.jpeg"
```

`thumbnail_path` is populated on 0 of 316 rows, so there is no smaller variant to fall back
to. It is the full object or nothing.

### Tables the route does not query, with the correct column and bucket

```
  archive_videos      rows=1  col=storage_path  bucket=archive-videos
      sample storage_path = "1783f9cf-.../1776463513143-contrib-jex6td5.mp4"
  archive_documents   rows=0  col=storage_path  bucket=archive-documents
  vault_files         rows=9  col=storage_path  bucket=vault-files
      sample storage_path = "test/placeholder.jpg"
  voice_portraits     rows=9  col=audio_path    bucket=voice-recordings
      sample audio_path = "1783f9cf-.../portraits/2026-05.mp3"
```

| Table | Path column | Bucket | Include in export? |
|---|---|---|---|
| `archive_videos` | `storage_path` | `archive-videos` | **Yes.** 43.85 MB of family video currently invisible. |
| `archive_documents` | `storage_path` | `archive-documents` | Yes, structurally. 0 rows today. |
| `voice_portraits` | **`audio_path`** | `voice-recordings` | Yes. 4 files, and per CLAUDE.md they are the last artifact of two decommissioned clones. |
| `vault_files` | `storage_path` | `vault-files` | **No.** Legacy Guide scope, not archive scope. See section 2. |

`voice_portraits.audio_path` is the trap. Every other table uses `storage_path`. Nine rows
point at only four distinct files, six of them at the same Hoa `2026-05.mp3`, so a naive
loop writes the same file six times into the zip. Deduplicate by path.

Also worth knowing: `archive_videos` has 1 row against 4 objects in the bucket. Reading the
table gets you one video. The other three, 32.88 MB, are orphans with no row and would still
be missed. That is the storage recon's open finding and it is not fixable from the table.

---

## 4. STREAMING OPTIONS

Four shapes. Judged against 60 seconds today, 300 seconds reachable, and 362.33 MB.

### The constraint everyone gets wrong

Time to download from Storage is not the binding limit. **Time for the family to receive
the bytes is.** If the function streams, the function is alive until the last byte lands on
the family's iPad.

362.33 MB is 2,898 megabits.

| Family downlink | Transfer time | Fits 60s? | Fits 300s? |
|---|---|---|---|
| 10 Mbps | 290 s | No | Barely, with zero stalls |
| 25 Mbps | 116 s | No | Yes |
| 50 Mbps | 58 s | Marginal | Yes |
| 100 Mbps | 29 s | Yes | Yes |

And a zip stream is not resumable. There is no HTTP range support on a stream generated on
the fly, because the zip central directory is not known until the end. A dropped connection
at 90% restarts at 0%. CLAUDE.md section 10 requires this to work for a non-technical
seventy year old on an iPad. A 290-second single-shot download with no resume does not.

### Option A. Buffered zip with bytes, current shape plus media

**Does not fit.** Fails on three independent limits at once. The 4.5 MB buffered response
cap kills it before anything else does, since the single largest object is 12.05 MB.
Memory is the second killer: JSZip `nodebuffer` holds all input and all output in RAM, so
362 MB in plus 362 MB out is roughly 750 MB peak before Node overhead. Duration is third.

Cost: zero to build, it is the smallest diff. Worthless, because it cannot return.

### Option B. Streamed zip from the export request

Replace the buffered `Response` with a `ReadableStream` and pipe objects through as they
download. Escapes the response size cap, which is the real win. Uses STORE so there is no
CPU cost.

**Fits 60 seconds: no.** Measured download floor alone is 69.5 s, and transfer is on top.
**Fits 300 seconds: for some families, not all.** The 10 Mbps row above is 290 s of held
function with no margin.
**Survives 362 MB: not reliably.** Non-resumable is the disqualifier, not the arithmetic.

Cost: moderate. Requires abandoning JSZip, which has no true streaming output, for a
streaming zip writer. New dependency.

Where it does work is small archives. Stevens Ha at 156.86 MB over 25 Mbps is 50 seconds.
That is the basis of Option E, and the reason to be skeptical of it.

### Option C. Background job, zip written to Storage, signed link emailed

Inngest is already wired and running real functions in production: `app/api/inngest/route.ts`
serves eight, including `filterAgent`, `trainingScorer`, and five billing functions. This is
not new infrastructure.

The decisive property is that **each Inngest step is its own function invocation.** The job
can be many steps, each well inside 300 seconds, and the total wall time of the job is
unbounded. Nothing holds a connection to the family.

Delivery is a Supabase signed URL to the finished object. Supabase serves those bytes
directly with range support and resumability, no lambda in the path, no timeout. A stalled
download resumes.

**Fits the timeout: yes,** with room. **Survives 362 MB: yes.** **Survives 3.6 GB in three
years: yes.**

Cost, and it is real:

- A new private bucket. None exists. The live bucket roster is `vault-files`,
  `voice-recordings`, `archive-videos`, `archive-documents`, `photographs`, and nothing else.
  There is nowhere to write a generated export file today.
- **A second full plaintext copy of the most sensitive data on the property**, sitting in
  Storage for the life of the link. Section 7 covers retention.
- A reaper. Supabase Storage has no native object TTL or lifecycle rule, so deletion is a
  cron you have to build and monitor. A reaper that fails silently accumulates complete
  copies of every archive that was ever exported. Per the storage recon's own conclusion,
  that needs alarm-on-silence, not alarm-on-failure.
- **It must be excluded from the B2 backup sync.** This is the cross-finding that matters.
  The storage recon recommends additive-only sync with Object Lock at 90 days. If the export
  bucket is inside that sync, every export becomes a full archive copy that literally cannot
  be deleted for 90 days, and `/data-ownership:41`, "We have no backup of your archive that
  survives a dissolution request," becomes false in the most direct way possible.
- Dissolution must purge it. `app/api/archive/terminate/route.ts` currently deletes nothing,
  it only sets `termination_requested_at` and `scheduled_deletion_at`. Whoever runs the
  eventual manual deletion needs the export bucket on the checklist from day one.

### Option D. Manifest with correct signed URLs, the current shape repaired

Fix the paths, fix the two broken selects, add the four missing tables, keep the media as
links. Smallest honest diff.

**Fits everything trivially.** Output stays under 100 KB. No timeout, no size cap, no
memory, no new bucket, no reaper, no backup coupling, no second copy.

And it does not satisfy the promise. Section 5.

Cost: low. Value: real but partial. It converts a broken thing into a working thing that is
still the wrong thing.

### Option E. Threshold hybrid, stream small archives inline, queue large ones

Stream under some cutoff, background job above it.

Two user-visible code paths for one button, an arbitrary threshold, and the failure mode
lands exactly on the family whose connection is slow, which is not correlated with archive
size. Today it would send Stevens Ha and Dr Ha down one path and Hoa Le Tran and Cindy Ha
down the other, which means the two archives with the most in them get the less-tested path.

Not recommended. It doubles the surface to maintain and to explain, in exchange for saving
one email on the two smallest archives.

---

## 5. WHAT PORTABLE ACTUALLY REQUIRES

### The promise, verbatim

`/terms:33`, section 03 Cancellation:

> Upon cancellation, you retain full rights to a complete export of your archive in open,
> portable formats. This export right is unconditional and does not require a reason. Export
> requests are fulfilled within 30 business days.

`/terms:33`, same section, final paragraph:

> If Basalith ceases operations for any reason, you may request a complete export of your
> archive in open and portable formats, fulfilled within 30 business days. Because the
> archive is always yours to hold, no closure can strand your data.

`/privacy:195`, section 8:

> You own your archive, and you may request a complete export of it in open, portable
> formats. Export requests are fulfilled within 30 business days.
> Because you keep ownership and can export, your archive does not depend on the continued
> existence of Basalith as a company.

`/data-ownership:41`, tenet 04:

> Dissolution is irreversible. We have no backup of your archive that survives a dissolution
> request.

`/data-ownership` tenet 01, "Absolute Ownership," is the one the export has to carry.

### The load-bearing sentence

**"Because the archive is always yours to hold, no closure can strand your data."**

That sentence, and its twin in `/privacy`, is a claim about what the family physically
possesses after an export. It is the standard the export artifact has to meet, and it is
stricter than "complete."

An export whose media is a set of signed URLs pointing at Supabase fails it outright. If
Basalith ceases operations, the links die with the project. The family holds a JSON catalog
of photographs they cannot open. That is precisely the stranding the sentence says cannot
happen.

### Plain verdict per option

| Option | Complete? | Open, portable formats? | Survives our closure? | Satisfies the promise as written? |
|---|---|---|---|---|
| A. Buffered zip with bytes | Would be | Yes | Yes | **Cannot ship. Fails the response cap.** |
| B. Streamed zip | Yes | Yes | Yes | **Yes in principle, no in practice.** Undeliverable to a slow connection with no resume. |
| C. Background job to Storage | Yes | Yes | Yes | **Yes.** The family ends up holding the bytes. |
| D. Repaired manifest | No | JSON yes, media absent | **No** | **No.** |
| E. Hybrid | Yes | Yes | Yes | Yes, by two different mechanisms with different failure modes. |

**Option D stated plainly, since it is the tempting one:** a manifest of expiring links is
not a complete export in portable formats. It is a catalog. It satisfies the word "export"
and none of the meaning. Shipping D and calling the promise met would be exactly the class
of claim CLAUDE.md section 8's standing integrity rule prohibits, a mechanism described as
real that cannot be pointed to.

### The reframing that makes this tractable

The public promise is **not** a promise of an instant self-serve download. Both `/terms` and
`/privacy` say "Export **requests** are **fulfilled** within 30 business days." That is a
human-or-job-fulfilled SLA with a month of headroom.

Nothing in the public copy obliges the button to return a zip in the same HTTP response.
The button is a courtesy layered on top of the promise. It is failing not because it is slow
but because it hands over something that is not the thing.

This is what makes Option C correct rather than a compromise. A background job that finishes
in minutes is not a degradation against a 30-business-day commitment. It is two orders of
magnitude inside it.

One gap worth naming: the export route is owner-only. `route.ts:24` re-verifies
`archives.owner_user_id === session.userId`, so a successor or Custodian cannot call it. But
`/terms:33` contemplates export by an executor, and dissolution can be invoked by a
Custodian. The 30-business-day manual path covers that today. It should not be quietly
forgotten when the button starts working.

---

## 6. THE 24-HOUR FUSE

### What is actually wrong with the current README line

Not the duration. The line is:

```
  Download links in JSON files expire after 24 hours.
```

The defect is that the sentence presupposes the links work. It sets an expectation of
"reachable now, unreachable tomorrow," when the truth is "unreachable, always, on 316/316
photographs and 33/33 recordings." A family reading it in month two concludes they waited
too long. They did not. There was never anything there.

Any copy change that only adjusts the number preserves the lie.

### If signed URLs stay in any form, what expiry is honest

The rule: **the link's expiry must equal the object's actual retention, and the copy must
state an absolute date, not a relative duration.**

Existing precedent in the codebase runs from 300 seconds to 30 days:

```
=== createSignedUrl expiries in code ===
      3 createSignedUrl(photo.storage_path, 3600)
      2 createSignedUrl(storagePath, 300)
      1 createSignedUrl(audioPath, 60 * 60 * 24 * 30)
```

The 30-day one is the voice portrait email, and per CLAUDE.md that is the exact mechanism
that has already failed a family: the May and June portrait links have expired and those
families cannot reach audio we still hold. That is the precedent to learn from, not repeat.

Recommendation under Option C:

- **Object retention: 7 days.** Long enough for a family to notice an email, be away for a
  weekend, and act. Short enough that a complete plaintext copy of the archive is not
  sitting in Storage indefinitely.
- **Signed URL expiry: 7 days, matched exactly to the object's deletion.** Never longer than
  the file's life. A live link to a deleted object produces a 404 the family reads as data
  loss.
- **State the absolute date.** "This link works until August 12, 2026. After that the file
  is deleted from our servers and you can request another at any time." Absolute date,
  explicit deletion, and an explicit re-request path.
- **The re-request path is what makes 7 days safe.** The family is not on a deadline to
  preserve their archive. They are on a deadline to download one particular copy of it,
  and they can ask for another. The current README offers no such reassurance because there
  is nothing to re-request.
- **The zip itself must carry no expiring links at all.** Once the bytes are inside, the
  README should say so, and every `downloadUrl` field should be gone. A self-contained
  artifact with an expiring pointer inside it is not self-contained.

### What the README should stop claiming

Independent of which option ships, three lines need to go or change, because they are false
today and two of them stay false under every option:

- "This export contains everything Basalith has stored for your archive." Nine tables are
  absent. Either fix the scope or describe the scope.
- "Voice recordings are in M4A format." They are webm and mp3.
- "Training pairs can be used to fine-tune any compatible language model." True only once
  the file stops being empty.

---

## 7. RECOMMENDATION

**Option C. Background job, real bytes, STORE not DEFLATE, written to a new private
`archive-exports` bucket, delivered by an emailed signed link with a 7-day matched life,
excluded from the B2 backup, and on the dissolution deletion checklist.**

The button changes from a download trigger to a request trigger, and says so.

### Sequencing, because one piece is unconditional

**Do the path fix first and separately.** Reading `storage_path` and `audio_path` instead of
constructing paths, adding those columns to the two selects, fixing the
`training_pairs.dimension` and `significant_dates.label` errors, and skipping the three
`twilio:` pseudo-paths are required by *every* option including doing nothing. That work is
small, independently verifiable, and unblocks everything else. It is also the fix that stops
`training-pairs.json` shipping empty, which is a live promise failure today with 154 rows
behind it.

The delivery shape is the second, larger decision and does not need to block the first.

### Named tradeoffs

**Against Option D, the repaired manifest.** D is cheaper by a wide margin: no bucket, no
reaper, no backup coupling, no second copy of the crown jewels. Its cost is that it does not
satisfy the promise, and specifically it does not satisfy "no closure can strand your
data," because every link in it dies with the Supabase project. Shipping D would mean
knowingly leaving a portability claim unbacked. That is the one tradeoff this repo's
integrity rule does not permit. If cost forced a phase, D is an acceptable *intermediate*
state only if the README stops describing itself as a complete export while it is live.

**Against Option B, streamed from the request.** B avoids the second copy entirely, which is
genuinely the strongest security argument available and I do not want to undersell it. No
new bucket, no reaper, no retention window, nothing to purge on dissolution. It loses on one
thing: resumability. A 362 MB non-resumable stream that must complete inside a function
lifetime will fail for exactly the family CLAUDE.md section 10 names, the seventy year old
on an iPad on home wifi. And it fails at 95%, repeatedly, with no partial credit. Storage-
served bytes resume. That is worth accepting a managed second copy for.

**Against Option E, the hybrid.** E is a real option and its appeal is that most archives
are small. It loses on maintenance honesty: two delivery mechanisms behind one button means
two failure modes, two sets of copy, and the less-exercised path is the one carrying the two
largest archives. One mechanism that works for 362 MB also works for 156 MB. Build one.

**Against Option A.** Not an option. It cannot return a response.

**On STORE versus DEFLATE.** Measured, 99.7% ratio, 20x the time. Use STORE. The only cost
is that the zip is not smaller than its contents, which is already true at 99.7%. If a zip
is wanted purely as a container rather than a compressor, that is exactly what STORE is.

**On retention length.** 7 days is a judgment call and the tradeoff is legible in both
directions. Shorter, say 48 hours, reduces the exposure window but raises the chance a
family misses it and has to re-request, which erodes trust in a feature whose whole purpose
is trust. Longer, say 30 days, matches the voice-portrait precedent and is exactly the
precedent that already failed a family. 7 days with an absolute date and a standing
re-request offer is the shape that fails safe in both directions.

### The one thing that must not be forgotten

The export bucket has to be excluded from the storage backup sync, and it has to be on the
dissolution deletion checklist, from the first commit. If either is missed, the result is a
complete, plaintext, Object-Locked copy of a family's archive that we have promised in
writing does not exist. That is not a bug. Per CLAUDE.md section 7, it is a broken promise
that cannot be repaired.

---

## LOGGED, NOT TOUCHED

Found during this recon. None were fixed.

| Finding | Detail |
|---|---|
| `training_pairs.dimension` does not exist | `route.ts:41`. 154 rows across the property ship as `[]` on every export. Dimension tags live in `metadata` jsonb per CLAUDE.md section 5. |
| `significant_dates.label` does not exist | `route.ts:45` and `anniversary-triggers/route.ts:147`. The daily cron errors every run. `notify_annually` is also missing. Migration `20260512_retention_mechanics.sql:14` claims to add both. |
| `Promise.allSettled` + `?? []` swallows query errors | `route.ts:38-50`. Any failing query becomes a valid empty JSON file with nothing logged. This is the mechanism that hid the two above. |
| Export is owner-only | `route.ts:24`. A successor or Custodian cannot self-serve, though `/terms:33` contemplates executor export. Covered by the manual path today. |
| `voice_portraits` duplicate rows | 9 rows, 4 distinct files, 6 pointing at the same Hoa `2026-05.mp3`. Any export loop must dedupe by path. Already logged in the storage recon. |
| `vaults` has no `archive_id` | Vault files are Legacy Guide scoped. They should not enter an archive owner's export. |
| No exports bucket exists | Confirmed live. Option C requires creating one. |

---

## HOW TO REPRODUCE

Five throwaway scripts were used and left in the session scratchpad, not in `scripts/`.
To redo this, write a script importing `scripts/load-env`, create a service-role client, and:

1. Recursive `sb.storage.from(bucket).list(prefix, { limit: 1000 })` over all five buckets,
   treating `id === null` as a folder. Group by the first path segment for per-archive
   totals, and sort by `metadata.size` for the largest object.
2. Run the export route's eight `select()` calls verbatim and print `error.message` on each.
   This is the step that surfaces the two silent failures, and it will not surface them if
   you only check `data.length`.
3. Bisect a suspect table's columns by selecting each name individually and recording which
   ones error.
4. Time `storage.download()` over a sample, sequential and at concurrency 8, and extrapolate.
   Note the measurement is dev-machine-to-Supabase, not lambda-to-Supabase.
5. Zip 8 real JPEGs with `DEFLATE` level 6 and again with `STORE`, and compare both output
   size and elapsed time.
