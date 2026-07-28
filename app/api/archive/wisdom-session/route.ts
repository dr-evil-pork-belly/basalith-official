import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { WISDOM_SESSIONS } from '@/lib/wisdomSessions'
import { DIMENSIONS, calculateDimensionScore } from '@/lib/entityAccuracy'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'
import { classifyDeposit } from '@/lib/classifyDeposit'
import { getSessionUser } from '@/lib/auth/getSessionUser'

// ── GET — recommended + in-progress session ────────────────────────────────
export async function GET() {
  // Auth: Supabase owner session only. Ownership is verified against the
  // archives table — a session carrying an archiveId is not proof of ownership
  // (getSessionUser fills archiveId for successors too).
  const session = await getSessionUser()
  if (!session?.archiveId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const archiveId = session.archiveId

  const { data: ownerRow } = await supabaseAdmin
    .from('archives')
    .select('owner_user_id')
    .eq('id', archiveId)
    .maybeSingle()
  if (!ownerRow || ownerRow.owner_user_id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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

  const sessionDef = WISDOM_SESSIONS[recommendedDimension]
  const recommended = sessionDef ? {
    dimension:         recommendedDimension,
    score:             scoreMap[recommendedDimension] ?? 0,
    title:             sessionDef.title,
    intro:             sessionDef.intro,
    estimatedMinutes:  sessionDef.estimatedMinutes,
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
    // Auth: Supabase owner session only. Ownership is verified against the
    // archives table — a session carrying an archiveId is not proof of ownership
    // (getSessionUser fills archiveId for successors too).
    const session = await getSessionUser()
    if (!session?.archiveId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const archiveId = session.archiveId

    const { data: ownerRow } = await supabaseAdmin
      .from('archives')
      .select('owner_user_id')
      .eq('id', archiveId)
      .maybeSingle()
    if (!ownerRow || ownerRow.owner_user_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { dimension } = await req.json()
    if (!dimension) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const sessionDef = WISDOM_SESSIONS[dimension]
    if (!sessionDef) return NextResponse.json({ error: 'Unknown dimension' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('wisdom_sessions')
      .insert({ archive_id: archiveId, dimension, status: 'in_progress', current_question: 0, answers: [] })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      sessionId:       data.id,
      dimension,
      title:           sessionDef.title,
      intro:           sessionDef.intro,
      estimatedMinutes: sessionDef.estimatedMinutes,
      currentQuestion: 0,
      question:        sessionDef.questions[0],
      totalQuestions:  sessionDef.questions.length,
    })
  } catch (err: any) {
    console.error('wisdom-session POST:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── PATCH — save answer and advance ────────────────────────────────────────
export async function PATCH(req: Request) {
  try {
    // Auth: Supabase owner session only. Ownership is verified against the
    // archives table — a session carrying an archiveId is not proof of ownership
    // (getSessionUser fills archiveId for successors too).
    const session = await getSessionUser()
    if (!session?.archiveId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const archiveId = session.archiveId

    const { data: ownerRow } = await supabaseAdmin
      .from('archives')
      .select('owner_user_id')
      .eq('id', archiveId)
      .maybeSingle()
    if (!ownerRow || ownerRow.owner_user_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { sessionId, questionIndex, answer, skip } = await req.json()
    if (!sessionId || questionIndex == null) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    // Fetch current session, scoped to the caller's own archive. A session id
    // alone is not authority to write an answer into the training corpus.
    const { data: wisdomRow, error: fetchErr } = await supabaseAdmin
      .from('wisdom_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('archive_id', archiveId)
      .single()
    if (fetchErr || !wisdomRow) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const wisdomDef = WISDOM_SESSIONS[wisdomRow.dimension]
    if (!wisdomDef) return NextResponse.json({ error: 'Unknown dimension' }, { status: 400 })

    const totalQuestions = wisdomDef.questions.length
    const existingAnswers: any[] = Array.isArray(wisdomRow.answers) ? wisdomRow.answers : []
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
        archive_id:     archiveId,
        prompt:         question.question,
        response:       answer.trim(),
        source_type:    'wisdom',
        essence_status: 'pending',
      }).select('id').single().then(({ data: dep, error }) => {
        if (error) console.warn('wisdom deposit skipped:', error.message)
        else if (dep) void classifyDeposit({ depositId: dep.id, archiveId, text: answer.trim() })
      })

      // Training pair from wisdom answer (fire-and-forget)
      if (answer.trim().length > 20) {
        void (async () => {
          try {
            const { data: arch } = await supabaseAdmin
              .from('archives').select('owner_name, name, preferred_language').eq('id', archiveId).single()
            if (!arch) return
            await createTrainingPairFromDeposit(
              { archive_id: archiveId, prompt: question.question, response: answer.trim() },
              arch.owner_name || 'Unknown',
              arch.name,
              arch.preferred_language || 'en',
            )
          } catch (e) {
            console.warn('[training] wisdom answer failed:', e instanceof Error ? e.message : e)
          }
        })()
      }
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

    await supabaseAdmin
      .from('wisdom_sessions')
      .update(updatePayload)
      .eq('id', sessionId)
      .eq('archive_id', archiveId)

    // Calculate new score for the dimension (non-blocking after update)
    let newScore = 0
    if (isComplete) {
      const [deposits, conversations, labels] = await Promise.all([
        supabaseAdmin.from('owner_deposits').select('response, prompt').eq('archive_id', archiveId),
        supabaseAdmin.from('entity_conversations').select('role, content, accuracy_rating').eq('archive_id', archiveId),
        supabaseAdmin.from('labels').select('what_was_happening, legacy_note').eq('archive_id', archiveId),
      ])
      const dim = DIMENSIONS.find(d => d.id === wisdomRow.dimension)
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
