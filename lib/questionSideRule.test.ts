import { describe, it, expect, afterEach } from 'vitest'
import { buildEntitySystemPrompt, formatFingerprintSection, EMPTY_CONTEXT } from './entitySystemPrompt'
import { auditorSystem } from './verifyGrounding'
import { AUDITOR_QUESTION_SIDE, entityQuestionSide, questionSideRuleOn } from './questionSideRule'

const base = {
  ownerName:          'Margaret Chen',
  archiveName:        'The Meridian Archive',
  fingerprintSection: formatFingerprintSection([{ prompt: 'Q', completion: 'A' }]),
  contextSection:     EMPTY_CONTEXT,
}

const saved = process.env.QUESTION_SIDE_RULE
afterEach(() => {
  if (saved === undefined) delete process.env.QUESTION_SIDE_RULE
  else process.env.QUESTION_SIDE_RULE = saved
})

describe('question side rule', () => {
  it('is off unless set to on', () => {
    expect(questionSideRuleOn({})).toBe(false)
    expect(questionSideRuleOn({ QUESTION_SIDE_RULE: 'off' })).toBe(false)
    expect(questionSideRuleOn({ QUESTION_SIDE_RULE: ' ON ' })).toBe(true)
  })

  it('leaves both prompts exactly as they were when off', () => {
    delete process.env.QUESTION_SIDE_RULE
    const off = buildEntitySystemPrompt(base)
    expect(off).not.toContain('Only the A lines')
    expect(off).toContain('This does not change):\n\nQ: Q\nA: A')
    expect(auditorSystem({})).not.toContain(AUDITOR_QUESTION_SIDE)
  })

  it('adds one paragraph to each when on, and the personal scope still builds', () => {
    process.env.QUESTION_SIDE_RULE = 'on'
    const on = buildEntitySystemPrompt(base)
    expect(on).toContain(`This does not change):\n\n${entityQuestionSide('Margaret Chen')}\n\nQ: Q\nA: A`)
    const personal = buildEntitySystemPrompt({ ...base, scope: 'personal' })
    expect(personal).toContain('Only the A lines are Margaret Chen\'s own words.')
    expect(personal).not.toMatch(/\bsuccessor\b|\bhandover\b/i)
    expect(auditorSystem({ QUESTION_SIDE_RULE: 'on' }).endsWith(AUDITOR_QUESTION_SIDE)).toBe(true)
  })
})
