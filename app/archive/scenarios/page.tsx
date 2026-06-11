import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { supabaseAdmin } from '@/lib/supabase-admin'
import ScenariosClient from './ScenariosClient'

export default async function ScenariosPage() {
  const session = await getSessionUser()
  if (!session?.archiveId) redirect('/archive-login')

  const { data: responses } = await supabaseAdmin
    .from('b2b_scenario_responses')
    .select('scenario_id, response, created_at')
    .eq('archive_id', session.archiveId)
    .order('created_at', { ascending: false })

  return (
    <ScenariosClient
      archiveId={session.archiveId}
      existingResponses={responses ?? []}
    />
  )
}
