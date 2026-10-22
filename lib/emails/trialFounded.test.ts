import { describe, it, expect } from 'vitest'
import { TRIAL_FOUNDED_SUBJECT, allTrialFoundedCopy, buildTrialFoundedEmail, trialFoundedLines, type TrialFoundedInput } from './trialFounded'

const base: TrialFoundedInput = { familyName: 'Chen', ownerName: 'Margaret Chen', deposits: 12, callsCompleted: 1, nextCall: 2 }
const all = (e: { subject: string; html: string; text: string }) => `${e.subject}\n${e.html}\n${e.text}`

describe('trial founded email', () => {
  it('says the payment went through and that what was said is still there', () => {
    const e = buildTrialFoundedEmail(base)
    expect(e.subject).toBe(TRIAL_FOUNDED_SUBJECT)
    expect(e.text).toContain('Your payment went through.')
    expect(e.text).toContain('everything you have said so far is in it')
    expect(e.text).toContain('Your Basalith is founded, Margaret.')
  })

  it('states the counts it was given and nothing else', () => {
    const e = buildTrialFoundedEmail(base)
    expect(e.text).toContain('It holds 12 deposits, in your own words, from 1 of the three founding calls.')
    const one = buildTrialFoundedEmail({ ...base, deposits: 1, callsCompleted: 0, nextCall: 1 })
    expect(one.text).toContain('It holds 1 deposit, in your own words.')
    expect(one.text).not.toMatch(/of the three/)
  })

  it('says nothing about what it holds when the record is empty', () => {
    const e = buildTrialFoundedEmail({ ...base, deposits: 0, callsCompleted: 0, nextCall: 1 })
    expect(trialFoundedLines({ ...base, deposits: 0, callsCompleted: 0, nextCall: 1 }).holds).toBeNull()
    expect(e.text).not.toMatch(/It holds/)
  })

  it('points at the next call, or at the dashboard when all three are done', () => {
    const mid = buildTrialFoundedEmail(base)
    expect(mid.text).toContain('Call 2 is ready when you are.')
    expect(mid.text).toContain('https://basalith.ai/archive/founding')
    const done = buildTrialFoundedEmail({ ...base, deposits: 41, callsCompleted: 3, nextCall: null })
    expect(done.text).toContain('All three founding calls are on the record.')
    expect(done.text).toContain('https://basalith.ai/archive/dashboard')
    expect(done.text).not.toMatch(/Call \d is ready/)
  })

  it('carries no password, no Guide, no "complete", and no one time link', () => {
    for (const input of [base, { ...base, nextCall: null as null, callsCompleted: 3 }]) {
      const e = buildTrialFoundedEmail(input)
      expect(all(e)).not.toMatch(/password/i)
      expect(all(e)).not.toMatch(/guide/i)
      expect(all(e)).not.toMatch(/complete/i)
      expect(all(e)).not.toMatch(/token=|type=magiclink/)
    }
  })

  it('escapes a name that came from a form', () => {
    const e = buildTrialFoundedEmail({ ...base, ownerName: '<b>x</b> Chen', familyName: 'A&B' })
    expect(e.html).not.toContain('<b>x</b>')
    expect(e.html).toContain('&lt;b&gt;x&lt;/b&gt;')
    expect(e.html).toContain('A&amp;B')
  })

  it('follows the copy rules', () => {
    for (const line of allTrialFoundedCopy()) {
      const words = line.replace(/https?:\/\/\S+/g, '')
      expect(line, line).not.toMatch(/—|–/)
      expect(line, line).not.toMatch(/!/)
      expect(words, line).not.toMatch(/[A-Za-z]-[A-Za-z]/)
      expect(words, line).not.toMatch(/archive/i)
      expect(line, line).not.toMatch(/curated|seamless|innovative|stewardship|unlock|supercharge/i)
      expect(line, line).not.toMatch(/can help you|makes it easier|this matters|in practice|meaningful|thoughtful|what comes next/i)
    }
  })
})
