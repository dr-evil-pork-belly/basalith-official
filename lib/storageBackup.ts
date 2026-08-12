/**
 * Storage backup: scope, thresholds, and the pure logic.
 *
 * Spec: docs/STORAGE_BACKUP_SKELETON_2026-08.md sections 2, 3, 5, 6, 7.
 * Manifest tables: supabase/migrations/20260808_storage_backup_manifest.sql.
 * Dissolution procedure that reads the manifest: docs/DISSOLUTION_RUNBOOK.md.
 *
 * Everything here is a constant or a pure function, with no Supabase client and
 * no S3 client, so the diff, the roster check, and the scope rules are testable
 * without touching either vendor. The I/O lives in lib/storageBackupB2.ts and
 * lib/inngest/storageBackupFunctions.ts.
 */

// ── Scope ────────────────────────────────────────────────────────────────────

/**
 * The four buckets that get copied offsite. Four, not five: vault-files was on
 * this list until August 8, 2026 and is now excluded. See EXCLUDED below.
 */
export const ALLOWLIST = [
  'photographs',
  'voice-recordings',
  'archive-videos',
  'archive-documents',
] as const

export type AllowlistBucket = (typeof ALLOWLIST)[number]

/**
 * Excluded permanently, and for two DIFFERENT reasons. Do not collapse these
 * into one reason. Each is asserted separately in lib/storageBackup.test.ts so
 * that a later edit cannot silently reclassify one as the other.
 */
export const EXCLUDED = {
  'archive-exports': {
    reason: 'derived-and-retention-managed',
    detail:
      'Every object is a zip rebuildable from the content buckets, so copying it stores a ' +
      'second copy of data already covered. It also carries its own 7 day retention, and a ' +
      'copy under a 90 day COMPLIANCE lock would outlive the retention it is meant to respect.',
  },
  'vault-files': {
    reason: 'not-archive-scoped',
    detail:
      'Objects are keyed to a vault, not an archive. The path is vaults/{vault_id}/... and ' +
      'the vaults table has no archive_id column, it keys on archivist_id. The dissolution ' +
      'filter works by excluding an archive id prefix, so it has nothing to match on here. ' +
      'Every object would stay in scope through a dissolution and be written into a locked ' +
      'backup that no dissolution could target. Verified live August 8, 2026.',
  },
} as const

export type ExcludedBucket = keyof typeof EXCLUDED

export const EXCLUDED_BUCKETS = Object.keys(EXCLUDED) as ExcludedBucket[]

/** Every bucket the job knows about. A live bucket outside this set raises A4. */
export const KNOWN_BUCKETS: string[] = [...ALLOWLIST, ...EXCLUDED_BUCKETS]

export function isSynced(bucket: string): bucket is AllowlistBucket {
  return (ALLOWLIST as readonly string[]).includes(bucket)
}

export function isExcluded(bucket: string): bucket is ExcludedBucket {
  return bucket in EXCLUDED
}

/**
 * The marker Supabase writes into a prefix that would otherwise hold no objects.
 *
 * One exists today, created the moment the last photograph was deleted out of
 * `photographs/f44f1818-8f17-499d-8f27-23e286e923f7/` on August 8, 2026.
 */
export const EMPTY_FOLDER_PLACEHOLDER = '.emptyFolderPlaceholder'

/**
 * True for a Supabase empty-folder marker, matched on its name and nothing else.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS IS A NAME MATCH. IT MUST NEVER BECOME A ZERO BYTE FILTER.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A placeholder is zero bytes, so "skip anything at 0 bytes" looks like the same
 * rule and is a different rule. A real upload that landed at zero bytes is a
 * content file that has gone wrong, and that is a fact worth copying and worth
 * surfacing in reconciliation. Filtering it by size would hide exactly the
 * failure the backup exists to notice, and hide it silently, because a skipped
 * object raises nothing.
 *
 * The name is the only thing that identifies a placeholder as not-a-file.
 *
 * Applied on the source walk, in `walkBucket`, so a placeholder never enters
 * `SourceObject[]` at all. Not in the diff. An object filtered at the diff has
 * already been counted as source, and the three way diff would then read it as
 * present in the destination and absent from source, which is the shape A2
 * exists to alarm on. See docs/STORAGE_BACKUP_SKELETON_2026-08.md section 2.2.
 */
