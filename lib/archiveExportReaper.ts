/**
 * Deletes generated export zips once they reach RETENTION_DAYS.
 *
 * Lives in lib/ rather than inside the cron route because the export job calls
 * it too. Any export activity reaps, so the bucket is not left to a single
 * scheduled job that can quietly stop running.
 *
 * See lib/archiveExportStorage.ts for why this bucket is excluded from backup
 * and why retention is short.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { EXPORT_BUCKET, RETENTION_SECONDS } from '@/lib/archiveExportStorage'

export interface ReapResult {
  ok:            boolean
  error?:        string
  /** True when nothing was deleted and `deletedPaths` is what WOULD have gone. */
  dryRun:        boolean
  scanned:       number
  deleted:       number
  deletedPaths?: string[]
  kept?:         { path: string; expiresAt: string }[]
  ranAt?:        string
}

export interface ReapOptions {
  /** Injected for tests. Defaults to now. */
  now?: Date
  /**
   * Report what would be deleted and delete nothing.
   *
   * This exists because the alternative way to gain confidence in a delete path
   * that runs against complete unencrypted archive copies is to let it delete
   * something and see what happened. A dry run against live Storage proves the
   * traversal, the age arithmetic, and the root-file guard on real objects
   * before anything is destroyed.
   *
   * `deleted` stays 0 in a dry run and `deletedPaths` carries the candidates, so
   * a caller that ignores the `dryRun` flag cannot misread a dry run as work
   * done.
   */
  dryRun?: boolean
}

export async function reapExpiredExports(options: ReapOptions = {}): Promise<ReapResult> {
  const now    = options.now ?? new Date()
  const dryRun = options.dryRun === true
  const cutoff = now.getTime() - RETENTION_SECONDS * 1000

  // Top level of the bucket is one folder per archive id.
  const { data: prefixes, error: listErr } = await supabaseAdmin.storage
    .from(EXPORT_BUCKET)
    .list('', { limit: 1000 })

  if (listErr) {
    console.error('[export-reaper] bucket list failed:', listErr.message)
    return { ok: false, error: listErr.message, dryRun, scanned: 0, deleted: 0 }
  }

  let scanned = 0
  const doomed: string[] = []
  const kept: { path: string; expiresAt: string }[] = []

  for (const prefix of prefixes ?? []) {
    // A file at the bucket root is not something this job created. Leave it and
    // say so rather than deleting something whose provenance is unknown.
    if ((prefix as { id?: string | null }).id !== null) {
      console.warn(`[export-reaper] unexpected object at bucket root, left in place: ${prefix.name}`)
      continue
    }

    const { data: objects, error } = await supabaseAdmin.storage
      .from(EXPORT_BUCKET)
      .list(prefix.name, { limit: 1000 })

    if (error) {
      console.error(`[export-reaper] list ${prefix.name} failed:`, error.message)
      continue
    }

    for (const obj of objects ?? []) {
      if ((obj as { id?: string | null }).id === null) continue
      scanned += 1
      const path    = `${prefix.name}/${obj.name}`
      const created = obj.created_at ? new Date(obj.created_at).getTime() : 0

      // An object with no created_at cannot be aged. Treat it as expired rather
      // than immortal. Nothing in this bucket is worth keeping on a doubt.
      if (!created || created <= cutoff) {
        doomed.push(path)
      } else {
        kept.push({ path, expiresAt: new Date(created + RETENTION_SECONDS * 1000).toISOString() })
      }
    }
  }

  // A dry run stops here. remove() is not reached, not called with an empty
  // array, not called at all.
  if (dryRun) {
    console.log(`[export-reaper] DRY RUN scanned=${scanned} wouldDelete=${doomed.length} kept=${kept.length}`)
    return { ok: true, dryRun: true, scanned, deleted: 0, deletedPaths: doomed, kept, ranAt: now.toISOString() }
  }

  let deleted = 0
  if (doomed.length) {
    const { error } = await supabaseAdmin.storage.from(EXPORT_BUCKET).remove(doomed)
    if (error) {
      console.error('[export-reaper] remove failed:', error.message)
      return { ok: false, error: error.message, dryRun: false, scanned, deleted: 0, deletedPaths: doomed }
    }
    deleted = doomed.length
  }

  console.log(`[export-reaper] scanned=${scanned} deleted=${deleted} kept=${kept.length}`)
  return { ok: true, dryRun: false, scanned, deleted, deletedPaths: doomed, kept, ranAt: now.toISOString() }
}
