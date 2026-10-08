import { describe, it, expect } from 'vitest'
import { B2B_DOMAINS } from './b2bDomains'
import {
  ASSESSMENT_STATUS,
  CLOSED_REPORT_STATUSES,
  OPEN_REPORT_STATUSES,
  PURGE_DAYS,
  RELEASE_DAYS,
  areasCapturedFromRows,
  assessmentAreas,
  assessmentProgress,
  captureDone,
  isAssessment,
  nextArea,
  purgeAfter,
  readingsDue,
  releaseDueAt,
  releaseLapsed,
  type AreaCallRow,
} from './assessment'

const DOMAINS = B2B_DOMAINS.map(d => d.name)

function call(area: string, over: Partial<AreaCallRow> & { deposits?: number; scope?: string } = {}): AreaCallRow {
  const { deposits = 2, scope = 'business', ...rest } = over
  return {
    status: 'complete',
    state: {
      areaCall:     { area, scope },
      probeHistory: Array.from({ length: deposits }, (_, i) => ({ depositId: `dep-${area}-${i}` })),
    },
    ...rest,
  }
}

describe('assessment record', () => {
  it('is a status, and only that status', () => {
    expect(ASSESSMENT_STATUS).toBe('assessment')
    expect(isAssessment({ status: 'assessment' })).toBe(true)
    for (const s of ['active', 'trial', 'drill', 'paused', null, undefined]) {
      expect(isAssessment({ status: s })).toBe(false)
    }
  })

  it('covers the eight live business domains in order', () => {
    expect(assessmentAreas()).toEqual(DOMAINS)
    expect(assessmentAreas()).toHaveLength(8)
  })

  it('splits the six report statuses into open and closed with none left over', () => {
    expect([...OPEN_REPORT_STATUSES, ...CLOSED_REPORT_STATUSES].sort()).toEqual(
      ['capturing', 'not_completed', 'not_released', 'ordered', 'ready', 'released'],
    )
  })
})

describe('areas captured', () => {
  it('counts a complete business area call with a deposit, in domain order', () => {
    const rows = [call('Risk'), call('Decision-Making'), call('Capital')]
    expect(areasCapturedFromRows(rows)).toEqual(['Decision-Making', 'Risk', 'Capital'])
  })

  it('does not count an open or abandoned call, a call with no deposit, a personal call, or an unknown area', () => {
    const rows: AreaCallRow[] = [
      call('People', { status: 'open' }),
      call('Risk', { status: 'abandoned' }),
      call('Capital', { deposits: 0 }),
      call('Culture', { scope: 'personal' }),
      call('Money'),
      { status: 'complete', state: { probeHistory: [{ depositId: 'x' }] } },
      { status: 'complete', state: null },
      { status: 'complete' },
    ]
    expect(areasCapturedFromRows(rows)).toEqual([])
  })

  it('counts an area once however many calls it had, and a later good call rescues an empty one', () => {
    const rows = [call('Strategy', { deposits: 0 }), call('Strategy'), call('Strategy')]
    expect(areasCapturedFromRows(rows)).toEqual(['Strategy'])
  })

  it('ignores a probe history entry with no deposit id', () => {
    const row: AreaCallRow = { status: 'complete', state: { areaCall: { area: 'Risk', scope: 'business' }, probeHistory: [{ depositId: null }, {}] } }
    expect(areasCapturedFromRows([row])).toEqual([])
  })

  it('walks the areas in domain order and finishes at eight', () => {
    expect(nextArea([])).toBe(DOMAINS[0])
    expect(nextArea(['Decision-Making', 'Risk'])).toBe('People')
    expect(captureDone(DOMAINS.slice(0, 7))).toBe(false)
    expect(nextArea(DOMAINS.slice(0, 7))).toBe(DOMAINS[7])
    expect(captureDone(DOMAINS)).toBe(true)
    expect(nextArea(DOMAINS)).toBeNull()
  })
})

describe('readings due', () => {
  it('only while capturing, with all eight areas and the intake', () => {
    expect(readingsDue({ status: 'capturing', captured: DOMAINS, hasIntake: true })).toBe(true)
    expect(readingsDue({ status: 'capturing', captured: DOMAINS.slice(1), hasIntake: true })).toBe(false)
    expect(readingsDue({ status: 'capturing', captured: DOMAINS, hasIntake: false })).toBe(false)
  })

  it('never again once the report is ready or closed, so a late event spends nothing', () => {
    for (const status of ['ordered', 'ready', 'released', 'not_released', 'not_completed', null, undefined]) {
      expect(readingsDue({ status, captured: DOMAINS, hasIntake: true })).toBe(false)
    }
  })
})

describe('windows', () => {
  it('gives the founder fourteen days to release', () => {
    expect(RELEASE_DAYS).toBe(14)
    expect(releaseDueAt('2026-10-08T18:00:00.000Z')).toBe('2026-10-22T18:00:00.000Z')
    const built = '2026-10-08T18:00:00.000Z'
    expect(releaseLapsed(built, new Date('2026-10-22T17:59:59.000Z'))).toBe(false)
    expect(releaseLapsed(built, new Date('2026-10-22T18:00:00.000Z'))).toBe(true)
  })

  it('schedules the purge ninety days after the report closes', () => {
    expect(PURGE_DAYS).toBe(90)
    expect(purgeAfter('2026-10-22T18:00:00.000Z')).toBe('2027-01-20T18:00:00.000Z')
    expect(purgeAfter(new Date('2026-10-22T18:00:00.000Z'))).toBe('2027-01-20T18:00:00.000Z')
  })
})

describe('the founder\u2019s view', () => {
  it('lists all eight areas in order with what is captured, and the next one', () => {
    const p = assessmentProgress({ status: 'capturing', captured: ['Decision-Making', 'Risk'], hasIntake: false })
    expect(p.stage).toBe('capture')
    expect(p.areas.map(a => a.area)).toEqual(DOMAINS)
    expect(p.areas.filter(a => a.captured).map(a => a.area)).toEqual(['Decision-Making', 'Risk'])
    expect(p.areas[0].description).toBe(B2B_DOMAINS[0].description)
    expect(p.captured).toBe(2)
    expect(p.total).toBe(8)
    expect(p.next).toBe('People')
    expect(p.intakeIn).toBe(false)
  })

  it('stays on capture until both parts are in, then says reading', () => {
    expect(assessmentProgress({ status: 'capturing', captured: DOMAINS, hasIntake: false }).stage).toBe('capture')
    expect(assessmentProgress({ status: 'capturing', captured: DOMAINS.slice(1), hasIntake: true }).stage).toBe('capture')
    expect(assessmentProgress({ status: 'ordered', captured: [], hasIntake: false }).stage).toBe('capture')
    const done = assessmentProgress({ status: 'capturing', captured: DOMAINS, hasIntake: true })
    expect(done.stage).toBe('reading')
    expect(done.next).toBeNull()
  })

  it('follows the report status once the report exists, whatever the record holds', () => {
    for (const status of ['ready', 'released', 'not_released', 'not_completed'] as const) {
      expect(assessmentProgress({ status, captured: DOMAINS, hasIntake: true }).stage).toBe(status)
      expect(assessmentProgress({ status, captured: [], hasIntake: false }).stage).toBe(status)
    }
  })
})
