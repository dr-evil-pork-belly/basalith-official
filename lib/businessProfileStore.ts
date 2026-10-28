/**
 * Reads and writes the business profile (lib/businessProfile.ts). October 28,
 * 2026. The answers are owner deposits found by their question text.
 */

import { supabaseAdmin } from './supabase-admin'
import { PROFILE_QUESTIONS, profileApplies, profileFromRows, type BusinessProfile } from './businessProfile'

/** The owner's profile, or null until both questions are answered. Throws on a read error. */
export async function loadBusinessProfile(archiveId: string): Promise<BusinessProfile | null> {
  const { data, error } = await supabaseAdmin
    .from('owner_deposits')
    .select('prompt, response, created_at')
    .eq('archive_id', archiveId)
    .is('contributor_id', null)
    .in('prompt', PROFILE_QUESTIONS.map(q => q.question))
  if (error) throw new Error(`load business profile ${archiveId}: ${error.message}`)
  return profileFromRows((data ?? []) as { prompt: string | null; response: string | null; created_at: string | null }[])
}

/**
 * Whether a page should send this owner to /archive/business first. False
 * whenever the screen does not apply, and false on a read error: a failed
 * read must never lock an owner out of his own portal.
 */
export async function needsBusinessProfile(
  archive: { id: string; tier?: string | null; status?: string | null; preferred_language?: string | null },
): Promise<boolean> {
  if (!profileApplies(archive)) return false
  try {
    return (await loadBusinessProfile(archive.id)) === null
  } catch (err) {
    console.error('[businessProfile] read failed, not redirecting:', err instanceof Error ? err.message : err)
    return false
  }
}