export function isEmptyFolderPlaceholder(name: string): boolean {
  return name === EMPTY_FOLDER_PLACEHOLDER || name.endsWith(`/${EMPTY_FOLDER_PLACEHOLDER}`)
}

// ── Thresholds ───────────────────────────────────────────────────────────────

/**
 * Inngest allows 1000 steps per run. A sync is N copy steps plus 4 fixed ones.
 * 300 keeps the seed inside the limit with room, and keeps the design working at
 * 10,000 objects instead of failing on a limit nobody remembered. Whatever is
 * deferred is counted and logged, so a capped run never reads as a complete one.
 */
export const MAX_COPIES_PER_RUN = 300

/**
 * Supabase bills egress in decimal GB, so these are decimal, not GiB.
 * Derivations are in skeleton section 6.1 and were rechecked on August 8 against
 * a confirmed 0.065 GB month-to-date against the 250 GB Pro allowance.
 */
export const PER_RUN_SOURCE_BYTE_CEILING = 3_500_000_000 // 3.5 GB, ~3x full property volume
export const ROLLING_30D_SOURCE_BYTE_CEILING = 25_000_000_000 // 25 GB, 10% of the plan allowance
export const ROLLING_WINDOW_DAYS = 30

/** Checked before the first copy, then every this many copies. */
export const BUDGET_CHECK_EVERY = 25

/** COMPLIANCE retention sent with every PUT, and set as the bucket default. */
export const LOCK_RETENTION_DAYS = 90

/** Silence thresholds for the heartbeat. */
export const SILENCE_SYNC_DAYS = 8
export const SILENCE_VERIFY_DAYS = 10

// ── Alarms ───────────────────────────────────────────────────────────────────

/**
 * A1 through A8 are the skeleton's section 7 table.
 *
 * A9 and A10 are NOT in that table. Both were found while building and both are
 * real silent-failure holes in the spec. Flagged rather than added quietly:
 *
 *   A9  A bucket on the allowlist is absent from listBuckets. Without this the
 *       objects simply vanish from the source set, the three way diff reads them
 *       as "in destination, absent from source", which V2 classifies as normal
 *       and expected, and 337 photographs drop out of the backup in silence.
 *   A10 An object in the manifest is absent from the destination. V2 calls this
 *       a hard alarm in prose ("Object Lock should make this impossible, so it
 *       firing means the lock is not doing what we believe") but the section 7
 *       table has no code for it.
 */
export const ALARM = {
  A1_MISSING_IN_DEST: 'A1_MISSING_IN_DEST',
  A2_UNKNOWN_IN_DEST: 'A2_UNKNOWN_IN_DEST',
  A3_HASH_MISMATCH: 'A3_HASH_MISMATCH',
  A4_UNKNOWN_BUCKET: 'A4_UNKNOWN_BUCKET',
  A5_SILENCE: 'A5_SILENCE',
  A6_BUDGET_EXCEEDED: 'A6_BUDGET_EXCEEDED',
  A7_DRILL_FAILED: 'A7_DRILL_FAILED',
  A8_CAPPED: 'A8_CAPPED',
  A9_ALLOWLIST_BUCKET_MISSING: 'A9_ALLOWLIST_BUCKET_MISSING',
  A10_MANIFEST_MISSING_IN_DEST: 'A10_MANIFEST_MISSING_IN_DEST',
} as const

export type AlarmCode = (typeof ALARM)[keyof typeof ALARM]

export interface Alarm {
  code: AlarmCode
  detail: string
}

/**
 * Appended to A1's detail while the build order 9a to 9d window is open, and
 * never at any other time.
 *
 * A1 is the alarm the whole system exists to raise, and between 9a and 9d it
 * fires every Sunday for a reason that is expected: one disposable archive is in
 * the manifest and the rest of the property has deliberately not been copied
 * yet. The risk is not the alarm. It is an operator learning across a few weeks
 * that A1 is sometimes fine, and carrying that lesson past 9d.
 *
 * So the note is conditional, not permanent. It states its own expiry, and it is
 * computed from storage_backup_runs rather than from anyone's memory of what
 * month it is. The moment a successful seed run exists, this sentence stops
 * appearing and A1 goes back to meaning exactly one thing.
 */
