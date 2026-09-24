import { inngest } from '@/lib/inngest'
import {
  extractThreadsForDeposit,
  loadPendingDeposits,
  threadExtractionEnabled,
} from '@/lib/threadExtract'

// ─────────────────────────────────────────────────────────────────────────────
// threadExtractionSweep: turn new owner deposits into record threads.
//
// Slice 1 of tailored questions (docs/TAILORED_QUESTIONS_2026-09-24.md).
// Write-only: threads are stored and nothing serves them yet.
//
// WHY A SWEEP AND NOT A HOOK IN EACH ROUTE. Deposits arrive through more than a
// dozen routes (incident answers, the email reply handler, journal, spark,
// capture, voice, the Twilio line). Wiring each one would touch a dozen files
// and inherit their bugs: the email reply handler still calls classifyDeposit
// as `void`, which dies on lambda freeze. The ledger table makes the sweep
// idempotent across every channel at once: a deposit with no ledger row is
// pending, whatever wrote it. A new thread appears within the hour, which is
// fast enough for a planner that queues tomorrow's questions.
//
// GATES. Off unless THREAD_EXTRACTION=on, so this can deploy before the
// migration is pasted. Active Basaliths only, enforced inside
// pending_thread_extractions (migration 20260924, pinned by
// lib/cronGates.test.ts). Owner deposits only; no contributor text, no eval
// holdout, no test artifact.
//
// COST. One Haiku call per new owner deposit, at most BATCH per hour, plus one
// read of that Basalith's existing threads (extractor t2 attaches to them).
// Deposits run in created_at order, one at a time, so each read sees every
// thread the previous deposit made.
// ─────────────────────────────────────────────────────────────────────────────

const BATCH = 40

export const threadExtractionSweep = inngest.createFunction(
  {
    id:          'thread-extraction-sweep',
    name:        'Record thread extraction sweep',
    retries:     1,
    concurrency: { limit: 1 },
    // :17 past each hour, clear of the 04:00 storage sync, the Sunday 05:00
    // verify, and the 06:00 monthly coverage sweep's top of hour.
    triggers:    [{ cron: '17 * * * *' }],
  },
  async ({ step }) => {
    if (!threadExtractionEnabled()) return { skipped: 'THREAD_EXTRACTION is not on' }

    const pending = await step.run('load-pending', () => loadPendingDeposits(BATCH))

    let created  = 0
    let attached = 0
    let errors   = 0
    for (const d of pending) {
      // One step per deposit, so a retry replays one model call, not the batch.
      const outcome = await step.run(`extract:${d.deposit_id}`, () =>
        extractThreadsForDeposit({
          depositId: d.deposit_id,
          archiveId: d.archive_id,
          tier:      d.tier,
          prompt:    d.prompt,
          response:  d.response ?? '',
          saidAt:    d.created_at,
        }).then(o => ({ created: o.created, attached: o.attached, error: o.error, dropped: o.dropped.length })),
      )
      created  += outcome.created
      attached += outcome.attached
      if (outcome.error) errors += 1
    }

    return { deposits: pending.length, created, attached, errors }
  },
)
