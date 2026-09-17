/**
 * Self-serve trial archives. Slice A, September 17, 2026.
 *
 * A trial is an archives row with status = 'trial' and trial_expires_at set
 * thirty days after trial_started_at. No CHECK enforces the value; the
 * convention is documented in CLAUDE.md section 4 and lib/cronGates.test.ts
 * keeps every scheduled email on status = 'active', so a trial is invisible
 * to the crons by construction. Pure functions only, so the route and the
 * page can be tested without a Supabase client.
 *
 * Skeleton: docs/SELF_SERVE_SKELETON_2026-09-17.md sections 1.1 and 1.2.
 */

export const TRIAL_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * The family name for a trial archive, from the person's own name: the last
 * whitespace token ("Ha" from "David Ha"), or the whole trimmed name when it
 * is one token. First letter upper-cased, the rest left as typed. Never
 * empty: a blank name falls back to 'Founder' so archives.family_name
 * (NOT NULL) is always set.
 */
export function deriveFamilyName(name: string): string {
  const tokens = (name ?? '').trim().split(/\s+/).filter(Boolean)
  const last = tokens[tokens.length - 1] ?? ''
  if (!last) return 'Founder'
  return last.charAt(0).toUpperCase() + last.slice(1)
}

/** trial_started_at and trial_expires_at for a trial opened at `now`. */
export function trialWindow(now: Date = new Date()): { startedAt: string; expiresAt: string } {
  return {
    startedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + TRIAL_DAYS * DAY_MS).toISOString(),
  }
}

export function isTrial(archive: { status?: string | null }): boolean {
  return archive.status === 'trial'
}

/**
 * Whether the founding proof may be shown. One completed founding call is
 * enough: the proof needs one included training pair, and call 1 produces
 * ten to fifteen (recon C2). Until September 17, 2026 the proof route
 * required all three calls (`status.done`).
 */
export function canShowProof(status: { completed: number }): boolean {
  return status.completed >= 1
}
