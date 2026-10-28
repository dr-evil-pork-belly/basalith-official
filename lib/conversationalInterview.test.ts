import { describe, it, expect } from 'vitest'
import { appendLog, armFor, callQualifies, enabledFor, LOG_CAP, writeFollowUp, type FollowUpDeps, type InterviewLogEntry } from './conversationalInterview'
import { isAssentOnly } from './assent'
import { aimFor, interviewerSystem, interviewerUser, parseDraft } from './interviewer'
import type { InterviewerDraft } from './interviewer'
import type { JudgeVerdict } from './interviewGuard'

const ID_EVEN = '6c0722d3-0000-4000-8000-000000000000' // last hex 0
const ID_ODD  = '6c0722d3-0000-4000-8000-000000000001' // last hex 1

describe('who gets the interviewer', () => {
  it('is off unless the record is named', () => {
    expect(enabledFor(ID_EVEN, {})).toBe(false)
    expect(enabledFor(ID_EVEN, { CONVERSATIONAL_INTERVIEW: 'off' })).toBe(false)
    expect(enabledFor(ID_EVEN, { CONVERSATIONAL_INTERVIEW: 'on' })).toBe(false)
    expect(enabledFor(ID_EVEN, { CONVERSATIONAL_INTERVIEW: `x, ${ID_EVEN.toUpperCase()}` })).toBe(true)
  })

  it('runs only on an English area call', () => {
    const env = { CONVERSATIONAL_INTERVIEW: ID_EVEN }
    expect(callQualifies({ archiveId: ID_EVEN, isAreaCall: true, language: null }, env)).toBe(true)
    expect(callQualifies({ archiveId: ID_EVEN, isAreaCall: true, language: 'en' }, env)).toBe(true)
    expect(callQualifies({ archiveId: ID_EVEN, isAreaCall: false, language: 'en' }, env)).toBe(false)
    expect(callQualifies({ archiveId: ID_EVEN, isAreaCall: true, language: 'yue' }, env)).toBe(false)
  })

  // October 28, 2026. docs/GENERIC_QUESTIONS_SLICE_1_2026-10-28.md.
  it('takes all for every record, and nothing looser', () => {
    expect(enabledFor(ID_EVEN, { CONVERSATIONAL_INTERVIEW: 'all' })).toBe(true)
    expect(enabledFor(ID_ODD, { CONVERSATIONAL_INTERVIEW: ' ALL ' })).toBe(true)
    expect(enabledFor(ID_EVEN, { CONVERSATIONAL_INTERVIEW: 'on' })).toBe(false)
    expect(enabledFor(ID_EVEN, { CONVERSATIONAL_INTERVIEW: 'true' })).toBe(false)
    expect(enabledFor(ID_EVEN, { CONVERSATIONAL_INTERVIEW: 'all,' })).toBe(false)
  })

  it('takes a founding call only with its own flag on', () => {
    const named = { CONVERSATIONAL_INTERVIEW: ID_EVEN }
    const founding = { archiveId: ID_EVEN, isAreaCall: false, isFoundingCall: true, language: 'en' }
    expect(callQualifies(founding, named)).toBe(false)
    expect(callQualifies(founding, { ...named, CONVERSATIONAL_INTERVIEW_FOUNDING: 'on' })).toBe(true)
    expect(callQualifies(founding, { ...named, CONVERSATIONAL_INTERVIEW_FOUNDING: 'yes' })).toBe(false)
    // The founding flag alone switches nobody on.
    expect(callQualifies(founding, { CONVERSATIONAL_INTERVIEW_FOUNDING: 'on' })).toBe(false)
    // Still English only.
    expect(callQualifies({ ...founding, language: 'vi' }, { ...named, CONVERSATIONAL_INTERVIEW_FOUNDING: 'on' })).toBe(false)
    // Area calls do not need the founding flag.
    expect(callQualifies({ archiveId: ID_EVEN, isAreaCall: true, language: 'en' }, named)).toBe(true)
  })
})

describe('the arm', () => {
  it('alternates per record, and the start depends on the record', () => {
    expect([0, 1, 2, 3].map(n => armFor(ID_EVEN, n, {}))).toEqual(['interviewer', 'spine', 'interviewer', 'spine'])
    expect([0, 1, 2, 3].map(n => armFor(ID_ODD, n, {}))).toEqual(['spine', 'interviewer', 'spine', 'interviewer'])
  })
  it('can be forced for a manual run', () => {
    expect(armFor(ID_ODD, 0, { CONVERSATIONAL_INTERVIEW_ARM: 'interviewer' })).toBe('interviewer')
    expect(armFor(ID_EVEN, 0, { CONVERSATIONAL_INTERVIEW_ARM: 'spine' })).toBe('spine')
  })
})

const turns = [
  { question: 'Tell me about a time someone crossed a line.', answer: 'My site manager Marcus was skimming on a job in Riverside.' },
  { question: 'What happened, in order?', answer: 'The supplier said he had been paid in cash twice. Nobody pays cash on my jobs.' },
]
const base = {
  probeType: 'BASIS' as const,
  lens: 'succession' as const,
  turns,
  reprobe: false,
  level: 'branch' as const,
  newDecisionPoint: false,
  spineText: 'Why that one over the next best option?',
  said: turns.map(t => t.answer),
}

