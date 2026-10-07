/**
 * Who may put questions to a Basalith. October 6, 2026.
 * Record: docs/ENTITY_ACCESS_2026-10-06.md.
 *
 * The rule: the owner decides, one person at a time, and can close it to
 * anyone at any time. Nobody else grants access. A contributor cannot pass
 * access on.
 *
 * The state lives where it has lived since April 30, 2026
 * (20260430_archives_entity_access.sql), on the archives row:
 *
 *   contributor_entity_access        'none' | 'preview' | 'open'
 *   entity_preview_contributor_ids   uuid[]
 *
 * 'preview' means the listed contributors and nobody else. 'open' means every
 * active contributor. The owner's control only ever writes 'none' or
 * 'preview'; 'open' is read and honored for any row that already carries it.
 *
 * Until this file the list was honored by the contributor page only. The
 * route that answers (/api/archive/entity-chat) checked that the mode was not
 * 'none' and never read the list, so under 'preview' any active contributor's
 * token was answered. hasEntityAccess is now the one check, used by the route,
 * the page, and the owner's control.
 *
 * Pure functions only. No imports, so the tests need no client. The reads are
 * in lib/entityAccessStore.ts.
 */

export type EntityAccessMode = 'none' | 'preview' | 'open'

export type EntityAccessState = {
  mode: EntityAccessMode
  ids:  string[]
}

/**
 * The most people who can hold access to one Basalith at once. The contributor
 * cap decided September 24, 2026 is ten, and only a contributor can be granted
 * access, so this is the same number. Enforced on grant.
 */
export const MAX_ENTITY_ACCESS = 10

/** Questions one contributor may ask per window. See the route for the limits of this limiter. */
export const CONTRIBUTOR_QUESTIONS_PER_HOUR = 30
export const CONTRIBUTOR_QUESTION_WINDOW_MS = 60 * 60 * 1000

/** Longest question a contributor may send, in characters. */
export const CONTRIBUTOR_MESSAGE_MAX = 2000

/** Prior turns kept from a contributor's conversation. */
export const CONTRIBUTOR_HISTORY_MAX = 20

export function normalizeMode(raw: unknown): EntityAccessMode {
  return raw === 'preview' || raw === 'open' ? raw : 'none'
}

export function normalizeIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter((x): x is string => typeof x === 'string' && x.length > 0))]
}

/** The one access check. */
export function hasEntityAccess(state: EntityAccessState, contributorId: string | null | undefined): boolean {
  if (!contributorId) return false
  if (state.mode === 'open') return true
  if (state.mode === 'preview') return state.ids.includes(contributorId)
  return false
}

/** The active contributors who can ask right now. */
export function holders(state: EntityAccessState, activeIds: string[]): string[] {
  if (state.mode === 'open') return [...activeIds]
  if (state.mode === 'preview') return state.ids.filter(id => activeIds.includes(id))
  return []
}

/**
 * Give one active contributor access. Returns the state to write and whether
 * anything changed. An 'open' row is left as it is: everyone already has it.
 * A list that would pass MAX_ENTITY_ACCESS is refused with reason 'full'.
 */
export function grantAccess(
  state: EntityAccessState,
  contributorId: string,
  activeIds: string[],
): { next: EntityAccessState; changed: boolean; refused?: 'not_active' | 'full' } {
  if (!activeIds.includes(contributorId)) return { next: state, changed: false, refused: 'not_active' }
  if (state.mode === 'open') return { next: state, changed: false }

  // Drop anyone who is no longer an active contributor while we are here.
  const kept = state.mode === 'preview' ? state.ids.filter(id => activeIds.includes(id)) : []
  if (kept.includes(contributorId)) return { next: { mode: 'preview', ids: kept }, changed: false }
  if (kept.length >= MAX_ENTITY_ACCESS) return { next: state, changed: false, refused: 'full' }
  return { next: { mode: 'preview', ids: [...kept, contributorId] }, changed: true }
}

/**
 * Close it to one contributor. From 'open' this becomes a list of every other
 * active contributor, so closing one person never closes the rest. An empty
 * list becomes 'none'.
 */
export function revokeAccess(
  state: EntityAccessState,
  contributorId: string,
  activeIds: string[],
): { next: EntityAccessState; changed: boolean } {
  if (!hasEntityAccess(state, contributorId)) return { next: state, changed: false }
  const after = holders(state, activeIds).filter(id => id !== contributorId)
  const next: EntityAccessState = after.length === 0 ? { mode: 'none', ids: [] } : { mode: 'preview', ids: after }
  return { next, changed: true }
}

/**
 * A contributor who is removed loses access with the row. Without this the id
 * stays on the list, and adding the same email back (the contributors route
 * upserts on archive and email, so it is the same row id) would hand the
 * access back without the owner choosing to.
 */
export function pruneAccess(state: EntityAccessState, removedId: string): { next: EntityAccessState; changed: boolean } {
  if (state.mode !== 'preview' || !state.ids.includes(removedId)) return { next: state, changed: false }
  const ids = state.ids.filter(id => id !== removedId)
  return { next: ids.length === 0 ? { mode: 'none', ids: [] } : { mode: 'preview', ids }, changed: true }
}

export type AccessBlock = 'not_active' | 'succession' | 'pipeline' | null

/**
 * Whether the owner's control is offered at all.
 *
 *   not_active  a trial, paused, or terminated Basalith. A trial has no
 *               contributors (lib/trial.ts), so there is nobody to grant.
 *   succession  the successor has a sign in of their own; that is the product.
 *               Not offered to contributors of a business record.
 *   pipeline    the Basalith is still on the 'context' builder
 *               (archives.entity_pipeline), which has no verifier. A relative
 *               is only ever answered by the grounded path, where an answer
 *               the record does not support is replaced by the gap reply.
 */
export function accessBlock(archive: { status?: string | null; tier?: string | null; pipeline?: string | null }): AccessBlock {
  if (archive.status !== 'active') return 'not_active'
  if (archive.tier === 'succession') return 'succession'
  if (archive.pipeline !== 'grounded') return 'pipeline'
  return null
}

/**
 * The contributor token on a request, or null.
 *
 * It travels as `Authorization: Bearer <token>` (web portal, iOS) or as
 * body.contributorToken. The iOS owner sends a Supabase JWT in the same
 * header, so a value with three dot separated segments is not a contributor
 * token. Tokens are 64 hex characters today (lib/contributorToken.ts);
 * anything of 32 or more is accepted, matching getContributorByToken.
 */
export function contributorTokenFrom(authHeader: string | null | undefined, bodyToken: unknown): string | null {
  const candidates: unknown[] = []
  if (authHeader && /^Bearer\s+/i.test(authHeader)) candidates.push(authHeader.replace(/^Bearer\s+/i, '').trim())
  candidates.push(bodyToken)
  for (const c of candidates) {
    if (typeof c !== 'string') continue
    const t = c.trim()
    if (t.length < 32 || t.length > 256) continue
    if (t.split('.').length === 3) continue
    if (!/^[A-Za-z0-9_-]+$/.test(t)) continue
    return t
  }
  return null
}
