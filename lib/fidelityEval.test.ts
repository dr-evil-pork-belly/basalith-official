import { describe, it, expect, vi } from 'vitest'
import {
  aggregateVoiceRepetitions,
  computeTestAMetrics,
  computeTestBMetrics,
  parsePrefilledJSON,
  detectContamination,
  formatTestAReport,
  formatTestBReport,
  runTestA,
  runTestB,
  runTestC,
  runTestD,
  buildEvalConfig,
  languageName,
  voiceJudgeSystemPrompt,
  contentJudgeSystemPrompt,
  contentQuestionSystemPrompt,
  SMALL_SAMPLE_THRESHOLD,
  type FidelityEvalDeps,
  type HoldoutDeposit,
  type VoiceTrialOutcome,
  type ContentScore,
  type EvalResultInsert,
} from './fidelityEval'

const CONFIG = buildEvalConfig(2)

function makeDeposit(over: Partial<HoldoutDeposit> & { id: string }): HoldoutDeposit {
  return {
    archiveId: 'archive-1',
    prompt:    'Tell me about your first job.',
    response:  'I worked at a print shop on Main Street.',
    language:  'en',
    ...over,
  }
}

function makeDeps(overrides: Partial<FidelityEvalDeps> = {}): FidelityEvalDeps {
  const base: FidelityEvalDeps = {
    getHoldoutDeposits:       vi.fn().mockResolvedValue([]),
    generateEntityResponse:   vi.fn().mockResolvedValue({ response: 'entity says something', usedDepositIds: [] }),
    judgeVoiceTrial:          vi.fn().mockResolvedValue({ pick: 'a', reason: 'because' }),
    generateFactualQuestions: vi.fn().mockResolvedValue([]),
    judgeContentScore:        vi.fn().mockResolvedValue({ score: 2, reason: 'consistent' }),
    isSuccessionArchive:      vi.fn().mockResolvedValue(false),
    getMirrorReactionCounts:  vi.fn().mockResolvedValue({ archiveId: 'archive-1', month: '2026-06', thisIsMe: 0, notQuiteRight: 0, heart: 0, total: 0 }),
    createEvalRun:            vi.fn().mockResolvedValue('eval-run-1'),
    writeEvalResults:         vi.fn().mockResolvedValue(undefined),
    random:                   () => 0,
  }
  return { ...base, ...overrides }
}

// ── aggregateVoiceRepetitions ───────────────────────────────────────────────

describe('aggregateVoiceRepetitions', () => {
  it('returns correct on 2/3 or 3/3 correct', () => {
    expect(aggregateVoiceRepetitions(['correct', 'correct', 'incorrect'])).toBe('correct')
    expect(aggregateVoiceRepetitions(['correct', 'correct', 'correct'])).toBe('correct')
  })

  it('returns incorrect on 2/3 or 3/3 incorrect', () => {
    expect(aggregateVoiceRepetitions(['incorrect', 'incorrect', 'correct'])).toBe('incorrect')
    expect(aggregateVoiceRepetitions(['incorrect', 'incorrect', 'incorrect'])).toBe('incorrect')
  })

  it('returns no_majority when split or dominated by unparseable trials', () => {
    expect(aggregateVoiceRepetitions(['correct', 'incorrect', 'unparseable'])).toBe('no_majority')
    expect(aggregateVoiceRepetitions(['unparseable', 'unparseable', 'correct'])).toBe('no_majority')
    expect(aggregateVoiceRepetitions(['unparseable', 'unparseable', 'unparseable'])).toBe('no_majority')
  })
})

// ── computeTestAMetrics ──────────────────────────────────────────────────────

describe('computeTestAMetrics', () => {
  it('computes judge accuracy and small-sample caveat', () => {
    const outcomes: ('correct' | 'incorrect' | 'no_majority')[] = ['correct', 'correct', 'incorrect', 'no_majority']
    const metrics = computeTestAMetrics(outcomes, 4, 5)

    expect(metrics.totalTested).toBe(4)
    expect(metrics.correctCount).toBe(2)
    expect(metrics.incorrectCount).toBe(1)
    expect(metrics.noMajorityCount).toBe(1)
    expect(metrics.judgeAccuracy).toBe(0.5)
    expect(metrics.qualifyingCount).toBe(4)
    expect(metrics.totalHoldouts).toBe(5)
    expect(metrics.smallSampleCaveat).toBe(true)
  })

  it('flags no caveat once n reaches the threshold', () => {
    const outcomes = Array.from({ length: SMALL_SAMPLE_THRESHOLD }, () => 'correct' as const)
    const metrics = computeTestAMetrics(outcomes, SMALL_SAMPLE_THRESHOLD, SMALL_SAMPLE_THRESHOLD)
    expect(metrics.smallSampleCaveat).toBe(false)
    expect(metrics.judgeAccuracy).toBe(1)
  })

  it('handles zero tested without divide-by-zero', () => {
    const metrics = computeTestAMetrics([], 0, 5)
    expect(metrics.judgeAccuracy).toBe(0)
    expect(metrics.totalTested).toBe(0)
  })
})

