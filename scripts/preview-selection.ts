import './load-env'

/**
 * Preview / verification harness for lib/selectNextQuestion.ts.
 *
 * Runs selectNextQuestion repeatedly against a real archive and prints, per
 * run: domain coverage, the policy branch that fired, the chosen domain,
 * tier, question text, and whether a grounded framing sentence was used.
 *
 * Does NOT write to question_history unless --record is passed (default OFF),
 * so verification runs are safe to repeat against production data.
 *
 * Usage:
 *   npx tsx scripts/preview-selection.ts --archive <archiveId> [--runs N] [--seed N] [--record]
 *
 * Examples:
 *   npx tsx scripts/preview-selection.ts --archive a38e4503-c7d2-4af3-af8c-cacd66974e0b
 *   npx tsx scripts/preview-selection.ts --archive a38e4503-c7d2-4af3-af8c-cacd66974e0b --runs 10 --seed 7
 *   npx tsx scripts/preview-selection.ts --archive a38e4503-c7d2-4af3-af8c-cacd66974e0b --runs 5 --record
 */

import {
  selectNextQuestion,
  defaultDeps,
  band,
  validateGroundedFramingReason,
  type Deps,
  type DomainCoverage,
} from '../lib/selectNextQuestion'
import { supabaseAdmin } from '../lib/supabase-admin'

// ── Arg parsing ───────────────────────────────────────────────────────────────

function argValue(flag: string): string | null {
  const idx = process.argv.indexOf(flag)
  return idx !== -1 ? process.argv[idx + 1] ?? null : null
}

const ARCHIVE_ID = argValue('--archive')
const RUNS       = Number(argValue('--runs') ?? '1')
const SEED       = Number(argValue('--seed') ?? '42')
const RECORD     = process.argv.includes('--record')

if (!ARCHIVE_ID) {
  console.error('\nERROR: --archive <archiveId> is required.\n')
  process.exit(1)
}
if (!Number.isFinite(RUNS) || RUNS < 1) {
  console.error('\nERROR: --runs must be a positive integer.\n')
  process.exit(1)
}
if (!Number.isFinite(SEED)) {
  console.error('\nERROR: --seed must be a number.\n')
  process.exit(1)
}

// ── Seeded RNG (mulberry32) so the 80/20 draw is reproducible ──────────────────

function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatCoverage(coverage: DomainCoverage[]): string {
  if (coverage.length === 0) return '(no coverage rows)'
  return coverage
    .map(d => `${d.slug}(w${d.emotionalWeight}) density=${d.density.toFixed(2)} depth=${d.avgDepth.toFixed(2)}`)
    .join('\n    ')
}

async function getQuestionTier(questionId: number | null, b2bQuestionId: string | null): Promise<string> {
  if (questionId !== null) {
    const { data } = await supabaseAdmin.from('elicitation_questions').select('tier').eq('id', questionId).maybeSingle()
    return data?.tier ?? 'unknown'
  }
  if (b2bQuestionId !== null) return 'b2b'
  return 'n/a'
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`-- ${RECORD ? 'RECORD' : 'PREVIEW (no writes)'} -- archive ${ARCHIVE_ID} -- runs ${RUNS} -- seed ${SEED} --\n`)

  const rng = mulberry32(SEED)

  for (let run = 1; run <= RUNS; run++) {
    const now = new Date()

    // pickDomainP2P3 may call random() twice: once for the 80/20 branch
    // decision, and again to index into the eligible pool on the 20% path.
    // Only the first draw determines which branch fired.
    const draws: number[] = []

    // Captures the raw framing sentence (if any) generated for this run, plus
    // why it was rejected, so we can explain a "(bare)" result even when
    // selectNextQuestion itself doesn't surface the rejected attempt.
    const framingAttempts: Array<{ raw: string | null; reason: ReturnType<typeof validateGroundedFramingReason> }> = []

    const deps: Deps = {
      ...defaultDeps,
      random: () => {
        const v = rng()
        draws.push(v)
        return v
      },
      insertQuestionHistory: RECORD ? defaultDeps.insertQuestionHistory : async () => {},
      generateFramingSentence: async (anchor, questionText, domainEmotionalWeight) => {
        const raw = await defaultDeps.generateFramingSentence(anchor, questionText, domainEmotionalWeight)
        framingAttempts.push({ raw, reason: validateGroundedFramingReason(raw) })
        return raw
      },
    }

    // Read-only context, gathered independently so we can print it and
    // determine which policy branch fired -- mirrors the logic inside
    // selectNextQuestion without duplicating its decisions.
    const reflection  = await deps.getNotQuiteRightReflection(ARCHIVE_ID!, now)
    const scope       = await deps.getArchiveScope(ARCHIVE_ID!)
    const depositCount = await deps.getOwnerDepositCount(ARCHIVE_ID!)
    const b           = band(depositCount)
    const coverage    = await deps.getCoverage(ARCHIVE_ID!, scope)

    const result = await selectNextQuestion({ archiveId: ARCHIVE_ID!, channel: 'daily_email', now }, deps)

    let policy: string
    if (reflection) {
      policy = 'p0 (repair: not_quite_right reflection)'
    } else if (b === 'p1') {
      policy = 'p1 (pre-Echo rotation, weight-1 domains)'
    } else if (draws.length > 0) {
      const draw = draws[0]
      const branch = draw < 0.8 ? 'lowest density' : 'random eligible'
      policy = `${b} (${branch}, draw=${draw.toFixed(3)})`
    } else {
      policy = `${b} (no eligible domain)`
    }

    const domainSlug = result.domainId !== null
      ? coverage.find(d => d.domainId === result.domainId)?.slug ?? `id ${result.domainId}`
      : 'n/a'

    const tier = await getQuestionTier(result.questionId, result.b2bQuestionId)

    const attempt = framingAttempts[0] ?? null

    let framingOrBare: string
    if (result.framingUsed) {
      framingOrBare = `framing: "${result.framingUsed}"`
    } else if (attempt === null) {
      framingOrBare = '(bare -- no anchor deposit for domain, or pre-Echo)'
    } else if (attempt.raw === null) {
      framingOrBare = '(bare -- model returned NONE)'
    } else {
      framingOrBare = `(bare -- rejected: ${attempt.reason}; raw: "${attempt.raw}")`
    }

    console.log(`-- Run ${run}/${RUNS} ` + '-'.repeat(40))
    console.log(`  scope:    ${scope}`)
    console.log(`  deposits: ${depositCount}`)
    console.log(`  coverage:`)
    console.log(`    ${formatCoverage(coverage)}`)
    console.log(`  policy:   ${policy}`)
    console.log(`  domain:   ${domainSlug}`)
    console.log(`  tier:     ${tier}`)
    console.log(`  question: ${result.questionText}`)
    console.log(`  ${framingOrBare}`)
    console.log('')
  }

  if (!RECORD) {
    console.log('No question_history rows were written (preview mode). Re-run with --record to write.\n')
  }
}

main().catch(err => {
  console.error('preview-selection error:', err instanceof Error ? err.message : err)
  process.exit(1)
})
