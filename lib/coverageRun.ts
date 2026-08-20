/**
 * Coverage run, the single implementation.
 *
 * Imported by BOTH lib/inngest/coverageFunctions.ts (production) and
 * scripts/coverage-drive.ts (the local acceptance driver) so the deployed run
 * and the run you can watch on your own machine cannot drift. Same rule as
 * lib/verifyGrounding.ts and lib/entitySystemPrompt.ts: one implementation, two
 * callers, do not fork this logic.
 *
 * The only thing the two callers differ on is HOW a unit of work is wrapped.
 * Inngest wants each probe inside step.run so a retry replays one probe rather
 * than the whole run. The local driver wants a plain await so it can be watched
 * and killed. That difference is injected as `runStep` rather than duplicated,
 * which is what keeps the two paths honestly identical.
 *
 * THE MECHANISM, stated once. For each probe in the current set: build
 * the SAME system prompt the production succession route builds, generate a
 * draft in the founder's voice, then run the SAME verifier the production route
 * runs. A domain is backed because the verifier said basis='deposit', not
 * because deposits were counted. There is no second prompt builder and no demo
 * shortcut verifier here.
 *
 * COST. Two model calls per probe, so 2 * COVERAGE_PROBES.length per run. At
 * probe set v2 that is 48 probes and 96 calls. Never restate those numbers as
 * literals anywhere; read them off the set.
 */

import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from './supabase-admin'
import { buildEntitySystemPrompt, formatFingerprintSection } from './entitySystemPrompt'
import { verifyGrounding } from './verifyGrounding'
import { COVERAGE_PROBES, PROBE_SET_VERSION } from './coverageProbes'
import { rollUpRun, isRunComplete, type CoverageState, type ProbeResult, type DomainRollup } from './coverage'

// Lazy client, for the same reason lib/verifyGrounding.ts:44 is lazy. The local
// driver loads ANTHROPIC_API_KEY via dotenv at runtime, after imports are
// evaluated, so constructing at module top-level would throw on import before
// the key exists. Next loads env before module code, so this is safe for the
// Inngest path too.
let _client: Anthropic | null = null
function client(): Anthropic {
  if (!_client) _client = new Anthropic()
  return _client
}

/** Mirrors app/api/succession/entity/chat/route.ts. */
const VOICE_MODEL      = 'claude-sonnet-4-6'
const VOICE_MAX_TOKENS = 1000

/**
 * The one place coverage deliberately differs from the production chat route.
 *
 * Production leaves temperature at the API default, which is right for a
 * conversation. Here it is the dominant noise source. Each run generates a fresh
 * draft, so a sampled draft that lands slightly differently gets a different
 * verdict, and the domain moves. The v2 fixture measured 15 of 48 and 11 of 48
 * probe verdicts changing across two identical runs on identical fixtures, and
 * most of that is draft variance rather than verifier variance.
 *
 * A measurement instrument wants the modal behavior, not a sample of it. So the
 * voice call is pinned. The verifier's own temperature is NOT pinned, because
 * verifyGrounding is shared with production and this build does not get to
 * change production behavior to make its own numbers look better.
 *
 * The honest caveat: coverage therefore reads the entity's most likely answer,
 * and a successor gets a sampled one. That makes coverage a slightly optimistic
 * reading of a domain the entity is marginal on. It is the right trade for a
 * measurement, and it is a real difference, so do not describe the map to a
 * customer as what their successor will experience.
 */
const VOICE_TEMPERATURE = 0

/**
 * verifyGrounding's catch path returns exactly this on a parse or call failure:
 * position 'unknown', topic 'this', basis 'unsupported'. Failing to 'unsupported'
 * is correct for production, where the rule is never ship an unverified founder
 * position. It is wrong as measurement, because a JSON parse error would be
 * recorded as the entity reaching past the archive.
 *
 * The v2 fixture run hit one of these ("Unexpected non-whitespace character
 * after JSON at position 105"), and under the previous code it was silently
 * counted as overreach.
 *
 * This is a signature match, not a status code, because verifyGrounding does not
 * expose one and this build is not allowed to change it. The auditor is
 * instructed to return a stance or "none", never "unknown", so the pair is a
 * strong tell. If it ever starts firing often, the fix is to surface a real
 * error channel from the verifier rather than to widen this heuristic.
 */
