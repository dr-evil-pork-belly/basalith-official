import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { CHURCH_AUDIENCE, CONFIDENCE_LINE, QUESTION_LENSES, asLens, lensFor } from './questionLens'
import { ASSESSMENT_STATUS } from './assessment'
import { AREA_SEEDS, LENS_AREA_SEEDS, seedForArea } from './areaSeeds'
import { areasFor } from './areaCalls'
import { CHURCH_FOUNDING_SEEDS, FOUNDING_SEEDS, allFoundingCopy, seedFor, foundingStatusFromRows } from './foundingSequence'
import { initialIncidentState } from './incidentSession'
import { ALL_COVERAGE_SETS } from './coverageSet'
import { ROUND_QUESTIONS } from './assessmentRound'
import { DEPENDENCY_QUESTIONS } from './dependencyIntake'

const ROOT = path.resolve(__dirname, '..')
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

describe('lensFor', () => {
  it('reads the four lenses from columns on the archives row', () => {
    expect(lensFor({ tier: 'active', status: 'active' })).toBe('personal')
    expect(lensFor({ tier: 'active', status: 'trial' })).toBe('personal')
    expect(lensFor({ tier: 'resting' })).toBe('personal')
    expect(lensFor({})).toBe('personal')
    expect(lensFor({ tier: 'succession', status: 'active' })).toBe('succession')
    expect(lensFor({ tier: 'succession', status: ASSESSMENT_STATUS })).toBe('acquisition')
    expect(lensFor({ tier: 'active', status: 'trial', audience: CHURCH_AUDIENCE })).toBe('church')
  })

  it('a succession tier record is never church, and an unknown audience is no audience', () => {
    expect(lensFor({ tier: 'succession', status: 'active', audience: CHURCH_AUDIENCE })).toBe('succession')
    expect(lensFor({ tier: 'succession', status: ASSESSMENT_STATUS, audience: CHURCH_AUDIENCE })).toBe('acquisition')
    expect(lensFor({ tier: 'active', audience: 'synagogue' })).toBe('personal')
    expect(lensFor({ tier: 'active', audience: null })).toBe('personal')
    // An assessment status off the succession tier is not an assessment.
    expect(lensFor({ tier: 'active', status: ASSESSMENT_STATUS })).toBe('personal')
  })

  it('narrows unknown values', () => {
    for (const l of QUESTION_LENSES) expect(asLens(l)).toBe(l)
    expect(asLens('business')).toBeNull()
    expect(asLens(undefined)).toBeNull()
    expect(asLens(3)).toBeNull()
  })
})

