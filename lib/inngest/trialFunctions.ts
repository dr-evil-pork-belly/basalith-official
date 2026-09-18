/**
 * Trial expiry, the two crons. Slice B, September 17, 2026.
 *
 *   trial-warn    0 15 * * *  (08:00 Pacific)  the day 23 warning email
 *   trial-expire  0 16 * * *  (09:00 Pacific)  the delete
 *
 * Both read every archives row with status = 'trial' and decide in the pure
 * core (lib/trialExpiry.ts). Neither selects status = 'active', on purpose:
 * lib/cronGates.test.ts pins that rule for the Vercel crons that email owners
 * of live archives, and these two are the one job that is about trials.
 *
 * trialWarn sends before it marks. An email that fails must not mark the row
 * warned, and a row already marked (a concurrent run, a retry after the mark)
 * must not mail twice: the update carries `trial_warned_at is null` and a
 * zero-row result is logged, not retried.
 *
 * trialExpire runs one step.run per DELETE_ORDER entry per archive, named
 * `${step}:${archiveId}`, through lib/trialExpiryRunner.ts, which the probe
 * script also runs. A retry re-runs only the steps that did not complete.
 * Skeleton section 2; the live cascade map in
 * docs/SELF_SERVE_BUILD_B_2026-09-17.md.
 *
 * after() does not apply here. Inngest steps are the durable primitive.
 */

import { inngest } from '@/lib/inngest'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { notifyInternal } from '@/lib/internalNotify'
import { buildTrialWarningEmail } from '@/lib/emails/trialWarning'
import { selectTrialsToExpire, selectTrialsToWarn, type DeleteStep, type TrialRow } from '@/lib/trialExpiry'
import { runTrialExpiryForArchive, type ExpiryOutcome } from '@/lib/trialExpiryRunner'

const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'legacy@basalith.xyz'

const TRIAL_COLS = 'id, name, owner_email, owner_name, trial_expires_at, trial_warned_at, scheduled_deletion_at, status, preferred_language'

async function loadTrials(): Promise<TrialRow[]> {
  const { data, error } = await supabaseAdmin
    .from('archives')
    .select(TRIAL_COLS)
    .eq('status', 'trial')
  if (error) throw new Error(`load trials: ${error.message}`)
  return (data ?? []) as TrialRow[]
}

// ── trial-warn ───────────────────────────────────────────────────────────────

export const trialWarn = inngest.createFunction(
  {
    id:          'trial-warn',
    name:        'Trial warning, seven days before deletion',
    retries:     2,
    concurrency: { limit: 1 },
    triggers:    [{ cron: '0 15 * * *' }],
  },
  async ({ step }) => {
    const due = await step.run('load', async () => selectTrialsToWarn(await loadTrials()))

    let sent = 0
    const skipped: string[] = []

    for (const trial of due) {
      const result = await step.run(`warn:${trial.id}`, async () => {
        if (!trial.owner_email) return { sent: false, reason: 'no owner_email', deposits: 0 }
        if (!trial.trial_expires_at) return { sent: false, reason: 'no trial_expires_at', deposits: 0 }

        const { count } = await supabaseAdmin
          .from('owner_deposits')
          .select('id', { count: 'exact', head: true })
          .eq('archive_id', trial.id)
          .is('contributor_id', null)

        const email = buildTrialWarningEmail({
          archiveName: trial.name ?? 'your archive',
          ownerName:   trial.owner_name,
          deposits:    count ?? 0,
          expiresAt:   new Date(trial.trial_expires_at),
        })

        // Send first. A failed send throws, the step retries, and the row is
        // never marked warned by a mail that did not go out.
        await resend.emails.send({
          from:    `${trial.name ?? 'Basalith'} <${RESEND_FROM}>`,
          to:      trial.owner_email,
          // The keep line is a reply until slice C. The founder reads this box.
          replyTo: ADMIN_EMAIL,
          subject: email.subject,
          html:    email.html,
          text:    email.text,
          headers: { 'X-Entity-Ref-ID': `basalith-trial-warn-${trial.id}` },
        })

        const { data: marked, error } = await supabaseAdmin
          .from('archives')
          .update({ trial_warned_at: new Date().toISOString() })
          .eq('id', trial.id)
          .is('trial_warned_at', null)
          .select('id')
        if (error) throw new Error(`mark warned ${trial.id}: ${error.message}`)
        if (!marked || marked.length === 0) {
          console.warn('[trial-warn] sent but the row was already marked warned (concurrent run):', trial.id)
        }
        return { sent: true, reason: null as string | null, deposits: count ?? 0 }
      })

      if (result.sent) sent += 1
      else skipped.push(`${trial.id} (${result.reason})`)
    }

    return { due: due.length, sent, skipped }
  },
)

// ── trial-expire ─────────────────────────────────────────────────────────────

export const trialExpire = inngest.createFunction(
  {
    id:          'trial-expire',
    name:        'Trial expiry, delete at thirty days',
    retries:     2,
    concurrency: { limit: 1 },
    triggers:    [{ cron: '0 16 * * *' }],
  },
  async ({ step }) => {
    const due = await step.run('load', async () => selectTrialsToExpire(await loadTrials()))

    const outcomes: ExpiryOutcome[] = []
    for (const trial of due) {
      const outcome = await runTrialExpiryForArchive(trial.id, {
        supabaseAdmin,
        notify:  notifyInternal,
        runStep: <T,>(name: DeleteStep, fn: () => Promise<T>) => step.run(`${name}:${trial.id}`, fn) as Promise<T>,
      })
      outcomes.push(outcome)
    }

    return {
      due:     due.length,
      deleted: outcomes.filter(o => !o.stoppedAt).length,
      stopped: outcomes.filter(o => o.stoppedAt).map(o => o.archiveId),
      outcomes,
    }
  },
)