function isVerifierFailsafe(v: { position: string; topic: string; basis: string }): boolean {
  return v.basis === 'unsupported' && v.position === 'unknown' && v.topic === 'this'
}

/**
 * Retry a model call through transient infrastructure failure.
 *
 * Added 2026-08-16 after a fixture run died 47 probes into its fourth pass on
 * `getaddrinfo ENOTFOUND api.anthropic.com`. A DNS blip cost twenty minutes of
 * work and, worse, the harness reported it as a gate failure. See the note in
 * scripts/coverage-fixture-probe.ts.
 *
 * Retries only what is worth retrying. A 4xx other than 429 is a real error in
 * the request and repeating it just burns time. Anything else (connection reset,
 * DNS, 429, 5xx) gets three attempts with backoff.
 *
 * The Inngest path already survived this, because a failing probe is caught and
 * recorded as a miss and the step retries. This closes the same hole on the
 * local paths, which have no such wrapper.
 */
export async function withApiRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const DELAYS_MS = [2_000, 6_000]
  let lastError: unknown

  for (let attempt = 0; attempt <= DELAYS_MS.length; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const status = (err as { status?: number })?.status
      const permanent = typeof status === 'number' && status >= 400 && status < 500 && status !== 429
      if (permanent || attempt === DELAYS_MS.length) break
      const wait = DELAYS_MS[attempt]
      console.warn(`[coverage] ${label} failed (${(err as Error)?.message ?? err}), retrying in ${wait / 1000}s`)
      await new Promise(r => setTimeout(r, wait))
    }
  }

  throw lastError
}

/** Probes carry no successor context. Coverage is a property of the frozen layer. */
const NO_CONTEXT = 'No contextual layer injected yet.'

/**
 * The frozen layer ceiling, applied to EVERY content source.
 *
 * app/api/succession/entity/chat/route.ts caps the layer it sends, and coverage
 * exists to measure the path that ships. So the cap is applied here, after the
 * content is read, rather than only in the SQL. A caller that injects content
 * gets truncated exactly as the archive path does.
 *
 * WHY THIS IS NOT TIDINESS. Before slice 2.2 the fixture probe passed persona
 * pairs uncapped while the archive path capped at 20. Both personas hold 15, so
 * the paths agreed by coincidence. A persona grown to 21 would have measured a
 * frozen layer no successor ever receives, silently, with no gate firing. That
 * is the measurement diverging from production, which is the class of defect
 * this whole surface is being built to catch.
 *
 * The archive path orders by quality_score before truncating. An injected source
 * has no such column, so WHICH 20 survive is undefined there. That is why
 * scripts/coverage-fixture-probe.ts asserts its personas sit under the cap: the
 * cap defends the general case, the assertion guarantees it never silently
 * engages where the ordering would be meaningless.
 */
export const FROZEN_LAYER_LIMIT = 20

export type TriggerSource = 'manual' | 'cron' | 'transition'

/**
 * Wraps one unit of work. Inngest passes step.run, so each probe becomes a
 * replayable step keyed by the probe key (asserted unique at import, so no two
 * steps can collide on an id). The local driver passes a pass-through.
 */
export type RunStep = <T>(id: string, fn: () => Promise<T>) => Promise<T>

export const passThroughStep: RunStep = (_id, fn) => fn()

export type FingerprintPairRow = { prompt: string; completion: string }

