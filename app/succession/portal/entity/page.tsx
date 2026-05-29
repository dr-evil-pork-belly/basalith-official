import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import SuccessorEntityClient from './SuccessorEntityClient'

export default async function SuccessorEntityPage() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('successor_session')?.value

  let session: { successorId: string; archiveId: string; name: string; organization: string | null } | null = null
  try { session = raw ? JSON.parse(raw) : null } catch {}
  if (!session?.successorId) redirect('/succession/login')

  const [archiveResult, contextsResult] = await Promise.all([
    supabaseAdmin
      .from('archives')
      .select('name, owner_name')
      .eq('id', session.archiveId)
      .single(),
    supabaseAdmin
      .from('successor_contexts')
      .select('id, content, context_type, created_at')
      .eq('successor_id', session.successorId)
      .order('created_at', { ascending: false }),
  ])

  return (
    <SuccessorEntityClient
      session={session}
      archiveName={archiveResult.data?.name ?? 'Archive'}
      ownerName={archiveResult.data?.owner_name ?? ''}
      activeContexts={contextsResult.data ?? []}
    />
  )
}