export const SCOPED_SEED_WINDOW_NOTE =
  'EXPECTED DURING THIS WINDOW ONLY. A kind=scoped run has completed and no full ' +
  'seed has, which is build order 9a to 9d: the manifest holds one disposable ' +
  'archive on purpose and the rest of the property has never been copied. This ' +
  'sentence is generated from the run table and disappears the moment a ' +
  'successful seed exists. A1 without this sentence is real. A1 with it, after ' +
  'the full seed has run, is also real. See docs/DISSOLUTION_RUNBOOK.md 1.5.'

/**
 * A1's detail line. Pure, so the wording and the condition are testable without
 * a Supabase client or a B2 client.
 */
export function a1MissingDetail(params: {
  missingKeys: readonly string[]
  scopedSeedWindow: boolean
}): string {
  const head =
    `${params.missingKeys.length} object(s) in source, absent from B2: ` +
    params.missingKeys.slice(0, 20).join(', ')
  return params.scopedSeedWindow ? `${head}. ${SCOPED_SEED_WINDOW_NOTE}` : head
}

// ── Keys and paths ───────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** B2 key is the natural key. Skeleton 3.5 rejects content-addressed keys. */
export function b2Key(bucket: string, path: string): string {
  return `${bucket}/${path}`
}

/**
 * The archive id is the first path segment, when it is a uuid. Null is a real
 * answer and not a failure: the f44f1818 prefix has objects and no archives row,
 * and the sync copies orphans rather than filtering against pointer tables.
 */
export function archiveIdFromPath(path: string): string | null {
  const first = path.split('/')[0]
  return first && UUID_RE.test(first) ? first.toLowerCase() : null
}

/** Where the per-run inventory snapshot goes. Skeleton 4.3. */
export function manifestSnapshotKey(isoDate: string): string {
  return `_manifest/${isoDate}.json`
}

/**
 * The snapshot carries five fields and no more. source_row is deliberately
 * absent: it can hold a caption or a description, which is archive content, and
 * archive content must never go under a 90 day offsite lock. Settled August 8,
 * skeleton 4.3 and 9.4.5.
 */
export interface SnapshotEntry {
  bucket: string
  path: string
  sha256: string
  size_bytes: number
  b2_locked_until: string
}

export function toSnapshotEntry(row: {
  bucket: string
  path: string
  sha256: string
  size_bytes: number
  b2_locked_until: string
}): SnapshotEntry {
  return {
    bucket: row.bucket,
    path: row.path,
    sha256: row.sha256,
    size_bytes: row.size_bytes,
    b2_locked_until: row.b2_locked_until,
  }
}

/** A storage_backup_objects row as the snapshot step selects it. */
export type SnapshotSourceRow = Parameters<typeof toSnapshotEntry>[0]

/**
 * The manifest rows that go into the snapshot, with terminated archives removed.
 *
 * THIS IS THE DISSOLUTION FILTER'S SECOND HALF, and it was missing until
 * August 12, 2026. applyArchiveScope stops a terminated archive being COPIED.
 * It does nothing about the inventory snapshot, which is built from
 * storage_backup_objects rather than from the source walk. Those rows survive
 * until the operator runs DISSOLUTION_RUNBOOK.md step 4.8, at X+365, so every
 * sync in between wrote a fresh _manifest/{date}.json listing the terminated
 * archive's paths, hashes, sizes and lock expiries, each under a new COMPLIANCE
 * lock dated from its own write day. Deleting one by hand did not help. The
 * next sync regenerated it from the same rows.
 *
 * Runbook 4.6 asserted the opposite, that snapshots written after day X do not
 * list the archive. That sentence described the source walk and was read as
 * describing the snapshot. It is corrected in the same commit as this function.
 *
 * The rules match applyArchiveScope's dissolution filter exactly, and they match
 * it because a second set of rules is a second thing to get wrong:
 *
 *   - keyed on archiveIdFromPath, the same parser, over the same path shape
 *   - an object whose path carries no uuid prefix is KEPT, because an object
 *     with no archives row can never be the subject of a termination request
 *   - ids are compared lowercased, so the case they arrive in does not matter
 *   - a malformed terminated id throws rather than filtering nothing, because
 *     filtering nothing here is silently writing the archive offsite again
 *
 * What this does NOT do, and no code does: it does not touch snapshots already
 * in B2. Those come out only through runbook step 4.6, by hand, once their locks
 * have expired. This stops the bleeding. It does not clean up behind itself.
 */