/**
 * WHAT THE RUN IS ABOUT, separated from WHERE THE RUN IS READ FROM.
 *
 * Supplying this skips the `archives` read and the `training_pairs` read. It
 * does NOT skip the in-flight check, which belongs to the store rather than to
 * the content: the check exists to stop two writers interleaving upserts into
 * archive_coverage, so whether it is needed is a property of the sink.
 *
 * `segment` is carried rather than derived. The archive path computes it from
 * `archives.tier`; an injected source states it. off_label is then computed the
 * same way on both paths, from segment alone, so the column keeps exactly one
 * meaning: the probe set does not match the segment. It is NOT a fixture flag.
 * Fiction is separated from reality by which table a run lands in, not by a
 * boolean, and overloading this column would make every future query on it
 * ambiguous.
 */
export type CoverageContent = {
  ownerName:   string
  archiveName: string
  /** 'succession' or 'b2c'. The only input to off_label, on every path. */
  segment:     string
  pairs:       FingerprintPairRow[]
}

// ─────────────────────────────────────────────────────────────────────────────
// THE STORE PORT
//
// Every database touch runCoverage makes, behind one interface. Methods are
// named for what they mean, not for the SQL underneath, so a second
// implementation does not have to pretend to be Postgres.
//
// TYPED NARROWLY ON PURPOSE. lib/archiveExport.ts:131 declares `Queryable` as
// `from(table: string): QueryBuilder`, which accepts literally any table and any
// row shape, and the cost shows up at lib/inngest/exportFunctions.ts:79 as
// `buildArchiveExport(supabaseAdmin as never, ...)`. A cast to `never` is the
// type system reporting that the interface stopped carrying information. Here
// each method takes a named, concrete input, so the Supabase implementation
// satisfies it without a cast and a wrong sink cannot be passed at all.
// ─────────────────────────────────────────────────────────────────────────────

export type OpenRunInput = {
  archiveId:       string
  probeSetVersion: string
  segment:         string
  offLabel:        boolean
  triggerSource:   TriggerSource
}

/**
 * Explicit union, so the failure branch and the success branch stay
 * discriminated. Left to inference, TypeScript merges them into one shape with
 * an optional `error` and the narrowing silently stops working.
 */
export type OpenRunOutcome = { runId: string } | { error: string }

export type ProbeRecord = {
  runId:    string
  domain:   string
  probeKey: string
  basis:    ProbeResult['basis']
  topic:    string
  reply:    string
}

export type PriorCoverage = {
  domain:          string
  state:           CoverageState
  probeSetVersion: string
}

/** The close for a run that produced results. */
export type RunTotals = {
  runId:           string
  finishedAt:      string
  complete:        boolean
  error:           string | null
  probesTotal:     number
  probesDeposit:   number
  probesOverreach: number
  probesDeclined:  number
  probesErrored:   number
  modelCalls:      number
}

/**
 * The close for a run that produced nothing. Separate from finishRun because the
 * two write different column sets, and collapsing them would put per-basis
 * counts on a row that measured no bases.
 */
export type RunFailure = {
  runId:      string
  finishedAt: string
  error:      string
}

export type CoverageRowWrite = {
  archiveId:       string
  domain:          string
  state:           CoverageState
  overreach:       DomainRollup['overreach']
  probesDeposit:   number
  probesErrored:   number
  probesOverreach: number
  probesDeclined:  number
  probesTotal:     number
  damped:          boolean
  probeSetVersion: string
  lastRunId:       string
  computedAt:      string
}

export interface CoverageStore {
  /** Opens a run row. The Supabase implementation also refuses a concurrent run. */
  openRun(input: OpenRunInput): Promise<OpenRunOutcome>
  /** One probe's verdict and draft. Idempotent on (run, probe). */
  recordProbe(record: ProbeRecord): Promise<void>
  /** Current per-domain state, for hysteresis. */
  readPriorCoverage(archiveId: string): Promise<PriorCoverage[]>
  /** The map itself. Idempotent on (archive, domain). */
  writeCoverage(rows: CoverageRowWrite[]): Promise<void>
  /** Closes a run that produced results. */
  finishRun(totals: RunTotals): Promise<void>
  /** Closes a run that produced none. Leaves the map untouched. */
  failRun(failure: RunFailure): Promise<void>
}

