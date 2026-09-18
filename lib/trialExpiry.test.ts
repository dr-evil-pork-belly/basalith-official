import { describe, it, expect } from 'vitest'
import {
  DELETE_ORDER,
  WARN_DAYS_BEFORE,
  canDeleteAuthUser,
  emailDomain,
  firstExpiryRunAfter,
  formatPacificDate,
  selectTrialsToExpire,
  selectTrialsToWarn,
  warnWindow,
  type TrialRow,
} from './trialExpiry'

const NOW = new Date('2026-10-11T15:00:00.000Z')
const DAY = 24 * 60 * 60 * 1000
const at = (days: number, ms = 0) => new Date(NOW.getTime() + days * DAY + ms).toISOString()

function row(over: Partial<TrialRow> & { id: string }): TrialRow {
  return {
    name: 'Test Archive',
    owner_email: 'person@example.com',
    owner_name: 'Person',
    status: 'trial',
    trial_expires_at: at(7),
    trial_warned_at: null,
    scheduled_deletion_at: null,
    preferred_language: 'en',
    ...over,
  }
}

describe('warnWindow', () => {
  it('is [now + 6 days, now + 8 days) around WARN_DAYS_BEFORE = 7', () => {
    expect(WARN_DAYS_BEFORE).toBe(7)
    const w = warnWindow(NOW)
    expect(w.from).toBe('2026-10-17T15:00:00.000Z')
    expect(w.to).toBe('2026-10-19T15:00:00.000Z')
  })
})

describe('selectTrialsToWarn', () => {
  it('takes a trial expiring inside the window, inclusive at from, exclusive at to', () => {
    const rows = [
      row({ id: 'at-from',     trial_expires_at: at(6) }),
      row({ id: 'mid',         trial_expires_at: at(7) }),
      row({ id: 'just-before', trial_expires_at: at(8, -1) }),
      row({ id: 'at-to',       trial_expires_at: at(8) }),
      row({ id: 'too-soon',    trial_expires_at: at(6, -1) }),
      row({ id: 'too-late',    trial_expires_at: at(9) }),
    ]
    expect(selectTrialsToWarn(rows, NOW).map(r => r.id)).toEqual(['at-from', 'mid', 'just-before'])
  })

  it('skips a trial already warned, one on the terminated path, and a non-trial', () => {
    const rows = [
      row({ id: 'warned',     trial_warned_at: at(-1) }),
      row({ id: 'terminated', scheduled_deletion_at: at(300) }),
      row({ id: 'converted',  status: 'active' }),
      row({ id: 'no-expiry',  trial_expires_at: null }),
      row({ id: 'due' }),
    ]
    expect(selectTrialsToWarn(rows, NOW).map(r => r.id)).toEqual(['due'])
  })
})

describe('selectTrialsToExpire', () => {
  it('takes an expired trial and leaves one still running', () => {
    const rows = [
      row({ id: 'expired',    trial_expires_at: at(0, -1) }),
      row({ id: 'expiring',   trial_expires_at: at(0) }),      // not strictly before now
      row({ id: 'running',    trial_expires_at: at(3) }),
      row({ id: 'no-expiry',  trial_expires_at: null }),
    ]
    expect(selectTrialsToExpire(rows, NOW).map(r => r.id)).toEqual(['expired'])
  })

  it('never selects a converted trial (status active) even when expired', () => {
    const rows = [row({ id: 'converted', status: 'active', trial_expires_at: at(-5) })]
    expect(selectTrialsToExpire(rows, NOW)).toEqual([])
  })

  it('never selects an archive the owner terminated by hand (scheduled_deletion_at set)', () => {
    const rows = [row({ id: 'terminated', trial_expires_at: at(-5), scheduled_deletion_at: at(360) })]
    expect(selectTrialsToExpire(rows, NOW)).toEqual([])
  })

  it('never selects an archive whose status is not trial', () => {
    const rows = [
      row({ id: 'drill',  status: 'drill',  trial_expires_at: at(-5) }),
      row({ id: 'paused', status: 'paused', trial_expires_at: at(-5) }),
      row({ id: 'null',   status: null,     trial_expires_at: at(-5) }),
    ]
    expect(selectTrialsToExpire(rows, NOW)).toEqual([])
  })
})

describe('canDeleteAuthUser', () => {
  const zero = { ownedArchives: 0, contributorRows: 0, successorRows: 0, archivistRows: 0 }

  it('is true only when every count is zero', () => {
    expect(canDeleteAuthUser(zero)).toBe(true)
  })

  it('keeps the user on any other ownership or role, each way', () => {
    expect(canDeleteAuthUser({ ...zero, ownedArchives: 1 })).toBe(false)
    expect(canDeleteAuthUser({ ...zero, contributorRows: 1 })).toBe(false)
    expect(canDeleteAuthUser({ ...zero, successorRows: 1 })).toBe(false)
    expect(canDeleteAuthUser({ ...zero, archivistRows: 1 })).toBe(false)
  })
})

describe('DELETE_ORDER', () => {
  it('is the documented order and nothing else', () => {
    expect([...DELETE_ORDER]).toEqual([
      'mark_terminated',
      'purge_storage',
      'assert_no_b2',
      'delete_email_replies',
      'delete_application',
      'delete_archive',
      'maybe_delete_user',
      'notify',
    ])
  })
})

describe('emailDomain', () => {
  it('returns the domain only', () => {
    expect(emailDomain('person@example.com')).toBe('example.com')
    expect(emailDomain(null)).toBe('(no email)')
    expect(emailDomain('nonsense')).toBe('(malformed)')
  })
})

describe('firstExpiryRunAfter', () => {
  it('is the 16:00 UTC run on the same day when the expiry is before it, else the next day', () => {
    expect(firstExpiryRunAfter(new Date('2026-10-18T03:31:00Z')).toISOString()).toBe('2026-10-18T16:00:00.000Z')
    expect(firstExpiryRunAfter(new Date('2026-10-18T16:00:00Z')).toISOString()).toBe('2026-10-18T16:00:00.000Z')
    expect(firstExpiryRunAfter(new Date('2026-10-18T16:00:01Z')).toISOString()).toBe('2026-10-19T16:00:00.000Z')
  })

  it('formats in Pacific, long form', () => {
    expect(formatPacificDate(new Date('2026-10-18T16:00:00Z'))).toBe('Sunday, October 18, 2026')
  })
})