describe('lens openers', () => {
  it('cover their scope\'s taxonomy exactly, in order', () => {
    expect(LENS_AREA_SEEDS.acquisition.map(s => s.area)).toEqual(areasFor('business'))
    expect(LENS_AREA_SEEDS.church.map(s => s.area)).toEqual(areasFor('personal'))
    expect(CHURCH_FOUNDING_SEEDS.map(s => s.call)).toEqual([1, 2, 3])
  })

  it('are served only on the scope they belong to, and fall back otherwise', () => {
    for (const area of areasFor('business')) {
      const own = LENS_AREA_SEEDS.acquisition.find(s => s.area === area)
      expect(seedForArea('business', area, 'acquisition')).toEqual(own)
      expect(seedForArea('business', area, 'succession')).toEqual(AREA_SEEDS.business.find(s => s.area === area))
      expect(seedForArea('business', area)).toEqual(AREA_SEEDS.business.find(s => s.area === area))
      // The wrong lens for the scope changes nothing.
      expect(seedForArea('business', area, 'church')).toEqual(AREA_SEEDS.business.find(s => s.area === area))
    }
    for (const area of areasFor('personal')) {
      expect(seedForArea('personal', area, 'church')).toEqual(LENS_AREA_SEEDS.church.find(s => s.area === area))
      expect(seedForArea('personal', area, 'personal')).toEqual(AREA_SEEDS.personal.find(s => s.area === area))
      expect(seedForArea('personal', area, 'acquisition')).toEqual(AREA_SEEDS.personal.find(s => s.area === area))
    }
    expect(seedForArea('personal', 'Capital', 'church')).toBeNull()
    expect(seedForArea('business', 'Money', 'acquisition')).toBeNull()

    for (const c of [1, 2, 3] as const) {
      expect(seedFor('personal', c, 'church')).toEqual(CHURCH_FOUNDING_SEEDS[c - 1])
      expect(seedFor('personal', c, 'personal')).toEqual(FOUNDING_SEEDS.personal[c - 1])
      expect(seedFor('personal', c)).toEqual(FOUNDING_SEEDS.personal[c - 1])
      expect(seedFor('business', c, 'church')).toEqual(FOUNDING_SEEDS.business[c - 1])
      // Same title either way: the call cards do not change by lens.
      expect(seedFor('personal', c, 'church').title).toBe(seedFor('personal', c).title)
    }
  })

  it('repeat nothing already asked or measured, and lift no run of six words from a probe', () => {
    const lensCopy = [
      ...LENS_AREA_SEEDS.acquisition,
      ...LENS_AREA_SEEDS.church,
      ...CHURCH_FOUNDING_SEEDS,
    ].map(s => s.question)

    const taken = new Set([
      ...ALL_COVERAGE_SETS.flatMap(s => s.probes.map(p => norm(p.question))),
      ...[...AREA_SEEDS.personal, ...AREA_SEEDS.business, ...FOUNDING_SEEDS.personal, ...FOUNDING_SEEDS.business].map(s => norm(s.question)),
      ...ROUND_QUESTIONS.map(q => norm(q.question)),
      ...DEPENDENCY_QUESTIONS.map(q => norm(q.question)),
    ])
    const grams = (s: string) => {
      const w = norm(s).replace(/[^a-z0-9 ]/g, '').split(' ').filter(Boolean)
      const out = new Set<string>()
      for (let i = 0; i + 6 <= w.length; i++) out.add(w.slice(i, i + 6).join(' '))
      return out
    }
    const probeGrams = new Set<string>()
    for (const set of ALL_COVERAGE_SETS) for (const p of set.probes) for (const g of grams(p.question)) probeGrams.add(g)

    const seen = new Set<string>()
    for (const q of lensCopy) {
      expect(taken.has(norm(q)), q).toBe(false)
      expect(seen.has(norm(q)), q).toBe(false)
      seen.add(norm(q))
      for (const g of grams(q)) expect(probeGrams.has(g), `${q} :: ${g}`).toBe(false)
    }
  })

  it('ask for a moment and obey the copy rules', () => {
    const banned = /\b(curated|seamless|innovative|stewardship|unlock|supercharge|game-changer|AI|thoughtful|meaningful|steady|dependable)\b/
    const copy = [
      ...LENS_AREA_SEEDS.acquisition.map(s => s.question),
      ...LENS_AREA_SEEDS.church.map(s => s.question),
      ...CHURCH_FOUNDING_SEEDS.map(s => s.question),
      CONFIDENCE_LINE,
    ]
    for (const s of copy) {
      if (s !== CONFIDENCE_LINE) expect(s.startsWith('Tell me about'), s).toBe(true)
      expect(s, s).not.toMatch(/[—―]/)
      expect(s, s).not.toMatch(/!/)
      expect(s, s).not.toMatch(banned)
      expect(s, s).not.toMatch(/[A-Za-z]-[A-Za-z]/)
    }
    for (const s of CHURCH_FOUNDING_SEEDS) expect(allFoundingCopy()).toContain(s.question)
  })

  it('no acquisition opener presumes the answer: none says only, nobody, or no one', () => {
    // The rule these openers are held to (lib/areaSeeds.ts): neutral on
    // dependency. A report a buyer pays for cannot open by assuming it.
    for (const s of LENS_AREA_SEEDS.acquisition) {
      expect(s.question, s.question).not.toMatch(/\b(only you|nobody|no one|without you|you alone)\b/i)
    }
  })
})