/**
 * The default store. This is the pre-2.2 SQL moved, not rewritten: same tables,
 * same column names, same conflict keys, same order. The neutrality test in
 * lib/coverageRun.test.ts asserts that by mocking supabaseAdmin and reading the
 * calls back, because "extracted rather than rewritten" is a claim worth
 * checking rather than asserting.
 */
export const supabaseCoverageStore: CoverageStore = {
  async openRun(input) {
    // The in-flight check is the front line; the partial unique index
    // coverage_runs_one_in_flight is the backstop. Two concurrent runs would
    // interleave upserts into archive_coverage and leave a map matching neither.
    const { data: inFlight } = await supabaseAdmin
      .from('coverage_runs')
      .select('id')
      .eq('archive_id', input.archiveId)
      .is('finished_at', null)
      .maybeSingle()

    if (inFlight) return { error: `run ${inFlight.id} already in flight` }

    const { data: run, error } = await supabaseAdmin
      .from('coverage_runs')
      .insert({
        archive_id:        input.archiveId,
        probe_set_version: input.probeSetVersion,
        segment:           input.segment,
        off_label:         input.offLabel,
        trigger_source:    input.triggerSource,
      })
      .select('id')
      .single()

    if (error || !run) return { error: error?.message ?? 'could not open run' }
    return { runId: run.id as string }
  },

  async recordProbe(record) {
    await supabaseAdmin.from('coverage_probe_results').upsert(
      {
        run_id:    record.runId,
        domain:    record.domain,
        probe_key: record.probeKey,
        basis:     record.basis,
        topic:     record.topic,
        reply:     record.reply,
      },
      { onConflict: 'run_id,probe_key' },
    )
  },

  async readPriorCoverage(archiveId) {
    const { data } = await supabaseAdmin
      .from('archive_coverage')
      .select('domain, state, probe_set_version')
      .eq('archive_id', archiveId)

    return (data ?? []).map(row => ({
      domain:          row.domain as string,
      state:           row.state as CoverageState,
      probeSetVersion: row.probe_set_version as string,
    }))
  },

  async writeCoverage(rows) {
    await supabaseAdmin.from('archive_coverage').upsert(
      rows.map(r => ({
        archive_id:        r.archiveId,
        domain:            r.domain,
        state:             r.state,
        overreach:         r.overreach,
        probes_deposit:    r.probesDeposit,
        probes_errored:    r.probesErrored,
        probes_overreach:  r.probesOverreach,
        probes_declined:   r.probesDeclined,
        probes_total:      r.probesTotal,
        damped:            r.damped,
        probe_set_version: r.probeSetVersion,
        last_run_id:       r.lastRunId,
        computed_at:       r.computedAt,
      })),
      { onConflict: 'archive_id,domain' },
    )
  },

  async finishRun(t) {
    await supabaseAdmin
      .from('coverage_runs')
      .update({
        finished_at:      t.finishedAt,
        ok:               true,
        complete:         t.complete,
        error:            t.error,
        probes_total:     t.probesTotal,
        probes_deposit:   t.probesDeposit,
        probes_overreach: t.probesOverreach,
        probes_declined:  t.probesDeclined,
        probes_errored:   t.probesErrored,
        model_calls:      t.modelCalls,
      })
      .eq('id', t.runId)
  },

  async failRun(f) {
    await supabaseAdmin
      .from('coverage_runs')
      .update({
        finished_at:  f.finishedAt,
        ok:           false,
        complete:     false,
        error:        f.error,
        probes_total: 0,
        model_calls:  0,
      })
      .eq('id', f.runId)
  },
}

