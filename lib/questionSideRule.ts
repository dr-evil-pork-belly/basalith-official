/**
 * The question side rule. October 22, 2026.
 *
 * The retriever, the entity prompt, and the verifier all read a pair as
 * "Q: <prompt>" and "A: <completion>". Until the interviewer, every Q was a
 * fixed sentence, so no Q could carry a position. A Q the interviewer wrote
 * can, and a pair of a leading Q and an agreeing A reads as if the person
 * said what the Q said. The rule: only the A line is the person's words.
 *
 * Off unless QUESTION_SIDE_RULE is 'on'. Off, both prompts are byte
 * identical to what they were, so production, the G7 fixtures, and every
 * probe are unchanged until David runs the same day A/B (CLAUDE.md, prompt
 * edits) and turns it on. Turn it on before the interviewer runs on any
 * record that is not a test record.
 *
 * Nothing here reads a lens (lib/questionLens.test.ts pins that the entity
 * prompt and the verifier never do).
 */

type Env = Record<string, string | undefined>

export function questionSideRuleOn(env: Env = process.env): boolean {
  return (env.QUESTION_SIDE_RULE ?? '').trim().toLowerCase() === 'on'
}

/** Added to the verifier's system prompt when the rule is on. */
export const AUDITOR_QUESTION_SIDE =
  'Each deposit is a question the founder was asked (Q) and the founder\'s answer (A). ' +
  'Only the A line is the founder\'s statement. A position that appears only in a Q line, ' +
  'or that the A line only agrees to without stating it, is NOT supported.'

/** Placed above the settled pairs in the entity prompt when the rule is on. */
export function entityQuestionSide(ownerName: string): string {
  return (
    `Each entry below is a question ${ownerName} was asked (Q) and ${ownerName}'s answer (A). ` +
    `Only the A lines are ${ownerName}'s own words. A position that appears only in a Q line, ` +
    `or that an A line only agrees to, is not a position ${ownerName} took.`
  )
}
