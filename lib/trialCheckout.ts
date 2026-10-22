/**
 * Trial to paid, the pure rules. Slice C, October 9, 2026.
 *
 * A trial (lib/trial.ts) is an archives row with status = 'trial'. Until this
 * slice the only way to pay was a link the founder built by hand
 * (app/api/admin/checkout), and provisioning answered a payment by creating a
 * NEW record. The person who did call 1 and saw the proof paid, landed on an
 * empty record, and the trial that held their words was deleted at thirty
 * days. This slice lets the owner pay from the page, and the payment founds
 * the record they already have.
 *
 * This file holds every decision that is a function of values already read.
 * No DB, no Stripe, no IO. The reads are in lib/trialCheckoutStore.ts, the
 * route is app/api/archive/checkout, and the conversion is
 * lib/billing/convertTrial.ts.
 *
 * THE METADATA KEY IS `archive_id`. The legacy branch of the Stripe webhook
 * reads `archiveId` (camel case) and activates a paused record. They are kept
 * distinct on purpose: a trial session must never take the legacy branch.
 *
 * PRICES. The three dollar figures below are what the page prints. What a card
 * is charged is the Stripe price object behind the name in lib/stripe/prices.ts,
 * created by scripts/stripe-setup.ts. lib/trialCheckout.test.ts reads that
 * script and fails if a figure here disagrees with it.
 */

import type { PriceName } from './stripe/prices'
import { REFERRAL_FOUNDING_DOLLARS } from './referral'

export const FOUNDING_DOLLARS     = 2500
export const ACTIVE_YEAR_DOLLARS  = 3600
export const ACTIVE_MONTH_DOLLARS = 360

/** metadata.source on a session this slice creates. */
export const TRIAL_CHECKOUT_SOURCE = 'trial'

export type BillingPeriod = 'year' | 'month'

export function isBillingPeriod(v: unknown): v is BillingPeriod {
  return v === 'year' || v === 'month'
}

// ── Who is offered Checkout ───────────────────────────────────────────────────

/**
 * Whether the pay button is shown to this owner, from the TRIAL_CHECKOUT env
 * value. Three settings:
 *
 *   unset, empty, 'off'   closed to everyone. The page shows the sentence it
 *                         showed before this slice and no button.
 *   a list of emails      open to those owners only, comma separated. This is
 *                         how the founder pays with a test card on production
 *                         without a stranger ever seeing the button.
 *   'on'                  open to every trial owner, with one condition below.
 *
 * THE CONDITION ON 'on'. On a production deployment holding a Stripe TEST key,
 * 'on' is treated as closed. A stranger's real card is declined in test mode,
 * and that would be their first experience of paying. A production deployment
 * is VERCEL_ENV = 'production', or NODE_ENV = 'production' with VERCEL_ENV
 * unset, so a missing VERCEL_ENV fails closed. Previews and `next dev` are not
 * production and open on a test key.
 */
export function checkoutOpenFor(input: {
  flag:       string | null | undefined
  email:      string | null | undefined
  stripeMode: 'test' | 'live'
  vercelEnv:  string | null | undefined
  nodeEnv:    string | null | undefined
}): boolean {
  const flag = (input.flag ?? '').trim().toLowerCase()
  if (!flag || flag === 'off') return false

  if (flag === 'on') {
    if (input.stripeMode === 'live') return true
    const production = input.vercelEnv
      ? input.vercelEnv === 'production'
      : input.nodeEnv === 'production'
    return !production
  }

  const email = (input.email ?? '').trim().toLowerCase()
  if (!email) return false
  return flag.split(',').map(s => s.trim()).filter(Boolean).includes(email)
}

// ── Who may pay ───────────────────────────────────────────────────────────────

export type CheckoutRefusal = { status: number; error: string }

/** The columns of archives the refusal reads. */
export interface CheckoutArchive {
  status?:                   string | null
  tier?:                     string | null
  scheduled_deletion_at?:    string | null
  termination_requested_at?: string | null
}

/**
 * Why this record cannot be paid for here, or null when it can.
 *
 * Only a personal trial pays here. A founded record has nothing to pay. A
 * business record is priced on a scoping call and paid through the founder's
 * own link. A record its owner asked to delete, or one the expiry job has
 * already begun to remove, is not sold a plan.
 *
 * An expired trial that has not been deleted yet is NOT refused. The expiry
 * job runs once a day, the person is asking to keep the record, and the
 * conversion takes it out of the job's selection.
 */
export function checkoutRefusal(archive: CheckoutArchive): CheckoutRefusal | null {
  if (archive.status === 'active') {
    return { status: 409, error: 'Your Basalith is already founded.' }
  }
  if (archive.status !== 'trial') {
    return { status: 409, error: 'This Basalith cannot be founded from here. Write to us and we will help.' }
  }
  if (archive.tier === 'succession') {
    return { status: 409, error: 'A business Basalith is set up with us directly. Write to us and we will help.' }
  }
  if (archive.scheduled_deletion_at || archive.termination_requested_at) {
    return { status: 409, error: 'This Basalith is set to be deleted. Write to us if you want to keep it.' }
  }
  return null
}

