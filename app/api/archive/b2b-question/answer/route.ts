import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'
import { classifyDeposit } from '@/lib/classifyDeposit'

export const dynamic = 'force-dynamic'

// Saves a founder's web answer to a B2B (succession) question. Mirrors the
// inbound email save path: owner_deposits insert -> mark question_history
// answered -> domain classification -> training pair. archiveId is resolved
// from the session, never trusted from the client.
export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session?.archiveId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const archiveId = session.archiveId

  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, owner_user_id, tier, name, owner_name, preferred_language')
    .eq('id', archiveId)
    .maybeSingle()

  if (!archive || archive.owner_user_id !== session.userId || archive.tier !== 'succession') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const b2bQuestionId = typeof body.b2bQuestionId === 'string' ? body.b2bQuestionId : null
  const questionText  = typeof body.questionText  === 'string' ? body.questionText.trim() : ''
  const answer        = typeof body.answer        === 'string' ? body.answer.trim() : ''

  if (!questionText || answer.length < 2) {
    return NextResponse.json({ error: 'Question and answer are required' }, { status: 400 })
  }

  // 1. Save the deposit
  const { data: deposit, error: depositError } = await supabaseAdmin
    .from('owner_deposits')
    .insert({
      archive_id:     archiveId,
      prompt:         questionText,
      response:       answer,
      source_type:    'web_capture',
      contributor_id: null,
    })
    .select('id, archive_id, prompt, response, source_type')
    .single()

  if (depositError || !deposit) {
    console.error('[b2b-question/answer] deposit save failed:', depositError?.message)
    return NextResponse.json({ error: 'Could not save answer' }, { status: 500 })
  }

  // 2. Mark the served question answered by EXACT match (we know the id), rather
  //    than the inbound handler's most-recent-within-14-days heuristic.
  if (b2bQuestionId) {
    const { error: histError } = await supabaseAdmin
      .from('question_history')
      .update({ answered_deposit_id: deposit.id, answered_at: new Date().toISOString() })
      .eq('archive_id', archiveId)
      .eq('b2b_question_id', b2bQuestionId)
      .is('answered_deposit_id', null)
    if (histError) console.error('[b2b-question/answer] question_history update failed:', histError.message)
  }

  // 3. Domain classification — fire and forget
  void classifyDeposit({ depositId: deposit.id, archiveId, text: answer })

  // 4. Training pair — fire and forget
  createTrainingPairFromDeposit(
    deposit,
    archive.owner_name ?? '',
    archive.name ?? '',
    archive.preferred_language ?? 'en',
    'owner',
  ).catch(() => {})

  return NextResponse.json({ ok: true, depositId: deposit.id })
}
