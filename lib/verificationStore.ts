/**
 * CoverageStore that writes to verification_runs and verification_probe_results.
 *
 * The third implementation of the port introduced in slice 2.2, alongside
 * supabaseCoverageStore (real archives) and createInMemoryCoverageStore (tests).
 * The INTERFACE DOES NOT CHANGE. Everything specific to a fixture run is passed
 * at construction, the way createInMemoryCoverageStore already takes a runId, so
 * fixture concepts never leak into OpenRunInput and never reach the shape the
 * archive path uses.
 *
 * Spec: BASALITH_VERIFICATION_SURFACE_SKELETON_V3.md sections 2.3 and 3.
 * Tables: supabase/migrations/20260820_verification_surface.sql.
 *
 * SERVER ONLY. resolveCommitSha shells out to git, so this module must not be
 * imported by anything Next bundles for the browser or the edge. Today its only
 * caller is scripts/coverage-fixture-probe.ts.
 */

import { execFileSync, type ExecFileSyncOptionsWithStringEncoding } from 'node:child_process'
import { supabaseAdmin } from './supabase-admin'
import type {
  CoverageStore,
  CoverageRowWrite,
  OpenRunInput,
  OpenRunOutcome,
  PriorCoverage,
  ProbeRecord,
  RunFailure,
  RunTotals,
} from './coverageRun'

/** A full sha and nothing else. Guards against a stray value becoming a wrong sha. */
const SHA_RE = /^[0-9a-f]{40}$/

/**
 * The commit the measured code was at, or null.
 *
 * WHAT WAS CHECKED, rather than assumed, on 2026-08-20:
 *
 *   VERCEL_GIT_COMMIT_SHA appears NOWHERE in this repo. No route, no lib, no
 *   script, no next.config, no vercel.json. It is a Vercel system variable that
 *   is only injected when a project has "Automatically expose System
 *   Environment Variables" enabled, and whether this project does cannot be
 *   read from the sandbox. So the deployed branch below is written on the
 *   documented contract and is NOT CONFIRMED for this project. It has never
 *   executed. When it is wrong it yields null, which is the safe direction.
 *
 *   No COMMIT or GIT key exists in .env.local.
 *
 *   No script in this repo shells out to git today. This is the first.
 *
 * NULL WHEN THE TREE IS DIRTY, which is a deliberate call and the one thing here
 * worth arguing with. A sha resolved from a dirty worktree does not describe the
 * code that ran; it describes the code that ran minus whatever is uncommitted.
 * That is a wrong sha, and a wrong sha beside a published figure is worse than
 * no sha. Returning null costs a little information and makes the invariant
 * total: when commit_sha is present, it is exactly the code that produced the
 * row. The reason is logged loudly so a local run does not silently lose it.
 */
export function resolveCommitSha(): string | null {
  // 1. Deployed. Documented Vercel contract, NOT CONFIRMED for this project.
  const fromEnv = process.env.VERCEL_GIT_COMMIT_SHA
  if (fromEnv && SHA_RE.test(fromEnv)) return fromEnv

  // 2. Local. execFileSync rather than execSync: no shell, so nothing here can
  //    be influenced by shell metacharacters or by cwd contents.
  try {
    const opts: ExecFileSyncOptionsWithStringEncoding = {
      encoding: 'utf8',
      // stderr discarded: "not a git repository" is an expected answer here, not
      // an error worth printing on every run outside a checkout.
      stdio: ['ignore', 'pipe', 'ignore'],
    }

    const dirty = execFileSync('git', ['status', '--porcelain'], opts).trim()
    if (dirty.length > 0) {
      console.warn(
        '[verification] worktree is dirty, writing commit_sha = null. ' +
        'A sha from a dirty tree does not describe the code that ran. ' +
        `${dirty.split('\n').length} uncommitted path(s).`,
      )
      return null
    }

    const sha = execFileSync('git', ['rev-parse', 'HEAD'], opts).trim()
    return SHA_RE.test(sha) ? sha : null
  } catch {
    // Not a repo, git absent from PATH, or the command failed. Unknown is a
    // legitimate answer and the surface renders it as unknown.
    return null
  }
}

export type VerificationRunContext = {
  /** A fictional persona id from lib/demoPersonas. Never an archive id. */
  fixtureId:   string
  /** Shared across the passes of one measurement. Drift is defined across them. */
  runGroupId:  string
  passNumber:  number
  /**
   * FALSE for every manual and local run. Only a scheduled run may set this, and
   * nothing schedules this yet, so every row written today is unpublished.
   */
  published:   boolean
  commitSha:   string | null
  /** 'manual' or 'cron'. Matches the CHECK on verification_runs. */
  triggerSource?: 'manual' | 'cron'
}

