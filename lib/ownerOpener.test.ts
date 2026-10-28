import { describe, it, expect } from 'vitest'
import {
  OPENER_AIMS,
  openerJudgeSystem,
  openerSystem,
  openerUser,
  writeOpener,
  type OpenerDeps,
} from './ownerOpener'
import { checkDraft } from './interviewGuard'
import { B2B_DOMAINS } from './b2bDomains'
import { AREA_SEEDS, LENS_AREA_SEEDS } from './areaSeeds'
import { CHURCH_FOUNDING_SEEDS, FOUNDING_SEEDS } from './foundingSequence'
import type { InterviewerDraft } from './interviewer'
import type { JudgeVerdict } from './interviewGuard'

// October 28, 2026. docs/GENERIC_QUESTIONS_SLICE_2_2026-10-28.md.

const profile = {
  business:  'We run two used truck lots and sell mostly to landscaping and roofing contractors.',
  decisions: 'How much inventory to buy before spring, when to raise prices, and which salesmen to keep after winter.',
}
const said = [profile.business, profile.decisions]

describe('the aims', () => {
  it('cover every business area for both lenses', () => {
    for (const lens of ['succession', 'acquisition'] as const) {
      expect(Object.keys(OPENER_AIMS[lens]).sort()).toEqual(B2B_DOMAINS.map(d => d.name).sort())
    }
  })

  // October 28, 2026 review: the first aims paraphrased the authored openers
  // closely enough to share runs of nine to twelve words. G7: a model copies
  // what it is shown. No prompt the writer or the judge sees may share a run of
  // six words with any authored opener, area or founding, any lens.
  it('share no run of six words with any authored opener', () => {
    const words = (t: string) => t.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean)
    const runs = new Set<string>()
    const authored = [
      ...AREA_SEEDS.business, ...AREA_SEEDS.personal, ...LENS_AREA_SEEDS.acquisition, ...LENS_AREA_SEEDS.church,
      ...FOUNDING_SEEDS.business, ...FOUNDING_SEEDS.personal, ...CHURCH_FOUNDING_SEEDS,
    ].map(s => s.question)
    for (const a of authored) {
      const w = words(a)
      for (let i = 0; i + 6 <= w.length; i++) runs.add(w.slice(i, i + 6).join(' '))
    }
    // The check itself works: the review's twelve word run is caught.
    const probe = words('had to make a call for the business before the numbers could')
    expect(runs.has(probe.slice(0, 6).join(' '))).toBe(true)
    for (const lens of ['succession', 'acquisition'] as const) {
      const prompts = [openerSystem(lens), openerJudgeSystem(lens), ...Object.values(OPENER_AIMS[lens]).map(aim => openerUser({ aim, profile }))]
      for (const p of prompts) {
        const w = words(p)
        for (let i = 0; i + 6 <= w.length; i++) {
          expect(runs.has(w.slice(i, i + 6).join(' ')), `${lens}: "${w.slice(i, i + 6).join(' ')}"`).toBe(false)
        }
      }
    }
  })

  it('keep the acquisition rule in both the writer and the judge', () => {
    expect(openerSystem('acquisition')).toMatch(/Never presume the owner makes the decision/)
    expect(openerSystem('acquisition')).toMatch(/Never quote the owner/)
    expect(openerSystem('acquisition')).toMatch(/Never repeat from it who does what, who decides/)
    expect(openerSystem('succession')).not.toMatch(/Never quote the owner/)
    expect(openerJudgeSystem('acquisition')).toMatch(/^E\. /m)
    expect(openerJudgeSystem('succession')).not.toMatch(/^E\. /m)
  })
})

describe('the guard on an opener', () => {
  const ctx = { said, probeType: 'SEED' as const, lens: 'succession' as const }

  it('takes a question, or a Tell me about ending in a period', () => {
    expect(checkDraft('Tell me about the last spring you bought inventory before you knew what demand would be. What did you do?', ctx)).toEqual([])
    expect(checkDraft('Tell me about a salesman you went back and forth on keeping after winter.', ctx)).toEqual([])
    expect(checkDraft('What happened the last time you raised prices on the lots?', ctx)).toEqual([])
  })

  it('refuses two questions, a statement that is not a Tell me about, and a misquote', () => {
    expect(checkDraft('What did you buy? Why?', ctx)).toContain('not_one_question')
    expect(checkDraft('Your inventory decisions matter.', ctx)).toContain('not_one_question')
    expect(checkDraft('You said "we sell trucks to everyone." When did that start?', ctx)).toContain('quote_not_verbatim')
  })

  it('lets an opener name a kind of moment with or, which a follow up may not', () => {
    const q = 'Tell me about a salesman you hired or let go after a long winter.'
    expect(checkDraft(q, ctx)).not.toContain('either_or')
    expect(checkDraft('Was it the price or the timing?', { ...ctx, probeType: 'BASIS' })).toContain('either_or')
  })

  it('refuses a name the owner never used', () => {
    expect(checkDraft('Tell me about the day Marcus quit the Azusa lot.', ctx)).toContain('unsaid_name')
  })
})