/** Reads identity and the frozen layer for a real archive. The default source. */
async function loadArchiveContent(archiveId: string): Promise<CoverageContent | { error: string }> {
  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, name, owner_name, tier')
    .eq('id', archiveId)
    .maybeSingle()

  if (!archive) return { error: 'archive not found' }

  const { data: pairs } = await supabaseAdmin
    .from('training_pairs')
    .select('prompt, completion')
    .eq('archive_id', archiveId)
    .eq('included_in_training', true)
    .order('quality_score', { ascending: false })
    .limit(FROZEN_LAYER_LIMIT)

  return {
    ownerName:   (archive.owner_name ?? archive.name) as string,
    archiveName: archive.name as string,
    // The b2b probe set against a non-succession archive is diagnostic only. It
    // is allowed, because waiting for a real succession archive means the map
    // cannot be judged against real data at all, but it is labeled at the row so
    // nothing downstream can mistake it for a customer-facing result.
    segment:     archive.tier === 'succession' ? 'succession' : 'b2c',
    pairs:       (pairs ?? []) as FingerprintPairRow[],
  }
}

type OpenRunResult =
  | { error: string }
  | {
      runId:       string
      ownerName:   string
      archiveName: string
      pairs:       FingerprintPairRow[]
      offLabel:    boolean
    }

export type CoverageRunResult =
  | { skipped: string }
  | {
      runId:    string
      ok:       boolean
      complete: boolean
      offLabel: boolean
      error:    string | null
      rollups:  DomainRollup[]
      results:  ProbeResult[]
    }

