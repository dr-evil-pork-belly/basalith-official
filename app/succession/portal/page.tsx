import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { supabaseAdmin } from '@/lib/supabase-admin'
import SuccessorPortalClient from './SuccessorPortalClient'

export default async function SuccessorPortalPage() {
  const session = await getSessionUser()
  if (!session?.successorId || !session.archiveId) redirect('/succession/login')

  const [archiveResult, trainingCount, contextCount, recentContexts, successorResult] = await Promise.all([
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
    supabaseAdmin
      .from('successors')
      .select('name, organization')
      .eq('id', session.successorId)
      .single(),
  ])

  return (
    <SuccessorPortalClient
      session={{
        successorId: session.successorId,
        archiveId:   session.archiveId,
        name:        successorResult.data?.name ?? '',
        organization: successorResult.data?.organization ?? null,
      }}
      archiveName={archiveResult.data?.name ?? 'Archive'}
      ownerName={archiveResult.data?.owner_name ?? ''}
      trainingPairCount={trainingCount.count ?? 0}
      contextCount={contextCount.count ?? 0}
      recentContexts={recentContexts.data ?? []}
    />
  )
}
