import { NextRequest, NextResponse, after } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { checkRateLimit, getClientIP } from '@/lib/apiSecurity'
import { areasCapturedFromRows, assessmentProgress, isAssessment } from '@/lib/assessment'
import { validateIntake } from '@/lib/dependencyIntake'
import { loadAreaRows, loadAssessmentForArchive, requestReadingsIfDue, type AssessmentRow } from '@/lib/assessmentStore'

export const dynamic = 'force-dynamic'

// The founder's side of an assessment. Slice 3b, October 8, 2026.
//
//   GET   where the assessment stands: which of the eight areas are on the
//         record, whether the intake is in, and the report's stage.
//   POST  the intake: who makes each kind of decision today, eight answers.
//
// Owner only. The record comes from the session, never the client, and must be
// an assessment record (archives.status = 'assessment'); any other record gets
// a 404, so this route says nothing about a client's Basalith.
//
// THE INTAKE IS WRITTEN ONCE. The update carries `intake is null`, so a second
// submission changes nothing and is answered 409. The report prints these
// answers as the founder's own statement; an answer that could be revised
// after the readings came back would not be that.

type Guard =
  | { ok: true; archiveId: string }
  | { ok: false; response: NextResponse }

async function guard(): Promise<Guard> {
  const session = await getSessionUser()
  if (!session?.archiveId) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, owner_user_id, status')
    .eq('id', session.archiveId)
    .maybeSingle()
  if (!archive || archive.owner_user_id !== session.userId) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  if (!isAssessment(archive)) {
    return { ok: false, response: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  }
  return { ok: true, archiveId: archive.id as string }
}

async function view(archiveId: string, row: AssessmentRow) {
  const captured = areasCapturedFromRows(await loadAreaRows(archiveId))
  const progress = assessmentProgress({ status: row.status, captured, hasIntake: validateIntake(row.intake).ok })
  return {
    ...progress,
    buyerName: row.buyer_name,
    buyerOrg:  row.buyer_org,
  }
}

export async function GET() {
  const g = await guard()
  if (!g.ok) return g.response

  try {
    const row = await loadAssessmentForArchive(g.archiveId)
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(await view(g.archiveId, row))
  } catch (err) {
    console.error('[archive/assessment GET]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not load your assessment' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req)
  const { allowed } = checkRateLimit(`assessment-intake:${ip}`, 30, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const g = await guard()
  if (!g.ok) return g.response
  const archiveId = g.archiveId

  const body = await req.json().catch(() => null)
  const intake = validateIntake(body?.responses)
  if (!intake.ok) {
    return NextResponse.json(
      { error: 'Please answer all eight.', missing: intake.missing, invalid: intake.invalid },
      { status: 400 },
    )
  }

  try {
    const now = new Date().toISOString()
    const { data: written, error } = await supabaseAdmin
      .from('dependency_reports')
      .update({ intake: intake.responses, intake_at: now, updated_at: now })
      .eq('archive_id', archiveId)
      .eq('status', 'capturing')
      .is('intake', null)
      .select('id')
    if (error) throw new Error(`intake write: ${error.message}`)
    if (!written || written.length === 0) {
      return NextResponse.json({ error: 'Your answers are already in.' }, { status: 409 })
    }

    // The intake may have been the last piece. After the response, per the
    // serverless rule: a bare promise dies when the lambda freezes.
    after(async () => {
      try {
        await requestReadingsIfDue(archiveId)
      } catch (err) {
        console.error('[archive/assessment POST] readings request failed:', err instanceof Error ? err.message : err)
      }
    })

    const row = await loadAssessmentForArchive(archiveId)
    if (!row) return NextResponse.json({ ok: true })
    return NextResponse.json({ ok: true, ...(await view(archiveId, row)) })
  } catch (err) {
    console.error('[archive/assessment POST]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not save your answers' }, { status: 500 })
  }
}