export async function runCoverage(params: {
  archiveId:      string
  triggerSource?: TriggerSource
  runStep?:       RunStep
  /**
   * Supply identity and the frozen layer directly instead of reading an archive.
   * Absent, the run reads `archives` and `training_pairs` as it always has.
   */
  content?:       CoverageContent
  /** Where the run is written. Absent, it goes to Supabase as it always has. */
  store?:         CoverageStore
  /**
   * Called after each probe resolves. Progress only, never control flow.
   *
   * Carries the whole ProbeResult rather than three loose fields, because
   * `verifierErrored` is needed to render a discarded verdict distinctly and a
   * caller that cannot see it prints a wrong glyph. Widened in slice 2.2; it is
   * typed, so a caller that does not match fails at compile time.
   */
  onProbe?:       (result: ProbeResult) => void
}): Promise<CoverageRunResult> {
  const { archiveId } = params
  const triggerSource = params.triggerSource ?? 'manual'
  const runStep       = params.runStep ?? passThroughStep
  const store         = params.store ?? supabaseCoverageStore

  if (!archiveId) return { skipped: 'no archiveId' }

  // ── Open the run ───────────────────────────────────────────────────────────
  // Content first, then the run row. On the default path both content reads now
  // precede the in-flight check, where before the check sat between them. No
  // write moved and no outcome changed; a run that is refused for being in
  // flight simply costs one extra read before it is refused.
  const opened = await runStep('open-run', async (): Promise<OpenRunResult> => {
    const content = params.content ?? (await loadArchiveContent(archiveId))
    if ('error' in content) return { error: content.error }

    const offLabel = content.segment !== 'succession'

    const outcome = await store.openRun({
      archiveId,
      probeSetVersion: PROBE_SET_VERSION,
      segment:         content.segment,
      offLabel,
      triggerSource,
    })

    if ('error' in outcome) return { error: outcome.error }

    return {
      runId:       outcome.runId,
      ownerName:   content.ownerName,
      archiveName: content.archiveName,
      // Applied to every source. See FROZEN_LAYER_LIMIT.
      pairs:       content.pairs.slice(0, FROZEN_LAYER_LIMIT),
      offLabel,
    }
  })

  if ('error' in opened) return { skipped: opened.error }

  const { runId, ownerName, archiveName, pairs, offLabel } = opened

  const systemPrompt = buildEntitySystemPrompt({
    ownerName,
    archiveName,
    fingerprintSection: formatFingerprintSection(pairs),
    contextSection:     NO_CONTEXT,
  })

  // ── Probe ──────────────────────────────────────────────────────────────────
  // Each probe writes its own row before returning: a timeout partway through
  // must lose one probe, not the whole run. A probe that exhausts its retries is
  // recorded as a miss and the run continues, so one failure does not cost the
  // rest of the set. The run is then flagged incomplete rather than full.
  const results: ProbeResult[] = []
  let hardError: string | null = null

  for (const probe of COVERAGE_PROBES) {
    try {
      const out = await runStep(`probe:${probe.key}`, async () => {
        const draft = await withApiRetry(`voice ${probe.key}`, () => client().messages.create({
          model:       VOICE_MODEL,
          max_tokens:  VOICE_MAX_TOKENS,
          temperature: VOICE_TEMPERATURE,
          system:      systemPrompt,
          messages:    [{ role: 'user', content: probe.question }],
        }))

        const reply = draft.content[0]?.type === 'text' ? draft.content[0].text : ''

        const verdict = await verifyGrounding({ pairs, question: probe.question, answer: reply })
        const errored = isVerifierFailsafe(verdict)
        if (errored) {
          console.warn(`[coverage] verifier failsafe on ${probe.key}, discarding this verdict`)
        }

        await store.recordProbe({
          runId,
          domain:   probe.domain,
          probeKey: probe.key,
          basis:    verdict.basis,
          topic:    errored ? 'verifier failsafe, verdict discarded' : verdict.topic,
          reply,
        })

        return { basis: verdict.basis, errored }
      })

      const result: ProbeResult = {
        probeKey:        probe.key,
        domain:          probe.domain,
        basis:           out.basis,
        verifierErrored: out.errored,
      }
      results.push(result)
      params.onProbe?.(result)
    } catch (err) {
      hardError = err instanceof Error ? err.message : String(err)
    }
  }

  // ── Roll up and write ──────────────────────────────────────────────────────
  // A failed run leaves archive_coverage UNCHANGED. Blanking a founder's map
  // because a model call timed out would tell them their judgment is missing
  // when it is not, which is the worst thing this surface can do.
  return await runStep('roll-up', async () => {
    const now = new Date().toISOString()

    if (results.length === 0) {
      await store.failRun({
        runId,
        finishedAt: now,
        error:      hardError ?? 'no probe results',
      })

      return {
        runId, ok: false, complete: false, offLabel,
        error: hardError ?? 'no probe results',
        rollups: [] as DomainRollup[], results,
      }
    }

    const prior = await store.readPriorCoverage(archiveId)

    // Hysteresis applies only within a probe set version. A prior state computed
    // under a different set is not a comparable observation, so it does not get
    // to damp this one.
    const previousByDomain: Record<string, CoverageState> = {}
    for (const row of prior) {
      if (row.probeSetVersion === PROBE_SET_VERSION) {
        previousByDomain[row.domain] = row.state
      }
    }

    const rollups  = rollUpRun(results, previousByDomain)
    const complete = isRunComplete(rollups)

    await store.writeCoverage(rollups.map(r => ({
      archiveId,
      domain:          r.domain,
      state:           r.state,
      overreach:       r.overreach,
      probesDeposit:   r.probesDeposit,
      probesErrored:   r.probesErrored,
      probesOverreach: r.probesOverreach,
      probesDeclined:  r.probesDeclined,
      probesTotal:     r.probesTotal,
      damped:          r.damped,
      probeSetVersion: PROBE_SET_VERSION,
      lastRunId:       runId,
      computedAt:      now,
    })))

    await store.finishRun({
      runId,
      finishedAt:      now,
      complete,
      error:           hardError,
      probesTotal:     results.length,
      probesDeposit:   results.filter(r => !r.verifierErrored && r.basis === 'deposit').length,
      probesOverreach: results.filter(r => !r.verifierErrored && r.basis === 'unsupported').length,
      probesDeclined:  results.filter(r => !r.verifierErrored && r.basis === 'no_position').length,
      probesErrored:   results.filter(r =>  r.verifierErrored).length,
      modelCalls:      results.length * 2,
    })

    return { runId, ok: true, complete, offLabel, error: hardError, rollups, results }
  })
}
