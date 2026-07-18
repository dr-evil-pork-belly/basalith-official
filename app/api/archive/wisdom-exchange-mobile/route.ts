import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'

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

  const { data, error } = await supabaseAdmin
    .from('wisdom_exchanges')
    .select('id, question, entity_response, owner_correction, status, created_at, contributor_id, contributors(name)')
    .eq('archive_id', archiveId)
    .neq('status', 'ignored')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const exchanges = (data ?? []).map((e: any) => ({
    id:              e.id,
    question:        e.question,
    entityResponse:  e.entity_response,
    ownerCorrection: e.owner_correction ?? null,
    status:          e.status,
    contributorName: e.contributors?.name ?? 'A contributor',
    createdAt:       e.created_at,
  }))

  return NextResponse.json({ exchanges })
}

export async function POST(req: NextRequest) {
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

  const body = await req.json()
  const { exchangeId, action, correction } = body

  if (!exchangeId || !action) {
    return NextResponse.json({ error: 'exchangeId and action required' }, { status: 400 })
  }

  if (action === 'ignore') {
    await supabaseAdmin
      .from('wisdom_exchanges')
      .update({ status: 'ignored', owner_reviewed: true })
      .eq('id', exchangeId)
      .eq('archive_id', archiveId)
    return NextResponse.json({ success: true })
  }

  if (action === 'approve') {
    await supabaseAdmin
      .from('wisdom_exchanges')
      .update({ status: 'approved', owner_reviewed: true })
      .eq('id', exchangeId)
      .eq('archive_id', archiveId)
    return NextResponse.json({ success: true })
  }

  if (action === 'correct' && correction?.trim()) {
    await supabaseAdmin
      .from('wisdom_exchanges')
      .update({ status: 'corrected', owner_correction: correction.trim(), owner_reviewed: true })
      .eq('id', exchangeId)
      .eq('archive_id', archiveId)

    // Save correction as training pair
    void (async () => {
      try {
        const { data: ex } = await supabaseAdmin
          .from('wisdom_exchanges').select('question').eq('id', exchangeId).single()
        const { data: arch } = await supabaseAdmin
          .from('archives').select('owner_name, name, preferred_language').eq('id', archiveId).single()
        if (ex && arch) {
          await createTrainingPairFromDeposit(
            { archive_id: archiveId, prompt: ex.question, response: correction.trim() },
            arch.owner_name ?? 'Unknown', arch.name, arch.preferred_language ?? 'en',
          )
        }
      } catch {}
    })()
  }

  return NextResponse.json({ success: true })
}
