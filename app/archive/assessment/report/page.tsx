import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isAssessment } from '@/lib/assessment'
import ReportClient from './ReportClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your report',
}

// The founder reads their own report here. Slice 4a, October 8, 2026. Owner
// only, assessment records only; everyone else goes to the dashboard. Whether
// a report exists yet is the API's answer, and the client says so plainly.
export default async function AssessmentReportPage() {
  const session = await getSessionUser()
  if (!session?.archiveId) redirect('/archive-login')

  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, owner_user_id, status')
    .eq('id', session.archiveId)
    .maybeSingle()

  if (!archive || archive.owner_user_id !== session.userId) redirect('/archive-login')
  if (!isAssessment(archive)) redirect('/archive/dashboard')

  return <ReportClient />
}