function deps(drafts: (InterviewerDraft | null)[], verdicts: JudgeVerdict[] = []): FollowUpDeps & { draftCalls: number; judgeCalls: number; reasons: (string[] | undefined)[] } {
  let clock = 0
  const d = {
    draftCalls: 0,
    judgeCalls: 0,
    reasons: [] as (string[] | undefined)[],
    draft: async (input: { retryReasons?: string[] }) => { d.reasons.push(input.retryReasons); return drafts[d.draftCalls++] ?? null },
    judge: async () => verdicts[d.judgeCalls++] ?? { pass: false, reason: 'none left' },
    now: () => (clock += 10),
  }
  return d as unknown as FollowUpDeps & { draftCalls: number; judgeCalls: number; reasons: (string[] | undefined)[] }
}

describe('writeFollowUp', () => {
  it('serves a draft that passes both checks', async () => {
    const d = deps([{ question: 'You said "Nobody pays cash on my jobs." Where did that rule come from?', aim: 'origin of the rule' }], [{ pass: true, reason: 'ok' }])
    const out = await writeFollowUp(base, d)
    expect(out.source).toBe('interviewer')
    expect(out.text).toContain('Where did that rule come from?')
    expect(out.aim).toBe('origin of the rule')
    expect(out.attempts).toHaveLength(1)
  })

  it('rewrites once with the reasons when the guard fails, and does not call the judge on a guard failure', async () => {
    const d = deps(
      [{ question: 'So it was the cash or the trust?', aim: '' }, { question: 'What did you do the morning after the supplier called?', aim: 'action' }],
      [{ pass: true, reason: 'ok' }],
    )
    const out = await writeFollowUp(base, d)
    expect(out.source).toBe('interviewer')
    expect(d.judgeCalls).toBe(1)
    expect(d.reasons[1]).toEqual(expect.arrayContaining(['either_or', 'summary']))
  })

  it('serves the spine after two failures', async () => {
    const d = deps(
      [{ question: 'Why did trust matter most?', aim: '' }, { question: 'Why did trust matter most to you?', aim: '' }],
      [{ pass: false, reason: 'A presupposes trust mattered most' }, { pass: false, reason: 'A again' }],
    )
    const out = await writeFollowUp(base, d)
    expect(out.source).toBe('spine')
    expect(out.text).toBe(base.spineText)
    expect(out.attempts.map(a => a.fails)).toEqual([['judge'], ['judge']])
    expect(d.reasons[1]).toEqual(['judge: A presupposes trust mattered most'])
  })

  it('serves the spine when the model fails', async () => {
    const out = await writeFollowUp(base, deps([null, null]))
    expect(out.source).toBe('spine')
    expect(out.attempts.map(a => a.fails)).toEqual([['draft_error'], ['draft_error']])
  })

  it('never writes SEED or TIMELINE', async () => {
    const d = deps([{ question: 'x?', aim: '' }])
    expect((await writeFollowUp({ ...base, probeType: 'TIMELINE' }, d)).source).toBe('spine')
    expect((await writeFollowUp({ ...base, probeType: 'SEED' }, d)).source).toBe('spine')
    expect(d.draftCalls).toBe(0)
  })
})

describe('the log', () => {
  it('keeps the newest entries up to the cap', () => {
    let log: InterviewLogEntry[] | undefined
    for (let i = 0; i < LOG_CAP + 5; i++) {
      log = appendLog(log, { at: String(i), probeType: 'CUE', arm: 'spine', source: 'spine', msModel: 0, msTotal: 0, aim: null, attempts: [] })
    }
    expect(log).toHaveLength(LOG_CAP)
    expect(log![0].at).toBe('5')
  })
})

describe('the interviewer prompt', () => {
  it('carries no example question and no word the record forbids', () => {
    for (const lens of ['personal', 'succession', 'acquisition', 'church'] as const) {
      const sys = interviewerSystem(lens)
      expect(sys).not.toMatch(/\bfor example\b|\be\.g\.|\bsuch as\b/i)
      expect(sys).not.toMatch(/\barchive\b/i)
      expect(sys).not.toMatch(/[\u2014\u2015]/)
    }
    expect(interviewerSystem('church')).toMatch(/Never use a person's name/)
  })

  it('fills the reader by lens and switches to the rule aim', () => {
    expect(aimFor('ERROR', 'acquisition', 'branch')).toContain('a new owner in the first ninety days')
    expect(aimFor('ERROR', 'church', 'rule')).toContain('Across everything said')
    expect(aimFor('CUE', 'personal', 'rule')).toBe(aimFor('CUE', 'personal', 'branch'))
  })

  it('marks a thin answer, a new decision, and a rejected draft', () => {
    const u = interviewerUser({ ...base, reprobe: true, newDecisionPoint: true, decisionLabel: 'fired the manager', retryReasons: ['either_or'] })
    expect(u).toContain('<thin>')
    expect(u).toContain('<new_decision>')
    expect(u).toContain('<decision_label>fired the manager</decision_label>')
    expect(u).toContain('either_or')
  })

  it('reads a draft and refuses an empty one', () => {
    expect(parseDraft('{"question":" Why  then? ","aim":"timing"}')).toEqual({ question: 'Why then?', aim: 'timing' })
    expect(parseDraft('{"question":""}')).toBeNull()
    expect(parseDraft('no json')).toBeNull()
  })
})

describe('isAssentOnly', () => {
  it('catches short agreement', () => {
    for (const a of ['Yes.', 'Yeah, exactly.', "That's right", 'Basically, yes', 'Pretty much', 'I agree', 'Right.']) {
      expect(isAssentOnly(a), a).toBe(true)
    }
  })
  it('leaves anything with content alone', () => {
    for (const a of ['Yes, because the supplier called me first.', 'No.', 'Right after the audit we cut him loose', 'Marcus', '']) {
      expect(isAssentOnly(a), a).toBe(false)
    }
  })
})
