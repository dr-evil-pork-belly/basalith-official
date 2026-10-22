import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

// Source level guards on provisionOnFoundingFee and on the Stripe webhook, the
// way lib/inngest/trialFunctions.test.ts pins the trial crons: importing
// either module pulls a live Inngest or Stripe client.
//
// What they pin (slice C, October 9, 2026): a payment a trial owner made from
// their own page founds the record that exists and NEVER creates one. The
// behavior of the conversion itself is tested in
// lib/billing/convertTrial.test.ts; these guards make sure the two callers
// are still wired to it, in the right order.

const fn      = readFileSync(path.resolve(__dirname, 'billingFunctions.ts'), 'utf8')
const webhook = readFileSync(path.resolve(__dirname, '..', '..', 'app', 'api', 'stripe', 'webhook', 'route.ts'), 'utf8')

function provisionBlock(): string {
  const start = fn.indexOf('export const provisionOnFoundingFee = inngest.createFunction(')
  expect(start).toBeGreaterThan(-1)
  const next = fn.indexOf('export const ', start + 1)
  return fn.slice(start, next === -1 ? undefined : next)
}

describe('provisionOnFoundingFee', () => {
  const b = provisionBlock()

  it('reads the trial record id only from a subscription whose source is trial', () => {
    expect(b).toMatch(/trialArchiveId:\s*sub\.metadata\?\.source === TRIAL_CHECKOUT_SOURCE\s*\?\s*\(\(sub\.metadata\?\.archive_id as string\) \?\? null\)\s*:\s*null/)
  })

  it('takes the trial branch BEFORE any record can be created, and returns from it', () => {
    const branch = b.indexOf('if (meta.trialArchiveId) {')
    const create = b.indexOf('createArchiveWithCredentials(')
    expect(branch).toBeGreaterThan(-1)
    expect(create).toBeGreaterThan(branch)
    // The branch ends in a return, so control cannot fall through to create.
    const body = b.slice(branch, create)
    expect(body).toMatch(/convertTrialOnPayment\(/)
    expect(body).toMatch(/return \{ ok: true, archiveId: converted\.archiveId/)
    expect(body).toMatch(/if \(!converted\.ok\) \{\s*return \{ ok: false/)
  })

  it('keeps the idempotency gate ahead of both branches', () => {
    const gate   = b.indexOf('if (billing.founding_paid_at) {')
    const branch = b.indexOf('if (meta.trialArchiveId) {')
    expect(gate).toBeGreaterThan(-1)
    expect(gate).toBeLessThan(branch)
  })

  it('creates a record in exactly one place', () => {
    expect(b.match(/createArchiveWithCredentials\(/g)).toHaveLength(1)
  })

  it('records no referral credit for a payment flagged as a duplicate', () => {
    expect(b).toMatch(/if \(!converted\.duplicate\) \{\s*await recordReferralCredit\(/)
  })

  it('still runs the two closing steps under their original step ids', () => {
    expect(fn).toMatch(/run\('mark-application-won'/)
    expect(fn).toMatch(/run\('referral-credit'/)
  })
})

describe('the Stripe webhook', () => {
  it('founds a paid trial session inline, keyed on archive_id plus source, and only when paid', () => {
    expect(webhook).toMatch(/if \(md\.archive_id && md\.source === TRIAL_CHECKOUT_SOURCE && session\.payment_status === 'paid'\) \{/)
    expect(webhook).toMatch(/await markTrialFounded\(supabaseAdmin, trialArchiveId\)/)
  })

  it('does so before the application linkage, and does not return out of it', () => {
    const trial = webhook.indexOf("md.source === TRIAL_CHECKOUT_SOURCE")
    const app   = webhook.indexOf('if (md.application_id) {')
    expect(trial).toBeGreaterThan(-1)
    expect(trial).toBeLessThan(app)
    expect(webhook.slice(trial, app)).not.toMatch(/\n    return\b|\n  return\b/)
  })

  it('keeps the legacy archiveId branch distinct from archive_id', () => {
    expect(webhook).toMatch(/if \(md\.archiveId\) \{/)
    expect(webhook).toMatch(/activateArchiveById\(md\.archiveId\)/)
  })
})
