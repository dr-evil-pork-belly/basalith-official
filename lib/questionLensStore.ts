/**
 * Question lenses, the one read. October 13, 2026.
 *
 * `archives.audience` is added by migration 20261013_archives_audience.sql,
 * pasted by hand. This read is kept apart from every route's own archives
 * select ON PURPOSE: a select that names a column the table does not have
 * fails whole, the route reads that as "no such record," and every owner is
 * refused. Here a failed read is logged and answered as null, so this code
 * is safe to deploy before the migration is pasted, in either order. The
 * cost of a failure is that a church record is asked the personal questions.
 */

import { supabaseAdmin } from './supabase-admin'
import { lensFor, type QuestionLens } from './questionLens'

/** archives.audience for one record, or null (unset, unreadable, or no column yet). */
export async function loadAudience(archiveId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('archives')
      .select('audience')
      .eq('id', archiveId)
      .maybeSingle()
    if (error) {
      console.warn('[questionLens] audience read failed, treated as unset:', error.message)
      return null
    }
    const v = (data as { audience?: unknown } | null)?.audience
    return typeof v === 'string' && v.trim() ? v.trim() : null
  } catch (err) {
    console.warn('[questionLens] audience read threw, treated as unset:', err instanceof Error ? err.message : err)
    return null
  }
}

/** The lens for a record whose tier and status the caller has already read. */
export async function loadLens(archive: {
  id:      string
  tier?:   string | null
  status?: string | null
}): Promise<QuestionLens> {
  // Only a record off the succession tier can be church; skip the read otherwise.
  const audience = archive.tier === 'succession' ? null : await loadAudience(archive.id)
  return lensFor({ tier: archive.tier, status: archive.status, audience })
}
