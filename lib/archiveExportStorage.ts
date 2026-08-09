/**
 * Where a generated archive export lives, and for exactly how long.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS BUCKET IS EXCLUDED FROM ANY BACKUP SYNC. PERMANENTLY. NO EXCEPTIONS.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * An export object is a complete, unencrypted copy of a family's entire archive
 * in one file. The storage backup plan in docs/STORAGE_BACKUP_RECON_2026-08.md
 * recommends an additive-only sync with Object Lock at 90 days, which by design
 * cannot delete what it has taken.
 *
 * If this bucket were ever inside that sync, every export a family requested
 * would become a full copy of their archive that we could not delete for 90
 * days, including after they invoked the Right of Dissolution. /data-ownership
 * tenet 04 says in writing:
 *
 *     "We have no backup of your archive that survives a dissolution request."
 *
 * Syncing this bucket makes that sentence false. Whoever builds the backup job
 * must skip `archive-exports` by name and assert the skip in a test.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS BUCKET IS ON THE DISSOLUTION DELETION CHECKLIST.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * app/api/archive/terminate/route.ts sets termination_requested_at and
 * scheduled_deletion_at and sends two emails. It deletes nothing. No code
 * anywhere deletes archive content today. When the eventual manual deletion is
 * performed, `archive-exports/{archiveId}/` must be purged along with the five
 * content buckets, or the first dissolution silently leaves a complete copy
 * behind.
 *
 * The reaper below caps that exposure at RETENTION_DAYS even if the checklist
 * is missed, which is the reason retention is short.
 */

export const EXPORT_BUCKET = 'archive-exports'

/**
 * Object life and link life are both this. They are the same number on purpose.
 *
 * The precedent being avoided is the voice portrait email, which signed for 30
 * days against an object that was never reaped. Those links expired in May and
 * June 2026 and left two families unable to reach audio we still hold.
 *
 * Seven days is long enough for a family to be away for a weekend and still act,
 * and short enough that a full plaintext copy is not sitting in Storage for a
 * month. The standing offer to request another export at any time is what makes
 * a short window safe.
 */
export const RETENTION_DAYS    = 7
export const RETENTION_SECONDS = RETENTION_DAYS * 24 * 60 * 60

/** Object path. The archive id prefix is what the dissolution purge targets. */
export function exportObjectPath(archiveId: string, exportId: string): string {
  return `${archiveId}/${exportId}.zip`
}

/** The instant both the object and its signed URL stop being valid. */
export function expiresAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + RETENTION_SECONDS * 1000)
}

/**
 * Human-readable absolute date for the email. The brief requires an absolute
 * date, never a duration, because "expires in 7 days" is unreadable in an inbox
 * a week later.
 */
export function formatExpiry(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  })
}

/**
 * Reads the `exp` claim out of a Supabase signed URL token.
 *
 * Used by the reaper and by scripts/export-probe.ts to prove that the link and
 * the object carry the same expiry rather than asserting it in a comment. The
 * token is a JWT; only the payload is read and no signature check is performed,
 * because this is reading our own freshly minted token, not trusting an inbound one.
 */
export function signedUrlExpiry(signedUrl: string): Date | null {
  try {
    const token = new URL(signedUrl, 'https://placeholder.invalid').searchParams.get('token')
    if (!token) return null
    const payload = token.split('.')[1]
    if (!payload) return null
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    const exp  = JSON.parse(json)?.exp
    return typeof exp === 'number' ? new Date(exp * 1000) : null
  } catch {
    return null
  }
}
