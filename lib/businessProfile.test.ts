import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  PROFILE_QUESTIONS,
  isBusinessRecord,
  ownerOpenersOn,
  profileApplies,
  profileFromRows,
  profileNext,
} from './businessProfile'

// October 28, 2026. docs/GENERIC_QUESTIONS_SLICE_2_2026-10-28.md.

const ID = '6c0722d3-0000-4000-8000-000000000000'
const ON = { OWNER_OPENERS: 'on', CONVERSATIONAL_INTERVIEW: ID }

describe('who is asked for a business profile', () => {
  it('needs both switches, a business record, and English', () => {
    const succession = { id: ID, tier: 'succession', status: 'active', preferred_language: 'en' }
    expect(profileApplies(succession, ON)).toBe(true)
    expect(profileApplies(succession, { CONVERSATIONAL_INTERVIEW: ID })).toBe(false)
    expect(profileApplies(succession, { OWNER_OPENERS: 'on' })).toBe(false)
    expect(profileApplies(succession, { OWNER_OPENERS: 'on', CONVERSATIONAL_INTERVIEW: 'all' })).toBe(true)
    expect(profileApplies({ ...succession, preferred_language: 'zh' }, ON)).toBe(false)
    expect(profileApplies({ ...succession, preferred_language: null }, ON)).toBe(true)
  })

  it('is a succession record or an assessment, never a personal one', () => {
    expect(isBusinessRecord({ tier: 'succession', status: 'active' })).toBe(true)
    expect(isBusinessRecord({ tier: 'succession', status: 'assessment' })).toBe(true)
    expect(isBusinessRecord({ tier: 'archive', status: 'trial' })).toBe(false)
    expect(isBusinessRecord({ tier: 'archive', status: 'active' })).toBe(false)
    expect(profileApplies({ id: ID, tier: 'archive', status: 'trial', preferred_language: 'en' }, ON)).toBe(false)
  })

  it('takes on, and nothing looser', () => {
    expect(ownerOpenersOn({ OWNER_OPENERS: ' ON ' })).toBe(true)
    expect(ownerOpenersOn({ OWNER_OPENERS: 'true' })).toBe(false)
    expect(ownerOpenersOn({})).toBe(false)
  })

  it('sends an assessment owner to his assessment and everyone else to the dashboard', () => {
    expect(profileNext({ status: 'assessment' })).toBe('/archive/assessment')
    expect(profileNext({ status: 'active' })).toBe('/archive/dashboard')
  })
})

describe('reading the profile from the record', () => {
  const [business, decisions] = PROFILE_QUESTIONS.map(q => q.question)

  it('is null until both are answered', () => {
    expect(profileFromRows([])).toBeNull()
    expect(profileFromRows([{ prompt: business, response: 'We sell used trucks to contractors in the valley.', created_at: '2026-10-28T10:00:00Z' }])).toBeNull()
  })

  it('takes the newest answer to each question and ignores every other deposit', () => {
    const p = profileFromRows([
      { prompt: business,  response: 'Old answer about the business.',                created_at: '2026-10-01T10:00:00Z' },
      { prompt: business,  response: 'We sell used trucks to contractors in the valley.', created_at: '2026-10-28T10:00:00Z' },
      { prompt: decisions, response: 'Pricing in spring, hiring in fall, inventory buys.', created_at: '2026-10-28T10:00:00Z' },
      { prompt: 'Something else entirely?', response: 'Not a profile answer.',           created_at: '2026-10-29T10:00:00Z' },
      { prompt: decisions, response: '   ',                                                created_at: '2026-10-30T10:00:00Z' },
    ])
    expect(p).toEqual({
      business:  'We sell used trucks to contractors in the valley.',
      decisions: 'Pricing in spring, hiring in fall, inventory buys.',
    })
  })
})

describe('the questions stay neutral on who decides', () => {
  // October 28, 2026 review: an assessment owner sees these, and the
  // acquisition lens never presumes the owner makes the decisions.
  it('never say the owner makes them', () => {
    for (const q of PROFILE_QUESTIONS) {
      expect(`${q.question} ${q.hint}`).not.toMatch(/\byou (make|decide|set|run|own)\b/i)
    }
  })
})

describe('the questions are copy', () => {
  it('carry no em dash, hyphenated word, or exclamation point', () => {
    for (const q of PROFILE_QUESTIONS) {
      for (const s of [q.question, q.hint]) {
        expect(s).not.toMatch(/[\u2014\u2013]/)
        expect(s).not.toMatch(/[A-Za-z]-[A-Za-z]/)
        expect(s).not.toMatch(/!/)
      }
    }
  })
})

describe('the pages that send an owner to the profile', () => {
  const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')
  for (const p of ['app/archive/dashboard/page.tsx', 'app/archive/assessment/page.tsx', 'app/archive/founding/page.tsx']) {
    it(`${p} asks needsBusinessProfile and selects what it reads`, () => {
      const src = read(p)
      expect(src).toContain("needsBusinessProfile(")
      expect(src).toContain("redirect('/archive/business')")
      expect(src).toMatch(/select\('[^']*\bid\b[^']*\btier\b[^']*\bstatus\b[^']*\bpreferred_language\b[^']*'\)|select\('[^']*\bid\b[^']*\btier\b[^']*\bstatus\b[^']*preferred_language'\)/)
    })
  }
})
