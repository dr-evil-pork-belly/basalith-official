import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getSessionUser()
  if (!session?.archiveId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const archiveId = session.archiveId

  const { data: ownerRow } = await supabaseAdmin
    .from('archives')
    .select('owner_user_id')
    .eq('id', archiveId)
    .maybeSingle()
  if (!ownerRow || ownerRow.owner_user_id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Labels from contributors (not owner) — no date restriction
  const { data: labels } = await supabaseAdmin
    .from('labels')
    .select('id, what_was_happening, labelled_by, created_at, photograph_id')
    .eq('archive_id', archiveId)
    .neq('labelled_by', 'owner')
    .not('what_was_happening', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10)

  // Wisdom exchange answers — no date restriction
  const { data: exchanges } = await supabaseAdmin
    .from('wisdom_exchanges')
    .select('id, question, entity_response, created_at, contributors(name)')
    .eq('archive_id', archiveId)
    .order('created_at', { ascending: false })
    .limit(5)

  console.log('[activity] archiveId:', archiveId.substring(0, 8),
    '| labels:', labels?.length ?? 0,
    '| exchanges:', exchanges?.length ?? 0)

  const activities = [
    ...(labels ?? []).map((l: any) => ({
      id:              l.id,
      type:            'label' as const,
      contributorName: l.labelled_by ?? 'A contributor',
      content:         l.what_was_happening ?? '',
      createdAt:       l.created_at,
    })),
    ...(exchanges ?? []).map((e: any) => ({
      id:              e.id,
      type:            'exchange' as const,
      contributorName: (e.contributors as any)?.name ?? 'A contributor',
      content:         e.entity_response ?? '',
      question:        e.question ?? '',
      createdAt:       e.created_at,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 15)

  return NextResponse.json({ activities })
}
