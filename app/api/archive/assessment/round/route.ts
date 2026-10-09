import { NextRequest, NextResponse, after } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { checkRateLimit, getClientIP } from '@/lib/apiSecurity'
import { areasCapturedFromRows, assessmentAreas, isAssessment } from '@/lib/assessment'
import { roundProgress, roundQuestionByKey } from '@/lib/assessmentRound'
import { loadAreaRows, loadAssessmentForArchive, loadRoundPrompts, requestReadingsIfDue } from '@/lib/assessmentStore'
import { classifyDeposit } from '@/lib/classifyDeposit'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'

export const dynamic = 'force-dynamic'

// The round of six for one area of an assessment (lib/assessmentRound.ts).
// Slice 4b, October 8, 2026.
//
//   GET  ?area=Capital  the six questions for the area and which are answered
//   POST { key, answer } one answer, written to the record as a deposit
//
// Owner only, assessment records only, record from the session. The question
// text comes from the server by key; the client never supplies a prompt, so
// nothing but a real round question can be written as one.
//
// AN ANSWER IS A DEPOSIT. Same table, same source_type, and the same two
// post-response steps as an interview turn in /api/archive/b2b-question/answer:
// classify, then the training pair. The pair is created with a probe type
// ('ROUND'), which is what lib/trainingPipeline.ts includeInTraining reads to
// take an interview answer on the interview's say-so instead of scoring a
// short answer as a paragraph. A deposit earns nothing toward the report by
// existing: the entity still has to answer the probe from it and the verifier
// has to agree.
//
// ORDER. The round opens after the area's call. The questions follow from the
// incident, and a founder who has not told the story yet answers them thinner.
//
// ONCE. A question already answered is refused. owner_deposits is append
// only, and a second answer to the same question would sit on the record
// beside the first.

const MIN_ANSWER = 20    // lib/trainingPipeline.ts writes no pair below this
const MAX_ANSWER = 6000

type Guard =
  | { ok: true; archive: { id: string; name: string | null; owner_name: string | null; preferred_language: string | null } }
  | { ok: false; response: NextResponse }

async function guard(): Promise<Guard> {
  const session = await getSessionUser()
  if (!session?.archiveId) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, owner_user_id, status, name, owner_name, preferred_language')
    .eq('id', session.archiveId)
    .maybeSingle()
  if (!archive || archive.owner_user_id !== session.userId) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  if (!isAssessment(archive)) {
    return { ok: false, response: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  }
  return {
    ok: true,
    archive: {
      id:                 archive.id as string,
      name:               (archive.name ?? null) as string | null,
      owner_name:         (archive.owner_name ?? null) as string | null,
      preferred_language: (archive.preferred_language ?? null) as string | null,
    },
  }
}

async function areaView(archiveId: string, area: string) {
  const [rows, prompts] = await Promise.all([loadAreaRows(archiveId), loadRoundPrompts(archiveId)])
  const p = roundProgress(area, prompts)
  return {
    area,
    callDone:  areasCapturedFromRows(rows).includes(area),
    answered:  p.answered,
    total:     p.total,
    done:      p.done,
    next:      p.next ? { key: p.next.key, question: p.next.question } : null,
    questions: p.questions.map(q => ({ key: q.key, question: q.question, answered: q.answered })),
  }
}

export async function GET(req: NextRequest) {
  const g = await guard()
  if (!g.ok) return g.response

  const area = (req.nextUrl.searchParams.get('area') ?? '').trim().slice(0, 40)
  if (!assessmentAreas().includes(area)) {
    return NextResponse.json({ error: 'That area is not part of your assessment' }, { status: 400 })
  }

  try {
    return NextResponse.json(await areaView(g.archive.id, area))
  } catch (err) {
    console.error('[assessment/round GET]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not load the questions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req)
  const { allowed } = checkRateLimit(`assessment-round:${ip}`, 120, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const g = await guard()
  if (!g.ok) return g.response
  const archive = g.archive
  const archiveId = archive.id

  const body = await req.json().catch(() => null)
  const question = typeof body?.key === 'string' ? roundQuestionByKey(body.key) : null
  if (!question) {
    return NextResponse.json({ error: 'Unknown question' }, { status: 400 })
  }
  const answer = typeof body?.answer === 'string' ? body.answer.trim().slice(0, MAX_ANSWER) : ''
  if (answer.length < MIN_ANSWER) {
    return NextResponse.json({ error: 'A sentence or two, please.' }, { status: 400 })
  }

  try {
    const row = await loadAssessmentForArchive(archiveId)
    if (!row || row.status !== 'capturing') {
      return NextResponse.json({ error: 'This assessment is no longer taking answers.' }, { status: 409 })
    }

    const before = await areaView(archiveId, question.domain)
    if (!before.callDone) {
      return NextResponse.json({ error: 'Finish the call on this part first.' }, { status: 409 })
    }
    if (before.questions.find(q => q.key === question.key)?.answered) {
      return NextResponse.json({ error: 'That one is already answered.', ...before }, { status: 409 })
    }

    const { data: deposit, error: depositError } = await supabaseAdmin
      .from('owner_deposits')
      .insert({ archive_id: archiveId, prompt: question.question, response: answer, source_type: 'web_capture', contributor_id: null })
      .select('id, archive_id, prompt, response, source_type')
      .single()
    if (depositError || !deposit) {
      console.error('[assessment/round POST] deposit save failed:', depositError?.message)
      return NextResponse.json({ error: 'Could not save your answer' }, { status: 500 })
    }

    // After the response, per the serverless rule: a bare promise dies when the
    // lambda freezes. The pair first, then the question of whether this answer
    // completed the record.
    after(async () => {
      try { await classifyDeposit({ depositId: deposit.id, archiveId, text: answer }) } catch {}
      try {
        await createTrainingPairFromDeposit(
          deposit,
          archive.owner_name ?? '',
          archive.name ?? '',
          archive.preferred_language ?? 'en',
          'owner',
          'ROUND',
        )
      } catch {}
      try {
        await requestReadingsIfDue(archiveId)
      } catch (err) {
        console.error('[assessment/round POST] readings request failed:', err instanceof Error ? err.message : err)
      }
    })

    return NextResponse.json({ ok: true, ...(await areaView(archiveId, question.domain)) })
  } catch (err) {
    console.error('[assessment/round POST]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not save your answer' }, { status: 500 })
  }
}