export function createVerificationStore(ctx: VerificationRunContext): CoverageStore {
  const triggerSource = ctx.triggerSource ?? 'manual'

  /**
   * Captured at openRun and replayed onto every probe row.
   *
   * The version is a property of the RUN, so it arrives on OpenRunInput rather
   * than on the fixture context, and the probe rows repeat it so the window
   * query needs no join. Taken from the same value that wrote the run row, in
   * the same store, so the two cannot disagree. If recordProbe ever fires before
   * openRun the write fails on the NOT NULL rather than storing an empty string,
   * which is the right way for that bug to surface.
   */
  let probeSetVersion: string | null = null

  return {
    async openRun(input: OpenRunInput): Promise<OpenRunOutcome> {
      // input.archiveId is deliberately NOT written. It carries a synthetic
      // 'fixture:<id>' string on this path, and storing it would put something
      // archive-shaped in a table whose whole guarantee is that it holds nothing
      // of the kind. fixture_id carries the identity instead.
      //
      // No in-flight check either. That guard exists to stop two writers
      // interleaving upserts into archive_coverage, and this store writes no map
      // at all. Two fixture passes are SUPPOSED to run in sequence under one
      // group; refusing the second would break the measurement.
      probeSetVersion = input.probeSetVersion

      const { data, error } = await supabaseAdmin
        .from('verification_runs')
        .insert({
          run_group_id:      ctx.runGroupId,
          pass_number:       ctx.passNumber,
          fixture_id:        ctx.fixtureId,
          probe_set_version: input.probeSetVersion,
          published:         ctx.published,
          commit_sha:        ctx.commitSha,
          trigger_source:    triggerSource,
        })
        .select('id')
        .single()

      if (error || !data) return { error: error?.message ?? 'could not open verification run' }
      return { runId: data.id as string }
    },

    async recordProbe(record: ProbeRecord): Promise<void> {
      const { error } = await supabaseAdmin.from('verification_probe_results').upsert(
        {
          run_id:            record.runId,
          run_group_id:      ctx.runGroupId,
          pass_number:       ctx.passNumber,
          fixture_id:        ctx.fixtureId,
          probe_set_version: probeSetVersion,
          domain:            record.domain,
          probe_key:         record.probeKey,
          basis:             record.basis,
          topic:             record.topic,
          reply:             record.reply,
        },
        { onConflict: 'run_id,probe_key' },
      )
      // Loud, not silent. A missing probe row makes the drift denominator wrong,
      // and a drift figure computed over 47 of 48 probes is a different claim
      // than the one the surface makes.
      if (error) throw new Error(`verification recordProbe ${record.probeKey}: ${error.message}`)
    },

    async readPriorCoverage(): Promise<PriorCoverage[]> {
      // EMPTY, AND THAT IS A CORRECTNESS REQUIREMENT, NOT A STUB.
      //
      // Carried across from lib/coverageStoreMemory.ts, where the same decision
      // was made for the same reason. An empty prior makes previousByDomain
      // empty, which makes applyHysteresis(null, next) return next unchanged.
      //
      // It must STAY empty. GATE 4 asserts that at most one of eight domains
      // changes state across two identical passes, which is the suite's only
      // measurement of whether the map holds still. Feeding pass 1's coverage in
      // as pass 2's prior would damp pass 2 toward pass 1 and suppress precisely
      // the movement GATE 4 exists to detect. The gate would then pass because
      // of the damping rather than because the map is stable, which is a check
      // reporting a conclusion it did not reach.
      //
      // If you are here because an unhysteresised verification path looks like an
      // oversight: it is not. Read GATE 4 in scripts/coverage-fixture-probe.ts
      // before changing this.
      return []
    },

    async writeCoverage(_rows: CoverageRowWrite[]): Promise<void> {
      // DELIBERATE NO-OP. There is no verification_coverage table and there
      // should not be.
      //
      // The per-domain map is fully derivable from verification_probe_results by
      // the same rollUpRun the run itself used. Storing a second copy would
      // create a row that can disagree with the probe rows it was derived from,
      // and when it did, nobody would be able to say which was wrong. The map is
      // cheap to recompute and the rows are the record.
      //
      // The fixture probe still gets its map: runCoverage returns rollups from
      // memory, and every gate reads that return value rather than any table.
      // Nothing is lost by dropping the write.
    },

    async finishRun(t: RunTotals): Promise<void> {
      const { error } = await supabaseAdmin
        .from('verification_runs')
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

      if (error) throw new Error(`verification finishRun ${t.runId}: ${error.message}`)
    },

    async failRun(f: RunFailure): Promise<void> {
      const { error } = await supabaseAdmin
        .from('verification_runs')
        .update({
          finished_at:  f.finishedAt,
          ok:           false,
          complete:     false,
          error:        f.error,
          probes_total: 0,
          model_calls:  0,
        })
        .eq('id', f.runId)

      if (error) throw new Error(`verification failRun ${f.runId}: ${error.message}`)
    },
  }
}
