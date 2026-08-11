/**
 * Storage backup: the sync and verify jobs.
 *
 * Spec: docs/STORAGE_BACKUP_SKELETON_2026-08.md section 3.
 *
 * Two Inngest crons. The heartbeat that watches them is deliberately NOT here,
 * it is a Vercel cron at app/api/cron/storage-backup-heartbeat, because a dead
 * job does not report its own death and a watcher sharing a scheduler with the
 * thing it watches is not a watcher.
 *
 * after() does not apply in this file. The serverless rule exists because
 * post-response work dies on lambda freeze, and there is no request-scoped async
 * work here. Inngest steps are the durable primitive and each one is its own
 * invocation. Skeleton 3.2.
 */
import { createHash } from 'node:crypto'
import { inngest } from '@/lib/inngest'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import {
  ALARM,
  ALLOWLIST,
  BUDGET_CHECK_EVERY,
  LOCK_RETENTION_DAYS,
  MAX_COPIES_PER_RUN,
  ROLLING_WINDOW_DAYS,
  SCOPED_RUN_KIND,
  SILENCE_SYNC_DAYS,
  a1MissingDetail,
  applyArchiveScope,
  archiveIdFromPath,
  resolveRunScope,
  b2Key,
  checkBudget,
  checkRoster,
  diffSourceAgainstManifest,
  isEmptyFolderPlaceholder,
  manifestSnapshotKey,
  threeWayDiff,
  toSnapshotEntry,
  type Alarm,
  type AlarmCode,
  type AllowlistBucket,
  type ManifestEntry,
  type SourceObject,
} from '@/lib/storageBackup'
import { getObjectBytes, listAll, putLocked } from '@/lib/storageBackupB2'

const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'legacy@basalith.xyz'

/**
 * A4 continues on the allowlist and stays green: a new bucket appearing is a
 * thing to know about within a day, not a reason to stop backing up the four
 * that matter. A8 is a notice. Everything else fails the run.
 */
const SOFT_ALARMS: AlarmCode[] = [ALARM.A4_UNKNOWN_BUCKET, ALARM.A8_CAPPED]

function isHard(alarms: Alarm[]): boolean {
  return alarms.some((a) => !SOFT_ALARMS.includes(a.code))
}

/** The pointer table behind each allowlist bucket. All four key on storage_path. */
const POINTER_TABLE: Record<AllowlistBucket, string> = {
  photographs: 'photographs',
  'voice-recordings': 'voice_recordings',
  'archive-videos': 'archive_videos',
  'archive-documents': 'archive_documents',
}

type PointerRow = Record<string, unknown>
type PointerMap = Record<string, Record<string, PointerRow>>

async function alertAdmin(subject: string, lines: string[]): Promise<void> {
  try {
    await resend.emails.send({
      from: RESEND_FROM,
      to: ADMIN_EMAIL,
      subject: `[basalith] ${subject}`,
      html: `<pre style="font:13px/1.5 monospace;white-space:pre-wrap">${lines
        .map((l) => l.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c] ?? c))
        .join('\n')}</pre>`,
    })
  } catch (e) {
    // Never let the alert failure mask the original failure.
    console.error('[storage-backup] admin alert failed to send:', e)
  }
}

/**
 * One admin alert for a crash, wherever in the run it happened.
 *
 * Until August 11, 2026 alertAdmin was only reachable from the alarm paths
 * inside the try block. An exception closed the run red, rethrew, and notified
 * nobody. That is how the first real B2 write failed: a correct red run row, an
 * accurate error string, and silence. The next signal would have been
 * A5_SILENCE from the heartbeat, up to SILENCE_SYNC_DAYS later, which is within
 * the designed threshold and still wrong for a design whose whole posture is
 * that failures are loud. It matters more once the daily cron goes on after 9d.
 *
 * The alertState flag is what stops a hard-alarm run sending twice: the alarm
 * paths set it before they throw, and this returns early when they have.
 *
 * NOT COVERED, and named rather than hidden: a lambda OOM or a timeout kills the
 * invocation without unwinding, so no catch in this file runs. Inngest still
 * marks the run failed. An `onFailure` handler on the function would cover that
 * class and is the obvious next step, not built here.
 */
