import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { supabaseAdmin } from '@/lib/supabase-admin'
import SuccessorContextClient from './SuccessorContextClient'

export default async function SuccessorContextPage() {
  const session = await getSessionUser()
  if (!session?.successorId || !session.archiveId) redirect('/succession/login')

  const [archiveResult, contextsResult, successorResult] = await Promise.all([
    supabaseAdmin
      .from('archives')
      .select('name')
      .eq('id', session.archiveId)
      .single(),
    supabaseAdmin
      .from('successor_contexts')
      .select('id, content, context_type, created_at')
      .eq('successor_id', session.successorId)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('successors')
      .select('name, organization')
      .eq('id', session.successorId)
      .single(),
  ])

  return (
    <SuccessorContextClient
      session={{
        successorId: session.successorId,
        archiveId:   session.archiveId,
        name:        successorResult.data?.name ?? '',
        organization: successorResult.data?.organization ?? null,
      }}
      archiveName={archiveResult.data?.name ?? 'Archive'}
      existingContexts={contextsResult.data ?? []}
    />
  )
}
