import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isAssessment } from '@/lib/assessment'
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
    .select('status')
    .eq('id', session.archiveId)
    .maybeSingle()
  if (archive && isAssessment(archive)) redirect('/archive/assessment')

  return <DashboardClient archiveId={session.archiveId} />
}
