import { NextRequest, NextResponse, after } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { checkRateLimit, getClientIP } from '@/lib/apiSecurity'
import {
  PROFILE_MAX_ANSWER,
  PROFILE_MIN_ANSWER,
  PROFILE_QUESTIONS,
  profileApplies,
  profileNext,
} from '@/lib/businessProfile'
import { classifyDeposit } from '@/lib/classifyDeposit'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'

export const dynamic = 'force-dynamic'

// The business profile (lib/businessProfile.ts). October 28, 2026.
//
//   POST { business, decisions }  both answers, written to the record as two
//                                 deposits, then the page the owner goes to next
//
// Owner only, record from the session. The question text comes from the
// server; the client sends answers only, so nothing but the two profile
// questions can be written as a prompt here. Refused when the screen does not
// apply to this record (lib/businessProfile.ts profileApplies).
//
// AN ANSWER IS A DEPOSIT, written the way the round of six writes one: same
// table and source_type, then classify and the training pair after the
// response. probe type 'PROFILE' marks the pair. A second save is allowed
// (the owner may correct himself) and the newest answer is the one the
// openers read; both stay on the record, which is append only.

export async function POST(req: NextRequest) {
  const ip = getClientIP(req)
  const { allowed } = checkRateLimit(`business-profile:${ip}`, 20, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await getSessionUser()
  if (!session?.archiveId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, owner_user_id, tier, status, name, owner_name, preferred_language')
    .eq('id', session.archiveId)
    .maybeSingle()
  if (!archive || archive.owner_user_id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!profileApplies(archive)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => null)
  const answers = PROFILE_QUESTIONS.map(q => ({
    question: q.question,
    answer: typeof body?.[q.key] === 'string' ? (body[q.key] as string).trim().slice(0, PROFILE_MAX_ANSWER) : '',
  }))
  if (answers.some(a => a.answer.length < PROFILE_MIN_ANSWER)) {
    return NextResponse.json({ error: 'A sentence or two on each, please.' }, { status: 400 })
  }

  const archiveId = archive.id as string
  const { data: deposits, error } = await supabaseAdmin
    .from('owner_deposits')
    .insert(answers.map(a => ({
      archive_id: archiveId, prompt: a.question, response: a.answer, source_type: 'web_capture', contributor_id: null,
    })))
    .select('id, archive_id, prompt, response, source_type')
  if (error || !deposits || deposits.length !== answers.length) {
    console.error('[business-profile POST] deposit save failed:', error?.message)
    return NextResponse.json({ error: 'Could not save your answers' }, { status: 500 })
  }

  after(async () => {
    for (const d of deposits) {
      try { await classifyDeposit({ depositId: d.id, archiveId, text: d.response ?? '' }) } catch {}
      try {
        await createTrainingPairFromDeposit(
          d,
          archive.owner_name ?? '',
          archive.name ?? '',
          archive.preferred_language ?? 'en',
          'owner',
          'PROFILE',
        )
      } catch {}
    }
  })

  return NextResponse.json({ ok: true, next: profileNext(archive) })
}