// ── computeTestBMetrics ──────────────────────────────────────────────────────

describe('computeTestBMetrics', () => {
  it('computes mean and distribution, excluding unparseable from the mean', () => {
    const scores: ContentScore[] = [2, 2, 1, 0, 'unparseable']
    const metrics = computeTestBMetrics(scores)

    expect(metrics.total).toBe(5)
    expect(metrics.n).toBe(4)
    expect(metrics.distribution).toEqual({ 0: 1, 1: 1, 2: 2, unparseable: 1 })
    expect(metrics.meanScore).toBe(5 / 4)
    expect(metrics.zeroCount).toBe(1)
  })

  it('returns zero mean on empty input', () => {
    const metrics = computeTestBMetrics([])
    expect(metrics.meanScore).toBe(0)
    expect(metrics.n).toBe(0)
    expect(metrics.total).toBe(0)
  })

  it('handles an all-unparseable set without a divide-by-zero mean', () => {
    const metrics = computeTestBMetrics(['unparseable', 'unparseable'])
    expect(metrics.n).toBe(0)
    expect(metrics.meanScore).toBe(0)
    expect(metrics.distribution.unparseable).toBe(2)
  })
})

// ── parsePrefilledJSON ───────────────────────────────────────────────────────

describe('parsePrefilledJSON', () => {
  it('parses a prefilled-brace response', () => {
    const raw = '"pick":"a","reason":"sounds more natural"}'
    expect(parsePrefilledJSON<{ pick: string; reason: string }>(raw, '{')).toEqual({
      pick: 'a',
      reason: 'sounds more natural',
    })
  })

  it('strips markdown fences', () => {
    const raw = '"pick":"b","reason":"more specific"}\n```'
    expect(parsePrefilledJSON<{ pick: string; reason: string }>(raw, '{')).toEqual({
      pick: 'b',
      reason: 'more specific',
    })
  })

  it('returns null on unparseable input', () => {
    expect(parsePrefilledJSON('not json at all', '{')).toBeNull()
  })

  it('parses a prefilled-bracket array response', () => {
    const raw = '{"question":"Where did you work?"}]'
    expect(parsePrefilledJSON<{ question: string }[]>(raw, '[')).toEqual([{ question: 'Where did you work?' }])
  })
})

// ── detectContamination ─────────────────────────────────────────────────────

describe('detectContamination', () => {
  it('returns holdout ids that leaked into retrieval', () => {
    expect(detectContamination(['d1', 'd2', 'h1'], ['h1', 'h2'])).toEqual(['h1'])
  })

  it('returns empty array when nothing leaked', () => {
    expect(detectContamination(['d1', 'd2'], ['h1', 'h2'])).toEqual([])
  })
})

// ── formatTestAReport / formatTestBReport ───────────────────────────────────

describe('formatTestAReport', () => {
  it('reports an x/n count and a small-sample caveat below the threshold', () => {
    const metrics = computeTestAMetrics(['correct', 'incorrect'], 2, 2)
    const report  = formatTestAReport(metrics)
    expect(report).toContain('1/2')
    expect(report).toContain('Small-sample caveat')
  })

  it('handles zero qualifying holdouts', () => {
    const metrics = computeTestAMetrics([], 0, 5)
    expect(formatTestAReport(metrics)).toContain('no qualifying holdouts')
  })
})

describe('formatTestBReport', () => {
  it('surfaces zero-count trials prominently', () => {
    const metrics = computeTestBMetrics([0, 2])
    const report  = formatTestBReport(metrics)
    expect(report).toContain('1 trial(s) scored 0')
  })

  it('reports zero trials scored 0 when none', () => {
    const metrics = computeTestBMetrics([2, 2])
    expect(formatTestBReport(metrics)).toContain('0 trials scored 0')
  })
})

