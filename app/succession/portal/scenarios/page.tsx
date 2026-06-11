import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { supabaseAdmin } from '@/lib/supabase-admin'
import SuccessorScenariosClient from './SuccessorScenariosClient'

export default async function SuccessorScenariosPage() {
  const session = await getSessionUser()
  if (!session?.successorId || !session.archiveId) redirect('/succession/login')

  const [archiveResult, responsesResult] = await Promise.all([
    supabaseAdmin
      .from('archives')
      .select('name, owner_name')
      .eq('id', session.archiveId)
      .single(),
    supabaseAdmin
      .from('b2b_scenario_responses')
      .select('scenario_id, response, created_at')
      .eq('archive_id', session.archiveId)
      .order('created_at', { ascending: false }),
  ])

  return (
    <SuccessorScenariosClient
      archiveName={archiveResult.data?.name ?? 'Archive'}
      ownerName={archiveResult.data?.owner_name ?? ''}
      responses={responsesResult.data ?? []}
    />
  )
}
