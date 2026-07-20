/**
 * Live acceptance driver for the enriched incident probe (READ/STAKE/CALIBRATION).
 *
 * Reproduces the EXACT turn cycle of app/api/archive/b2b-question/answer/route.ts
 * (classify -> timeline -> saturation-on-BASIS -> advance -> deposit + training
 * pair with the closed-dimension tag -> render -> persist) against the live DB and
 * Anthropic. It bypasses only the HTTP session/tier gate, which the route requires
 * (tier === 'succession') and which this archive does not have. Everything that
 * touches the reducer, the model layer, and persistence is the real code.
 *
 *   npx tsx scripts/incident-live-drive.ts <archiveId>
 *
 * Writes real owner_deposits + training_pairs on the given archive (additive).
 */
import './load-env'
import { supabaseAdmin } from '../lib/supabase-admin'
import {
  advance, createIncident, loadOpenIncident, persist, completeIncident,
  pickIncidentSeed, deriveReadAnchor,
  type ClassifierOut, type DimensionName, type ProbeType, type SaturationOut, type IncidentSession,
} from '../lib/incidentSession'
import { classifyAnswer, parseTimeline } from '../lib/incidentClassifier'
import { checkSaturation } from '../lib/incidentSaturation'
import { renderProbe } from '../lib/renderProbe'
import { createTrainingPairFromDeposit } from '../lib/trainingPipeline'

const DIMS: DimensionName[] = ['stake', 'read', 'calibration']

// Canned but realistic founder answers keyed by probe type. TIMELINE names people
// (so READ can anchor); a BASIS answer volunteers confidence (so calibration may
// close via narration with no probe); the STAKE answer disclaims personal stakes
// (so it may close as not_a_factor, the negative-space case).
const ANSWERS: Record<string, string> = {
  SEED: 'The hardest call was the winter we nearly missed payroll. A key client, Marcus at Vantage, wanted to renegotiate mid-contract, and my ops lead Priya wanted to hold the line while our CFO wanted to settle fast.',
  TIMELINE: 'First, Priya flagged that Marcus was stalling on the renewal. Then the CFO pushed me to accept his lower number to protect cash. I decided to counter, not accept. When Marcus escalated, I chose to keep Priya on the account instead of handing it to sales. Finally I set a walk-away price and held to it.',
  CUE: 'The first real sign was that Marcus stopped replying to Priya directly and started copying his lawyer. That formality was the tell.',
  OPTION: 'I seriously considered just accepting the CFO number to lock the cash. I also considered walking entirely. I decided against both and countered with a shorter term at a firm price.',
  BASIS: 'What tipped it was the cash runway math against the churn risk. I was almost completely certain we could survive a two week gap, so the downside of countering was small and I took it.',
  BOUNDARY: 'If the runway had dropped under thirty days I would have taken the CFO settlement without hesitation.',
  ERROR: 'Someone capable but new would read Marcus going quiet as agreement and ease off. The trap is that his silence meant the opposite.',
  STAKE: 'Honestly nothing was at stake for me personally here. The company would have been fine either way; it was a clean business judgment, not something that touched me.',
  READ: 'placeholder, overwritten with the anchored question at runtime',
  CALIBRATION: 'I was maybe eighty percent sure when I committed to the counter.',
  ANALOGUE: 'It reminded me of a 2016 renewal where I blinked too early and left money on the table.',
  GOAL: 'What I was really protecting was Priya\'s authority on the account, more than the dollars.',
  TRADEOFF: 'Cash certainty gives. The relationship and the price discipline mattered more than locking the money a week sooner.',
}

function answerFor(probeType: string): string {
  return ANSWERS[probeType] ?? 'I made the call I thought was right at the time and stood behind it.'
}

type TurnLog = {
  turn: number; answered: string; branchIndex: number; reprobe: boolean
  containsRule: boolean; dimensionSignal: ClassifierOut['dimensionSignal']
  closedDim: string | null; closedStatus: string | null; depositId: string | null
  next: string | null; dims: Record<DimensionName, string>; budget: number
}