describe('the call carries its lens to the page', () => {
  it('reports the lens of the open call, and null for a call opened before the marker existed', () => {
    const state = initialIncidentState()
    state.lens = 'church'
    state.pendingProbeType = 'SEED'
    const row = { id: 'a', status: 'open' as const, phase: 'SEED' as const, state, created_at: '2026-10-13T00:00:00Z' }
    expect(foundingStatusFromRows([row], 'personal').current?.lens).toBe('church')

    const old = { ...row, state: initialIncidentState() }
    expect(foundingStatusFromRows([old], 'personal').current?.lens).toBeNull()
  })
})

// THE HARD RULE (lib/questionLens.ts). A lens picks words for questions. It is
// never evidence. Nothing that builds what the entity knows, or checks what
// the entity said, may read it. Asserted on source text, the way
// lib/threadExtract.test.ts pins the same rule for threads.
describe('a lens never reaches the entity', () => {
  const EVIDENCE_PATHS = [
    'lib/entitySystemPrompt.ts',
    'lib/entityContext.ts',
    'lib/verifyGrounding.ts',
    'lib/frozenLayer.ts',
    'lib/incidentSaturation.ts',
    'lib/foundingProof.ts',
    'lib/familyEntity.ts',
    'lib/coverageRun.ts',
    'app/api/succession/entity/chat/route.ts',
    'app/api/archive/entity-chat/route.ts',
  ]
  const FORBIDDEN = /questionLens|QuestionLens|lensFor|loadLens|loadAudience|\.audience\b|'audience'/

  for (const rel of EVIDENCE_PATHS) {
    it(`${rel} does not read a lens`, () => {
      const file = path.join(ROOT, rel)
      expect(existsSync(file), `${rel} moved; update this list rather than deleting the check`).toBe(true)
      expect(FORBIDDEN.test(readFileSync(file, 'utf8'))).toBe(false)
    })
  }
})

// A select that names a column the table does not have fails whole, and every
// route below reads a failed archives select as "no such record." So
// `audience` is read in one place, apart, where a failure is answered as null
// (lib/questionLensStore.ts). This keeps the deploy safe before migration
// 20261013 is pasted.
describe('audience is read in one tolerant place', () => {
  const ROUTES = [
    'app/api/archive/b2b-question/answer/route.ts',
    'app/api/archive/b2b-question/next/route.ts',
    'app/api/archive/founding/start/route.ts',
    'app/api/archive/founding/status/route.ts',
    'app/api/archive/area-call/start/route.ts',
    'app/archive/founding/page.tsx',
  ]
  for (const rel of ROUTES) {
    it(`${rel} does not name audience in a select`, () => {
      const src = readFileSync(path.join(ROOT, rel), 'utf8')
      for (const m of src.matchAll(/\.select\(\s*(['"`])([\s\S]*?)\1/g)) {
        expect(m[2], rel).not.toMatch(/\baudience\b/)
      }
    })
  }

  it('the store answers null on a failed read', () => {
    const src = readFileSync(path.join(ROOT, 'lib/questionLensStore.ts'), 'utf8')
    expect(src).toMatch(/\.select\('audience'\)/)
    expect(src).toMatch(/if \(error\) \{[\s\S]{0,160}return null/)
    expect(src).toMatch(/catch \(err\) \{[\s\S]{0,200}return null/)
  })

  it('the trial route names audience only on the church insert, and retries without it', () => {
    const src = readFileSync(path.join(ROOT, 'app/api/trial/start/route.ts'), 'utf8')
    expect(src).toContain('.insert(audience ? { ...row, audience } : row)')
    expect(src).toContain('if (archiveErr && audience) {')
    const rowBlock = src.slice(src.indexOf('const row = {'), src.indexOf('let audienceSaved'))
    expect(rowBlock).not.toMatch(/\baudience\b[^.]*:/)
    expect(src).toContain('const audience = body.audience === CHURCH_AUDIENCE ? CHURCH_AUDIENCE : null')
  })
})
