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
 */
function changeKey(bucket: string, path: string, size: number, etag: string | null): string {
  return `${bucket} ${path} ${size} ${etag ?? ''}`
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
