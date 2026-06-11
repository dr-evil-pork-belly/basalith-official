import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { supabaseAdmin } from '@/lib/supabase-admin'
import SuccessionClient from './SuccessionClient'

export default async function SuccessionPage() {
  const session = await getSessionUser()
  if (!session?.archiveId) redirect('/archive-login')

  const { data: successors } = await supabaseAdmin
    .from('successors')
    .select('id, name, email, organization, title, created_at, last_login_at')
    .eq('archive_id', session.archiveId)
    .order('created_at', { ascending: false })

  return (
    <SuccessionClient
      archiveId={session.archiveId}
      initialSuccessors={successors ?? []}
    />
  )
}