async function main() {
  const archiveId = process.argv[2]
  if (!archiveId) throw new Error('usage: incident-live-drive.ts <archiveId>')

  const { data: archive } = await supabaseAdmin
    .from('archives').select('name, owner_name, preferred_language').eq('id', archiveId).maybeSingle()
  const ownerName = archive?.owner_name ?? ''
  const archiveName = archive?.name ?? ''
  const lang = archive?.preferred_language ?? 'en'

  if (await loadOpenIncident(archiveId)) {
    throw new Error('an open incident already exists; refusing to clobber. Resolve it first.')
  }

  const seed = await pickIncidentSeed(archiveId)
  if (!seed) throw new Error('no incident seed available')

  let incident = await createIncident(archiveId, { questionId: seed.questionId, category: seed.category })
  incident.state.pendingQuestion = renderProbe({ probeType: 'SEED', anchor: '', seedText: seed.seedText })
  incident.state.pendingProbeType = 'SEED'
  incident.state.pendingBranchIndex = -1
  await persist(incident)
  console.log(`\n[incident ${incident.id}] seed category=${seed.category}\nSEED Q: ${incident.state.pendingQuestion}\n`)

  const log: TurnLog[] = []
  const createdDepositIds: string[] = []
  let narrationCloseNote: string | null = null

  for (let turn = 1; turn <= 40; turn++) {
    const reloaded = await loadOpenIncident(archiveId)
    if (!reloaded) break
    incident = reloaded
    const st = incident.state
    const probeType = (st.pendingProbeType ?? 'SEED') as ProbeType | 'SEED' | 'TIMELINE'
    const pendingQuestion = st.pendingQuestion ?? ''
    const branchIndex = st.pendingBranchIndex ?? -1
    const branchSummary = branchIndex >= 0 ? (st.branches[branchIndex]?.summary ?? '') : ''
    const answer = answerFor(probeType)

    const classifierOut: ClassifierOut = await classifyAnswer({
      probeType: probeType as ProbeType, question: pendingQuestion, answer, branchSummary,
    })

    if (probeType === 'TIMELINE') {
      const parsed = await parseTimeline(answer)
      st.branches = parsed.branches.map((b, i) => ({ index: i, summary: b.summary, chosen: b.chosen, saturated: false }))
    }

    const saturationOut: SaturationOut =
      probeType === 'BASIS' ? await checkSaturation({ archiveId, branchSummary, basisAnswer: answer }) : { saturated: false }

    const isReprobe =
      incident.phase === 'DECISION_LOOP' && !st.pendingDetour &&
      classifierOut.containsRule === false && st.reprobeUsedOnCurrent === false

    const { session: next, decision } = advance(incident, answer, classifierOut, saturationOut)

    const closedDim = DIMS.find(
      d => incident.state.dimensions[d] === 'unelicited' && next.state.dimensions[d] !== 'unelicited',
    ) ?? null
    const dimensionTag = closedDim ? { dimension: closedDim, status: next.state.dimensions[closedDim] } : undefined

    // Note the first narration close (a dimension closed on a non-dimension probe).
    if (closedDim && probeType !== 'STAKE' && probeType !== 'READ' && probeType !== 'CALIBRATION' && !narrationCloseNote) {
      narrationCloseNote = `dimension "${closedDim}" closed as ${dimensionTag!.status} by the ${probeType} answer, no ${closedDim.toUpperCase()} probe fired`
    }

    let depositId: string | null = null
    if (!isReprobe) {
      const { data: deposit, error } = await supabaseAdmin
        .from('owner_deposits')
        .insert({ archive_id: archiveId, prompt: pendingQuestion, response: answer, source_type: 'web_capture', contributor_id: null })
        .select('id, archive_id, prompt, response, source_type')
        .single()
      if (error || !deposit) throw new Error(`deposit insert failed: ${error?.message}`)
      depositId = deposit.id
      createdDepositIds.push(deposit.id)
      await createTrainingPairFromDeposit(deposit, ownerName, archiveName, lang, 'owner', probeType, dimensionTag)
      const recs = next.state.probeHistory
      if (recs.length > 0) recs[recs.length - 1].depositId = deposit.id
    }

    if (decision.incidentComplete) {
      next.state.pendingQuestion = undefined
      next.state.pendingProbeType = undefined
      next.state.pendingBranchIndex = undefined
      await completeIncident(next)
    } else {
      const tensionForTradeoff =
        decision.probeType === 'TRADEOFF' ? next.state.tensions[next.state.spineCursor] : undefined
      const anchor = decision.probeType === 'READ' ? deriveReadAnchor(next.state.branches) : classifierOut.anchor
      const nextText = renderProbe({ probeType: decision.probeType, anchor, tensionForTradeoff })
      next.state.pendingQuestion = nextText
      next.state.pendingProbeType = decision.probeType
      next.state.pendingBranchIndex = decision.branchIndexForProbe
      await persist(next)
    }

    log.push({
      turn, answered: probeType, branchIndex, reprobe: isReprobe,
      containsRule: classifierOut.containsRule, dimensionSignal: classifierOut.dimensionSignal,
      closedDim, closedStatus: dimensionTag?.status ?? null, depositId,
      next: decision.incidentComplete ? null : decision.probeType,
      dims: { ...next.state.dimensions }, budget: next.state.probeBudgetUsed,
    })
    console.log(
      `turn ${String(turn).padStart(2)} | answered ${probeType.padEnd(11)} | reprobe=${isReprobe}` +
      ` | sig=${classifierOut.dimensionSignal ? classifierOut.dimensionSignal.dimension + ':' + classifierOut.dimensionSignal.status : '-'}` +
      ` | closed=${closedDim ?? '-'}${dimensionTag ? ':' + dimensionTag.status : ''} | next=${decision.incidentComplete ? 'COMPLETE' : decision.probeType}` +
      ` | budget=${next.state.probeBudgetUsed} | dims=${JSON.stringify(next.state.dimensions)}`,
    )

    if (decision.incidentComplete) break
  }

  // ── Acceptance artifacts ──────────────────────────────────────────────────────
  const finalIncident = await supabaseAdmin
    .from('incident_sessions').select('id, phase, status, state').eq('archive_id', archiveId)
    .order('created_at', { ascending: false }).limit(1).single()
  const finalState = (finalIncident.data as { state: IncidentSession['state'] } | null)?.state

  const { data: pairs } = await supabaseAdmin
    .from('training_pairs')
    .select('id, source_id, prompt, quality_score, included_in_training, metadata')
    .in('source_id', createdDepositIds.length ? createdDepositIds : ['none'])
    .order('created_at', { ascending: true })

  console.log('\n================ ACCEPTANCE ================')
  console.log('incidentId:', finalIncident.data?.id, 'phase:', finalIncident.data?.phase, 'status:', finalIncident.data?.status)
  console.log('1) final state.dimensions:', JSON.stringify(finalState?.dimensions))
  console.log('4) probeBudgetUsed:', finalState?.probeBudgetUsed)
  console.log('3) narration close:', narrationCloseNote ?? '(none observed — every dimension had its own probe)')
  const openDims = DIMS.filter(d => (finalState?.dimensions?.[d] ?? 'unelicited') === 'unelicited')
  console.log('5) dimensions left unelicited (nothing synthesized):', openDims.length ? openDims.join(', ') : '(none — full coverage)')
  console.log('\n2) training_pairs written this incident (with dimension tags):')
  for (const p of pairs ?? []) {
    const m = (p as { metadata: Record<string, unknown> }).metadata ?? {}
    console.log(
      `  pair ${(p as { id: string }).id.slice(0, 8)} | probe_type=${m.probe_type ?? '-'}` +
      ` | dimension=${m.dimension ?? '-'} | dimension_status=${m.dimension_status ?? '-'}` +
      ` | q="${String((p as { quality_score: number }).quality_score)}" incl=${(p as { included_in_training: boolean }).included_in_training}` +
      ` | prompt="${String((p as { prompt: string }).prompt).slice(0, 70)}"`,
    )
  }
  const negatives = (pairs ?? []).filter(p => (p as { metadata: Record<string, unknown> }).metadata?.dimension_status === 'not_a_factor')
  console.log(`\n   not_a_factor negative-space rows: ${negatives.length}`)
}

main().then(() => process.exit(0)).catch(e => { console.error('DRIVE FAILED:', e); process.exit(1) })
