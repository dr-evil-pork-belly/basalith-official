/**
 * Trial to paid, the conversion. Slice C, October 9, 2026.
 *
 * A payment that carries `archive_id` in its metadata (lib/trialCheckout.ts)
 * founds the record that already exists. It never creates one. Until this
 * slice every first payment created a new, empty record
 * (createArchiveWithCredentials) and the trial holding the person's words was
 * deleted at thirty days.
 *
 * TWO CALLERS, ONE FLIP.
 *
 *   markTrialFounded   one conditional update: status 'trial' to 'active',
 *                      converted_at set, trial_expires_at cleared. Called
 *                      inline by the Stripe webhook the moment a paid Checkout
 *                      session lands, and again by the job below. It is the
 *                      write that takes the record out of the expiry job's
 *                      selection, so it does not wait on Inngest: the billing
 *                      functions were once unregistered for weeks and nobody
 *                      knew (CLAUDE.md section 6).
 *
 *   convertTrialOnPayment   the rest, inside provisionOnFoundingFee: billing
 *                      link, lifecycle row, the welcome, the internal notice.
 *                      Everything that touches a database, Resend, or Inngest
 *                      is injected, so the body is tested without them
 *                      (lib/billing/convertTrial.test.ts).
 *
 * IDEMPOTENT. The flip is conditional on status = 'trial', so a second call
 * changes nothing. The caller's gate (billing.founding_paid_at) stops a second
 * delivery of the event before this body runs at all.
 *
 * WHAT IT DOES NOT TOUCH. tier stays what trial start set ('active'). The
 * record's name stays. No archive_credentials row is written: password sign in
 * is retired. No commission: there is no Guide.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/** The columns of archives the conversion reads. */
export interface ConvertArchiveRow {
  id:          string
  status:      string | null
  tier:        string | null
  name:        string | null
  family_name: string | null
  owner_email: string | null
  owner_name:  string | null
}

export const CONVERT_ARCHIVE_COLS = 'id, status, tier, name, family_name, owner_email, owner_name'

export type FlipResult =
  /** This call moved the record from 'trial' to 'active'. */
  | 'founded'
  /** The record was already 'active'. The webhook got there first, or a replay. */
  | 'already_active'
  /** No archives row with that id. */
  | 'missing'
  /** The record is in some other state. Nothing was changed. */
  | { unexpected: string }

/**
 * The one write that founds a trial. Conditional on status = 'trial', so it is
 * safe to call from the webhook and from the job, in either order, any number
 * of times.
 */
export async function markTrialFounded(
  db: Pick<SupabaseClient, 'from'>,
  archiveId: string,
  now: Date = new Date(),
): Promise<FlipResult> {
  const { data: flipped, error } = await db
    .from('archives')
    .update({ status: 'active', converted_at: now.toISOString(), trial_expires_at: null })
    .eq('id', archiveId)
    .eq('status', 'trial')
    .select('id')
  if (error) throw new Error(`found trial ${archiveId}: ${error.message}`)
  if (flipped && flipped.length > 0) return 'founded'

  const { data: row, error: readErr } = await db
    .from('archives')
    .select('id, status')
    .eq('id', archiveId)
    .maybeSingle()
  if (readErr) throw new Error(`read after flip ${archiveId}: ${readErr.message}`)
  if (!row) return 'missing'
  const status = (row as { status: string | null }).status
  return status === 'active' ? 'already_active' : { unexpected: status ?? 'null' }
}

/** What the welcome says is in the record. Read at send time, never estimated. */
export interface ConvertProgress {
  /** Owner deposits on the record. */
  deposits:       number
  /** Founding calls complete, 0 to 3. */
  callsCompleted: number
  /** The next founding call, or null when all three are done. */
  nextCall:       1 | 2 | 3 | null
}

export type ConvertStep = <T>(id: string, fn: () => Promise<T>) => Promise<T>

export interface ConvertDeps {
  /** Inngest's step.run, or a pass through in tests. */
  step: ConvertStep
  loadArchive(archiveId: string): Promise<ConvertArchiveRow | null>
  flip(archiveId: string): Promise<FlipResult>
  /**
   * Other subscriptions already paid on this record. More than zero means this
   * person has been charged twice.
   */
  otherPaidSubscriptions(archiveId: string, subscriptionId: string): Promise<string[]>
  /** billing: archive_id and founding_paid_at, on the row for this subscription. */
  linkBilling(subscriptionId: string, archiveId: string): Promise<void>
  /** archive_lifecycle: commercial_state 'active'. */
  upsertLifecycle(archiveId: string): Promise<void>
  loadProgress(archive: ConvertArchiveRow): Promise<ConvertProgress>
  /** Send the owner's welcome. Must not throw: a failed send does not undo a sale. */
  sendWelcome(archive: ConvertArchiveRow, progress: ConvertProgress): Promise<void>
  notify(input: { subject: string; text: string }): Promise<void>
}

