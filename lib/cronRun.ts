/**
 * The run ledger. One row per scheduled run, for every scheduled job.
 *
 * WHY THIS EXISTS. As of September 30, 2026 only the storage backup pair could
 * prove it ran (storage_backup_runs). Every other scheduled job left a platform
 * log and nothing else, and a green platform status proves little here: several
 * crons return a 200 "skipped" on an hour or day gate, and the backup heartbeat
 * returns 200 with ok:false on purpose. The daily backup cron sat undeployed
 * from August 13 to September 17 and nothing noticed. A row written by the job
 * itself is the only evidence that holds.
 * Recon: docs/RUN_LEDGER_SLICE_1_2026-09-30.md.
 * Table: supabase/migrations/20260930_cron_runs.sql.
 *
 * THE CONTRACT, in three lines:
 *
 *   1. A row is opened before the work starts and closed when it ends. A row
 *      with finished_at null is a run that died without unwinding (lambda OOM,
 *      timeout). That is a signal, not a defect in the ledger.
 *   2. outcome is 'ok' only when the job did its real work. A gate skip, a dry
 *      run, or a test invocation is 'skipped'. A watcher that counts 'ok' rows
 *      therefore counts work done, never invocations.
 *   3. THE LEDGER NEVER STOPS THE JOB. If the row cannot be opened or closed the
 *      failure is logged and the work runs anyway. A watcher that can break the
 *      thing it watches is a second job that can also fail.
 *
 * SUMMARY HOLDS COUNTS, NEVER CONTENT. No names, no emails, no storage paths,
 * no archive ids. This table is operational evidence and is read into a weekly
 * report; it must be safe to paste.
 *
 * NOT IN THIS FILE, and named rather than hidden: nothing reads the ledger yet.
 * The heartbeat that alarms on a silent job is the next slice. Until it ships,
 * this is a record, not an alarm.
 *
 * Every await here is awaited before the caller returns, so nothing depends on
 * fire-and-forget surviving a lambda freeze.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'

export type CronScheduler = 'vercel' | 'inngest'
export type CronOutcome = 'ok' | 'failed' | 'skipped'

export interface CronRunReport {
  outcome: CronOutcome
  /** Counts only. See the header. */
  summary?: Record<string, number | boolean | string | null>
  /** Set when outcome is 'failed'. Truncated before it is stored. */
  error?: string
}

export interface CronRunStore {
  /** Returns the new row id, or null when the row could not be opened. */
  open(input: { job: string; scheduler: CronScheduler; startedAt: string }): Promise<string | null>
  close(id: string, input: CronRunReport & { finishedAt: string }): Promise<void>
}

const ERROR_MAX = 2000

function message(err: unknown): string {
  return (err instanceof Error ? err.message : String(err)).slice(0, ERROR_MAX)
}

export const supabaseCronRunStore: CronRunStore = {
  async open({ job, scheduler, startedAt }) {
    const { data, error } = await supabaseAdmin
      .from('cron_runs')
      .insert({ job, scheduler, started_at: startedAt })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return (data as { id: string } | null)?.id ?? null
  },
  async close(id, { outcome, summary, error, finishedAt }) {
    const { error: updateError } = await supabaseAdmin
      .from('cron_runs')
      .update({
        finished_at: finishedAt,
        outcome,
        summary: summary ?? null,
        error: error ? error.slice(0, ERROR_MAX) : null,
      })
      .eq('id', id)
    if (updateError) throw new Error(updateError.message)
  },
}

export interface CronRunOptions {
  /** Stable job name. Matches the route folder or the Inngest function id. */
  job: string
  scheduler: CronScheduler
  /** Injected for tests. Defaults to the Supabase store. */
  store?: CronRunStore
  /** Injected for tests. Defaults to now. */
  now?: () => Date
}

/**
 * Runs `work` inside a ledger row and returns whatever `work` returns.
 *
 * `report` turns the result into an outcome. It is required, not defaulted to
 * 'ok', because the difference between "ran" and "did its work" is the whole
 * point and only the job knows it.
 *
 * If `work` throws, the row closes 'failed' and the error is rethrown unchanged,
 * so the route or the Inngest step behaves exactly as it did before.
 */
export async function withCronRun<T>(
  options: CronRunOptions,
  work: () => Promise<T>,
  report: (result: T) => CronRunReport,
): Promise<T> {
  const store = options.store ?? supabaseCronRunStore
  const now = options.now ?? (() => new Date())
  const tag = `[cron-run] ${options.job}`

  let id: string | null = null
  try {
    id = await store.open({
      job: options.job,
      scheduler: options.scheduler,
      startedAt: now().toISOString(),
    })
  } catch (err) {
    console.error(`${tag}: ledger row not opened, running anyway:`, message(err))
  }

  const close = async (r: CronRunReport): Promise<void> => {
    if (!id) return
    try {
      await store.close(id, { ...r, finishedAt: now().toISOString() })
    } catch (err) {
      console.error(`${tag}: ledger row ${id} not closed:`, message(err))
    }
  }

  let result: T
  try {
    result = await work()
  } catch (err) {
    await close({ outcome: 'failed', error: message(err) })
    throw err
  }

  let r: CronRunReport
  try {
    r = report(result)
  } catch (err) {
    // The work finished. A broken reporter must not turn that into a thrown
    // route, and must not be recorded as 'ok' either.
    r = { outcome: 'failed', error: `report() threw: ${message(err)}` }
  }
  await close(r)
  return result
}