// ── What is charged ───────────────────────────────────────────────────────────

export interface TrialCheckoutPlan {
  tierPrice:       PriceName
  foundingPrice:   PriceName
  /** What the page prints for the founding line. */
  foundingDollars: number
  referred:        boolean
}

/**
 * The two line items. The recurring plan follows the period the owner picked.
 * The founding line is the half fee when a referral is recorded on the trial
 * (lib/referral.ts, decided October 6, 2026) and the list fee otherwise.
 */
export function trialCheckoutPlan(input: {
  billingPeriod:     BillingPeriod
  referrerArchiveId: string | null
}): TrialCheckoutPlan {
  const referred = !!input.referrerArchiveId
  return {
    tierPrice:       input.billingPeriod === 'month' ? 'b2c_active_month' : 'b2c_active_year',
    foundingPrice:   referred ? 'b2c_founding_referral' : 'b2c_founding',
    foundingDollars: referred ? REFERRAL_FOUNDING_DOLLARS : FOUNDING_DOLLARS,
    referred,
  }
}

/** Every price name a plan needs, for the "is this configured" check. */
export function plansToConfigure(referrerArchiveId: string | null): PriceName[] {
  const year  = trialCheckoutPlan({ billingPeriod: 'year',  referrerArchiveId })
  const month = trialCheckoutPlan({ billingPeriod: 'month', referrerArchiveId })
  return [year.foundingPrice, year.tierPrice, month.tierPrice]
}

/**
 * The metadata written on both the session and the subscription.
 *
 * `archive_id` is what makes provisioning found the existing record and not
 * create one. `tier` is the billing SKU base, the same value the admin route
 * writes. `application_id`, when the trial's lead row was found, lets the
 * existing steps link billing to it and mark it won, which is what makes the
 * price tripwire a count and not a hand match. The referral keys are the two
 * the admin route writes, so the credit step reads one shape.
 */
export function trialCheckoutMetadata(input: {
  archiveId:         string
  billingPeriod:     BillingPeriod
  applicationId:     string | null
  referrerArchiveId: string | null
}): Record<string, string> {
  const md: Record<string, string> = {
    archive_id:     input.archiveId,
    source:         TRIAL_CHECKOUT_SOURCE,
    segment:        'b2c',
    tier:           'b2c_active',
    billing_period: input.billingPeriod,
  }
  if (input.applicationId) md.application_id = input.applicationId
  if (input.referrerArchiveId) {
    md.founding_referral   = 'half'
    md.referrer_archive_id = input.referrerArchiveId
  }
  return md
}

// ── What the page prints ──────────────────────────────────────────────────────

/** Passed from the server page to the client. Null means no button. */
export interface TrialOffer {
  foundingDollars: number
  /** The list founding fee, printed beside a referred one. */
  listDollars:     number
  yearDollars:     number
  monthDollars:    number
  referred:        boolean
}

export function trialOffer(referrerArchiveId: string | null): TrialOffer {
  const plan = trialCheckoutPlan({ billingPeriod: 'year', referrerArchiveId })
  return {
    foundingDollars: plan.foundingDollars,
    listDollars:     FOUNDING_DOLLARS,
    yearDollars:     ACTIVE_YEAR_DOLLARS,
    monthDollars:    ACTIVE_MONTH_DOLLARS,
    referred:        plan.referred,
  }
}

export function dollars(n: number): string {
  return `$${n.toLocaleString('en-US')}`
}

/**
 * The sentences under the proof card when Checkout is open. Rendered, so they
 * are copy: no em dash, no exclamation point, no hyphenated word, American
 * English. No figure is derived: each one is a price that exists in Stripe.
 */
export function offerLines(offer: TrialOffer): { lead: string; keep: string; founding: string; plan: string; begins: string } {
  return {
    lead:     'Found your Basalith to keep going.',
    keep:     'Everything you have said so far stays in it.',
    founding: offer.referred
      ? `Because you were referred, the Founding is ${dollars(offer.foundingDollars)}, paid once. That is half the usual ${dollars(offer.listDollars)}.`
      : `The Founding is ${dollars(offer.foundingDollars)}, paid once.`,
    plan:     `Your plan is ${dollars(offer.yearDollars)} a year or ${dollars(offer.monthDollars)} a month.`,
    begins:   'Both are charged today, on a Stripe page.',
  }
}

/** Every owner visible string here, for the copy rule test. */
export function allTrialCheckoutCopy(): string[] {
  const out: string[] = []
  for (const ref of [null, '00000000-0000-4000-8000-000000000000']) {
    out.push(...Object.values(offerLines(trialOffer(ref))))
  }
  for (const a of [
    { status: 'active' }, { status: 'paused' }, { status: 'trial', tier: 'succession' },
    { status: 'trial', tier: 'active', scheduled_deletion_at: 'x' },
  ]) {
    const r = checkoutRefusal(a)
    if (r) out.push(r.error)
  }
  return out
}
