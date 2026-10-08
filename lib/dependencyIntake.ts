/**
 * Key person dependency report, the intake. Slice 1, October 7, 2026.
 *
 * Eight questions, one per business domain (lib/b2bDomains.ts), each asking the
 * founder who makes that kind of decision today. This is the DEPENDENCY half of
 * the report. The CAPTURE half is the coverage run, which already exists.
 *
 * WHAT THIS IS AND IS NOT. The answers are the founder's own statement. Nothing
 * here checks them, and nothing can: no staff, customer, or document is asked.
 * Every surface that shows an answer must say it is as stated by the founder
 * (DEPENDENCY_ATTRIBUTION below). A founder selling a business has a reason to
 * understate how much runs through them, and the report says so in its limits
 * rather than pretending the reading is independent.
 *
 * The answers never reach the entity prompt, the frozen layer, or the verifier.
 * They are a column in a report, not a deposit.
 *
 * Pure. No DB, no model, no IO. Rendered strings are copy: no em dashes, no
 * exclamation points, American English.
 *
 * Skeleton and recon: docs/DEPENDENCY_REPORT_SLICE_1_2026-10-07.md.
 */

import { B2B_DOMAINS } from './b2bDomains'

/**
 * Who makes this kind of decision today, as the founder states it.
 *
 * 'founder'   the founder makes it
 * 'shared'    the founder makes it together with someone else
 * 'delegated' someone else makes it and the founder is not needed
 */
export type DependencyAnswer = 'founder' | 'shared' | 'delegated'

export const DEPENDENCY_ANSWERS: DependencyAnswer[] = ['founder', 'shared', 'delegated']

export type DependencyQuestion = {
  /** Matches a B2B_DOMAINS name exactly. */
  domain:   string
  question: string
}

/** One per domain, in B2B_DOMAINS order. Asked of the founder, in the second person. */
export const DEPENDENCY_QUESTIONS: DependencyQuestion[] = [
  { domain: 'Decision-Making', question: 'When a decision has to be made and the numbers will not settle it, who makes the call today?' },
  { domain: 'People',          question: 'Who decides who gets hired, who gets promoted, and who is let go today?' },
  { domain: 'Risk',            question: 'Who decides which bets the business takes and which it walks away from today?' },
  { domain: 'Capital',         question: 'Who decides where the money goes and when to hold it today?' },
  { domain: 'Culture',         question: 'Who sets the standards here today, and who deals with it when one is broken?' },
  { domain: 'Strategy',        question: 'Who decides which business to pursue and which to turn away today?' },
  { domain: 'Adversity',       question: 'When something breaks badly, who takes charge in the first day?' },
  { domain: 'Succession',      question: 'Who decides what gets handed to someone else, and when that person is ready?' },
]

/** What the founder picks from. */
export const DEPENDENCY_OPTION_LABEL: Record<DependencyAnswer, string> = {
  founder:   'I do',
  shared:    'I do, together with someone else',
  delegated: 'Someone else does, and I am not needed',
}

/** Asked only after 'shared' or 'delegated'. Optional. */
export const DEPENDENCY_ROLE_PROMPT = 'Who is that? A role is enough.'

/** What a reader of the report sees for each answer. */
export const DEPENDENCY_REPORT_LABEL: Record<DependencyAnswer, string> = {
  founder:   'Runs through the founder',
  shared:    'Shared with someone else',
  delegated: 'Handled without the founder',
}

/** Rendered wherever a dependency answer is shown to anyone but the founder. */
export const DEPENDENCY_ATTRIBUTION = 'As stated by the founder'

export const ROLE_MAX_LENGTH = 120

export type DependencyResponse = {
  domain: string
  answer: DependencyAnswer
  /** The other person's role, as typed. Null for 'founder' and when left blank. */
  role:   string | null
}

export type IntakeResult =
  | { ok: true; responses: DependencyResponse[] }
  | { ok: false; missing: string[]; invalid: string[] }

function isAnswer(v: unknown): v is DependencyAnswer {
  return typeof v === 'string' && (DEPENDENCY_ANSWERS as string[]).includes(v)
}

/**
 * Validate a raw submission into one response per domain, in domain order.
 *
 * Complete or refused: a report with seven answers is not a report on eight
 * domains, so there is no partial result. `missing` lists domains with no
 * answer, `invalid` lists domains whose answer is not one of the three.
 * Entries naming anything that is not a live domain are ignored.
 *
 * A role is kept only for 'shared' and 'delegated', trimmed and cut to
 * ROLE_MAX_LENGTH. A role sent with 'founder' is dropped, not an error.
 */
export function validateIntake(raw: unknown): IntakeResult {
  const byDomain = new Map<string, { answer?: unknown; role?: unknown }>()
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (!entry || typeof entry !== 'object') continue
      const e = entry as { domain?: unknown; answer?: unknown; role?: unknown }
      if (typeof e.domain !== 'string') continue
      // First entry for a domain wins. A duplicate is ignored, not merged.
      if (!byDomain.has(e.domain)) byDomain.set(e.domain, { answer: e.answer, role: e.role })
    }
  }

  const missing: string[] = []
  const invalid: string[] = []
  const responses: DependencyResponse[] = []

  for (const q of DEPENDENCY_QUESTIONS) {
    const got = byDomain.get(q.domain)
    if (!got || got.answer === undefined || got.answer === null || got.answer === '') {
      missing.push(q.domain)
      continue
    }
    if (!isAnswer(got.answer)) {
      invalid.push(q.domain)
      continue
    }
    const roleText = typeof got.role === 'string' ? got.role.trim().slice(0, ROLE_MAX_LENGTH) : ''
    responses.push({
      domain: q.domain,
      answer: got.answer,
      role:   got.answer === 'founder' || roleText === '' ? null : roleText,
    })
  }

  if (missing.length > 0 || invalid.length > 0) return { ok: false, missing, invalid }
  return { ok: true, responses }
}

/** Every string here that a person reads, for the copy rule test. */
export function allDependencyIntakeCopy(): string[] {
  return [
    ...DEPENDENCY_QUESTIONS.map(q => q.question),
    ...Object.values(DEPENDENCY_OPTION_LABEL),
    ...Object.values(DEPENDENCY_REPORT_LABEL),
    DEPENDENCY_ROLE_PROMPT,
    DEPENDENCY_ATTRIBUTION,
  ]
}

// Import time check, same idea as the probe set and the area seeds: a question
// naming a domain that is not live, or a live domain with no question, would
// produce a report with a hole in it.
function assertIntakeShape(): void {
  const live = B2B_DOMAINS.map(d => d.name)
  const asked = DEPENDENCY_QUESTIONS.map(q => q.domain)
  if (asked.length !== live.length || asked.some((d, i) => d !== live[i])) {
    throw new Error(`[dependencyIntake] questions must match B2B_DOMAINS one for one, in order. Got ${asked.join(', ')}`)
  }
}
assertIntakeShape()