export function buildSnapshotEntries(
  rows: readonly SnapshotSourceRow[],
  terminatedArchiveIds: readonly string[] = [],
): SnapshotEntry[] {
  const terminated = new Set(
    terminatedArchiveIds.map((id) => requireUuid(id, 'terminatedArchiveIds entry')),
  )

  const entries: SnapshotEntry[] = []
  for (const row of rows) {
    const archiveId = archiveIdFromPath(row.path)
    if (archiveId !== null && terminated.has(archiveId)) continue
    entries.push(toSnapshotEntry(row))
  }
  return entries
}

// ── Roster check ─────────────────────────────────────────────────────────────

export interface RosterResult {
  /** Live buckets in neither list. Raises A4. Not synced. */
  unknown: string[]
  /** Allowlist buckets that are not live. Raises A9. */
  missing: string[]
  /** Allowlist buckets present and therefore in scope this run. */
  synced: string[]
}

export function checkRoster(liveBuckets: string[]): RosterResult {
  const live = new Set(liveBuckets)
  return {
    unknown: liveBuckets.filter((b) => !KNOWN_BUCKETS.includes(b)),
    missing: ALLOWLIST.filter((b) => !live.has(b)),
    synced: ALLOWLIST.filter((b) => live.has(b)),
  }
}

// ── Archive scope ────────────────────────────────────────────────────────────

/**
 * The run kind written by a scoped run. NOT 'seed' and NOT 'sync', deliberately.
 *
 * app/api/cron/storage-backup-heartbeat/route.ts clears A5_SILENCE from the
 * latest ok run of kind 'sync' or 'seed', and reads started_at only. It never
 * looks at objects_copied. So a scoped run recorded as a seed would turn the
 * heartbeat green for 8 days on the strength of having copied one archive,
 * which is the silence failure the dryRun branch of storageBackupSync already
 * refuses to commit, in its partial form.
 *
 * Carrying a kind the heartbeat does not query means that property holds by
 * construction rather than by a filter someone has to remember. 'drill' already
 * behaves this way. Allowed by the CHECK on storage_backup_runs.kind as of
 * supabase/migrations/20260809_storage_backup_scoped_kind.sql.
 */
export const SCOPED_RUN_KIND = 'scoped'

export type RunKind = 'seed' | 'sync' | typeof SCOPED_RUN_KIND

export interface ResolvedRunScope {
  kind: RunKind
  onlyArchiveId: string | null
}

/**
 * Turn a storage/backup.sync.requested payload into a kind and a scope, or
 * throw. Pure, so the rules are testable without an Inngest client.
 *
 * Every invalid combination throws rather than coercing. A coercion here is how
 * a run ends up wearing a kind that describes something it did not do, and the
 * heartbeat reads that kind and nothing else.
 *
 *   kind: 'scoped'                 rejected. The kind is DERIVED from
 *                                  onlyArchiveId. Accepting a requested one
 *                                  would let an event claim a scoped run's
 *                                  heartbeat exemption while restricting
 *                                  nothing.
 *   kind: 'seed' + onlyArchiveId   rejected. A seed is the whole property and a
 *                                  scope is one archive. The two readings of
 *                                  that event differ by every other family's
 *                                  objects under a 90 day lock nobody can lift,
 *                                  so the sender says which they meant.
 *   a malformed onlyArchiveId      rejected, by applyArchiveScope's validator.
 *                                  A scope that silently matched nothing would
 *                                  become a full property seed.
 */
