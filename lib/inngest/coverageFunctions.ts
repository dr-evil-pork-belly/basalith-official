import { inngest } from '@/lib/inngest'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { runCoverage, type RunStep, type TriggerSource } from '@/lib/coverageRun'

// ─────────────────────────────────────────────────────────────────────────────
// computeCoverage — probe the succession entity across the eight b2b domains and
// read the grounding verifier to produce a coverage map.
//
// The run itself lives in lib/coverageRun.ts, shared with
// scripts/coverage-drive.ts so the deployed path and the local acceptance path
// cannot drift. This file contributes exactly two things: the Inngest wiring,
// and step.run as the unit-of-work wrapper so a retry replays one probe rather
// than the whole set.
//
// COST. Two model calls per probe, so 2 * COVERAGE_PROBES.length per run. At
// probe set v2 that is 96 calls. That is why this is a background job on a
// monthly cron writing to a cached table, and why no surface recomputes on
// render.
// ─────────────────────────────────────────────────────────────────────────────

export const computeCoverage = inngest.createFunction(
  {
    id:          'compute-coverage',
    name:        'Compute archive coverage map',
    retries:     2,
    // One coverage run at a time across the whole app. A run is two model calls
    // per probe; two concurrent runs double that against the same rate limit for
    // no gain, since nothing is waiting on the result interactively.
    concurrency: { limit: 1 },
    // Duplicate deliveries for one archive collapse before a second run can
    // open. The in-flight check inside runCoverage and the partial unique index
    // coverage_runs_one_in_flight are the two backstops behind this.
    idempotency: 'event.data.archiveId',
    triggers:    [{ event: 'coverage.run.requested' }],
  },
  async ({ event, step }) => {
    const archiveId     = event.data?.archiveId as string | undefined
    const triggerSource = (event.data?.triggerSource as TriggerSource | undefined) ?? 'manual'

    if (!archiveId) return { skipped: 'no archiveId on event' }

    // Inngest types step.run as returning Jsonify<T> rather than T, because a
    // step result crosses a serialization boundary when a run is replayed. Every
    // value a step returns in coverageRun.ts is already JSON-safe: strings,
    // numbers, booleans, and arrays of those. So Jsonify<T> and T describe the
    // same runtime value here and the cast is sound.
    //
    // It is sound BECAUSE of that, not in general. If a step in coverageRun.ts
    // ever returns a Date, a Map, a Set, or undefined, this cast starts lying
    // and a replayed run silently gets a different shape than a fresh one. The
    // fix then is to change the step, never to widen the cast.
    const runStep: RunStep = <T,>(id: string, fn: () => Promise<T>) =>
      step.run(id, fn) as Promise<T>

    const result = await runCoverage({ archiveId, triggerSource, runStep })

    if ('skipped' in result) return result

    // Return the map shape only. The full replies live in
    // coverage_probe_results and do not belong in an Inngest run payload.
    return {
      runId:    result.runId,
      ok:       result.ok,
      complete: result.complete,
      offLabel: result.offLabel,
      domains:  result.rollups.map(r => ({
        domain:    r.domain,
        state:     r.state,
        overreach: r.overreach,
        damped:    r.damped,
      })),
    }
  },
)

// ─────────────────────────────────────────────────────────────────────────────
// coverageMonthlySweep — fire a coverage run for each succession archive.
//
// Monthly, not weekly. The map moves at the speed a founder deposits, and a run
// is two model calls per probe. 06:00 UTC on the 3rd sits clear of the daily storage
// sync at 04:00 and the Sunday verify at 05:00. Nothing enforces that ordering,
// it just keeps the common case uncontended.
//
// Off-label archives are NOT swept. A diagnostic run against a b2c archive is
// something a person asks for, never something a cron does on its own.
// ─────────────────────────────────────────────────────────────────────────────
export const coverageMonthlySweep = inngest.createFunction(
  {
    id:          'coverage-monthly-sweep',
    name:        'Monthly coverage sweep',
    retries:     1,
    concurrency: { limit: 1 },
    triggers:    [{ cron: '0 6 3 * *' }],
  },
  async ({ step }) => {
    const archiveIds = await step.run('load-succession-archives', async () => {
      const { data } = await supabaseAdmin
        .from('archives')
        .select('id')
        .eq('tier', 'succession')
      return (data ?? []).map(a => a.id as string)
    })

    for (const archiveId of archiveIds) {
      await step.sendEvent(`request:${archiveId}`, {
        name: 'coverage.run.requested',
        data: { archiveId, triggerSource: 'cron' },
      })
    }

    return { requested: archiveIds.length }
  },
)
