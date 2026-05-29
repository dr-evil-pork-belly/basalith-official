import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import SuccessorPortalClient from './SuccessorPortalClient'

export default async function SuccessorPortalPage() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('successor_session')?.value

  let session: { successorId: string; archiveId: string; name: string; organization: string | null } | null = null
  try { session = raw ? JSON.parse(raw) : null } catch {}
  if (!session?.successorId) redirect('/succession/login')

  const [archiveResult, trainingCount, contextCount, recentContexts] = await Promise.all([
    supabaseAdmin
      .from('archives')
      .select('name, owner_name')
      .eq('id', session.archiveId)
      .single(),
    supabaseAdmin
      .from('training_pairs')
      .select('id', { count: 'exact', head: true })
      .eq('archive_id', session.archiveId)
      .eq('included_in_training', true),
    supabaseAdmin
      .from('successor_contexts')
      .select('id', { count: 'exact', head: true })
      .eq('successor_id', session.successorId),
    supabaseAdmin
      .from('successor_contexts')
      .select('id, content, context_type, created_at')
      .eq('successor_id', session.successorId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return (
    <SuccessorPortalClient
      session={session}
      archiveName={archiveResult.data?.name ?? 'Archive'}
      ownerName={archiveResult.data?.owner_name ?? ''}
      trainingPairCount={trainingCount.count ?? 0}
      contextCount={contextCount.count ?? 0}
      recentContexts={recentContexts.data ?? []}
    />
  )
}
