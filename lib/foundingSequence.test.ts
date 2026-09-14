import { describe, it, expect } from 'vitest'
import {
  FOUNDING_SEEDS,
  allFoundingCopy,
  foundingStatusFromRows,
  phaseLabel,
  scopeForTier,
  seedFor,
  type FoundingRow,
} from './foundingSequence'
import { initialIncidentState, type IncidentState } from './incidentSession'

function row(
  id: string,
  status: FoundingRow['status'],
  founding: IncidentState['founding'] | undefined,
  opts: { deposits?: number; turns?: number; pending?: string; pendingType?: IncidentState['pendingProbeType'] } = {},
): FoundingRow {
  const state = initialIncidentState()
  const turns = opts.turns ?? opts.deposits ?? 0
  for (let i = 0; i < turns; i++) {
    state.probeHistory.push({
      branchIndex: -1,
      probeType: 'SEED',
      question: '',
      answer: 'a',
      depositId: i < (opts.deposits ?? turns) ? `d${i}` : null,
    })
  }
  if (founding) state.founding = founding
  if (opts.pending) state.pendingQuestion = opts.pending
  if (opts.pendingType) state.pendingProbeType = opts.pendingType
  return { id, status, phase: status === 'complete' ? 'COMPLETE' : 'SEED', state, created_at: `2026-09-14T00:00:0${id.length}Z` }
}

describe('founding seeds', () => {
  it('has exactly three calls per scope, numbered 1 to 3', () => {
    for (const scope of ['personal', 'business'] as const) {
      expect(FOUNDING_SEEDS[scope].map(s => s.call)).toEqual([1, 2, 3])
      for (const c of [1, 2, 3] as const) expect(seedFor(scope, c).question.length).toBeGreaterThan(20)
    }
  })

  it('maps tier to scope', () => {
    expect(scopeForTier('succession')).toBe('business')
    expect(scopeForTier('active')).toBe('personal')
    expect(scopeForTier(null)).toBe('personal')
    expect(scopeForTier(undefined)).toBe('personal')
  })

  it('obeys the copy rules: no em dashes, no exclamation points, no banned words, no AI language', () => {
    const banned = /\b(curated|seamless|innovative|stewardship|unlock|supercharge|game-changer|AI)\b/i
    for (const s of allFoundingCopy()) {
      expect(s, s).not.toMatch(/[\u2014\u2015]/)
      expect(s, s).not.toMatch(/!/)
      expect(s, s).not.toMatch(banned)
    }
  })

  it('labels every probe type and falls back for unknown', () => {
    expect(phaseLabel('SEED')).toBe('The call')
    expect(phaseLabel('READ')).toBe('The people')
    expect(phaseLabel(null)).toBe('The call')
  })
})

describe('foundingStatusFromRows', () => {
  it('starts empty: nothing done, call 1 next, nothing current', () => {
    const s = foundingStatusFromRows([], 'personal')
    expect(s.completed).toBe(0)
    expect(s.done).toBe(false)
    expect(s.nextCall).toBe(1)
    expect(s.current).toBeNull()
    expect(s.calls.map(c => c.state)).toEqual(['upcoming', 'upcoming', 'upcoming'])
  })

  it('counts a complete founding incident as done and advances nextCall', () => {
    const rows = [row('a', 'complete', { call: 1, scope: 'personal', startedAt: 'x' }, { deposits: 7, turns: 9 })]
    const s = foundingStatusFromRows(rows, 'personal')
    expect(s.completed).toBe(1)
    expect(s.nextCall).toBe(2)
    expect(s.calls[0]).toMatchObject({ state: 'done', deposits: 7, turns: 9 })
  })

  it('reports the open founding incident as current with its pending probe', () => {
    const rows = [
      row('a', 'complete', { call: 1, scope: 'personal', startedAt: 'x' }, { deposits: 5 }),
      row('bb', 'open', { call: 2, scope: 'personal', startedAt: 'x' }, { deposits: 2, turns: 3, pending: 'What finally tipped it?', pendingType: 'BASIS' }),
    ]
    const s = foundingStatusFromRows(rows, 'personal')
    expect(s.nextCall).toBe(2)
    expect(s.calls[1].state).toBe('current')
    expect(s.current).toMatchObject({ incidentId: 'bb', isFounding: true, call: 2, question: 'What finally tipped it?', label: 'What tipped it', turns: 3, deposits: 2 })
  })

  it('reports an open non-founding incident as current but not founding', () => {
    const rows = [row('zzz', 'open', undefined, { turns: 1, pending: 'Walk me through it.', pendingType: 'TIMELINE' })]
    const s = foundingStatusFromRows(rows, 'business')
    expect(s.current).toMatchObject({ incidentId: 'zzz', isFounding: false, call: null, label: 'In order' })
    expect(s.nextCall).toBe(1)
    expect(s.calls[0].state).toBe('upcoming')
  })

  it('ignores abandoned founding incidents so the call can be started again', () => {
    const rows = [row('a', 'abandoned', { call: 1, scope: 'personal', startedAt: 'x' }, { deposits: 1 })]
    const s = foundingStatusFromRows(rows, 'personal')
    expect(s.calls[0].state).toBe('upcoming')
    expect(s.nextCall).toBe(1)
  })

  it('is done after three complete founding calls', () => {
    const rows = ([1, 2, 3] as const).map(c => row(`r${c}`, 'complete', { call: c, scope: 'business', startedAt: 'x' }, { deposits: 4 }))
    const s = foundingStatusFromRows(rows, 'business')
    expect(s.done).toBe(true)
    expect(s.completed).toBe(3)
    expect(s.nextCall).toBeNull()
  })
})
