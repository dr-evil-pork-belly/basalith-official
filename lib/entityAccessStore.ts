/**
 * Reads and writes for lib/entityAccess.ts. October 6, 2026.
 *
 * Every read here fails closed. A missing row, a missing column, or a failed
 * query all read as: nobody has access, and the control is not offered.
 */

import { supabaseAdmin } from './supabase-admin'
import {
  normalizeMode,
  normalizeIds,
  pruneAccess,
  type EntityAccessState,
} from './entityAccess'

export type ArchiveAccessRow = EntityAccessState & {
  status:   string | null
  tier:     string | null
  pipeline: string | null
}

const CLOSED: ArchiveAccessRow = { mode: 'none', ids: [], status: null, tier: null, pipeline: null }

export async function readAccessRow(archiveId: string): Promise<ArchiveAccessRow> {
  try {
    const { data, error } = await supabaseAdmin
      .from('archives')
      .select('status, tier, contributor_entity_access, entity_preview_contributor_ids, entity_pipeline')
      .eq('id', archiveId)
      .maybeSingle()
    if (error || !data) return CLOSED
    return {
      mode:     normalizeMode(data.contributor_entity_access),
      ids:      normalizeIds(data.entity_preview_contributor_ids),
      status:   (data.status as string | null) ?? null,
      tier:     (data.tier as string | null) ?? null,
      pipeline: (data.entity_pipeline as string | null) ?? null,
    }
  } catch {
    return CLOSED
  }
}

/** Ids of the active contributors on one Basalith. */
export async function activeContributorIds(archiveId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('contributors')
    .select('id')
    .eq('archive_id', archiveId)
    .eq('status', 'active')
  return (data ?? []).map(r => r.id as string)
}

export async function writeAccessState(
  archiveId: string,
  next: EntityAccessState,
  opts: { stampEnabled?: boolean } = {},
): Promise<{ error: string | null }> {
  const patch: Record<string, unknown> = {
    contributor_entity_access:      next.mode,
    entity_preview_contributor_ids: next.ids,
  }
  if (opts.stampEnabled) patch.entity_access_enabled_at = new Date().toISOString()
  const { error } = await supabaseAdmin.from('archives').update(patch).eq('id', archiveId)
  return { error: error?.message ?? null }
}

/**
 * Called when a contributor is removed. Best effort by design: the removal has
 * already made their token useless (every contributor read filters on
 * status = 'active'), and this keeps the list from handing access back if the
 * same person is added again.
 */
export async function dropRemovedContributor(archiveId: string, contributorId: string): Promise<void> {
  try {
    const row = await readAccessRow(archiveId)
    const { next, changed } = pruneAccess(row, contributorId)
    if (changed) await writeAccessState(archiveId, next)
  } catch (e) {
    console.warn('[entity-access] prune after removal failed:', e instanceof Error ? e.message : e)
  }
}
