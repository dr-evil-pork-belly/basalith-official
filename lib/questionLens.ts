/**
 * Question lenses. October 13, 2026.
 *
 * Until today two things chose every question a person was asked: the scope
 * (personal or business, from the tier) and nothing else. A grandmother and a
 * founder being read for a buyer got the same follow ups, and a founder being
 * read for a buyer got the same openers as one handing to his own successor.
 *
 * A LENS sits beside the scope. The scope keeps doing what it does: it picks
 * the taxonomy, the coverage probe set, and the classifier prompt. The lens
 * picks the openers and the wording of the few probes that assume a reader
 * (who inherits this, who it is being kept for). Four lenses:
 *
 *   personal     individuals and families. Every tier that is not succession.
 *   succession   a founder handing to a known successor.
 *   acquisition  a founder being read for a buyer (the dependency assessment).
 *   church       a pastor or an elder. archives.audience = 'church'.
 *
 * Language is not a lens. A family record in Cantonese is the personal lens;
 * a joint venture abroad is the acquisition lens. Nothing here translates.
 *
 * HARD RULE, the same one the threads carry: a lens picks words for
 * questions. It never reaches the entity prompt, the frozen layer, the
 * verifier, the saturation check, the founding proof, or a coverage run.
 * lib/questionLens.test.ts pins that on source text.
 *
 * Pure. No imports, so a client component can read CONFIDENCE_LINE.
 * Record: docs/QUESTION_LENSES_2026-10-13.md.
 */

export type QuestionLens = 'personal' | 'succession' | 'acquisition' | 'church'

export const QUESTION_LENSES: QuestionLens[] = ['personal', 'succession', 'acquisition', 'church']

/** archives.audience for a church leader's record. Migration 20261013. */
export const CHURCH_AUDIENCE = 'church'

/** archives.status for an assessment. Equal to ASSESSMENT_STATUS in
 *  lib/assessment.ts; repeated here so this file imports nothing, and pinned
 *  equal by lib/questionLens.test.ts. */
const ASSESSMENT = 'assessment'

/**
 * The lens for a record, from columns already on its archives row. A church
 * record rides the personal taxonomy, so a succession tier record is never
 * church whatever its audience says.
 */
export function lensFor(archive: {
  tier?:     string | null
  status?:   string | null
  audience?: string | null
}): QuestionLens {
  if (archive.tier === 'succession') {
    return archive.status === ASSESSMENT ? 'acquisition' : 'succession'
  }
  return archive.audience === CHURCH_AUDIENCE ? 'church' : 'personal'
}

/** Narrow an unknown value (a jsonb field, a request body) to a lens. */
export function asLens(v: unknown): QuestionLens | null {
  return typeof v === 'string' && (QUESTION_LENSES as string[]).includes(v) ? (v as QuestionLens) : null
}

/**
 * Shown above the question on every turn of a church call. It is an
 * instruction to the person. Nothing in the code detects or removes a
 * confidence, and no copy may say it does.
 */
export const CONFIDENCE_LINE =
  'Leave out names and anything told to you in confidence. Your decision is what belongs here.'
