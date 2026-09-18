/**
 * Deletes one archive's objects from Supabase Storage across the five
 * archive-scoped buckets. Lifted out of scripts/dissolution-purge.ts on
 * September 17, 2026 so the trial expiry job (lib/trialExpiryRunner.ts) and
 * the runbook script run one body. The script is now a thin caller.
 *
 * Every safety property the script had is kept:
 *
 *   - It refuses unless archives.termination_requested_at is set. Its only
 *     function is destruction and its only input is a uuid; nothing else
 *     stops it running against a live family archive on a typo. The trial
 *     job sets termination_requested_at first (DELETE_ORDER) for exactly this
 *     reason. Deliberately NOT a check on scheduled_deletion_at: that date is
 *     runbook step 4.0's gate, and duplicating it here would make the script
 *     impossible to rehearse against a drill archive.
 *   - It deletes only under the `{archiveId}/` prefix.
 *   - It walks the four backup ALLOWLIST buckets plus archive-exports.
 *     vault-files is absent on purpose: its objects key on a vault, not an
 *     archive (runbook 1.3).
 *   - Storage API, not SQL. `delete from storage.objects` removes the row that
 *     points at a file and can leave the file in the backend.
 *   - After deleting in a bucket it walks the prefix again and throws if
 *     anything survived.
 *
 * PROVEN as a script August 12, 2026 against the drill archive
 * dddddddd-0000-4000-8000-000000009a01, six objects across three buckets.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { ALLOWLIST } from './storageBackup'

export const EXPORT_BUCKET = 'archive-exports'

/** The five archive-scoped buckets, in walk order. */
export const PURGE_BUCKETS: readonly string[] = [...ALLOWLIST, EXPORT_BUCKET]

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface BucketPurgeResult {
  bucket: string
  /** Objects found under the prefix before any delete. */
  found: number
  /** Objects removed. Zero on a dry run. */
  deleted: number
  /** True when the prefix walked empty after the delete. Null on a dry run. */
  verifiedEmpty: boolean | null
  /** Every path found, for the log. */
  paths: string[]
}

export interface PurgeResult {
  archiveId: string
  dryRun: boolean
  buckets: BucketPurgeResult[]
  total: number
}

export interface PurgeDeps {
  /** The service-role client. Never the anon client. */
  supabaseAdmin: Pick<SupabaseClient, 'from' | 'storage'>
  /** List only, delete nothing. Default false. */
  dryRun?: boolean
  /** Line logger. Default console.log. */
  log?: (line: string) => void
}

/** Recursive listing of one bucket under a prefix. A folder placeholder has a null id. */
export async function walkPrefix(
  storage: Pick<SupabaseClient, 'storage'>['storage'],
  bucket: string,
  prefix: string,
  out: string[],
): Promise<void> {
  const { data, error } = await storage.from(bucket).list(prefix, { limit: 1000 })
  if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`)
  for (const entry of data ?? []) {
    const full = prefix ? `${prefix}/${entry.name}` : entry.name
    if ((entry as { id?: string | null }).id === null) await walkPrefix(storage, bucket, full, out)
    else out.push(full)
  }
}

/**
 * The gate. Reads the archives row and throws unless termination_requested_at
 * is set. Exported so the probe script can show the refusal without deleting.
 */
export async function requireTerminated(
  supabaseAdmin: Pick<SupabaseClient, 'from'>,
  archiveId: string,
): Promise<{ id: string; name: string | null; termination_requested_at: string; scheduled_deletion_at: string | null }> {
  const { data: archive, error } = await supabaseAdmin
    .from('archives')
    .select('id, name, termination_requested_at, scheduled_deletion_at')
    .eq('id', archiveId)
    .maybeSingle()
  if (error) throw new Error(`archive lookup: ${error.message}`)
  if (!archive) throw new Error(`no archives row for ${archiveId}. Refusing.`)
  if (!archive.termination_requested_at) {
    throw new Error(
      `${archiveId} (${archive.name}) has no termination_requested_at. The purge only ` +
        `runs against an archive that has requested dissolution. Refusing.`,
    )
  }
  return archive as { id: string; name: string | null; termination_requested_at: string; scheduled_deletion_at: string | null }
}

export async function purgeArchiveStorage(archiveId: string, deps: PurgeDeps): Promise<PurgeResult> {
  if (!UUID_RE.test(archiveId)) throw new Error(`purgeArchiveStorage: not a uuid: ${JSON.stringify(archiveId)}`)
  const { supabaseAdmin, dryRun = false } = deps
  const log = deps.log ?? ((line: string) => console.log(line))

  const archive = await requireTerminated(supabaseAdmin, archiveId)
  log(`archive:                  ${archive.name}`)
  log(`termination_requested_at: ${archive.termination_requested_at}`)
  log(`scheduled_deletion_at:    ${archive.scheduled_deletion_at}`)

  const buckets: BucketPurgeResult[] = []
  let total = 0

  for (const bucket of PURGE_BUCKETS) {
    const paths: string[] = []
    await walkPrefix(supabaseAdmin.storage, bucket, archiveId, paths)

    log(`\n${bucket}: ${paths.length} object(s) under ${archiveId}/`)
    for (const p of paths) log(`  ${p}`)
    total += paths.length

    const result: BucketPurgeResult = { bucket, found: paths.length, deleted: 0, verifiedEmpty: null, paths }
    buckets.push(result)
    if (!paths.length || dryRun) continue

    // remove() takes up to 1000 paths per call.
    for (let i = 0; i < paths.length; i += 500) {
      const batch = paths.slice(i, i + 500)
      const { error } = await supabaseAdmin.storage.from(bucket).remove(batch)
      if (error) throw new Error(`remove ${bucket}: ${error.message}`)
      result.deleted += batch.length
      log(`  deleted ${batch.length}`)
    }

    // Verify this bucket is empty for the prefix before moving to the next.
    const after: string[] = []
    await walkPrefix(supabaseAdmin.storage, bucket, archiveId, after)
    if (after.length) throw new Error(`${bucket}: ${after.length} object(s) survived deletion`)
    result.verifiedEmpty = true
    log(`  verified empty`)
  }

  log(`\n${dryRun ? 'WOULD DELETE' : 'DELETED'} ${total} object(s) total`)
  return { archiveId, dryRun, buckets, total }
}
