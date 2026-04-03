import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { WISDOM_SESSIONS } from '@/lib/wisdomSessions'
import { DIMENSIONS, calculateDimensionScore } from '@/lib/entityAccuracy'

// ── GET — recommended + in-progress session ────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const archiveId = searchParams.get('archiveId')
  if (!archiveId) return NextResponse.json({ error: 'archiveId required' }, { status: 400 })

  const [accuracyRows, sessionsRows] = await Promise.all([
    supabaseAdmin.from('entity_accuracy').select('dimension, accuracy_score').eq('archive_id', archiveId),
    supabaseAdmin.from('wisdom_sessions').select('*').eq('archive_id', archiveId).order('created_at', { ascending: false }),
  ])

  const accuracyData  = accuracyRows.data  || []
  const sessionsData  = sessionsRows.data  || []

  // Map dimension id → score (0-100)
  const scoreMap: Record<string, number> = {}
  for (const row of accuracyData) {
    scoreMap[row.dimension] = Math.round((row.accuracy_score ?? 0) * 100)
  }

  // Completed dimension ids
  const completedDimensions = sessionsData
    .filter(s => s.status === 'completed')
    .map(s => s.dimension)

  // In-progress session (most recent)
  const inProgress = sessionsData.find(s => s.status === 'in_progress') ?? null

  // Find recommended: lowest scoring dimension with no completed session
  const allDimensionIds = DIMENSIONS.map(d => d.id)
  const notCompleted = allDimensionIds.filter(id => !completedDimensions.includes(id))

  let recommendedDimension = notCompleted[0] || allDimensionIds[0]
  let lowestScore = Infinity

  for (const id of notCompleted) {
    const score = scoreMap[id] ?? 0
    if (score < lowestScore) {
      lowestScore = score
      recommendedDimension = id
    }
  }

  const session = WISDOM_SESSIONS[recommendedDimension]
  const recommended = session ? {
    dimension:         recommendedDimension,
    score:             scoreMap[recommendedDimension] ?? 0,
    title:             session.title,
    intro:             session.intro,
    estimatedMinutes:  session.estimatedMinutes,
  } : null

  // Completed sessions with metadata
  const completed = sessionsData
    .filter(s => s.status === 'completed')
    .map(s => ({
      id:           s.id,
      dimension:    s.dimension,
      title:        WISDOM_SESSIONS[s.dimension]?.title ?? s.dimension,
      completedAt:  s.completed_at,
      answerCount:  Array.isArray(s.answers) ? s.answers.length : 0,
    }))

  return NextResponse.json({ recommended, inProgress, completed })
}

// ── POST — start a new session ──────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { archiveId, dimension } = await req.json()
    if (!archiveId || !dimension) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const session = WISDOM_SESSIONS[dimension]
    if (!session) return NextResponse.json({ error: 'Unknown dimension' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('wisdom_sessions')
      .insert({ archive_id: archiveId, dimension, status: 'in_progress', current_question: 0, answers: [] })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      sessionId:       data.id,
      dimension,
      title:           session.title,
      intro:           session.intro,
      estimatedMinutes: session.estimatedMinutes,
      currentQuestion: 0,
      question:        session.questions[0],
      totalQuestions:  session.questions.length,
    })
  } catch (err: any) {
    console.error('wisdom-session POST:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── PATCH — save answer and advance ────────────────────────────────────────
export async function PATCH(req: Request) {
  try {
    const { sessionId, questionIndex, answer, archiveId, skip } = await req.json()
    if (!sessionId || questionIndex == null) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    // Fetch current session
    const { data: session, error: fetchErr } = await supabaseAdmin
      .from('wisdom_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()
    if (fetchErr || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const wisdomDef = WISDOM_SESSIONS[session.dimension]
    if (!wisdomDef) return NextResponse.json({ error: 'Unknown dimension' }, { status: 400 })

    const totalQuestions = wisdomDef.questions.length
    const existingAnswers: any[] = Array.isArray(session.answers) ? session.answers : []
    const question = wisdomDef.questions[questionIndex]

    // Build updated answers array
    const updatedAnswers = [...existingAnswers]
    if (!skip && answer?.trim()) {
      updatedAnswers.push({
        questionId: question.id,
        question:   question.question,
        answer:     answer.trim(),
        savedAt:    new Date().toISOString(),
      })

      // Save to owner_deposits (non-fatal)
      supabaseAdmin.from('owner_deposits').insert({
        archive_id:     session.archive_id,
        prompt:         question.question,
        response:       answer.trim(),
        essence_status: 'pending',
      }).then(({ error }) => {
        if (error) console.warn('wisdom deposit skipped:', error.message)
      })
    }

    const nextIndex  = questionIndex + 1
    const isComplete = nextIndex >= totalQuestions

    const updatePayload: any = {
      answers:          updatedAnswers,
      current_question: isComplete ? totalQuestions : nextIndex,
    }
    if (isComplete) {
      updatePayload.status       = 'completed'
      updatePayload.completed_at = new Date().toISOString()
    }

    await supabaseAdmin.from('wisdom_sessions').update(updatePayload).eq('id', sessionId)

    // Calculate new score for the dimension (non-blocking after update)
    let newScore = 0
    if (isComplete && archiveId) {
      const [deposits, conversations, labels] = await Promise.all([
        supabaseAdmin.from('owner_deposits').select('response, prompt').eq('archive_id', archiveId),
        supabaseAdmin.from('entity_conversations').select('role, content, accuracy_rating').eq('archive_id', archiveId),
        supabaseAdmin.from('labels').select('what_was_happening, legacy_note').eq('archive_id', archiveId),
      ])
      const dim = DIMENSIONS.find(d => d.id === session.dimension)
      if (dim) {
        newScore = calculateDimensionScore(dim, deposits.data || [], conversations.data || [], labels.data || [])
      }
    }

    return NextResponse.json({
      isComplete,
      nextIndex:    isComplete ? null : nextIndex,
      nextQuestion: isComplete ? null : wisdomDef.questions[nextIndex],
      newScore,
    })
  } catch (err: any) {
    console.error('wisdom-session PATCH:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
