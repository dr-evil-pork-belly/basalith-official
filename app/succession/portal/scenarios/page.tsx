import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import SuccessorScenariosClient from './SuccessorScenariosClient'

export default async function SuccessorScenariosPage() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('successor_session')?.value

  let session: { successorId: string; archiveId: string; name: string; organization: string | null } | null = null
  try { session = raw ? JSON.parse(raw) : null } catch {}
  if (!session?.successorId) redirect('/succession/login')

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