// ── runTestA ─────────────────────────────────────────────────────────────────

describe('runTestA', () => {
  it('reports insufficient_data and writes a placeholder result when there are no holdouts', async () => {
    const deps = makeDeps({ getHoldoutDeposits: vi.fn().mockResolvedValue([]) })
    const result = await runTestA('archive-1', 'eval-run-1', CONFIG, deps)

    expect(result.status).toBe('insufficient_data')
    expect(result.metrics).toBeNull()
    expect(deps.writeEvalResults).toHaveBeenCalledWith('eval-run-1', [
      expect.objectContaining({ testType: 'voice', value: null, n: 0 }),
    ])
  })

  it('only tests holdouts with a non-null prompt and aggregates majority vote', async () => {
    const holdouts: HoldoutDeposit[] = [
      makeDeposit({ id: 'h1', prompt: 'Tell me about your first job.' }),
      makeDeposit({ id: 'h2', prompt: null }),
    ]

    // Always returns 'a' as the pick. With random() === 0, realIsA is always true,
    // so 'a' picks the real response every time -> 'correct'.
    const deps = makeDeps({
      getHoldoutDeposits: vi.fn().mockResolvedValue(holdouts),
      judgeVoiceTrial:    vi.fn().mockResolvedValue({ pick: 'a', reason: 'real voice' }),
      random:             () => 0,
    })

    const result = await runTestA('archive-1', 'eval-run-1', CONFIG, deps)

    expect(result.status).toBe('completed')
    expect(result.metrics?.qualifyingCount).toBe(1)
    expect(result.metrics?.totalHoldouts).toBe(2)
    expect(result.metrics?.totalTested).toBe(1)
    expect(result.metrics?.correctCount).toBe(1)
    expect(result.metrics?.judgeAccuracy).toBe(1)
    expect(deps.judgeVoiceTrial).toHaveBeenCalledTimes(3)
    expect(deps.writeEvalResults).toHaveBeenCalledTimes(1)
  })

  it('flags contamination when usedDepositIds includes a holdout id', async () => {
    const holdouts: HoldoutDeposit[] = [makeDeposit({ id: 'h1' })]

    const deps = makeDeps({
      getHoldoutDeposits:     vi.fn().mockResolvedValue(holdouts),
      generateEntityResponse: vi.fn().mockResolvedValue({ response: 'entity answer', usedDepositIds: ['h1', 'other'] }),
      judgeVoiceTrial:        vi.fn().mockResolvedValue({ pick: 'a', reason: 'real voice' }),
      random:                 () => 0,
    })

    const result = await runTestA('archive-1', 'eval-run-1', CONFIG, deps)
    expect(result.details[0].contaminatedDepositIds).toEqual(['h1'])
  })

  it('counts a deposit as no_majority when the judge is consistently unparseable', async () => {
    const holdouts: HoldoutDeposit[] = [makeDeposit({ id: 'h1' })]

    const deps = makeDeps({
      getHoldoutDeposits: vi.fn().mockResolvedValue(holdouts),
      judgeVoiceTrial:    vi.fn().mockResolvedValue({ pick: 'unparseable', reason: null }),
      random:             () => 0,
    })

    const result = await runTestA('archive-1', 'eval-run-1', CONFIG, deps)
    expect(result.metrics?.noMajorityCount).toBe(1)
    expect(result.metrics?.totalTested).toBe(1)
  })
})

// ── runTestB ─────────────────────────────────────────────────────────────────