async function alertOnCrash(
  label: string,
  state: { alerted: boolean },
  err: unknown,
): Promise<void> {
  if (state.alerted) return
  state.alerted = true
  const e = err as Error
  await alertAdmin(`${label} FAILED`, [
    `${e?.name ?? 'Error'}: ${e?.message ?? String(err)}`,
    '',
    'This failure raised no alarm of its own, so this email is the only immediate signal it',
    `produced. Without it the next signal is A5_SILENCE from the daily heartbeat, up to`,
    `${SILENCE_SYNC_DAYS} days later.`,
    '',
    (e?.stack ?? '').split('\n').slice(0, 8).join('\n'),
  ])
}

// ── Shared I/O helpers ───────────────────────────────────────────────────────

/**
 * Recursive, paginated listing of one bucket. Supabase caps a page at 1000.
 *
 * Exported for lib/inngest/storageBackupWalk.test.ts. It is the only place the
 * placeholder filter is applied, so it is the only place that can be tested for
 * having it.
 */
export async function walkBucket(bucket: string, prefix: string, out: SourceObject[]): Promise<void> {
  const PAGE = 1000
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(prefix, { limit: PAGE, offset })
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`)
    const entries = data ?? []

    for (const entry of entries) {
      const full = prefix ? `${prefix}/${entry.name}` : entry.name
      // A folder placeholder has a null id. A real object does not.
      if ((entry as { id?: string | null }).id === null) {
        await walkBucket(bucket, full, out)
      } else if (isEmptyFolderPlaceholder(entry.name)) {
        // Supabase's empty-prefix marker. It has a real id, so the id check
        // above does not catch it, and without this it is copied to B2 under a
        // 90 day lock as a zero byte non-file. Dropped here on the source walk
        // so it never becomes a SourceObject and never reaches the diff.
        // Name match only. See isEmptyFolderPlaceholder for why not by size.
        continue
      } else {
        const md = entry.metadata as { size?: number; eTag?: string } | null
        out.push({
          bucket,
          path: full,
          size: md?.size ?? 0,
          etag: md?.eTag ?? null,
          createdAt: entry.created_at ?? null,
        })
      }
    }

    if (entries.length < PAGE) break
  }
}

async function loadManifest(): Promise<ManifestEntry[]> {
  const PAGE = 1000
  const rows: ManifestEntry[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin
      .from('storage_backup_objects')
      .select('bucket, path, size_bytes, source_etag')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`load-manifest: ${error.message}`)
    const page = (data ?? []) as ManifestEntry[]
    rows.push(...page)
    if (page.length < PAGE) break
  }
  return rows
}

/**
 * One lookup per pointer table at the start of the run, held in a map, read per
 * object. A decoration on the copy, not a filter on it: the object is copied
 * whether or not a row is found. Null records that it was an orphan when taken,
 * which is true of 22 objects today.
 */
async function loadPointers(buckets: string[]): Promise<PointerMap> {
  const map: PointerMap = {}
  for (const bucket of buckets) {
    const table = POINTER_TABLE[bucket as AllowlistBucket]
    if (!table) continue
    const byPath: Record<string, PointerRow> = {}
    const PAGE = 1000
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabaseAdmin.from(table).select('*').range(from, from + PAGE - 1)
      if (error) throw new Error(`load-pointers ${table}: ${error.message}`)
      const page = (data ?? []) as PointerRow[]
      for (const row of page) {
        const p = row.storage_path
        // voice_recordings carries 'twilio:RExxxx' sentinels for Twilio-hosted
        // audio, which are not Storage paths. They simply never match, and the
        // corresponding objects resolve to null, which is correct.
        if (typeof p === 'string' && p.length) byPath[p] = row
      }
      if (page.length < PAGE) break
    }
    map[bucket] = byPath
  }
  return map
}

async function closeRun(
  runId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('storage_backup_runs')
    .update({ finished_at: new Date().toISOString(), ...patch })
    .eq('id', runId)
  if (error) console.error(`[storage-backup] close-run ${runId} failed: ${error.message}`)
}

// ── storage-backup-sync ──────────────────────────────────────────────────────

interface SyncEventData {
  /**
   * 'seed' or 'sync' only. 'scoped' is DERIVED from onlyArchiveId and can never
   * be requested, so an event cannot claim a kind the run did not earn.
   */
  kind?: 'seed' | 'sync'
  dryRun?: boolean
  continuedFrom?: string
  /**
   * Build order 9a. Restrict this run to the one archive named here. Every other
   * object leaves the source set before the diff, including every object whose
   * path carries no uuid prefix.
   *
   * Setting this forces kind to SCOPED_RUN_KIND, which the heartbeat does not
   * count toward silence, and writes the id to storage_backup_runs.scope_archive_id,
   * which the CHECK added in 20260809_storage_backup_scoped_kind.sql requires.
   */
  onlyArchiveId?: string
}

export const storageBackupSync = inngest.createFunction(
  {
    id: 'storage-backup-sync',
    name: 'Storage backup sync',
    retries: 2,
    // One at a time. Two syncs racing would double-read the same objects
    // against a metered egress line and interleave their byte accounting.
    concurrency: { limit: 1 },
    // EVENT TRIGGERED ONLY, DELIBERATELY. There is no cron here yet.
    //
    // A '0 4 * * *' cron was specified and is not wired, because registering
    // this function would then have seeded the whole property on its own, the
    // night after the first production deploy. The seed writes every in-scope
    // object into B2 under a 90 day COMPLIANCE lock, which nobody can shorten,
    // including the account root. The per-run byte ceiling does not stop it:
    // 1073 MB against a 3.5 GB ceiling passes.
    //
    // Build order 9a through 9d in docs/STORAGE_BACKUP_SKELETON_2026-08.md puts
    // three things before that first write: the dissolution dry walk on a
    // throwaway archive, dissolution-purge.ts existing and proven, and the
    // /data-ownership tenet 04 redraft. An unattended seed inverts all three
    // and falsifies a published promise while it does it.
    //
    // So the seed is sent by hand at 9d, as
    // `storage/backup.sync.requested` with `{ kind: 'seed' }`. The daily cron
    // goes on AFTER that run is green and the runbook is signed, and adding it
    // is a deliberate commit of its own, not a line someone uncomments.
    triggers: [
      { event: 'storage/backup.sync.requested' },
      { event: 'storage/backup.sync.continue' },
    ],
  },
  async ({ event, step }) => {
    const alertState = { alerted: false }
    try {
      const data = (event?.data ?? {}) as SyncEventData
      const dryRun = data.dryRun === true
      const alarms: Alarm[] = []

      // ── 0. Resolve the kind, and refuse a contradictory event. ───────────────
      //
      // Pure and unit tested in lib/storageBackup.ts. Throws on an event asking
      // for kind 'scoped' directly, on kind 'seed' alongside a scope, and on a
      // malformed archive id. It never coerces, because a coercion here produces
      // a run wearing a kind that describes something it did not do, and the
      // heartbeat reads that kind and nothing else.
      //
      // Thrown before the walk, so a contradictory event does no work and leaves
      // no run row.
      const { kind, onlyArchiveId } = resolveRunScope(data)

      // ── 1. Source listing and roster check. ──────────────────────────────────
      const source = await step.run('list-source', async () => {
        const { data: buckets, error } = await supabaseAdmin.storage.listBuckets()
        if (error) throw new Error(`listBuckets: ${error.message}`)
        const names = (buckets ?? []).map((b) => b.name)
        const roster = checkRoster(names)
        const objects: SourceObject[] = []
        for (const bucket of roster.synced) await walkBucket(bucket, '', objects)
        return { names, roster, objects }
      })

      if (source.roster.unknown.length) {
        alarms.push({
          code: ALARM.A4_UNKNOWN_BUCKET,
          detail:
            `Live bucket(s) in neither ALLOWLIST nor EXCLUDED: ${source.roster.unknown.join(', ')}. ` +
            `NOT synced. A new bucket must be a decision, and it must not be able to join an ` +
            `Object Lock sync by existing.`,
        })
      }
      if (source.roster.missing.length) {
        alarms.push({
          code: ALARM.A9_ALLOWLIST_BUCKET_MISSING,
          detail:
            `Allowlist bucket(s) absent from listBuckets: ${source.roster.missing.join(', ')}. ` +
            `Their objects would silently drop out of the diff and read as deletions, which this ` +
            `job does not propagate. Treating as hard rather than syncing a partial property.`,
        })
      }

      // ── 1b. Archive scope, applied between the walk and the diff. ────────────
      //
      // BEFORE the dry run branch on purpose. A dry walk whose output described an
      // unfiltered source set would prove nothing about the filters, and build
      // order 9b uses exactly that output to confirm the dissolution filter drops
      // a terminated prefix.
      //
      // Two filters, one predicate, opposite treatment of a path with no uuid
      // prefix. See applyArchiveScope. The dissolution exclusion runs on EVERY
      // run, seed and sync alike. The single archive scope runs only when asked.
      const terminatedArchiveIds = await step.run('load-terminated-archives', async () => {
        const { data: rows, error } = await supabaseAdmin
          .from('archives')
          .select('id')
          .not('termination_requested_at', 'is', null)
        // Throw, never default to an empty list. An empty list on a failed read is
        // indistinguishable from "nobody has asked to be forgotten", and it would
        // copy a terminated family into a lock nobody can lift.
        if (error) throw new Error(`load-terminated-archives: ${error.message}`)
        return (rows ?? []).map((r) => (r as { id: string }).id)
      })

      const scope = applyArchiveScope(source.objects, { onlyArchiveId, terminatedArchiveIds })
      const inScope = scope.kept

      // ── 2. A dry run stops here and writes nothing at all. ───────────────────
      // Not even a run row. A dry run that recorded itself as a completed sync
      // would let the heartbeat read the backup as healthy while nothing is being
      // copied, which is the silence failure this design exists to prevent.
      // Build order step 8 uses this.
      if (dryRun) {
        const manifest = await step.run('load-manifest', loadManifest)
        const diff = diffSourceAgainstManifest(inScope, manifest)
        const summary = {
          dryRun: true,
          kind,
          onlyArchiveId,
          buckets: source.names,
          roster: source.roster,
          alarms,
          // Walked, then what survived each filter. 9b reads these three lines and
          // terminatedArchiveIds below to confirm the dissolution filter worked.
          sourceWalked: source.objects.length,
          sourceInScope: inScope.length,
          droppedOutOfScope: scope.droppedOutOfScope,
          droppedTerminated: scope.droppedTerminated,
          terminatedArchiveIds,
          sourceBytes: inScope.reduce((n, o) => n + o.size, 0),
          manifestRows: manifest.length,
          wouldCopy: diff.toCopy.length,
          wouldCopyBytes: diff.toCopy.reduce((n, o) => n + o.size, 0),
          unchanged: diff.unchanged,
          deferred: diff.deferred,
          firstTwenty: diff.toCopy.slice(0, 20).map((o) => b2Key(o.bucket, o.path)),
        }
        console.log('[storage-backup] DRY RUN', JSON.stringify(summary, null, 2))
        return summary
      }

      // ── 3. Open the run row before any copying, so a crash leaves evidence. ──
      const run = await step.run('open-run', async () => {
        const { data: row, error } = await supabaseAdmin
          .from('storage_backup_runs')
          .insert({
            kind,
            // Post-scope: what this run actually treated as its source, not what
            // the walk returned. The walked total and both drop counts go to the
            // summary and the log. A scoped run recording 377 here would read as a
            // run that lost 371 objects rather than one that excluded them.
            objects_source: inScope.length,
            // The CHECK in 20260809_storage_backup_scoped_kind.sql requires this to
            // be non-null exactly when kind is 'scoped', which the resolution above
            // guarantees. A mismatch is rejected by the database, not logged.
            scope_archive_id: onlyArchiveId,
            continued_from: data.continuedFrom ?? null,
          })
          .select('id')
          .single()
        if (error) throw new Error(`open-run: ${error.message}`)
        return row as { id: string }
      })

      try {
        const manifest = await step.run('load-manifest', loadManifest)
        const pointers = await step.run('load-pointers', async () =>
          loadPointers(source.roster.synced),
        )

        // Rolling window total, read from the table rather than held in memory, so
        // it survives a cold start.
        const windowBytes = await step.run('budget-window', async () => {
          const since = new Date(Date.now() - ROLLING_WINDOW_DAYS * 86_400_000).toISOString()
          const { data: rows, error } = await supabaseAdmin
            .from('storage_backup_runs')
            .select('bytes_read_source')
            .gte('started_at', since)
          if (error) throw new Error(`budget-window: ${error.message}`)
          return (rows ?? []).reduce(
            (n, r) => n + Number((r as { bytes_read_source: number | null }).bytes_read_source ?? 0),
            0,
          )
        })

        const diff = diffSourceAgainstManifest(inScope, manifest, MAX_COPIES_PER_RUN)

        if (diff.deferred > 0) {
          alarms.push({
            code: ALARM.A8_CAPPED,
            detail:
              `${diff.deferred} object(s) deferred by MAX_COPIES_PER_RUN=${MAX_COPIES_PER_RUN}. ` +
              `A continuation event was emitted. A capped run is not a complete one.`,
          })
        }

        // ── 4. Copy. One step per object, and the order inside is the point. ───
        let bytesRead = 0
        let copied = 0

        for (let i = 0; i < diff.toCopy.length; i++) {
          if (i % BUDGET_CHECK_EVERY === 0) {
            const verdict = checkBudget({ runBytes: bytesRead, windowBytes, isSeed: kind === 'seed' })
            if (!verdict.ok) {
              const alarm: Alarm = {
                code: ALARM.A6_BUDGET_EXCEEDED,
                detail: `${verdict.breach}: ${verdict.detail} Aborted after ${copied} copies.`,
              }
              alarms.push(alarm)
              await closeRun(run.id, {
                ok: false,
                objects_copied: copied,
                bytes_read_source: bytesRead,
                bytes_written_dest: bytesRead,
                alarms,
                error: alarm.detail,
              })
              await alertAdmin('storage backup ABORTED on byte budget', [alarm.detail])
              alertState.alerted = true
              throw new Error(`[storage-backup] ${alarm.code}: ${alarm.detail}`)
            }
          }

          const obj = diff.toCopy[i]
          const result = await step.run(`copy:${obj.bucket}/${obj.path}`, async () => {
            // 1. Download into memory. Largest in-scope object is 12.05 MB, so no
            //    streaming or multipart handling is needed on our side, and the
            //    50 MB bucket cap keeps that true.
            const dl = await supabaseAdmin.storage.from(obj.bucket).download(obj.path)
            if (dl.error || !dl.data) {
              throw new Error(`download ${obj.bucket}/${obj.path}: ${dl.error?.message ?? 'no body'}`)
            }
            const bytes = new Uint8Array(await dl.data.arrayBuffer())

            // 2. Hash over the bytes, and count the REAL body length rather than
            //    trusting metadata.size.
            const sha256 = createHash('sha256').update(bytes).digest('hex')

            // 3. PUT with Object Lock, and wait for the version id.
            const key = b2Key(obj.bucket, obj.path)
            const retainUntil = new Date(Date.now() + LOCK_RETENTION_DAYS * 86_400_000)
            const put = await putLocked({
              key,
              body: bytes,
              sha256,
              contentType: dl.data.type || 'application/octet-stream',
              retainUntil,
            })

            // 4. THEN the manifest row. Last, because a manifest written first
            //    reports coverage that does not exist. Upsert on the idempotency
            //    key so an Inngest retry does not create a twin.
            const pointer = pointers[obj.bucket]?.[obj.path] ?? null
            const { error: insErr } = await supabaseAdmin.from('storage_backup_objects').upsert(
              {
                bucket: obj.bucket,
                path: obj.path,
                archive_id: archiveIdFromPath(obj.path),
                size_bytes: bytes.byteLength,
                sha256,
                source_etag: obj.etag,
                source_created_at: obj.createdAt,
                b2_key: key,
                b2_file_id: put.fileId,
                b2_locked_until: put.lockedUntil,
                source_table: pointer ? POINTER_TABLE[obj.bucket as AllowlistBucket] : null,
                source_row: pointer,
                run_id: run.id,
              },
              { onConflict: 'bucket,path,sha256' },
            )
            if (insErr) throw new Error(`manifest insert ${key}: ${insErr.message}`)

            return { key, bytes: bytes.byteLength, sha256, fileId: put.fileId }
          })

          // Reconstructed from memoized step output on replay, so this survives
          // the function body re-running at every step boundary.
          bytesRead += result.bytes
          copied += 1
        }

        // ── 5. Inventory snapshot to B2, under the same lock. ──────────────────
        // Five fields per object and no more. source_row stays in Postgres,
        // because it can carry a caption and archive content must never go under
        // a 90 day offsite lock. Skeleton 4.3 and 9.4.5, settled August 8.
        const snapshot = await step.run('write-manifest-json', async () => {
          const PAGE = 1000
          const entries = []
          for (let from = 0; ; from += PAGE) {
            const { data: rows, error } = await supabaseAdmin
              .from('storage_backup_objects')
              .select('bucket, path, sha256, size_bytes, b2_locked_until')
              .range(from, from + PAGE - 1)
            if (error) throw new Error(`snapshot read: ${error.message}`)
            const page = (rows ?? []) as Parameters<typeof toSnapshotEntry>[0][]
            entries.push(...page.map(toSnapshotEntry))
            if (page.length < PAGE) break
          }

          const isoDate = new Date().toISOString().slice(0, 10)
          const key = manifestSnapshotKey(isoDate)
          const body = new TextEncoder().encode(JSON.stringify({ takenAt: new Date().toISOString(), entries }))
          const sha256 = createHash('sha256').update(body).digest('hex')
          await putLocked({
            key,
            body,
            sha256,
            contentType: 'application/json',
            retainUntil: new Date(Date.now() + LOCK_RETENTION_DAYS * 86_400_000),
          })
          return { key, entries: entries.length }
        })

        // ── 6. Continuation, if this run was capped. ───────────────────────────
        if (diff.deferred > 0) {
          await step.sendEvent('continue', {
            name: 'storage/backup.sync.continue',
            // onlyArchiveId MUST travel with the continuation. Without it the
            // resumed run resolves to kind 'sync' with no scope and copies the
            // whole property, which is the exact outcome 9a exists to avoid, three
            // hundred objects into a run that was supposed to touch one archive.
            // kind is not forwarded: it is re-derived from onlyArchiveId, and a
            // continuation carrying kind:'scoped' would now be rejected by the
            // kind guard above.
            data: {
              kind: kind === 'seed' ? 'seed' : 'sync',
              onlyArchiveId: onlyArchiveId ?? undefined,
              continuedFrom: run.id,
            },
          })
        }

        const hard = isHard(alarms)
        await closeRun(run.id, {
          ok: !hard,
          objects_copied: copied,
          objects_manifest: snapshot.entries,
          objects_deferred: diff.deferred,
          bytes_read_source: bytesRead,
          bytes_written_dest: bytesRead,
          alarms: alarms.length ? alarms : null,
        })

        if (alarms.length) {
          await alertAdmin(
            `storage backup sync ${hard ? 'FAILED' : 'completed with alarms'}`,
            alarms.map((a) => `${a.code}: ${a.detail}`),
          )
          // A hard alarm throws below. Marking here is what stops alertOnCrash
          // sending a second email for the same failure.
          alertState.alerted = true
        }

        const summary = {
          ok: !hard,
          runId: run.id,
          kind,
          onlyArchiveId,
          // What the walk found, what survived the two filters, and why the rest
          // did not. objects_source on the run row carries sourceInScope alone, so
          // this log line is the only place the exclusions are counted.
          sourceWalked: source.objects.length,
          sourceInScope: inScope.length,
          droppedOutOfScope: scope.droppedOutOfScope,
          droppedTerminated: scope.droppedTerminated,
          copied,
          deferred: diff.deferred,
          unchanged: diff.unchanged,
          bytesRead,
          manifestRows: snapshot.entries,
          snapshotKey: snapshot.key,
          alarms,
        }
        console.log('[storage-backup] sync', JSON.stringify(summary))

        // Throw so the run is red in Inngest rather than quietly green.
        if (hard) throw new Error(`[storage-backup] sync failed: ${alarms.map((a) => a.code).join(', ')}`)
        return summary
      } catch (err) {
        // Leave a red row behind even when the failure was not one of ours.
        await closeRun(run.id, { ok: false, error: (err as Error)?.message ?? String(err) })
        throw err
      }
    } catch (err) {
      await alertOnCrash('storage backup sync', alertState, err)
      throw err
    }
  },
)

// ── storage-backup-verify ────────────────────────────────────────────────────

export const storageBackupVerify = inngest.createFunction(
  {
    id: 'storage-backup-verify',
    name: 'Storage backup verify',
    retries: 2,
    concurrency: { limit: 1 },
    triggers: [
      { cron: '0 5 * * 0' },
      { event: 'storage/backup.verify.requested' },
      { event: 'storage/backup.verify.continue' },
    ],
  },
  async ({ event, step }) => {
    const alertState = { alerted: false }
    try {
      const data = (event?.data ?? {}) as { continuedFrom?: string }
      const alarms: Alarm[] = []

      const run = await step.run('open-run', async () => {
        const { data: row, error } = await supabaseAdmin
          .from('storage_backup_runs')
          .insert({ kind: 'verify', continued_from: data.continuedFrom ?? null })
          .select('id')
          .single()
        if (error) throw new Error(`open-run: ${error.message}`)
        return row as { id: string }
      })

      try {
        const source = await step.run('list-source', async () => {
          const { data: buckets, error } = await supabaseAdmin.storage.listBuckets()
          if (error) throw new Error(`listBuckets: ${error.message}`)
          const roster = checkRoster((buckets ?? []).map((b) => b.name))
          const objects: SourceObject[] = []
          for (const bucket of roster.synced) await walkBucket(bucket, '', objects)
          return { roster, objects }
        })

        const dest = await step.run('list-destination', async () => listAll())

        const manifest = await step.run('load-manifest', async () => {
          const PAGE = 1000
          const rows: { b2_key: string; sha256: string; size_bytes: number }[] = []
          for (let from = 0; ; from += PAGE) {
            const { data: page, error } = await supabaseAdmin
              .from('storage_backup_objects')
              .select('b2_key, sha256, size_bytes')
              .range(from, from + PAGE - 1)
            if (error) throw new Error(`load-manifest: ${error.message}`)
            const rowsPage = (page ?? []) as typeof rows
            rows.push(...rowsPage)
            if (rowsPage.length < PAGE) break
          }
          return rows
        })

        // The dissolution filter applies to verify's SOURCE side too, and only the
        // source side.
        //
        // Once the sync stops copying a terminated archive, any object of that
        // archive still sitting in Supabase and never copied is legitimately
        // absent from B2. Without this it lands in inSourceNotDest and raises A1,
        // a hard alarm, every Sunday for the up to 365 days between the request
        // and the deletion. The sync change in this commit is what makes that
        // reachable, so the two belong together.
        //
        // destKeys and manifestKeys stay complete on purpose. Objects already
        // copied for that archive are still in B2 under lock, still in the
        // manifest, and still re-hashed every run, so nothing stops being
        // verified. They simply move into inDestNotSource, which V2 classifies as
        // normal and expected because deletions do not propagate.
        const verifyTerminated = await step.run('load-terminated-archives', async () => {
          const { data: rows, error } = await supabaseAdmin
            .from('archives')
            .select('id')
            .not('termination_requested_at', 'is', null)
          if (error) throw new Error(`load-terminated-archives: ${error.message}`)
          return (rows ?? []).map((r) => (r as { id: string }).id)
        })
        const verifyScope = applyArchiveScope(source.objects, {
          terminatedArchiveIds: verifyTerminated,
        })

        // Three way structural diff, in plain code, no step.
        // The manifest snapshots under _manifest/ are written by this job but are
        // not objects it copied, so they are excluded from the comparison rather
        // than reported as unknown every single run.
        const destKeys = dest.map((d) => d.key).filter((k) => !k.startsWith('_manifest/'))
        const diff = threeWayDiff({
          sourceKeys: verifyScope.kept.map((o) => b2Key(o.bucket, o.path)),
          destKeys,
          manifestKeys: manifest.map((m) => m.b2_key),
        })

        // Is the build order 9a to 9d window open? A scoped run has completed and
        // no full seed has. Read from the run table, not inferred from the shape
        // of the manifest: a property that genuinely held one archive would look
        // identical from the manifest and would get an excuse it has not earned.
        //
        // This does NOT downgrade A1. A1 stays hard, the run still closes ok:false
        // and still throws. It only makes the email say why it is expected today
        // and when it stops being expected. Skeleton build order 9a, runbook 1.5.
        const scopedSeedWindow = await step.run('scoped-seed-window', async () => {
          const [scoped, seeded] = await Promise.all([
            supabaseAdmin
              .from('storage_backup_runs')
              .select('id')
              .eq('kind', SCOPED_RUN_KIND)
              .eq('ok', true)
              .limit(1),
            supabaseAdmin
              .from('storage_backup_runs')
              .select('id')
              .eq('kind', 'seed')
              .eq('ok', true)
              .limit(1),
          ])
          if (scoped.error) throw new Error(`scoped-seed-window scoped: ${scoped.error.message}`)
          if (seeded.error) throw new Error(`scoped-seed-window seed: ${seeded.error.message}`)
          return (scoped.data?.length ?? 0) > 0 && (seeded.data?.length ?? 0) === 0
        })

        if (diff.inSourceNotDest.length) {
          alarms.push({
            code: ALARM.A1_MISSING_IN_DEST,
            detail: a1MissingDetail({
              missingKeys: diff.inSourceNotDest,
              scopedSeedWindow,
            }),
          })
        }
        if (diff.inDestNotManifest.length) {
          alarms.push({
            code: ALARM.A2_UNKNOWN_IN_DEST,
            detail:
              `${diff.inDestNotManifest.length} object(s) in B2 with no manifest row. Something ` +
              `other than this job is writing to the backup bucket: ${diff.inDestNotManifest.slice(0, 20).join(', ')}`,
          })
        }
        if (diff.inManifestNotDest.length) {
          alarms.push({
            code: ALARM.A10_MANIFEST_MISSING_IN_DEST,
            detail:
              `${diff.inManifestNotDest.length} manifest row(s) with no object in B2. Object Lock ` +
              `should make this impossible, so it firing means the lock is not doing what we ` +
              `believe: ${diff.inManifestNotDest.slice(0, 20).join(', ')}`,
          })
        }

        // Re-hash from B2, not from Supabase, so a verify spends zero Supabase
        // egress. That is what makes weekly verification affordable.
        const toRehash = manifest.slice(0, MAX_COPIES_PER_RUN)
        const deferred = Math.max(0, manifest.length - MAX_COPIES_PER_RUN)
        if (deferred > 0) {
          alarms.push({
            code: ALARM.A8_CAPPED,
            detail: `${deferred} object(s) not re-hashed this run, deferred to a continuation.`,
          })
        }

        let bytesReadDest = 0
        let rehashed = 0
        const mismatches: string[] = []

        for (const row of toRehash) {
          const result = await step.run(`rehash:${row.b2_key}`, async () => {
            const bytes = await getObjectBytes(row.b2_key)
            const sha256 = createHash('sha256').update(bytes).digest('hex')
            return { bytes: bytes.byteLength, sha256, match: sha256 === row.sha256 }
          })
          bytesReadDest += result.bytes
          rehashed += 1
          if (!result.match) mismatches.push(row.b2_key)
        }

        if (mismatches.length) {
          alarms.push({
            code: ALARM.A3_HASH_MISMATCH,
            detail: `${mismatches.length} object(s) re-hashed differently from the manifest: ${mismatches
              .slice(0, 20)
              .join(', ')}`,
          })
        }

        // Pointer reconciliation, both directions. Reporting, not filtering.
        // Nothing is skipped because of it.
        const pointerReport = await step.run('reconcile-pointers', async () => {
          const pointers = await loadPointers(source.roster.synced)
          const report: Record<string, { orphanObjects: number; danglingRows: number }> = {}
          for (const bucket of source.roster.synced) {
            const byPath = pointers[bucket] ?? {}
            const objectPaths = new Set(
              source.objects.filter((o) => o.bucket === bucket).map((o) => o.path),
            )
            report[bucket] = {
              orphanObjects: [...objectPaths].filter((p) => !byPath[p]).length,
              danglingRows: Object.keys(byPath).filter((p) => !objectPaths.has(p)).length,
            }
          }
          return report
        })

        if (deferred > 0) {
          await step.sendEvent('continue', {
            name: 'storage/backup.verify.continue',
            data: { continuedFrom: run.id },
          })
        }

        const hard = isHard(alarms)
        await closeRun(run.id, {
          ok: !hard,
          objects_source: source.objects.length,
          objects_destination: destKeys.length,
          objects_manifest: manifest.length,
          objects_rehashed: rehashed,
          objects_deferred: deferred,
          bytes_read_dest: bytesReadDest,
          alarms: alarms.length ? alarms : null,
        })

        if (alarms.length) {
          await alertAdmin(
            `storage backup verify ${hard ? 'FAILED' : 'completed with alarms'}`,
            [
              ...alarms.map((a) => `${a.code}: ${a.detail}`),
              '',
              `pointer reconciliation: ${JSON.stringify(pointerReport)}`,
            ],
          )
          // As above: a hard alarm throws, and this stops a duplicate email.
          alertState.alerted = true
        }

        const summary = {
          ok: !hard,
          runId: run.id,
          source: source.objects.length,
          // Excluded from the source side of the diff only, never from the rehash.
          sourceExcludedTerminated: verifyScope.droppedTerminated,
          terminatedArchiveIds: verifyTerminated,
          destination: destKeys.length,
          manifest: manifest.length,
          rehashed,
          deferred,
          bytesReadDest,
          diff: {
            inSourceNotDest: diff.inSourceNotDest.length,
            inDestNotManifest: diff.inDestNotManifest.length,
            inManifestNotDest: diff.inManifestNotDest.length,
            inSourceNotManifest: diff.inSourceNotManifest.length,
            inDestNotSource: diff.inDestNotSource.length,
          },
          pointerReport,
          alarms,
        }
        console.log('[storage-backup] verify', JSON.stringify(summary))

        if (hard) throw new Error(`[storage-backup] verify failed: ${alarms.map((a) => a.code).join(', ')}`)
        return summary
      } catch (err) {
        await closeRun(run.id, { ok: false, error: (err as Error)?.message ?? String(err) })
        throw err
      }
    } catch (err) {
      await alertOnCrash('storage backup verify', alertState, err)
      throw err
    }
  },
)

/** Registered in app/api/inngest/route.ts. */
export const storageBackupFunctions = [storageBackupSync, storageBackupVerify]

// Re-exported so the allowlist test can assert scope without importing the
// Inngest client, which pulls in the whole serve() surface.
export { ALLOWLIST }
