/**
 * The one read lib/conversationalInterview.ts needs: how many of this
 * record's calls already carry an arm. Kept apart so the module above stays
 * pure. A failed read answers 0, which only shifts which arm the next call
 * gets; it never blocks the call.
 */

import { supabaseAdmin } from './supabase-admin'

export async function countArmedCalls(archiveId: string): Promise<number> {
  try {
    const { count, error } = await supabaseAdmin
      .from('incident_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('archive_id', archiveId)
      .not('state->>interviewArm', 'is', null)
    if (error) {
      console.warn('[conversationalInterviewStore] count failed:', error.message)
      return 0
    }
    return count ?? 0
  } catch (err) {
    console.warn('[conversationalInterviewStore] count threw:', err instanceof Error ? err.message : err)
    return 0
  }
}
