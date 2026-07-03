import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'
import { classifyDeposit } from '@/lib/classifyDeposit'
import {
  advance,
  loadOpenIncident,
  persist,
  completeIncident,
  deriveReadAnchor,
  type ClassifierOut,
  type DimensionName,
  type ProbeType,
  type SaturationOut,
} from '@/lib/incidentSession'
import { classifyAnswer, parseTimeline } from '@/lib/incidentClassifier'
import { checkSaturation } from '@/lib/incidentSaturation'
import { renderProbe } from '@/lib/renderProbe'

export const dynamic = 'force-dynamic'

// Saves a founder's web answer to the current incident probe and advances the
// interview. archiveId is resolved from the session, never the client. The
// deposit write + training pair are wrapped inside the incident turn cycle: the
// reducer decides re-probe vs accept, and we write a deposit only on acceptance.
// If no incident is open (defensive), we fall back to the prior single-question
// save behavior unchanged.
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

  const answer = typeof body.answer === 'string' ? body.answer.trim() : ''
  if (answer.length < 2) {
    return NextResponse.json({ error: 'Answer is required' }, { status: 400 })
  }

  const ownerName = archive.owner_name ?? ''
  const archiveName = archive.name ?? ''
  const lang = archive.preferred_language ?? 'en'

  const incident = await loadOpenIncident(archiveId)

  // ── Fallback: no open incident → prior single-question save behavior ─────────
  if (!incident) {
    const b2bQuestionId = typeof body.b2bQuestionId === 'string' ? body.b2bQuestionId : null
    const questionText = typeof body.questionText === 'string' ? body.questionText.trim() : ''
    if (!questionText) return NextResponse.json({ error: 'Question and answer are required' }, { status: 400 })

    const { data: deposit, error: depositError } = await supabaseAdmin
      .from('owner_deposits')
      .insert({ archive_id: archiveId, prompt: questionText, response: answer, source_type: 'web_capture', contributor_id: null })
      .select('id, archive_id, prompt, response, source_type')
      .single()
    if (depositError || !deposit) {
      console.error('[b2b-question/answer] deposit save failed:', depositError?.message)
      return NextResponse.json({ error: 'Could not save answer' }, { status: 500 })
    }

    if (b2bQuestionId) {
      await supabaseAdmin
        .from('question_history')
        .update({ answered_deposit_id: deposit.id, answered_at: new Date().toISOString() })
        .eq('archive_id', archiveId)
        .eq('b2b_question_id', b2bQuestionId)
        .is('answered_deposit_id', null)
    }
    void classifyDeposit({ depositId: deposit.id, archiveId, text: answer })
    createTrainingPairFromDeposit(deposit, ownerName, archiveName, lang, 'owner').catch(() => {})
    return NextResponse.json({ ok: true, depositId: deposit.id })
  }

  // ── Incident turn cycle ──────────────────────────────────────────────────────
  const st = incident.state
  const probeType = (st.pendingProbeType ?? 'SEED') as ProbeType | 'SEED' | 'TIMELINE'
  const pendingQuestion = st.pendingQuestion ?? (typeof body.questionText === 'string' ? body.questionText : '')
  const branchIndex = st.pendingBranchIndex ?? -1
  const branchSummary = branchIndex >= 0 ? (st.branches[branchIndex]?.summary ?? '') : ''

  // Model layer (all fail closed internally → a model outage yields a plain spine).
  const classifierOut: ClassifierOut = await classifyAnswer({
    probeType: probeType as ProbeType, // SEED/TIMELINE only feed the prompt label
    question: pendingQuestion,
    answer,
    branchSummary,
  })

  // TIMELINE: populate branches before advance (reducer falls closed to one).
  if (probeType === 'TIMELINE') {
    const parsed = await parseTimeline(answer)
    st.branches = parsed.branches.map((b, i) => ({ index: i, summary: b.summary, chosen: b.chosen, saturated: false }))
  }

  // BASIS: the saturation gate. Every other probe passes not-saturated.
  const saturationOut: SaturationOut =
    probeType === 'BASIS'
      ? await checkSaturation({ archiveId, branchSummary, basisAnswer: answer })
      : { saturated: false }

  // Predict re-probe from the PRE-advance state (the reducer re-probes a
  // DECISION_LOOP spine answer that carries no rule, once per position). On a
  // re-probe we do NOT write a deposit; we write only on acceptance.
  const isReprobe =
    incident.phase === 'DECISION_LOOP' &&
    !st.pendingDetour &&
    classifierOut.containsRule === false &&
    st.reprobeUsedOnCurrent === false

  const { session: next, decision } = advance(incident, answer, classifierOut, saturationOut)

  // A dimension the turn closed (unelicited -> substantive/not_a_factor), diffed
  // across advance. Rides training_pairs.metadata alongside probe_type. A
  // not_a_factor close is still a real, tagged training pair (negative space).
  const DIMS: DimensionName[] = ['stake', 'read', 'calibration']
  const closedDim = DIMS.find(
    d => incident.state.dimensions[d] === 'unelicited' && next.state.dimensions[d] !== 'unelicited',
  )
  const dimensionTag = closedDim
    ? { dimension: closedDim, status: next.state.dimensions[closedDim] }
    : undefined

  // Write the deposit + training pair only when the answer was accepted.
  let depositId: string | null = null
  if (!isReprobe) {
    const { data: deposit, error: depositError } = await supabaseAdmin
      .from('owner_deposits')
      .insert({ archive_id: archiveId, prompt: pendingQuestion, response: answer, source_type: 'web_capture', contributor_id: null })
      .select('id, archive_id, prompt, response, source_type')
      .single()

    if (depositError || !deposit) {
      console.error('[b2b-question/answer] deposit save failed:', depositError?.message)
      return NextResponse.json({ error: 'Could not save answer' }, { status: 500 })
    }
    depositId = deposit.id

    // The seed served a question_history row (selectNextQuestion path is gone, but
    // older seeds may still have one). Mark it answered on the SEED turn only.
    if (probeType === 'SEED' && incident.seedQuestionId) {
      await supabaseAdmin
        .from('question_history')
        .update({ answered_deposit_id: deposit.id, answered_at: new Date().toISOString() })
        .eq('archive_id', archiveId)
        .eq('b2b_question_id', incident.seedQuestionId)
        .is('answered_deposit_id', null)
    }

    void classifyDeposit({ depositId: deposit.id, archiveId, text: answer })
    // Step 6: probe type rides into training_pairs.metadata.probe_type; the closed
    // coverage dimension (if any) rides alongside it as metadata.dimension.
    createTrainingPairFromDeposit(deposit, ownerName, archiveName, lang, 'owner', probeType, dimensionTag).catch(() => {})

    // Patch the depositId onto the just-answered ProbeRecord (the last appended).
    const recs = next.state.probeHistory
    if (recs.length > 0) recs[recs.length - 1].depositId = deposit.id
  }

  // Render and stash the next pending probe for the next GET /next to serve.
  if (decision.incidentComplete) {
    next.state.pendingQuestion = undefined
    next.state.pendingProbeType = undefined
    next.state.pendingBranchIndex = undefined
    await completeIncident(next)
  } else {
    const tensionForTradeoff =
      decision.probeType === 'TRADEOFF' ? next.state.tensions[next.state.spineCursor] : undefined
    // READ anchors on the people the timeline named (the reducer only emits READ
    // when that anchor is non-empty). Every other probe anchors on the classifier.
    const anchor =
      decision.probeType === 'READ' ? deriveReadAnchor(next.state.branches) : classifierOut.anchor
    const nextText = renderProbe({
      probeType: decision.probeType,
      anchor,
      tensionForTradeoff,
    })
    next.state.pendingQuestion = nextText
    next.state.pendingProbeType = decision.probeType
    next.state.pendingBranchIndex = decision.branchIndexForProbe
    await persist(next)
  }

  return NextResponse.json({
    ok: true,
    depositId,
    incidentId: incident.id,
    answeredProbeType: probeType,
    reprobed: isReprobe,
    nextProbeType: decision.incidentComplete ? null : decision.probeType,
    incidentComplete: decision.incidentComplete,
  })
}