export function resolveRunScope(data: {
  kind?: unknown
  onlyArchiveId?: unknown
}): ResolvedRunScope {
  const { kind, onlyArchiveId } = data

  if (kind !== undefined && kind !== 'seed' && kind !== 'sync') {
    throw new Error(
      `[storage-backup] kind must be 'seed' or 'sync', got ${JSON.stringify(kind)}. ` +
        `'${SCOPED_RUN_KIND}' is derived from onlyArchiveId and cannot be requested.`,
    )
  }

  if (onlyArchiveId !== undefined && onlyArchiveId !== null && typeof onlyArchiveId !== 'string') {
    throw new Error(
      `[storage-backup] onlyArchiveId must be a string, got ${JSON.stringify(onlyArchiveId)}.`,
    )
  }

  const scoped =
    onlyArchiveId === undefined || onlyArchiveId === null
      ? null
      : requireUuid(onlyArchiveId, 'onlyArchiveId')

  if (scoped !== null && kind === 'seed') {
    throw new Error(
      `[storage-backup] refusing an event carrying both kind:'seed' and ` +
        `onlyArchiveId:${scoped}. A seed covers the whole property and a scope covers ` +
        `one archive. Send one or the other.`,
    )
  }

  return {
    kind: scoped !== null ? SCOPED_RUN_KIND : kind === 'seed' ? 'seed' : 'sync',
    onlyArchiveId: scoped,
  }
}

export interface ArchiveScope {
  /**
   * Build order 9a. Keep only objects under this archive id. Undefined or null
   * means no scoping at all.
   */
  onlyArchiveId?: string | null
  /**
   * Archive ids carrying a non-null archives.termination_requested_at. Their
   * objects leave the source set.
   */
  terminatedArchiveIds?: readonly string[]
}

export interface ArchiveScopeResult {
  kept: SourceObject[]
  /** Dropped by onlyArchiveId. Reported so a scoped run can log its own narrowness. */
  droppedOutOfScope: number
  /** Dropped by the dissolution filter. */
  droppedTerminated: number
}

function requireUuid(value: string, field: string): string {
  if (!UUID_RE.test(value)) {
    throw new Error(
      `[storage-backup] ${field} is not a uuid: ${JSON.stringify(value)}. Refusing to run ` +
        `rather than applying a filter that matches nothing.`,
    )
  }
  return value.toLowerCase()
}

/**
 * Two filters on the source set, both keyed on the archive id in the object
 * path, applied together between the walk and the diff.
 *
 * They exist for opposite reasons, and they treat a missing archive id
 * oppositely. That asymmetry is the part that goes wrong silently if it is not
 * written down:
 *
 *   terminatedArchiveIds  The dissolution filter. Skeleton 2.1, and
 *                         DISSOLUTION_RUNBOOK.md section 3 already states this
 *                         behaviour as live. An object whose path carries no
 *                         uuid prefix is KEPT. An object with no archives row
 *                         can never be the subject of a termination request,
 *                         and dropping it would shrink the backup with no alarm
 *                         anywhere, which is the one thing this job must not do.
 *
 *   onlyArchiveId         Build order 9a. An object whose path carries no uuid
 *                         prefix is DROPPED, because only this archive means
 *                         only this archive. The 22 orphans and the f44f1818
 *                         prefix are out of a scoped run by definition.
 *
 * Terminated wins. An id that is both the scope target and terminated is
 * dropped. Writing a terminated archive into a 90 day COMPLIANCE lock is the
 * one outcome here that nobody can undo, including the account root, so no
 * explicit request is allowed to override it.
 *
 * A malformed id throws rather than filtering nothing. Both silent-failure
 * directions are unacceptable in different ways: a bad onlyArchiveId would turn
 * a scoped run into a full property seed, and a bad terminated id would keep
 * copying a family that asked to be forgotten. A red run is the correct amount
 * of noise for either.
 *
 * The sync is additive, so this stops FUTURE copies and does nothing to what is
 * already in B2. Those objects come out only through DISSOLUTION_RUNBOOK.md
 * section 4. Never read a clean result here as "the backup no longer holds it."
 */