describe('runTestB', () => {
  it('reports insufficient_data when there are no holdouts', async () => {
    const deps = makeDeps({ getHoldoutDeposits: vi.fn().mockResolvedValue([]) })
    const result = await runTestB('archive-1', 'eval-run-1', CONFIG, deps)

    expect(result.status).toBe('insufficient_data')
    expect(result.metrics).toBeNull()
    expect(deps.writeEvalResults).toHaveBeenCalledWith('eval-run-1', [
      expect.objectContaining({ testType: 'content', value: null, n: 0 }),
    ])
  })

  it('generates questions per holdout and scores each entity answer', async () => {
    const holdouts: HoldoutDeposit[] = [
      makeDeposit({ id: 'h1' }),
      makeDeposit({ id: 'h2' }),
    ]

    const deps = makeDeps({
      getHoldoutDeposits:       vi.fn().mockResolvedValue(holdouts),
      generateFactualQuestions: vi.fn().mockResolvedValue(['Where did you work?']),
      judgeContentScore: vi.fn()
        .mockResolvedValueOnce({ score: 2, reason: 'consistent' })
        .mockResolvedValueOnce({ score: 0, reason: 'contradicts the deposit' }),
    })

    const result = await runTestB('archive-1', 'eval-run-1', CONFIG, deps)

    expect(result.status).toBe('completed')
    expect(result.details).toHaveLength(2)
    expect(result.metrics?.total).toBe(2)
    expect(result.metrics?.n).toBe(2)
    expect(result.metrics?.zeroCount).toBe(1)
    expect(result.metrics?.meanScore).toBe(1)
    expect(deps.writeEvalResults).toHaveBeenCalledTimes(1)
  })

  it('records unparseable judge scores without dropping the trial', async () => {
    const holdouts: HoldoutDeposit[] = [makeDeposit({ id: 'h1' })]

    const deps = makeDeps({
      getHoldoutDeposits:       vi.fn().mockResolvedValue(holdouts),
      generateFactualQuestions: vi.fn().mockResolvedValue(['Where did you work?']),
      judgeContentScore:        vi.fn().mockResolvedValue({ score: 'unparseable' as ContentScore, reason: null }),
    })

    const result = await runTestB('archive-1', 'eval-run-1', CONFIG, deps)
    expect(result.metrics?.total).toBe(1)
    expect(result.metrics?.n).toBe(0)
    expect(result.metrics?.distribution.unparseable).toBe(1)
  })
})

// ── runTestC ─────────────────────────────────────────────────────────────────

describe('runTestC', () => {
  it('returns the no-succession-archives stub status and writes a placeholder result', async () => {
    const deps = makeDeps({ isSuccessionArchive: vi.fn().mockResolvedValue(false) })
    const result = await runTestC('archive-1', 'eval-run-1', deps)

    expect(result).toEqual({ status: 'no_succession_archives_active', results: [] })
    expect(deps.writeEvalResults).toHaveBeenCalledWith('eval-run-1', [
      expect.objectContaining({ testType: 'reasoning', details: { status: 'no_succession_archives_active' } }),
    ])
  })

  it('throws for a succession-tier archive, since execution is not implemented in v1', async () => {
    const deps = makeDeps({ isSuccessionArchive: vi.fn().mockResolvedValue(true) })
    await expect(runTestC('archive-1', 'eval-run-1', deps)).rejects.toThrow(/not implemented/)
  })

  it('checks the archive under evaluation, not whether any succession archive exists globally', async () => {
    const isSuccessionArchive = vi.fn().mockResolvedValue(false)
    const deps = makeDeps({ isSuccessionArchive })

    await runTestC('consumer-archive', 'eval-run-1', deps)
    expect(isSuccessionArchive).toHaveBeenCalledWith('consumer-archive')
  })
})

// ── runTestD ─────────────────────────────────────────────────────────────────

describe('runTestD', () => {
  it('writes one live_signal row per reaction type', async () => {
    const counts = { archiveId: 'archive-1', month: '2026-06', thisIsMe: 3, notQuiteRight: 1, heart: 2, total: 6 }
    const deps = makeDeps({ getMirrorReactionCounts: vi.fn().mockResolvedValue(counts) })

    const result = await runTestD('archive-1', '2026-06', 'eval-run-1', deps)

    expect(result).toEqual(counts)
    const writeCall = (deps.writeEvalResults as ReturnType<typeof vi.fn>).mock.calls[0]
    const rows = writeCall[1] as EvalResultInsert[]
    expect(rows).toHaveLength(3)
    expect(rows.find(r => r.metric === 'this_is_me')?.value).toBe(3)
    expect(rows.find(r => r.metric === 'not_quite_right')?.value).toBe(1)
    expect(rows.find(r => r.metric === 'heart')?.value).toBe(2)
    expect(rows.every(r => r.n === 6 && r.testType === 'live_signal')).toBe(true)
  })
})

// ── buildEvalConfig ──────────────────────────────────────────────────────────

