/**
 * Key person dependency assessment, the round. Slice 4b, October 8, 2026.
 *
 * Six short questions per business domain, asked after that domain's call:
 * four on the decisions the call's one incident did not reach, and two on who
 * else can make those decisions. Each answer is written to the record as a
 * deposit in the founder's words, exactly like an interview turn.
 *
 * WHY THIS EXISTS. An area call is one incident. The report reads each domain
 * with six questions on six different subjects (lib/coverageProbes.ts). One
 * incident on "a time cash was tight" says nothing about borrowing or about a
 * business line that stopped growing, because nobody asked. Left alone, every
 * founder would read about the same in every domain and the report would
 * measure the width of the interview. And nothing in a call asks what the
 * report is about: who else could make this call.
 * (docs/DEPENDENCY_REPORT_QUESTION_ANALYSIS_2026-10-08.md.)
 *
 * THE RULE THE OPENERS ALREADY FOLLOW. A round question and a coverage probe
 * aim at the same kind of judgment on purpose: a probe measures, a question
 * elicits. No round question repeats a probe, an area opener, or another round
 * question word for word (lib/assessmentRound.test.ts pins it). Where it can,
 * a question asks for a moment, because the verifier can ground a position in
 * what someone did and cannot ground one in what they believe.
 *
 * WHAT IS NOT HERE. A question earns no credit by being asked. A deposit
 * counts toward the report only if the entity, asked the probe, answers from
 * it and the verifier agrees. A vague answer to a round question changes
 * nothing in the count.
 *
 * TRACKING. An answer is found by its question text: a deposit on the record
 * whose prompt is the question. No table, no column. The cost is that editing
 * a question's wording reopens it for any assessment in progress. Bump
 * ROUND_VERSION when the set changes, and do not edit wording while an
 * assessment is open.
 *
 * Assessment only. No client's interview reads this file. Pure: no DB, no
 * model, no IO. Questions are rendered to the founder, so they are copy: no
 * em dashes, no exclamation points, American English.
 */

import { B2B_DOMAINS } from './b2bDomains'

export const ROUND_VERSION = 'r1'

/** 'rule': a decision in this domain. 'dependency': who else can make it. */
export type RoundKind = 'rule' | 'dependency'

export type RoundQuestion = {
  /** Stable, unique across the set. */
  key:      string
  /** Matches a B2B_DOMAINS name exactly. */
  domain:   string
  kind:     RoundKind
  question: string
}

export const RULES_PER_DOMAIN      = 4
export const DEPENDENCY_PER_DOMAIN = 2
export const ROUND_PER_DOMAIN      = RULES_PER_DOMAIN + DEPENDENCY_PER_DOMAIN

function domain(name: string, slug: string, rules: [string, string, string, string], dependency: [string, string]): RoundQuestion[] {
  return [
    ...rules.map((question, i) => ({ key: `${slug}-rule-${i + 1}`, domain: name, kind: 'rule' as const, question })),
    ...dependency.map((question, i) => ({ key: `${slug}-dep-${i + 1}`, domain: name, kind: 'dependency' as const, question })),
  ]
}

export const ROUND_QUESTIONS: RoundQuestion[] = [
  ...domain('Decision-Making', 'decision',
    [
      'Which calls here do you make on the spot, and which do you sleep on? Give me one of each from the last year.',
      'Tell me about a call you got wrong. What did you miss, and what do you look for now because of it?',
      'Before a hard call, who do you talk to? Who do you leave out on purpose?',
      'Tell me about a time you realized you had made up your mind before you looked at the facts. What did you do?',
    ],
    [
      'If you could not be reached for three months, who would make the calls the numbers cannot settle? What would they do differently from you?',
      'Which of those calls have you never explained to anyone here?',
    ]),
  ...domain('People', 'people',
    [
      'Who was the last person you promoted, and why them? What would have ruled them out even with good numbers?',
      'Who can you not afford to lose? What do you do to keep them that you do not do for everyone?',
      'How is pay decided here? What is that way of paying meant to protect?',
      'Tell me about someone who lost your confidence. What did it take, and how long did they have after that?',
    ],
    [
      'If you were away for three months, who would decide a hire or a firing? Where would they go wrong?',
      'Who on your team would leave if you did?',
    ]),
  ...domain('Risk', 'risk',
    [
      'What is the biggest loss this business could take and carry on as it is? Tell me how you know.',
      'Which customer, supplier, or person does too much of this business depend on? At what point would you act on it?',
      'Which gamble in this business do you regret? What do you do differently now before you commit?',
      'Before you commit to something large, what must you know first, and what are you willing to leave unknown?',
    ],
    [
      'Who else here can say no to a deal? When did they last do it without asking you?',
      'Which risks in this business does nobody watch but you?',
    ]),
  ...domain('Capital', 'capital',
    [
      'When there is money left over, where does it go first? Tell me about the last time.',
      'Tell me about the last time you borrowed for the business, or chose not to. What decided it?',
      'How much cash do you keep on hand, and at what level do you start to worry?',
      'Is there a product or a line here that makes money and has stopped growing? What have you done with it?',
    ],
    [
      'Who besides you can approve spending, and up to what amount?',
      'If you were away for three months, which money decisions would wait for you?',
    ]),
  ...domain('Culture', 'culture',
    [
      'Which standard here costs you money to keep? What does it cost?',
      'What gets someone removed here however good their results are? Tell me about the last time.',
      'What do you put up with that others in your seat would not?',
      'What do people here do on their own that they picked up from you? How did they pick it up?',
    ],
    [
      'Which job here have you kept for yourself the whole time? What would happen if someone else did it?',
      'Who else holds people to the standards when you are not there? When did they last do it?',
    ]),
  ...domain('Strategy', 'strategy',
    [
      'Tell me about a time a large customer asked for something you do not do. What did you tell them?',
      'How do you set your prices? What will you never give away to win a deal?',
      'Where do you disagree with how most people in your industry run things? What do you do differently because of it?',
      'Tell me about a time a competitor came in well below your price. What did you do?',
    ],
    [
      'Who else here could decide to enter or leave a line of business? Have they ever?',
      'Which customers stay because of you personally?',
    ]),
  ...domain('Adversity', 'adversity',
    [
      'When you have had to cut, what went first and what did you refuse to touch?',
      'Tell me about a mistake that was yours and that everyone could see. What did you do?',
      'When something breaks, who do you call, and in what order?',
      'Tell me about the last time you had to give bad news. Who did you tell first, and how soon?',
    ],
    [
      'The last time something broke while you were away, what happened? Who handled it?',
      'In a crisis, what would the team wait for you to decide?',
    ]),
  ...domain('Succession', 'succession',
    [
      'If someone took over tomorrow, what should they leave exactly as it is? Why?',
      'And what should they change first, that you never got to?',
      'How would you choose who takes over? What counts most?',
      'Once you have handed over, how much say do you want? Tell me what you would do the first time they called you about a decision.',
    ],
    [
      'What do you carry in your head about this business that no document holds? Give me three things.',
      'Who is closest to being able to run this without you? What do they still lack?',
    ]),
]

