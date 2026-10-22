/**
 * Trial to paid, the reads. Slice C, October 9, 2026.
 *
 * Everything here touches Supabase, the environment, or the price table. The
 * decisions are in lib/trialCheckout.ts, which is pure and tested. Used by the
 * founding page (to decide whether a button is shown) and by
 * app/api/archive/checkout (to build the session), so the page and the route
 * cannot disagree about who is offered what.
 */

import { supabaseAdmin } from './supabase-admin'
import { stripeMode } from './stripe/client'
import { priceId } from './stripe/prices'
import { referrerArchiveFromReason } from './referral'
import {
  checkoutOpenFor,
  checkoutRefusal,
  plansToConfigure,
  trialOffer,
  type CheckoutArchive,
  type TrialOffer,
} from './trialCheckout'

/** Whether Checkout is open to this owner on this deployment. */
export function checkoutOpenForOwner(email: string | null | undefined): boolean {
  return checkoutOpenFor({
    flag:       process.env.TRIAL_CHECKOUT,
    email,
    stripeMode: stripeMode(),
    vercelEnv:  process.env.VERCEL_ENV,
    nodeEnv:    process.env.NODE_ENV,
  })
}

export interface TrialApplication {
  /** archive_applications.id, or null when no lead row was found. */
  id:                string | null
  /** The Basalith that referred this person (lib/referral.ts), or null. */
  referrerArchiveId: string | null
}

/**
 * The lead row /api/trial/start wrote for this trial, found by the owner's
 * email and status = 'trial'. It carries the referral tag in `reason`.
 *
 * It never throws. The row is bookkeeping: trial start itself carries on when
 * the insert fails, so a trial with no lead row is a real state, and a failed
 * read here must not stop a person from paying. The cost of a miss is that a
 * referred person is shown the list fee, which is why a failed read is logged.
 *
 * Nobody refers themselves: a tag naming `ownArchiveId` reads as no referral,
 * here, so the page and the route apply the same rule.
 */
export async function loadTrialApplication(
  ownerEmail: string | null | undefined,
  ownArchiveId?: string | null,
): Promise<TrialApplication> {
  const none: TrialApplication = { id: null, referrerArchiveId: null }
  const email = (ownerEmail ?? '').trim().toLowerCase()
  if (!email) return none
  try {
    const { data, error } = await supabaseAdmin
      .from('archive_applications')
      .select('id, reason')
      .eq('email', email)
      .eq('status', 'trial')
      .limit(5)
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as { id: string; reason: string | null }[]
    if (rows.length === 0) return none
    // One trial per person, so one row is the rule. If there are more, the one
    // carrying a referral is the one that changes what is charged.
    const referred = rows.find(r => referrerArchiveFromReason(r.reason))
    const row = referred ?? rows[0]
    const referrer = referrerArchiveFromReason(row.reason)
    return { id: row.id, referrerArchiveId: referrer && referrer !== ownArchiveId ? referrer : null }
  } catch (err) {
    console.error('[trialCheckout] application read failed:', err instanceof Error ? err.message : err)
    return none
  }
}

/** True when every Stripe price a plan needs has an id in the current mode. */
export function pricesConfigured(referrerArchiveId: string | null): boolean {
  try {
    for (const name of plansToConfigure(referrerArchiveId)) priceId(name)
    return true
  } catch {
    return false
  }
}

/**
 * What the founding page shows a trial owner, or null for no button.
 *
 * Null when Checkout is closed to this owner, when the record cannot be paid
 * for here, or when a price is missing. In each of those the page shows what
 * it showed before this slice. A button that fails on click is worse than no
 * button.
 */
export async function loadTrialOffer(
  archive: CheckoutArchive & { id?: string | null; owner_email?: string | null },
): Promise<TrialOffer | null> {
  if (checkoutRefusal(archive)) return null
  if (!checkoutOpenForOwner(archive.owner_email)) return null
  const application = await loadTrialApplication(archive.owner_email, archive.id)
  if (!pricesConfigured(application.referrerArchiveId)) return null
  return trialOffer(application.referrerArchiveId)
}