function deps(drafts: (InterviewerDraft | null)[], verdicts: JudgeVerdict[] = []) {
  let clock = 0
  const d = {
    draftCalls: 0,
    judgeCalls: 0,
    draft: async () => drafts[d.draftCalls++] ?? null,
    judge: async () => verdicts[d.judgeCalls++] ?? { pass: false, reason: 'none left' },
    now: () => (clock += 10),
  }
  return d as unknown as OpenerDeps & { draftCalls: number; judgeCalls: number }
}

const base = { area: 'Capital', lens: 'succession' as const, profile, seedText: 'AUTHORED OPENER' }

describe('writeOpener', () => {
  it('serves a written opener that passes both checks, with its log', async () => {
    const d = deps([{ question: 'Tell me about the last spring you bought inventory before you knew what demand would be.', aim: 'cash choice' }], [{ pass: true, reason: 'ok' }])
    const out = await writeOpener(base, d)
    expect(out.source).toBe('interviewer')
    expect(out.text).toMatch(/^Tell me about the last spring/)
    expect(out.log.area).toBe('Capital')
    expect(out.log.attempts).toHaveLength(1)
  })

  it('rewrites once, then serves the authored opener', async () => {
    const d = deps([
      { question: 'What do you believe about money? And why?', aim: '' },
      { question: 'What is your philosophy on cash?', aim: '' },
    ], [{ pass: false, reason: 'C belief' }])
    const out = await writeOpener(base, d)
    expect(out.source).toBe('spine')
    expect(out.text).toBe('AUTHORED OPENER')
    expect(d.draftCalls).toBe(2)
    expect(out.log.attempts.map(a => a.fails.length > 0)).toEqual([true, true])
  })

  it('never serves an assessment opener that quotes the owner', async () => {
    const quoted = { question: 'You wrote "how much inventory to buy before spring." Who made that call last year?', aim: '' }
    const d = deps([quoted, quoted], [{ pass: true, reason: 'ok' }, { pass: true, reason: 'ok' }])
    const out = await writeOpener({ ...base, lens: 'acquisition' }, d)
    expect(out.source).toBe('spine')
    expect(out.log.attempts[0].fails).toContain('quote_in_assessment')
    expect(d.judgeCalls).toBe(0)
  })

  it('stops at the deadline, however the model behaves', async () => {
    // A draft that never answers: the race ends it at the deadline.
    const hang: OpenerDeps = {
      draft: () => new Promise(() => {}),
      judge: async () => ({ pass: true, reason: 'ok' }),
      now: () => Date.now(),
      deadlineMs: 50,
    }
    const t0 = Date.now()
    const out = await writeOpener(base, hang)
    expect(out.source).toBe('spine')
    expect(Date.now() - t0).toBeLessThan(1000)
    expect(out.log.attempts[0].fails).toEqual(['deadline'])

    // A clock already past the deadline: no model call at all.
    let calls = 0
    const late: OpenerDeps = {
      draft: async () => { calls++; return { question: 'What happened?', aim: '' } },
      judge: async () => ({ pass: true, reason: 'ok' }),
      now: (() => { let t = 0; return () => (t += 30_000) })(),
    }
    expect((await writeOpener(base, late)).source).toBe('spine')
    expect(calls).toBe(0)
  })

  it('serves the authored opener on a model error, and for an area with no aim', async () => {
    expect((await writeOpener(base, deps([null, null]))).source).toBe('spine')
    const d = deps([{ question: 'Anything?', aim: '' }])
    const out = await writeOpener({ ...base, area: 'Not An Area' }, d)
    expect(out.text).toBe('AUTHORED OPENER')
    expect(d.draftCalls).toBe(0)
  })
})
