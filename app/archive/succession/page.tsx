import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import SuccessionClient from './SuccessionClient'

export default async function SuccessionPage() {
  const cookieStore = await cookies()
  const archiveId   = cookieStore.get('archive-id')?.value
  if (!archiveId) redirect('/archive-login')

  const { data: successors } = await supabaseAdmin
    .from('successors')
    .select('id, name, email, organization, title, created_at, last_login_at')
    .eq('archive_id', archiveId)
    .order('created_at', { ascending: false })

  return (
    <SuccessionClient
      archiveId={archiveId}
      initialSuccessors={successors ?? []}
    />
  )
}
