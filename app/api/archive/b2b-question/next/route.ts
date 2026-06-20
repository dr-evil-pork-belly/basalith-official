import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { selectNextQuestion } from '@/lib/selectNextQuestion'

export const dynamic = 'force-dynamic'

// Returns the founder's current B2B (succession) question. archiveId is resolved
// from the session, never from the client. The flow deliberately avoids serving
// a new question on every reload: if a question has already been served and is
// still unanswered, we return that same one.
export async function GET() {
  const session = await getSessionUser()
  if (!session?.archiveId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const archiveId = session.archiveId

  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, owner_user_id, tier')
    .eq('id', archiveId)
    .maybeSingle()

  if (!archive || archive.owner_user_id !== session.userId || archive.tier !== 'succession') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 1. Reuse an already-served, still-unanswered B2B question if one exists, so
  //    reloads don't burn through the bank.
  const { data: open } = await supabaseAdmin
    .from('question_history')
    .select('b2b_question_id, question_text, domain_id')
    .eq('archive_id', archiveId)
    .not('b2b_question_id', 'is', null)
    .is('answered_deposit_id', null)
    .order('served_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (open) {
    return NextResponse.json({
      b2bQuestionId: open.b2b_question_id,
      questionText:  open.question_text,
      domainId:      open.domain_id,
    })
  }

  // 2. Otherwise serve a new one. selectNextQuestion records the serve in
  //    question_history (channel 'founder_web').
  try {
    const result = await selectNextQuestion({ archiveId, channel: 'founder_web' })
    return NextResponse.json({
      b2bQuestionId: result.b2bQuestionId,
      questionText:  result.questionText,
      domainId:      result.domainId,
    })
  } catch (err) {
    // No eligible question right now (e.g. everything answered within cooldown).
    console.warn('[b2b-question/next] no question available:', err instanceof Error ? err.message : err)
    return NextResponse.json({ b2bQuestionId: null, questionText: null, domainId: null, allAnswered: true })
  }
}
