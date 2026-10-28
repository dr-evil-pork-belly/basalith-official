/**
 * The business profile: two questions an owner answers once, in his own words,
 * on the first screen of the portal. October 28, 2026.
 * docs/GENERIC_QUESTIONS_SLICE_2_2026-10-28.md.
 *
 * WHY. Every area call opened with the same sentence for a dealer, a
 * distributor, and a dental group, because nothing that wrote the opener knew
 * which one it was talking to. These two answers are what lib/ownerOpener.ts
 * writes an opener from. Decided October 28, 2026: the question is asked on a
 * portal screen, not on the scoping call.
 *
 * THE ANSWERS ARE DEPOSITS. They are the owner's words, so they belong on the
 * record: same table, same source_type, a training pair like any answer. An
 * answer is found by its question text, the way the round of six finds its
 * answers (lib/assessmentRound.ts). No table, no column, no migration. The
 * cost is the same as there: editing a question's wording reopens the screen
 * for every owner. Bump PROFILE_VERSION when the set changes.
 *
 * WHO. A business record only: a succession record or an assessment record.
 * Only when OWNER_OPENERS is on AND the record is one the interviewer is on
 * for (CONVERSATIONAL_INTERVIEW names it, or is 'all'). The screen promises
 * that the calls start from what the owner writes; with either switch off
 * that would not be true, so the screen does not appear.
 *
 * Rendered strings are copy: no em dashes, no hyphenated words, no
 * exclamation points, American English.
 */

import { enabledFor } from './conversationalInterview'
import { isAssessment } from './assessment'

export const PROFILE_VERSION = 'p1'

export type ProfileKey = 'business' | 'decisions'

export type ProfileQuestion = {
  key:      ProfileKey
  question: string
  hint:     string
}

export const PROFILE_QUESTIONS: ProfileQuestion[] = [
  {
    key:      'business',
    question: 'What does the business do, and who pays for it?',
    hint:     'The way you would explain it to someone at dinner.',
  },
  {
    key:      'decisions',
    question: 'Name three decisions that come back every year or every season.',
    // Neutral on who decides (October 28, 2026 review): an assessment owner
    // sees this too, and the acquisition lens never presumes he decides.
    hint:     'Whatever they are, and whoever makes them today.',
  },
]

export const PROFILE_MIN_ANSWER = 20
export const PROFILE_MAX_ANSWER = 3000

type Env = Record<string, string | undefined>

export function ownerOpenersOn(env: Env = process.env): boolean {
  return (env.OWNER_OPENERS ?? '').trim().toLowerCase() === 'on'
}

/** A record whose calls are about a business. */
export function isBusinessRecord(archive: { tier?: string | null; status?: string | null }): boolean {
  return archive.tier === 'succession' || isAssessment(archive)
}

/** Whether this record is asked for a profile and gets written openers. */
export function profileApplies(
  archive: { id: string; tier?: string | null; status?: string | null; preferred_language?: string | null },
  env: Env = process.env,
): boolean {
  const lang = (archive.preferred_language ?? 'en').trim().toLowerCase() || 'en'
  return ownerOpenersOn(env) && lang === 'en' && isBusinessRecord(archive) && enabledFor(archive.id, env)
}

export interface BusinessProfile {
  business:  string
  decisions: string
}

/**
 * The newest answer to each question, from deposit rows. Null until both are
 * answered. Pure, exported for the test.
 */
export function profileFromRows(rows: readonly { prompt: string | null; response: string | null; created_at?: string | null }[]): BusinessProfile | null {
  const latest: Partial<Record<ProfileKey, { text: string; at: string }>> = {}
  for (const q of PROFILE_QUESTIONS) {
    for (const r of rows) {
      if (r.prompt !== q.question) continue
      const text = (r.response ?? '').trim()
      if (!text) continue
      const at = r.created_at ?? ''
      const have = latest[q.key]
      if (!have || at >= have.at) latest[q.key] = { text, at }
    }
  }
  if (!latest.business || !latest.decisions) return null
  return { business: latest.business.text, decisions: latest.decisions.text }
}

/** The page an owner goes to once the profile is answered. */
export function profileNext(archive: { status?: string | null }): string {
  return isAssessment(archive) ? '/archive/assessment' : '/archive/dashboard'
}