const BY_KEY = new Map(ROUND_QUESTIONS.map(q => [q.key, q]))

/** The six questions for one domain, rules first, in order. Empty for an unknown domain. */
export function roundFor(domainName: string): RoundQuestion[] {
  return ROUND_QUESTIONS.filter(q => q.domain === domainName)
}

export function roundQuestionByKey(key: string): RoundQuestion | null {
  return BY_KEY.get(key) ?? null
}

/** Every question text, for the one read that finds the answers on a record. */
export function allRoundPrompts(): string[] {
  return ROUND_QUESTIONS.map(q => q.question)
}

/**
 * The keys answered on a record, given the prompts of its deposits. A prompt
 * counts when it is a round question exactly (trimmed). Anything else on the
 * record is ignored, and a question answered twice counts once.
 */
export function answeredRoundKeys(depositPrompts: readonly string[]): Set<string> {
  const have = new Set(depositPrompts.map(p => (p ?? '').trim()))
  return new Set(ROUND_QUESTIONS.filter(q => have.has(q.question)).map(q => q.key))
}

export interface RoundProgress {
  domain:    string
  answered:  number
  total:     number
  done:      boolean
  /** The next unanswered question, in order, or null when the round is done. */
  next:      RoundQuestion | null
  questions: (RoundQuestion & { answered: boolean })[]
}

export function roundProgress(domainName: string, depositPrompts: readonly string[]): RoundProgress {
  const keys = answeredRoundKeys(depositPrompts)
  const questions = roundFor(domainName).map(q => ({ ...q, answered: keys.has(q.key) }))
  const answered = questions.filter(q => q.answered).length
  const next = questions.find(q => !q.answered) ?? null
  return {
    domain:   domainName,
    answered,
    total:    questions.length,
    // An unknown domain has no questions and is never done.
    done:     questions.length > 0 && answered === questions.length,
    next:     next ? { key: next.key, domain: next.domain, kind: next.kind, question: next.question } : null,
    questions,
  }
}

/** The domains whose round is fully answered, in domain order. */
export function areasWithRoundDone(depositPrompts: readonly string[]): string[] {
  return B2B_DOMAINS.map(d => d.name).filter(name => roundProgress(name, depositPrompts).done)
}

/** Every rendered string here, for the copy rule test. */
export function allRoundCopy(): string[] {
  return allRoundPrompts()
}

// Import time check, the same idea as the probe set and the area seeds: a
// domain with the wrong number of questions, a duplicate key, or two questions
// with the same text (which would both be answered by one deposit) would
// corrupt the tracking silently.
function assertRoundShape(): void {
  const keys = new Set<string>()
  const texts = new Set<string>()
  for (const q of ROUND_QUESTIONS) {
    if (keys.has(q.key)) throw new Error(`[assessmentRound] duplicate key: ${q.key}`)
    keys.add(q.key)
    const t = q.question.trim()
    if (texts.has(t)) throw new Error(`[assessmentRound] duplicate question text: ${q.key}`)
    texts.add(t)
  }
  for (const d of B2B_DOMAINS) {
    const qs = roundFor(d.name)
    const rules = qs.filter(q => q.kind === 'rule').length
    const deps  = qs.filter(q => q.kind === 'dependency').length
    if (rules !== RULES_PER_DOMAIN || deps !== DEPENDENCY_PER_DOMAIN) {
      throw new Error(`[assessmentRound] ${d.name} has ${rules} rule and ${deps} dependency questions, expected ${RULES_PER_DOMAIN} and ${DEPENDENCY_PER_DOMAIN}`)
    }
  }
  if (ROUND_QUESTIONS.length !== B2B_DOMAINS.length * ROUND_PER_DOMAIN) {
    throw new Error('[assessmentRound] a question names a domain that is not live')
  }
}
assertRoundShape()
