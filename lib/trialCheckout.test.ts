import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import {
  ACTIVE_MONTH_DOLLARS,
  ACTIVE_YEAR_DOLLARS,
  FOUNDING_DOLLARS,
  TRIAL_CHECKOUT_SOURCE,
  allTrialCheckoutCopy,
  checkoutOpenFor,
  checkoutRefusal,
  isBillingPeriod,
  offerLines,
  plansToConfigure,
  trialCheckoutMetadata,
  trialCheckoutPlan,
  trialOffer,
} from './trialCheckout'
import { REFERRAL_FOUNDING_DOLLARS } from './referral'

const REFERRER = '11111111-2222-4333-8444-555555555555'
const RECORD   = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'

describe('who is offered Checkout (TRIAL_CHECKOUT)', () => {
  const base = { email: 'owner@example.com', stripeMode: 'test' as const, vercelEnv: 'production', nodeEnv: 'production' }

  it('is closed when the flag is unset, empty, or off', () => {
    for (const flag of [undefined, null, '', '  ', 'off', 'OFF']) {
      expect(checkoutOpenFor({ ...base, flag, stripeMode: 'live' })).toBe(false)
    }
  })

  it('a list of emails opens it to those owners only, in any mode', () => {
    const flag = 'Owner@Example.com, second@example.com'
    expect(checkoutOpenFor({ ...base, flag })).toBe(true)
    expect(checkoutOpenFor({ ...base, flag, email: 'SECOND@example.com' })).toBe(true)
    expect(checkoutOpenFor({ ...base, flag, email: 'stranger@example.com' })).toBe(false)
    expect(checkoutOpenFor({ ...base, flag, email: null })).toBe(false)
  })

  it('"on" opens it to everyone on a live key', () => {
    expect(checkoutOpenFor({ ...base, flag: 'on', stripeMode: 'live', email: 'stranger@example.com' })).toBe(true)
  })

  it('"on" with a TEST key is closed on production, so no stranger meets a declined card', () => {
    expect(checkoutOpenFor({ ...base, flag: 'on' })).toBe(false)
    // VERCEL_ENV missing on a production build fails closed.
    expect(checkoutOpenFor({ ...base, flag: 'on', vercelEnv: undefined })).toBe(false)
  })

  it('"on" with a test key is open on a preview and in next dev', () => {
    expect(checkoutOpenFor({ ...base, flag: 'on', vercelEnv: 'preview' })).toBe(true)
    expect(checkoutOpenFor({ ...base, flag: 'on', vercelEnv: undefined, nodeEnv: 'development' })).toBe(true)
  })
})

describe('who may pay', () => {
  it('a personal trial may', () => {
    expect(checkoutRefusal({ status: 'trial', tier: 'active' })).toBeNull()
  })

  it('an expired trial that has not been deleted yet still may', () => {
    // No date is read at all: the person is asking to keep it.
    expect(checkoutRefusal({ status: 'trial', tier: 'active', scheduled_deletion_at: null, termination_requested_at: null })).toBeNull()
  })

  it('a founded record, an assessment, a paused record, and a business trial may not', () => {
    for (const a of [
      { status: 'active', tier: 'active' },
      { status: 'assessment', tier: 'succession' },
      { status: 'paused', tier: 'estate' },
      { status: null, tier: 'active' },
      { status: 'trial', tier: 'succession' },
    ]) {
      expect(checkoutRefusal(a)?.status, JSON.stringify(a)).toBe(409)
    }
  })

  it('a record set for deletion, by its owner or by the expiry job, may not', () => {
    expect(checkoutRefusal({ status: 'trial', tier: 'active', scheduled_deletion_at: '2027-01-01T00:00:00Z' })?.status).toBe(409)
    expect(checkoutRefusal({ status: 'trial', tier: 'active', termination_requested_at: '2026-10-09T00:00:00Z' })?.status).toBe(409)
  })
})

