import { describe, it, expect } from 'vitest'
import { TRIAL_WARNING_SUBJECT, allTrialWarningCopy, buildTrialWarningEmail, trialWarningLines } from './trialWarning'

const INPUT = { archiveName: 'Ha Archive', ownerName: 'David Ha', deposits: 12, expiresAt: new Date('2026-10-18T03:31:00Z') }

describe('the trial warning email', () => {
  it('carries the approved subject and body, with the date the job actually runs, in Pacific', () => {
    const l = trialWarningLines(INPUT)
    expect(TRIAL_WARNING_SUBJECT).toBe('Seven days left on your first call.')
    // Expires 03:31 UTC October 18; the 16:00 UTC run that day deletes it,
    // which is Sunday, October 18 in Pacific time.
    expect(l.body).toBe('Your Basalith holds 12 deposits from your first call. It is deleted on Sunday, October 18, 2026 unless you keep it.')
    expect(l.keep).toBe('Reply to this email and we will keep it open while you decide.')
    expect(l.exportUrl).toBe('https://basalith.ai/archive/preferences')
  })

  it('singular deposit, and a greeting without a name', () => {
    const l = trialWarningLines({ ...INPUT, deposits: 1, ownerName: null })
    expect(l.body).toContain('holds 1 deposit from')
    expect(l.greeting).toBe('Hello,')
  })

  it('text and html both carry every line', () => {
    const e = buildTrialWarningEmail(INPUT)
    const l = trialWarningLines(INPUT)
    for (const s of [l.body, l.keep, l.export, l.exportUrl]) {
      expect(e.text).toContain(s)
      expect(e.html).toContain(s)
    }
    expect(e.subject).toBe(TRIAL_WARNING_SUBJECT)
  })

  it('obeys the copy rules', () => {
    const banned = /\b(curated|seamless|innovative|stewardship|unlock|supercharge|game-changer|AI)\b/i
    for (const s of allTrialWarningCopy()) {
      expect(s, s).not.toMatch(/[—―]/)
      expect(s, s).not.toMatch(/!/)
      expect(s, s).not.toMatch(banned)
    }
  })
})
