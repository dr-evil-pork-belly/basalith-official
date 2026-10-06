import { supabaseAdmin } from '@/lib/supabase-admin'

// Contributor referral, October 6, 2026. See docs/LAUNCH_REVENUE_2026-10-06.md.
//
// A contributor who has added to someone's Basalith is shown one link to begin
// their own, at /begin?ref=<contributor id>. The id is the contributors row
// uuid, never the access token: the token is a credential and does not belong
// in a query string.
//
// This resolves the id to a live contributor on an active Basalith, or null.
// It decides two things only: whether /begin shows the waiver line, and what
// the trial start route records. It grants nothing by itself. The Founding fee
// is waived by hand, with waiveFounding on the admin checkout route.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ContributorReferral = { contributorId: string; archiveId: string }

export function isReferralCode(raw: unknown): raw is string {
  return typeof raw === 'string' && UUID.test(raw)
}

export async function resolveContributorReferral(raw: unknown): Promise<ContributorReferral | null> {
  if (!isReferralCode(raw)) return null
  try {
    const { data: contributor } = await supabaseAdmin
      .from('contributors')
      .select('id, archive_id, status')
      .eq('id', raw)
      .maybeSingle()
    if (!contributor || contributor.status !== 'active' || !contributor.archive_id) return null

    const { data: archive } = await supabaseAdmin
      .from('archives')
      .select('id, status')
      .eq('id', contributor.archive_id)
      .maybeSingle()
    if (!archive || archive.status !== 'active') return null

    return { contributorId: contributor.id, archiveId: archive.id }
  } catch {
    // A failed lookup means no referral. It never blocks a person from beginning.
    return null
  }
}