describe('what is charged', () => {
  it('the plan follows the period and the founding line follows the referral', () => {
    expect(trialCheckoutPlan({ billingPeriod: 'year', referrerArchiveId: null })).toEqual({
      tierPrice: 'b2c_active_year', foundingPrice: 'b2c_founding', foundingDollars: FOUNDING_DOLLARS, referred: false,
    })
    expect(trialCheckoutPlan({ billingPeriod: 'month', referrerArchiveId: REFERRER })).toEqual({
      tierPrice: 'b2c_active_month', foundingPrice: 'b2c_founding_referral', foundingDollars: REFERRAL_FOUNDING_DOLLARS, referred: true,
    })
  })

  it('names every price a plan needs, so a missing one hides the button', () => {
    expect(plansToConfigure(null)).toEqual(['b2c_founding', 'b2c_active_year', 'b2c_active_month'])
    expect(plansToConfigure(REFERRER)).toEqual(['b2c_founding_referral', 'b2c_active_year', 'b2c_active_month'])
  })

  it('accepts only year or month', () => {
    expect(isBillingPeriod('year')).toBe(true)
    expect(isBillingPeriod('month')).toBe(true)
    for (const v of ['annual', '', null, undefined, 12]) expect(isBillingPeriod(v)).toBe(false)
  })
})

describe('the metadata', () => {
  it('carries archive_id and source trial, which is what founds the existing record', () => {
    const md = trialCheckoutMetadata({ archiveId: RECORD, billingPeriod: 'year', applicationId: null, referrerArchiveId: null })
    expect(md).toEqual({ archive_id: RECORD, source: TRIAL_CHECKOUT_SOURCE, segment: 'b2c', tier: 'b2c_active', billing_period: 'year' })
  })

  it('never writes the legacy key, which activates a paused record by another path', () => {
    const md = trialCheckoutMetadata({ archiveId: RECORD, billingPeriod: 'month', applicationId: 'app-1', referrerArchiveId: REFERRER })
    expect(Object.keys(md)).not.toContain('archiveId')
    expect(md.application_id).toBe('app-1')
    expect(md.founding_referral).toBe('half')
    expect(md.referrer_archive_id).toBe(REFERRER)
  })

  it('every value is a string, as Stripe requires', () => {
    const md = trialCheckoutMetadata({ archiveId: RECORD, billingPeriod: 'month', applicationId: 'app-1', referrerArchiveId: REFERRER })
    for (const v of Object.values(md)) expect(typeof v).toBe('string')
  })
})

describe('the figures the page prints', () => {
  // scripts/stripe-setup.ts creates the Stripe prices. If a figure printed on
  // the page disagrees with the amount that script creates, this fails.
  const setup = readFileSync(path.resolve(__dirname, '..', 'scripts', 'stripe-setup.ts'), 'utf8')
  const cents = (name: string): number => {
    const m = setup.match(new RegExp(`name:\\s*'${name}',\\s*unitAmount:\\s*(\\d+)`))
    expect(m, `${name} in scripts/stripe-setup.ts`).not.toBeNull()
    return Number(m![1])
  }

  it('match the amounts scripts/stripe-setup.ts creates', () => {
    expect(cents('b2c_founding')).toBe(FOUNDING_DOLLARS * 100)
    expect(cents('b2c_founding_referral')).toBe(REFERRAL_FOUNDING_DOLLARS * 100)
    expect(cents('b2c_active_year')).toBe(ACTIVE_YEAR_DOLLARS * 100)
    expect(cents('b2c_active_month')).toBe(ACTIVE_MONTH_DOLLARS * 100)
  })

  it('a referred owner is shown the half fee beside the list fee', () => {
    const l = offerLines(trialOffer(REFERRER))
    expect(l.founding).toContain('$1,250')
    expect(l.founding).toContain('$2,500')
    const plain = offerLines(trialOffer(null))
    expect(plain.founding).toBe('The Founding is $2,500, paid once.')
    expect(plain.plan).toBe('Your plan is $3,600 a year or $360 a month.')
  })

  it('prints no figure that is not one of the four prices', () => {
    const allowed = new Set(['2,500', '1,250', '3,600', '360'])
    for (const line of allTrialCheckoutCopy()) {
      for (const m of line.matchAll(/\$(\d[\d,]*\d|\d)/g)) expect(allowed.has(m[1]), line).toBe(true)
    }
  })
})

describe('copy rules', () => {
  it('no em dash, no exclamation point, no hyphenated word, no "archive", no banned word', () => {
    for (const line of allTrialCheckoutCopy()) {
      expect(line, line).not.toMatch(/—|–/)
      expect(line, line).not.toMatch(/!/)
      expect(line, line).not.toMatch(/[A-Za-z]-[A-Za-z]/)
      expect(line, line).not.toMatch(/archive/i)
      expect(line, line).not.toMatch(/curated|seamless|innovative|stewardship|unlock|supercharge/i)
      expect(line, line).not.toMatch(/can help you|makes it easier|this matters|in practice|meaningful|thoughtful/i)
    }
  })
})