export type ConvertOutcome =
  | { ok: true; archiveId: string; familyName: string; flip: 'founded' | 'already_active'; duplicate: boolean }
  /** Money was taken and no record could be founded. The founder has been told. */
  | { ok: false; reason: 'record_missing' | 'unexpected_status'; detail: string }

// A step must return something JSON carries. See lib/dependencyReadings.ts.
async function notified(deps: ConvertDeps, input: { subject: string; text: string }): Promise<true> {
  await deps.notify(input)
  return true
}

export async function convertTrialOnPayment(
  input: { archiveId: string; subscriptionId: string; referred: boolean; billingPeriod: string | null },
  deps: ConvertDeps,
): Promise<ConvertOutcome> {
  const { archiveId, subscriptionId } = input
  const { step } = deps

  // ── The record ─────────────────────────────────────────────────────────────
  const archive = await step('convert:load', () => deps.loadArchive(archiveId))
  if (!archive) {
    await step('convert:notify-missing', () => notified(deps, {
      subject: 'PAID, NO RECORD: a trial payment names a record that does not exist',
      text: [
        `Subscription: ${subscriptionId}`,
        `Record named in the metadata: ${archiveId}`,
        'Nothing was created. A person has paid and has no Basalith. Find them in Stripe and write to them today.',
      ].join('\n'),
    }))
    return { ok: false, reason: 'record_missing', detail: archiveId }
  }

  // ── The flip ───────────────────────────────────────────────────────────────
  const flip = await step('convert:found', () => deps.flip(archiveId))
  if (flip === 'missing' || typeof flip === 'object') {
    const detail = flip === 'missing' ? 'the record was deleted between the read and the write' : `status ${flip.unexpected}`
    // When the record exists, the billing row is still linked, so the
    // subscription points at the record it was bought for and a second
    // delivery stops at the gate. A record that is gone cannot be linked:
    // billing.archive_id is a foreign key.
    if (flip !== 'missing') {
      await step('convert:link-billing', () => deps.linkBilling(subscriptionId, archiveId).then(() => true))
    }
    await step('convert:notify-unexpected', () => notified(deps, {
      subject: 'PAID, NOT FOUNDED: a trial payment landed on a record that is not a trial',
      text: [
        `Subscription: ${subscriptionId}`,
        `Record: ${archiveId} (${archive.name ?? 'no name'})`,
        `Owner: ${archive.owner_name ?? ''} <${archive.owner_email ?? ''}>`,
        `Why: ${detail}`,
        'The status was not changed. Read the record and decide by hand.',
      ].join('\n'),
    }))
    return { ok: false, reason: 'unexpected_status', detail }
  }

  // ── Charged twice? ─────────────────────────────────────────────────────────
  const others = await step('convert:other-paid', () => deps.otherPaidSubscriptions(archiveId, subscriptionId))
  const duplicate = others.length > 0

  await step('convert:link-billing', () => deps.linkBilling(subscriptionId, archiveId).then(() => true))
  await step('convert:lifecycle', () => deps.upsertLifecycle(archiveId).then(() => true))

  const familyName = (archive.family_name ?? '').trim() || 'Founder'

  if (duplicate) {
    await step('convert:notify-duplicate', () => notified(deps, {
      subject: `PAID TWICE: ${archive.name ?? familyName}`,
      text: [
        `Record: ${archiveId}`,
        `Owner: ${archive.owner_name ?? ''} <${archive.owner_email ?? ''}>`,
        `This subscription: ${subscriptionId}`,
        `Already paid on this record: ${others.join(', ')}`,
        'Both are linked in billing. Cancel and refund one in Stripe. No second welcome was sent.',
      ].join('\n'),
    }))
    return { ok: true, archiveId, familyName, flip, duplicate }
  }

  // ── The welcome, and the notice ────────────────────────────────────────────
  const progress = await step('convert:progress', () => deps.loadProgress(archive))
  await step('convert:welcome', () => deps.sendWelcome(archive, progress).then(() => true))

  await step('convert:notify-founded', () => notified(deps, {
    subject: `Founded: ${archive.name ?? familyName}`,
    text: [
      `Owner: ${archive.owner_name ?? ''} <${archive.owner_email ?? ''}>`,
      `Record: ${archiveId}`,
      `Subscription: ${subscriptionId}`,
      `Plan: ${input.billingPeriod === 'month' ? 'monthly' : input.billingPeriod === 'year' ? 'yearly' : 'not recorded'}`,
      `Founding fee: ${input.referred ? 'half, by referral' : 'list'}`,
      `On the record: ${progress.deposits} deposits, ${progress.callsCompleted} of 3 founding calls`,
      flip === 'founded'
        ? 'Founded by this job. The webhook had not flipped it.'
        : 'Founded by the webhook. This job linked billing and sent the welcome.',
    ].join('\n'),
  }))

  return { ok: true, archiveId, familyName, flip, duplicate }
}