export function applyArchiveScope(
  objects: readonly SourceObject[],
  scope: ArchiveScope = {},
): ArchiveScopeResult {
  const only =
    scope.onlyArchiveId === undefined || scope.onlyArchiveId === null
      ? null
      : requireUuid(scope.onlyArchiveId, 'onlyArchiveId')

  const terminated = new Set(
    (scope.terminatedArchiveIds ?? []).map((id) => requireUuid(id, 'terminatedArchiveIds entry')),
  )

  const kept: SourceObject[] = []
  let droppedOutOfScope = 0
  let droppedTerminated = 0

  for (const object of objects) {
    const archiveId = archiveIdFromPath(object.path)

    if (archiveId !== null && terminated.has(archiveId)) {
      droppedTerminated += 1
      continue
    }
    if (only !== null && archiveId !== only) {
      droppedOutOfScope += 1
      continue
    }
    kept.push(object)
  }

  return { kept, droppedOutOfScope, droppedTerminated }
}

// ── Diff ─────────────────────────────────────────────────────────────────────

export interface SourceObject {
  bucket: string
  path: string
  size: number
  etag: string | null
  createdAt: string | null
}

export interface ManifestEntry {
  bucket: string
  path: string
  size_bytes: number
  source_etag: string | null
}

/**
 * Change detection is size plus eTag, never a source re-hash. An in-place
 * overwrite changes the eTag, the diff sees it, and the object is recopied as a
 * new B2 version. The 32 multipart eTags on the property are fine here, because
 * detection only needs the value to differ when the bytes differ, not to equal
 * an MD5.
 *
 * Known limit: an overwrite that keeps the same byte length AND produces the
 * same eTag would be missed. Supabase returns an eTag on every object, so this
 * needs the storage backend to reuse one, which it does not do in practice.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE SEPARATOR IS \0 AND IT MUST NOT BECOME A SPACE.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * NUL is the one byte that cannot occur in a bucket name, an object path, or an
 * eTag, so it is the only separator that cannot be forged by the content it
 * separates. A space can. Under a space these two are the same key:
 *
 *   path 'a 1', size 2, etag '3'      ->  'photographs a 1 2 3'
 *   path 'a',   size 1, etag '2 3'    ->  'photographs a 1 2 3'
 *
 * and the diff would read a real, uncopied object as already backed up and
 * never copy it. Supabase paths do contain spaces.
 *
 * Written as the \0 ESCAPE, never as a literal NUL byte in the source. Until
 * August 9, 2026 this line held three raw 0x00 bytes. They behaved identically
 * at runtime and were invisible three ways: they render as spaces in most
 * editors and in review, git called the file text because its binary sniff only
 * reads the first 8000 bytes and these sat at 11565, and ripgrep called the file
 * binary and returned NO MATCHES for any search against it, which silently
 * breaks recon on the module. lib/storageBackup.test.ts asserts both that the
 * collision above does not happen and that this file contains no raw NUL.
 */
function changeKey(bucket: string, path: string, size: number, etag: string | null): string {
  return `${bucket}\0${path}\0${size}\0${etag ?? ''}`
}

export interface DiffResult {
  toCopy: SourceObject[]
  unchanged: number
  /** Set when toCopy was truncated by MAX_COPIES_PER_RUN. Raises A8. */
  deferred: number
}

export function diffSourceAgainstManifest(
  source: SourceObject[],
  manifest: ManifestEntry[],
  maxCopies: number = MAX_COPIES_PER_RUN,
): DiffResult {
  const seen = new Set(
    manifest.map((m) => changeKey(m.bucket, m.path, m.size_bytes, m.source_etag)),
  )

  const changed = source.filter(
    (s) => !seen.has(changeKey(s.bucket, s.path, s.size, s.etag)),
  )

  return {
    toCopy: changed.slice(0, maxCopies),
    unchanged: source.length - changed.length,
    deferred: Math.max(0, changed.length - maxCopies),
  }
}

// ── Three way structural diff, for verify ────────────────────────────────────

export interface ThreeWayDiff {
  /** Hard, A1. The failure the system exists to catch. */
  inSourceNotDest: string[]
  /** Alarm, A2. Something other than this job is writing to the backup bucket. */
  inDestNotManifest: string[]
  /** Hard, A10. Object Lock should make this impossible. */
  inManifestNotDest: string[]
  /** Normal. This is the copy list. */
  inSourceNotManifest: string[]
  /** Normal and expected. Additive-only means deletions do not propagate. */
  inDestNotSource: string[]
}

