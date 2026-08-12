/**
 * Deletes one archive's objects from Supabase Storage across the five
 * archive-scoped buckets. Dissolution only. See docs/DISSOLUTION_RUNBOOK.md 4.1.
 *
 *   npx tsx scripts/dissolution-purge.ts <archive-id>             lists, deletes nothing
 *   npx tsx scripts/dissolution-purge.ts <archive-id> --confirm   deletes
 *
 * Storage API, not SQL. `delete from storage.objects` removes the row that
 * points at a file and can leave the file itself in the storage backend, which
 * is a dissolution that reports success over bytes that still exist.
 *
 * `vault-files` is absent on purpose. Its objects key on a vault, not an
 * archive, so there is nothing here for a dissolution to target. Runbook 1.3.
 *
 * PROVEN August 12, 2026 against the disposable drill archive
 * dddddddd-0000-4000-8000-000000009a01, six objects across three buckets.
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
  { auth: { persistSession: false } },
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

/**
 * SAFETY GATE. Added August 12, 2026 after the 9a drill, and not in the
 * runbook's original listing of this script.
 *
 * This script's only function is destruction and its only input is a uuid typed
 * by a person. Nothing stopped the original running against a live family
 * archive on a typo. This refuses unless the archive has actually requested
 * dissolution, which is the invariant every other step in section 4 assumes.
 *
 * Deliberately NOT a check on scheduled_deletion_at. That date is step 4.0's
 * gate, and duplicating it here would make the script impossible to rehearse
 * against a drill archive, which is how the runbook gets proven at all. Do not
 * "tighten" this later without reading that sentence.
 */
async function requireTerminated(): Promise<void> {
  const { data: archive, error } = await supabase
    .from('archives')
    .select('id, name, termination_requested_at, scheduled_deletion_at')
    .eq('id', archiveId)
    .maybeSingle()
  if (error) throw new Error(`archive lookup: ${error.message}`)
  if (!archive) throw new Error(`no archives row for ${archiveId}. Refusing.`)
  if (!archive.termination_requested_at) {
    throw new Error(
      `${archiveId} (${archive.name}) has no termination_requested_at. This script only ` +
        `runs against an archive that has requested dissolution. Refusing.`,
    )
  }
  console.log(`archive:                  ${archive.name}`)
  console.log(`termination_requested_at: ${archive.termination_requested_at}`)
  console.log(`scheduled_deletion_at:    ${archive.scheduled_deletion_at}`)
}

async function main() {
  await requireTerminated()

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

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
