/**
 * Trial expiry, the pure core. Slice B, September 17, 2026.
 *
 * Nothing in this file touches a database. Every decision the two crons make
 * (which trials to warn, which to delete, whether the auth user goes with the
 * archive, the order of the delete) is a pure function over rows the caller
 * has already read, so it is tested without a Supabase client and the
 * Inngest functions and the probe script share one body
 * (lib/trialExpiryRunner.ts).
 *
 * Skeleton: docs/SELF_SERVE_SKELETON_2026-09-17.md section 2. The live
 * cascade map that made the delete writable is in
 * docs/SELF_SERVE_BUILD_B_2026-09-17.md.
 */

export const WARN_DAYS_BEFORE = 7

const DAY_MS = 24 * 60 * 60 * 1000

/** The columns the crons read from archives. Everything else is untouched. */
export interface TrialRow {
  id: string
  name: string | null
  owner_email: string | null
  owner_name: string | null
  status: string | null
  trial_expires_at: string | null
  trial_warned_at: string | null
  scheduled_deletion_at: string | null
  preferred_language?: string | null
}

/**
 * The warn select's window, [from, to): trials expiring between six and eight
 * days from now. The cron runs daily, so every trial passes through the
 * two-day window exactly once, and trial_warned_at is what keeps a second
 * pass from mailing twice.
 */
export function warnWindow(now: Date = new Date()): { from: string; to: string } {
  return {
    from: new Date(now.getTime() + (WARN_DAYS_BEFORE - 1) * DAY_MS).toISOString(),
    to:   new Date(now.getTime() + (WARN_DAYS_BEFORE + 1) * DAY_MS).toISOString(),
  }
}

function inWindow(iso: string | null, from: string, to: string): boolean {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return t >= new Date(from).getTime() && t < new Date(to).getTime()
}

/**
 * Trials due the day 23 warning: still a trial, not yet warned, expiring
 * inside the window, and not on the owner-terminated 365 day path.
 */
export function selectTrialsToWarn<T extends TrialRow>(rows: readonly T[], now: Date = new Date()): T[] {
  const { from, to } = warnWindow(now)
  return rows.filter(r =>
    r.status === 'trial' &&
    r.trial_warned_at === null &&
    r.scheduled_deletion_at === null &&
    inWindow(r.trial_expires_at, from, to),
  )
}

/**
 * Trials to delete: still a trial, expired, and not on the owner-terminated
 * path. A converted trial has status 'active' (slice C) and never selects. A
 * trial the owner terminated by hand through /api/archive/terminate has
 * scheduled_deletion_at set and takes the 365 day dissolution path that
 * already exists; the two never race because this select refuses it.
 */
export function selectTrialsToExpire<T extends TrialRow>(rows: readonly T[], now: Date = new Date()): T[] {
  const cutoff = now.getTime()
  return rows.filter(r =>
    r.status === 'trial' &&
    r.scheduled_deletion_at === null &&
    r.trial_expires_at !== null &&
    new Date(r.trial_expires_at).getTime() < cutoff,
  )
}

/**
 * Whether the auth user (and its profiles row) goes with the archive. The
 * caller reads the four counts AFTER the archives row is deleted, so
 * ownedArchives counts other archives only. Any other role or ownership
 * keeps the user: a contributor on a family archive who tried a trial keeps
 * their sign-in, and so does a successor or a Legacy Guide.
 */
export function canDeleteAuthUser(input: {
  ownedArchives: number
  contributorRows: number
  successorRows: number
  archivistRows: number
}): boolean {
  return (
    input.ownedArchives === 0 &&
    input.contributorRows === 0 &&
    input.successorRows === 0 &&
    input.archivistRows === 0
  )
}

/**
 * The per-archive delete, in order. The Inngest function runs one step per
 * entry, named `${step}:${archiveId}`, and the probe script runs the same
 * body. The order is load bearing:
 *
 *   mark_terminated       termination_requested_at is what the storage purge
 *                         and the B2 filter key on; set it first.
 *   purge_storage         Supabase Storage under {archiveId}/ in five buckets.
 *   assert_no_b2          storage_backup_objects must hold nothing for the id.
 *                         A non-zero count stops this archive: the slice A
 *                         exclusion promised it, and a violation is a bug to
 *                         read, not a row to delete around.
 *   delete_email_replies  the one table with a no-action FK to archives.
 *   delete_application    the trial's archive_applications row, keyed by
 *                         email and status; no FK, so not in the cascade.
 *   delete_archive        one delete; the cascade takes the rest.
 *   maybe_delete_user     profiles then auth.users, only if the user owns
 *                         nothing else and holds no other role.
 *   notify                internal notice, domain only, never the address.
 */
export const DELETE_ORDER = [
  'mark_terminated',
  'purge_storage',
  'assert_no_b2',
  'delete_email_replies',
  'delete_application',
  'delete_archive',
  'maybe_delete_user',
  'notify',
] as const

export type DeleteStep = (typeof DELETE_ORDER)[number]

/** The address's domain, for the internal notice. Never the address itself. */
export function emailDomain(email: string | null | undefined): string {
  if (!email) return '(no email)'
  const at = email.lastIndexOf('@')
  return at >= 0 ? email.slice(at + 1) : '(malformed)'
}