describe('buildEvalConfig', () => {
  it('records judge model, version tag, generator path version, holdout count, and prompt template hashes', () => {
    const config = buildEvalConfig(7)
    expect(config.holdoutCount).toBe(7)
    expect(config.judgeModel).toBeTruthy()
    expect(config.judgeVersionTag).toBeTruthy()
    expect(config.generatorModel).toBeTruthy()
    expect(config.generatorPathVersion).toBeTruthy()
    expect(Object.keys(config.promptTemplateHashes)).toEqual(
      expect.arrayContaining(['voiceJudge', 'contentQuestionGen', 'contentJudge']),
    )
  })
})

// ── In-language judging ──────────────────────────────────────────────────────

describe('languageName', () => {
  it('maps preferred_language codes to full language names', () => {
    expect(languageName('en')).toBe('English')
    expect(languageName('yue')).toBe('Cantonese')
    expect(languageName('zh')).toBe('Mandarin Chinese')
  })

  it('falls back to the raw code for an unrecognized language', () => {
    expect(languageName('xx')).toBe('xx')
  })
})

describe('in-language judge prompts', () => {
  it('builds the Test A voice judge prompt in Cantonese for a yue deposit', () => {
    const prompt = voiceJudgeSystemPrompt('yue')
    expect(prompt).toContain('Cantonese')
    expect(prompt).not.toContain('English')
  })

  it('builds the Test B content judge prompt in Cantonese for a yue deposit', () => {
    const prompt = contentJudgeSystemPrompt('yue')
    expect(prompt).toContain('Cantonese')
    expect(prompt).not.toContain('English')
  })

  it('builds the Test B question-generation prompt in Cantonese for a yue deposit', () => {
    const prompt = contentQuestionSystemPrompt('yue')
    expect(prompt).toContain('Cantonese')
    expect(prompt).not.toContain('English')
  })

  it('instructs the question-generation prompt to ask in second person and bans document framing', () => {
    const prompt = contentQuestionSystemPrompt('en')
    expect(prompt).toMatch(/second person/i)
    expect(prompt).toMatch(/"the deposit/)
    expect(prompt).toMatch(/"the text/)
    expect(prompt).toMatch(/"the author/)
    expect(prompt).toMatch(/"the subject/)
    expect(prompt).toMatch(/"mentioned/)
  })

  it('forbids questions that embed the fact being probed', () => {
    const prompt = contentQuestionSystemPrompt('en')
    expect(prompt).toMatch(/must NOT state, presuppose, or embed the fact being probed/)
    expect(prompt).toMatch(/The answer, not the question, must supply the fact/)
  })

  it('includes the full content-judge rubric and the quote-on-zero requirement, with a 1-scoring different-traits example', () => {
    const prompt = contentJudgeSystemPrompt('en')
    expect(prompt).toMatch(/2 = CONSISTENT/)
    expect(prompt).toMatch(/1 = OMITS \/ DOESN'T KNOW/)
    expect(prompt).toMatch(/0 = CONTRADICTS OR INVENTS/)
    expect(prompt).toMatch(/MUST quote both the specific entity claim and the specific deposit text/)
    expect(prompt).toMatch(/different traits than the deposit's wording/i)
    expect(prompt).toMatch(/does not earn a 2/)
  })

  it('threads the holdout deposit language into judgeVoiceTrial and judgeContentScore', async () => {
    const holdout = makeDeposit({ id: 'h1', language: 'yue' })

    const judgeVoiceTrial    = vi.fn().mockResolvedValue({ pick: 'a', reason: 'sounds right' })
    const judgeContentScore  = vi.fn().mockResolvedValue({ score: 2, reason: 'consistent' })

    const deps = makeDeps({
      getHoldoutDeposits:       vi.fn().mockResolvedValue([holdout]),
      generateFactualQuestions: vi.fn().mockResolvedValue(['Where did you work?']),
      judgeVoiceTrial,
      judgeContentScore,
      random: () => 0,
    })

    await runTestA('archive-1', 'eval-run-1', CONFIG, deps)
    await runTestB('archive-1', 'eval-run-1', CONFIG, deps)

    expect(judgeVoiceTrial.mock.calls[0][0].language).toBe('yue')
    expect(judgeContentScore.mock.calls[0][0].deposit.language).toBe('yue')
  })
})

// ── outcome type sanity (compile-time) ──────────────────────────────────────

describe('VoiceTrialOutcome union', () => {
  it('accepts all three outcomes', () => {
    const outcomes: VoiceTrialOutcome[] = ['correct', 'incorrect', 'unparseable']
    expect(outcomes).toHaveLength(3)
  })
})
