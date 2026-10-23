import { NextRequest, NextResponse, after } from 'next/server'
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
import { FOUNDING_CALLS, getFoundingStatus, loadFoundingRows, scopeForTier } from '@/lib/foundingSequence'
import {
  buildFoundingCompleteInternalEmail,
  buildFoundingCompleteOwnerEmail,
} from '@/lib/emails/foundingSequenceComplete'
import { resend } from '@/lib/resend'
import { notifyInternal } from '@/lib/internalNotify'
import { inngest } from '@/lib/inngest'
import { isAssessment } from '@/lib/assessment'
import { requestReadingsIfDue } from '@/lib/assessmentStore'
import { asLens, lensFor } from '@/lib/questionLens'
import {
  appendLog,
  armFor,
  callQualifies,
  writeFollowUp,
  type QuestionSource,
} from '@/lib/conversationalInterview'
import { countArmedCalls } from '@/lib/conversationalInterviewStore'
import { isAssentOnly } from '@/lib/assent'

export const dynamic = 'force-dynamic'

// Saves an owner's web answer to the current incident probe and advances the
// interview. archiveId is resolved from the session, never the client. The
// deposit write + training pair are wrapped inside the incident turn cycle: the
// reducer decides re-probe vs accept, and we write a deposit only on acceptance.
//
// September 14, 2026: opened to every owner tier for the Founding Sequence
// (/archive/founding, lib/foundingSequence.ts). The incident turn cycle is
// tier-agnostic. The no-open-incident fallback below stays succession-only,
// exactly as it was, so a personal archive can only write through an open
// interview. Also: the post-response classify and training-pair writes now run
// under after() instead of void/fire-and-forget, per the serverless rule in
// CLAUDE.md section 1; and an optional recordingId links a transcript-only
// voice recording to the deposit it became.
export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session?.archiveId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const archiveId = session.archiveId

  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, owner_user_id, tier, status, name, owner_name, preferred_language, owner_email')
    .eq('id', archiveId)
    .maybeSingle()

  if (!archive || archive.owner_user_id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const answer = typeof body.answer === 'string' ? body.answer.trim() : ''
  if (answer.length < 2) {
    return NextResponse.json({ error: 'Answer is required' }, { status: 400 })
  }

  // Optional: a voice_recordings.id from /api/archive/transcribe-voice in
  // transcript_only mode. Linked to the deposit below, scoped to this archive.
  const recordingId = typeof body.recordingId === 'string' && /^[0-9a-f-]{36}$/i.test(body.recordingId)
    ? body.recordingId
    : null

  const ownerName = archive.owner_name ?? ''
  const archiveName = archive.name ?? ''
  const lang = archive.preferred_language ?? 'en'

  const incident = await loadOpenIncident(archiveId)

  // ── Fallback: no open incident → prior single-question save behavior ─────────
  // Succession only, unchanged. Every other tier must answer through an open
  // interview (the Founding Sequence opens one via /api/archive/founding/start).
  if (!incident && archive.tier !== 'succession') {
    return NextResponse.json({ error: 'No open interview' }, { status: 409 })
  }
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
    after(async () => {
      try { await classifyDeposit({ depositId: deposit.id, archiveId, text: answer }) } catch {}
      try { await createTrainingPairFromDeposit(deposit, ownerName, archiveName, lang, 'owner') } catch {}
    })
    return NextResponse.json({ ok: true, depositId: deposit.id })
  }

  // ── Incident turn cycle ──────────────────────────────────────────────────────
  const st = incident.state
  const probeType = (st.pendingProbeType ?? 'SEED') as ProbeType | 'SEED' | 'TIMELINE'
  const pendingQuestion = st.pendingQuestion ?? (typeof body.questionText === 'string' ? body.questionText : '')
  const branchIndex = st.pendingBranchIndex ?? -1
  const branchSummary = branchIndex >= 0 ? (st.branches[branchIndex]?.summary ?? '') : ''

  // Model layer (all fail closed internally → a model outage yields a plain spine).
  // Scope by tier: succession archives are read as a founder describing a
  // business decision (the original prompt); every other tier as a person
  // describing a decision in their own life. See ClassifierScope.
  const scope = scopeForTier(archive.tier)
  // Timed for the interview log (R4 in the conversational interview skeleton):
  // classifier, timeline parse, and saturation together.
  const tModel = Date.now()
  const classifierOut: ClassifierOut = await classifyAnswer({
    probeType: probeType as ProbeType, // SEED/TIMELINE only feed the prompt label
    question: pendingQuestion,
    answer,
    branchSummary,
    scope,
  })

  // TIMELINE: populate branches before advance (reducer falls closed to one).
  if (probeType === 'TIMELINE') {
    const parsed = await parseTimeline(answer, scope)
    st.branches = parsed.branches.map((b, i) => ({ index: i, summary: b.summary, chosen: b.chosen, saturated: false }))
  }

  // BASIS: the saturation gate. Every other probe passes not-saturated.
  const saturationOut: SaturationOut =
    probeType === 'BASIS'
      ? await checkSaturation({ archiveId, branchSummary, basisAnswer: answer })
      : { saturated: false }
  const msModel = Date.now() - tModel

  // Conversational follow ups (lib/conversationalInterview.ts). A call is
  // armed once its first follow up is stamped with an arm. On an armed call,
  // both arms, the deposit records who wrote the question it answers, and a
  // turn that only agrees is kept out of the layer (lib/assent.ts). On every
  // other call nothing below changes a byte of what is written.
  const armed = st.interviewArm === 'interviewer' || st.interviewArm === 'spine'
  const answeredSource: QuestionSource = st.pendingQuestionSource ?? 'spine'
  const assentOnly = armed && isAssentOnly(answer)

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
    const row = { archive_id: archiveId, prompt: pendingQuestion, response: answer, source_type: 'web_capture', contributor_id: null }
    // question_source is named only on an armed call, and a failure that names
    // the column is retried without it, so the deposit is never lost before
    // migration 20261022 is pasted. Same pattern as the audience column.
    let { data: deposit, error: depositError } = await supabaseAdmin
      .from('owner_deposits')
      .insert(armed ? { ...row, question_source: answeredSource } : row)
      .select('id, archive_id, prompt, response, source_type')
      .single()
    if (depositError && armed && /question_source/.test(depositError.message ?? '')) {
      console.error('[b2b-question/answer] question_source column missing, saved without it. Paste migration 20261022.')
      ;({ data: deposit, error: depositError } = await supabaseAdmin
        .from('owner_deposits')
        .insert(row)
        .select('id, archive_id, prompt, response, source_type')
        .single())
    }

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

    // Link the voice recording this answer came from, if any. Scoped to this
    // archive so a recordingId from another archive is a no-op.
    if (recordingId) {
      await supabaseAdmin
        .from('voice_recordings')
        .update({ deposit_id: deposit.id })
        .eq('id', recordingId)
        .eq('archive_id', archiveId)
        .is('deposit_id', null)
    }

    // Step 6: probe type rides into training_pairs.metadata.probe_type; the closed
    // coverage dimension (if any) rides alongside it as metadata.dimension.
    // Both run after the response under after(); void/fire-and-forget dies on
    // lambda freeze (CLAUDE.md section 1).
    const acceptedDeposit = deposit
    after(async () => {
      try { await classifyDeposit({ depositId: acceptedDeposit.id, archiveId, text: answer }) } catch {}
      try {
        await createTrainingPairFromDeposit(
          acceptedDeposit, ownerName, archiveName, lang, 'owner', probeType, dimensionTag,
          armed ? { questionSource: answeredSource, assentOnly } : undefined,
        )
      } catch {}
    })

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

    // Founding Sequence: when the first founding call closes, tell the
    // founder (watch mode, skeleton 1.7); when the third closes, tell the
    // owner and the founder. Runs after the response. The owner email
    // promises only the 48-hour reply the site already commits to.
    if (next.state.founding && (next.state.founding.call === 1 || next.state.founding.call === FOUNDING_CALLS)) {
      const scope = next.state.founding.scope
      const closedCall = next.state.founding.call
      const ownerEmail = (archive.owner_email as string | null) ?? null
      after(async () => {
        if (closedCall === 1) {
          // Call 1 complete. Internal only; the owner sees the proof card.
          try {
            const status = await getFoundingStatus(archiveId, archive.tier)
            const call = status.calls.find(c => c.call === 1)
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.ai'
            await notifyInternal({
              subject: `Call 1 complete: ${archiveName || 'Basalith archive'}`,
              text: [
                `Archive: ${archiveName || 'Basalith archive'} (${archiveId})`,
                `Owner: ${ownerName || 'Unknown owner'}${ownerEmail ? ` <${ownerEmail}>` : ''}`,
                `Scope: ${scope}`,
                `Deposits: ${call?.deposits ?? 0}`,
                `Turns: ${call?.turns ?? 0}`,
                `God view: ${siteUrl}/god`,
              ].join('\n'),
            })
          } catch (err) {
            console.error('[b2b-question/answer] call 1 complete notice failed:', err instanceof Error ? err.message : err)
          }
          return
        }

        try {
          const status = await getFoundingStatus(archiveId, archive.tier)
          if (!status.done) return
          const deposits = status.calls.reduce((n, c) => n + c.deposits, 0)
          // Voice turns within the Founding Sequence only: linked recordings
          // created since the first founding call opened. An unbounded count
          // would include every recording the archive ever made.
          const rows = await loadFoundingRows(archiveId)
          const firstFounding = rows
            .filter(r => r.state?.founding)
            .map(r => r.created_at)
            .sort()[0]
          let voiceQuery = supabaseAdmin
            .from('voice_recordings')
            .select('id', { count: 'exact', head: true })
            .eq('archive_id', archiveId)
            .not('deposit_id', 'is', null)
          if (firstFounding) voiceQuery = voiceQuery.gte('created_at', firstFounding)
          const { count } = await voiceQuery
          const input = {
            archiveName: archiveName || 'Your Basalith',
            ownerName:   ownerName || null,
            ownerEmail,
            deposits,
            voiceTurns:  count ?? 0,
            scope,
          }
          // Same sender and recipients as before, now through the one helper
          // (lib/internalNotify.ts) every founder-facing send uses.
          const internal = buildFoundingCompleteInternalEmail(input)
          await notifyInternal({ subject: internal.subject, html: internal.html, text: internal.text })
          if (ownerEmail) {
            const owner = buildFoundingCompleteOwnerEmail(input)
            await resend.emails.send({
              from:    `${archiveName || 'Basalith'} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
              to:      ownerEmail,
              subject: owner.subject,
              html:    owner.html,
              text:    owner.text,
            })
          }
        } catch (err) {
          console.error('[b2b-question/answer] founding complete notice failed:', err instanceof Error ? err.message : err)
        }

        // First coverage reading, every tier. The probe set follows the
        // archive segment (lib/coverageSet.ts): business for succession,
        // personal for a family archive, so neither run is off-label. The
        // Inngest function is idempotent on archiveId and the monthly sweep
        // re-reads the map from here on. A failed send is logged and costs
        // nothing: the sweep picks the archive up on the third.
        try {
          await inngest.send({
            name: 'coverage.run.requested',
            data: { archiveId, triggerSource: 'manual' },
          })
        } catch (err) {
          console.error('[b2b-question/answer] coverage run request failed:', err instanceof Error ? err.message : err)
        }
      })
    }

    // Area call (lib/areaCalls.ts): the owner deposited into one thin area of
    // the map, so read the map again. The compute function refuses a run while
    // another is in flight; a send that lands during one is logged and the
    // monthly sweep covers it.
    //
    // An assessment record (lib/assessment.ts, October 8, 2026) sends no
    // coverage event here. Its report is built from exactly two readings taken
    // once all eight areas and the intake are in (lib/dependencyReadings.ts);
    // a run after each of eight calls would be eight more, 96 model calls
    // each, that nothing reads. Instead this asks whether the call that just
    // closed completed the record, and requests the two readings if it did.
    if (next.state.areaCall && isAssessment(archive)) {
      after(async () => {
        try {
          await requestReadingsIfDue(archiveId)
        } catch (err) {
          console.error('[b2b-question/answer] assessment readings request failed:', err instanceof Error ? err.message : err)
        }
      })
    } else if (next.state.areaCall) {
      after(async () => {
        try {
          await inngest.send({
            name: 'coverage.run.requested',
            data: { archiveId, triggerSource: 'manual' },
          })
        } catch (err) {
          console.error('[b2b-question/answer] coverage run request after area call failed:', err instanceof Error ? err.message : err)
        }
      })
    }
  } else {
    const tensionForTradeoff =
      decision.probeType === 'TRADEOFF' ? next.state.tensions[next.state.spineCursor] : undefined

    // Everything the person has said in this call, this answer included. The
    // renderer names a tradeoff, and this route names a person, only from
    // these words (docs/QUESTION_LENSES_2026-10-13.md).
    const said = next.state.probeHistory.map(r => r.answer).filter(Boolean)

    // Who is being asked. Set on the call when it opened; a call opened
    // before October 13, 2026 carries no marker and is read from the tier and
    // status, which cannot see a church record (that one finishes its open
    // call on the personal wording).
    const lens = asLens(next.state.lens) ?? lensFor({ tier: archive.tier, status: archive.status })

    // READ anchors on the people the timeline named (the reducer only emits READ
    // when that anchor is non-empty), kept only where the person said the name.
    // Every other probe anchors on the classifier's fragment, which the
    // renderer quotes only if it is a literal span of this answer.
    const anchor =
      decision.probeType === 'READ' ? deriveReadAnchor(next.state.branches, said) : classifierOut.anchor
    const nextText = renderProbe({
      probeType: decision.probeType,
      anchor,
      tensionForTradeoff,
      answer,
      // The first probe of a new decision point must not quote an answer
      // about the last one.
      quote:         decision.branchIndexForProbe === branchIndex || probeType === 'TIMELINE',
      said,
      reprobe:       isReprobe,
      level:         decision.phaseAfter === 'GENERALIZE' ? 'rule' : 'branch',
      tradeoffIndex: next.state.spineCursor,
      lens,
    })

    // Conversational follow ups. Only an area call on a record named in
    // CONVERSATIONAL_INTERVIEW, in English. The arm is stamped once per call.
    // On the interviewer arm the spine sentence above is the fallback; on the
    // spine arm it is the question. Both arms are logged.
    let questionText = nextText
    if (callQualifies({ archiveId, isAreaCall: !!next.state.areaCall, language: archive.preferred_language })) {
      if (!next.state.interviewArm) {
        next.state.interviewArm = armFor(archiveId, await countArmedCalls(archiveId))
      }
    }
    if (next.state.interviewArm) {
      let source: QuestionSource = 'spine'
      let aim: string | null = null
      let attempts: Awaited<ReturnType<typeof writeFollowUp>>['attempts'] = []
      let msTotal = 0
      // A call armed earlier keeps its arm, but the interviewer runs only
      // while the record is still named; otherwise the spine is served.
      const stillOn = callQualifies({ archiveId, isAreaCall: !!next.state.areaCall, language: archive.preferred_language })
      if (next.state.interviewArm === 'interviewer' && stillOn) {
        const out = await writeFollowUp({
          probeType:        decision.probeType,
          lens,
          turns:            next.state.probeHistory.map(r => ({ question: r.question, answer: r.answer })),
          reprobe:          isReprobe,
          level:            decision.phaseAfter === 'GENERALIZE' ? 'rule' : 'branch',
          newDecisionPoint: !(decision.branchIndexForProbe === branchIndex || probeType === 'TIMELINE'),
          decisionLabel:
            decision.branchIndexForProbe >= 0 ? next.state.branches[decision.branchIndexForProbe]?.summary : undefined,
          spineText:        nextText,
          said,
        })
        questionText = out.text
        source = out.source
        aim = out.aim
        attempts = out.attempts
        msTotal = out.msTotal
      }
      next.state.pendingQuestionSource = source
      next.state.interviewLog = appendLog(next.state.interviewLog, {
        at:        new Date().toISOString(),
        probeType: String(decision.probeType),
        arm:       next.state.interviewArm,
        source,
        msModel,
        msTotal,
        aim,
        attempts,
      })
    }

    next.state.pendingQuestion = questionText
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
    nextQuestion:  decision.incidentComplete ? null : (next.state.pendingQuestion ?? null),
    founding:      next.state.founding ?? null,
    areaCall:      next.state.areaCall ?? null,
    incidentComplete: decision.incidentComplete,
  })
}