export function threeWayDiff(params: {
  sourceKeys: string[]
  destKeys: string[]
  manifestKeys: string[]
}): ThreeWayDiff {
  const source = new Set(params.sourceKeys)
  const dest = new Set(params.destKeys)
  const manifest = new Set(params.manifestKeys)

  return {
    inSourceNotDest: [...source].filter((k) => !dest.has(k)).sort(),
    inDestNotManifest: [...dest].filter((k) => !manifest.has(k)).sort(),
    inManifestNotDest: [...manifest].filter((k) => !dest.has(k)).sort(),
    inSourceNotManifest: [...source].filter((k) => !manifest.has(k)).sort(),
    inDestNotSource: [...dest].filter((k) => !source.has(k)).sort(),
  }
}

// ── Budget ───────────────────────────────────────────────────────────────────

export interface BudgetState {
  /** Bytes read from Supabase Storage in this run so far. */
  runBytes: number
  /** Bytes read from Supabase Storage across the rolling window, before this run. */
  windowBytes: number
  /** Seed runs are exempt from the per-run ceiling. Skeleton 6.1. */
  isSeed: boolean
}

export interface BudgetVerdict {
  ok: boolean
  breach?: 'per-run' | 'rolling-30d'
  detail?: string
}

/**
 * On breach the caller aborts the run, writes ok = false with the alarm, and
 * alerts. Not throttle, not continue with a warning. A job reading gigabytes it
 * should not read is a bug, and the response to a bug of unknown shape is stop.
 */
export function checkBudget(state: BudgetState): BudgetVerdict {
  if (!state.isSeed && state.runBytes > PER_RUN_SOURCE_BYTE_CEILING) {
    return {
      ok: false,
      breach: 'per-run',
      detail:
        `Run has read ${state.runBytes} bytes from Supabase Storage, over the ` +
        `${PER_RUN_SOURCE_BYTE_CEILING} per-run ceiling.`,
    }
  }

  const total = state.windowBytes + state.runBytes
  if (total > ROLLING_30D_SOURCE_BYTE_CEILING) {
    return {
      ok: false,
      breach: 'rolling-30d',
      detail:
        `Rolling ${ROLLING_WINDOW_DAYS} day source egress would reach ${total} bytes, over ` +
        `the ${ROLLING_30D_SOURCE_BYTE_CEILING} ceiling. The seed exemption does not apply ` +
        `to this one, because 30 runs at the per-run ceiling is 105 GB and would trip nothing.`,
    }
  }

  return { ok: true }
}

// ── Silence, for the heartbeat ───────────────────────────────────────────────

export interface SilenceInput {
  lastSuccessfulSyncAt: string | null
  lastSuccessfulVerifyAt: string | null
  now: Date
}

export function checkSilence(input: SilenceInput): Alarm[] {
  const alarms: Alarm[] = []
  const ageDays = (iso: string | null): number | null =>
    iso === null ? null : (input.now.getTime() - new Date(iso).getTime()) / 86_400_000

  const syncAge = ageDays(input.lastSuccessfulSyncAt)
  if (syncAge === null || syncAge > SILENCE_SYNC_DAYS) {
    alarms.push({
      code: ALARM.A5_SILENCE,
      detail:
        syncAge === null
          ? 'No successful storage-backup-sync has ever completed.'
          : `Last successful sync was ${syncAge.toFixed(1)} days ago, over the ${SILENCE_SYNC_DAYS} day threshold.`,
    })
  }

  const verifyAge = ageDays(input.lastSuccessfulVerifyAt)
  if (verifyAge === null || verifyAge > SILENCE_VERIFY_DAYS) {
    alarms.push({
      code: ALARM.A5_SILENCE,
      detail:
        verifyAge === null
          ? 'No successful storage-backup-verify has ever completed.'
          : `Last successful verify was ${verifyAge.toFixed(1)} days ago, over the ${SILENCE_VERIFY_DAYS} day threshold.`,
    })
  }

  return alarms
}
