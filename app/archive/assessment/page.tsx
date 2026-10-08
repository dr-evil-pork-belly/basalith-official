import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isAssessment } from '@/lib/assessment'
import AssessmentClient from './AssessmentClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your assessment',
}

// The founder's assessment page. Slice 3b, October 8, 2026. Owner only: the
// record comes from the session. Only an assessment record
// (archives.status = 'assessment') is shown this page; every other owner is
// sent to the dashboard, which is where /archive/dashboard sends an
// assessment record here. The two redirects cannot loop: each fires on the
// opposite answer to the same question.
export default async function AssessmentPage() {
  const session = await getSessionUser()
  if (!session?.archiveId) redirect('/archive-login')

  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, owner_user_id, status')
    .eq('id', session.archiveId)
    .maybeSingle()

  if (!archive || archive.owner_user_id !== session.userId) redirect('/archive-login')
  if (!isAssessment(archive)) redirect('/archive/dashboard')

  return <AssessmentClient />
}
