import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isAssessment } from '@/lib/assessment'
import { needsBusinessProfile } from '@/lib/businessProfileStore'
import DashboardClient from './DashboardClient'

export const metadata: Metadata = {
  title: 'Your Basalith',
}

export default async function ArchiveDashboardPage() {
  const session = await getSessionUser()
  if (!session?.archiveId) redirect('/begin?signed_in=1')

  // An assessment record (lib/assessment.ts) has its own page. The dashboard
  // is built for a client's Basalith and says things that are not true of an
  // assessment. This is also where the sign in callback lands a founder.
  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, owner_user_id, tier, status, preferred_language')
    .eq('id', session.archiveId)
    .maybeSingle()
  if (archive && isAssessment(archive)) redirect('/archive/assessment')
  // An owner describes his business before anything else, when the owner
  // openers are on for him (lib/businessProfile.ts, October 28, 2026).
  // Owner only: a successor's session can resolve to this record, and the
  // profile screen would send him on to sign in.
  if (archive && archive.owner_user_id === session.userId && await needsBusinessProfile(archive)) {
    redirect('/archive/business')
  }

  return <DashboardClient archiveId={session.archiveId} />
}
