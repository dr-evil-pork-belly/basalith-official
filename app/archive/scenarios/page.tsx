import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import ScenariosClient from './ScenariosClient'

export default async function ScenariosPage() {
  const cookieStore = await cookies()
  const archiveId   = cookieStore.get('archive-id')?.value
  if (!archiveId) redirect('/archive-login')

  const { data: responses } = await supabaseAdmin
    .from('b2b_scenario_responses')
    .select('scenario_id, response, created_at')
    .eq('archive_id', archiveId)
    .order('created_at', { ascending: false })

  return (
    <ScenariosClient
      archiveId={archiveId}
      existingResponses={responses ?? []}
    />
  )
}
