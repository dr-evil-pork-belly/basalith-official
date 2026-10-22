/**
 * Incident interview — probe renderer.
 *
 * Pure function. Turns a probe-type decision plus the classifier's anchor into
 * the actual question text shown to the founder. This is rendered product copy,
 * so every output obeys the standing copy rules: no em dashes, American English,
 * short declarative sentences, no banned words, and nothing implying the entity
 * is conscious or alive. The voice is the interviewer asking the founder, the
 * same elicitation voice the daily questions already use.
 *
 * No Anthropic calls, no table access. Given the same input it always renders
 * the same string (variant selection is a deterministic hash of the anchor).
 *
 * October 13, 2026 (docs/QUESTION_LENSES_2026-10-13.md). Four changes, all
 * still deterministic: no model writes a question.
 *
 *   1. THE QUOTE IS GUARDED. The classifier is asked for a fragment that is
 *      "verbatim-ish" and nothing checked it, so "You said X" could hand a
 *      paraphrase back to a person as their own words, and the question text
 *      is stored as the deposit prompt. When the caller passes `answer`, a
 *      fragment is quoted only if it is a literal span of that answer, and it
 *      is quoted in the person's own casing, inside quotation marks.
 *   2. THE QUOTE IS USED. Six more probes carry it (OPTION, BASIS, BOUNDARY,
 *      ERROR, ANALOGUE, GOAL). Before, only CUE did.
 *   3. A SECOND ASK IS A DIFFERENT QUESTION. `reprobe` renders wording that
 *      asks for the concrete thing a thin answer left out. Before, the one
 *      allowed repeat rendered the same sentence again.
 *   4. THE TRADEOFF DOES NOT LEAD. When the caller passes `said`, the two
 *      goods are named only if both appear in the person's own words in this
 *      call. Otherwise the plain wording is used.
 *
 * And `lens` (lib/questionLens.ts) picks the wording of the probes that
 * assume a reader. A caller that passes none of the new fields gets the
 * behavior this module had before, except CALIBRATION, which gained a second
 * sentence for everyone.
 */

import type { ProbeType } from './incidentSession'
import type { QuestionLens } from './questionLens'

const TIMELINE_TEXT =
  'Walk me through what happened, in order. Do not explain the reasons yet, just the sequence.'

// ── Copy-rule guard ───────────────────────────────────────────────────────────

/**
 * Belt-and-suspenders: strip any em dash (or horizontal bar) from a rendered
 * string before it leaves this module, replacing it with a comma, which fits the
 * clause-joining role an em dash usually plays. The templates below contain none;
 * this exists so a future template edit cannot leak one past the copy rule.
 */
function stripEmDashes(s: string): string {
  return s
    .replace(/\s*[—―]\s*/g, ', ') // em dash / horizontal bar -> comma
    .replace(/\s+,/g, ',')                  // tidy any space before a comma
    .replace(/,\s*,/g, ',')                 // collapse double commas
    .replace(/,\s*\./g, '.')                // ", ." -> "."
    .trim()
}

// ── Anchor handling at the seam ───────────────────────────────────────────────

/** Trim whitespace, surrounding quotes, and trailing sentence punctuation so the
 *  anchor drops cleanly into a template. Anchor is already capped at 14 words
 *  upstream, so this only tidies the edges. */
function cleanAnchor(raw: string): string {
  return raw
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .trim()
    .replace(/[.,;:!?…]+$/g, '')
    .trim()
}

/** Lowercase the first letter for a mid-sentence seam, but keep the pronoun "I"
 *  and all-caps acronyms (USC, IPO) intact. */
function lowerSeam(a: string): string {
  if (!a) return a
  const firstWord = a.split(/\s+/)[0]
  if (firstWord === 'I' || /^I['’]/.test(firstWord)) return a
  if (firstWord.length > 1 && firstWord === firstWord.toUpperCase()) return a
  return a.charAt(0).toLowerCase() + a.slice(1)
}

// ── The guarded quote ─────────────────────────────────────────────────────────

const QUOTE_MIN_WORDS = 3
const QUOTE_MAX_WORDS = 14

/** Collapse whitespace and straighten apostrophes. Length preserving after the
 *  whitespace collapse, so an index into the folded string is an index into
 *  the collapsed one. */
function collapse(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}
function fold(s: string): string {
  return s.replace(/[‘’]/g, "'").toLowerCase()
}

/**
 * The span of `source` that `fragment` names, in the source's own casing, or
 * null when the fragment is not a literal span of it. Case and whitespace are
 * folded for the comparison and nothing else is: a paraphrase does not match.
 * The span must begin and end on a word boundary, run three to fourteen
 * words, and carry no quotation mark, em dash, or exclamation point (any of
 * which would have to be altered to render, and an altered quote is not a
 * quote). Exported for the test and for callers that need the same check.
 */
export function verbatimSpan(fragment: string, source: string | null | undefined): string | null {
  const frag = collapse(cleanAnchor(fragment ?? ''))
  const src  = collapse(source ?? '')
  if (!frag || !src) return null

  const fFold = fold(frag)
  const sFold = fold(src)
  // toLowerCase can change length on a few code points. If it did, an index
  // into the folded source is not an index into the source. Refuse.
  if (sFold.length !== src.length || fFold.length !== frag.length) return null

  const isWordChar = (c: string | undefined) => !!c && /[\p{L}\p{N}]/u.test(c)
  let at = sFold.indexOf(fFold)
  while (at !== -1) {
    const before = src[at - 1]
    const after  = src[at + fFold.length]
    if (!isWordChar(before) && !isWordChar(after)) break
    at = sFold.indexOf(fFold, at + 1)
  }
  if (at === -1) return null

  const span = src.slice(at, at + fFold.length)
  const words = span.split(' ').filter(Boolean).length
  if (words < QUOTE_MIN_WORDS || words > QUOTE_MAX_WORDS) return null
  if (/["“”—―!]/.test(span)) return null
  return span
}

/** True when `phrase` appears, case folded, somewhere in what the person said. */
function wasSaid(phrase: string, said: readonly string[]): boolean {
  const p = fold(collapse(phrase))
  if (!p) return false
  return said.some(s => fold(collapse(s ?? '')).includes(p))
}

type Lead = 'said' | 'mentioned'

/** The lead sentence that carries a quote, or '' when there is none. */
function lead(span: string | null, kind: Lead): string {
  if (!span) return ''
  return kind === 'said' ? `You said "${span}." ` : `You mentioned "${span}." `
}

// ── Variant selection ─────────────────────────────────────────────────────────

/** Deterministic, cheap hash of the anchor to choose a variant, so the cadence
 *  rotates instead of always emitting variant 1. Empty anchor -> variant 0. */
function pickVariant(anchor: string, variants: string[]): string {
  if (variants.length === 1) return variants[0]
  let h = 0
  for (let i = 0; i < anchor.length; i++) h = (h * 31 + anchor.charCodeAt(i)) >>> 0
  return variants[h % variants.length]
}

// ── Tradeoff ──────────────────────────────────────────────────────────────────

// Asked when the two goods cannot be named in the person's own words. Three,
// because the battery asks up to three and must not ask the same one twice.
const TRADEOFF_PLAIN = [
  'When two things you cared about pulled against each other here, which gave way?',
  'What did this decision cost you? Would you pay it again?',
  'What did you give up to do it this way?',
]

function renderTradeoff(tension: string | undefined, said: readonly string[] | undefined, index: number): string {
  if (tension) {
    const parts = tension.split(/\s+vs\.?\s+/i).map(p => p.trim()).filter(Boolean)
    // The classifier may name a tension that is only implied. Putting its two
    // words in front of a person and asking them to pick one is leading. With
    // `said`, both sides must be the person's own words in this call.
    const theirs = !said || (parts.length === 2 && wasSaid(parts[0], said) && wasSaid(parts[1], said))
    if (parts.length === 2 && theirs) {
      const x = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
      const y = parts[1]
      return `Suppose you could not protect both. ${x} or ${y}, which goes, and why?`
    }
  }
  if (!said) return TRADEOFF_PLAIN[0]
  const i = Number.isFinite(index) && index >= 0 ? Math.floor(index) : 0
  return TRADEOFF_PLAIN[i % TRADEOFF_PLAIN.length]
}

// ── Lens wording ──────────────────────────────────────────────────────────────
// Only the probes that assume a reader change by lens. Everything else is
// shared. A caller with no lens gets the wording this module always had.

const ERROR_LEGACY = 'Someone capable but new inherits this exact situation. Where do they get it wrong?'
const ERROR_TRAP   = 'What is the trap here that is not obvious?'

const ERROR_BY_LENS: Record<QuestionLens, string> = {
  personal:    'Someone you love faces this same choice years from now. Where do they go wrong?',
  succession:  'The person who takes over faces this exact situation in the first year. Where do they get it wrong?',
  acquisition: 'A new owner faces this exact situation in the first ninety days. Where do they get it wrong?',
  church:      'The next person in your seat faces this exact situation. Where do they get it wrong?',
}

// The rule level BOUNDARY, asked once after the last decision point.
const RULE_BOUNDARY_BY_LENS: Record<QuestionLens, string> = {
  personal:    'When would you tell someone you love to do the opposite?',
  succession:  'When should the person who takes over break this rule?',
  acquisition: 'Where is this written down, and where does what you do depart from it?',
  church:      'Where does what you do here depart from what is written down, and why?',
}

const GOAL_DEFAULT = 'Set the decision aside. What were you actually trying to protect?'
const GOAL_CHURCH  = 'Set the decision aside. Who or what were you trying to protect?'

const READ_PLAIN = 'What was your read on the people involved while this was happening?'

const CALIBRATION_TEXT = 'How sure were you when you decided? What would have made you surer?'

// ── The second ask ────────────────────────────────────────────────────────────
// Rendered when the reducer repeats a spine position because the first answer
// carried no cue, rule, boundary, or rejected option. Each asks for the
// concrete thing a thin answer leaves out. Never quotes the thin answer.

const REPROBE: Partial<Record<ProbeType, string>> = {
  CUE:      'Take me to the day. What did you see or hear first?',
  OPTION:   'Name one thing you could have done instead. Why did you not do it?',
  BASIS:    'Give me the one fact that settled it. If it had been different, what would you have done?',
  BOUNDARY: 'Has there been a time you did go the other way? What was different that time?',
  ERROR:    'Tell me about someone you watched get this wrong. What did they miss?',
}

/** Every string this module can render on its own (no quote, no tension, no
 *  names), for the copy rule test. */
export function allProbeCopy(): string[] {
  return [
    TIMELINE_TEXT,
    'What was the first sign that something was off?',
    'What was the first sign, before that, that something was off?',
    'Once you saw that, what did you seriously consider doing? Include what you decided against.',
    'What finally tipped it?',
    'Why that one over the next best option?',
    'What would have had to be different for you to go the other way?',
    'Under what conditions do you reverse this?',
    'Had you seen this shape before? What did it remind you of?',
    ERROR_LEGACY,
    ERROR_TRAP,
    ...Object.values(ERROR_BY_LENS),
    ...Object.values(RULE_BOUNDARY_BY_LENS),
    GOAL_DEFAULT,
    GOAL_CHURCH,
    'In that moment, what were you most trying to protect?',
    READ_PLAIN,
    CALIBRATION_TEXT,
    ...TRADEOFF_PLAIN,
    ...Object.values(REPROBE),
    'You said',
    'You mentioned',
  ]
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function renderProbe(input: {
  probeType: ProbeType | 'SEED' | 'TIMELINE'
  anchor: string
  seedText?: string
  tensionForTradeoff?: string
  /**
   * The answer the anchor was drawn from. When given, the anchor is quoted
   * only if it is a literal span of this text (verbatimSpan). When omitted,
   * CUE quotes the anchor unchecked, as it always did, and no other probe
   * quotes at all.
   */
  answer?: string
  /** False when the anchor belongs to a different decision point than the
   *  probe being rendered (the first probe of a new branch). Default true. */
  quote?: boolean
  /** Everything the person has said in this call. Gates the tradeoff naming. */
  said?: readonly string[]
  /** The reducer is repeating this spine position after a thin answer. */
  reprobe?: boolean
  /** 'rule' for the two probes asked once after the last decision point. */
  level?: 'branch' | 'rule'
  /** Position in the tradeoff battery, zero based. */
  tradeoffIndex?: number
  /** Who is being asked (lib/questionLens.ts). */
  lens?: QuestionLens
}): string {
  const anchor = cleanAnchor(input.anchor ?? '')
  const lens   = input.lens
  const rule   = input.level === 'rule'
  const guarded = typeof input.answer === 'string'
  // The person's own words, or null. Never on a second ask, never across
  // decision points, and never on the two rule level probes (the answer
  // before each was about something else).
  const span =
    guarded && input.quote !== false && !input.reprobe && !rule
      ? verbatimSpan(anchor, input.answer)
      : null
  let out: string

  if (input.reprobe && REPROBE[input.probeType as ProbeType]) {
    return stripEmDashes(REPROBE[input.probeType as ProbeType] as string)
  }

  switch (input.probeType) {
    case 'SEED':
      // Authored copy from b2b_questions. Returned verbatim, never paraphrased
      // (the em-dash guard still runs, but our seeds carry none).
      out = (input.seedText ?? '').trim()
      break

    case 'TIMELINE':
      out = TIMELINE_TEXT
      break

    case 'CUE':
      if (guarded) {
        out = span
          ? `${lead(span, 'said')}What was the first sign, before that, that something was off?`
          : 'What was the first sign that something was off?'
      } else {
        out = anchor
          ? `You said ${lowerSeam(anchor)}. What was the first sign, before that, that something was off?`
          : 'What was the first sign that something was off?'
      }
      break

    case 'OPTION':
      out = `${lead(span, 'mentioned')}Once you saw that, what did you seriously consider doing? Include what you decided against.`
      break

    case 'BASIS':
      out = lead(span, 'said') + pickVariant(anchor, [
        'What finally tipped it?',
        'Why that one over the next best option?',
      ])
      break

    case 'BOUNDARY':
      if (rule && lens) {
        out = RULE_BOUNDARY_BY_LENS[lens]
      } else {
        out = lead(span, 'mentioned') + pickVariant(anchor, [
          'What would have had to be different for you to go the other way?',
          'Under what conditions do you reverse this?',
        ])
      }
      break

    case 'TRADEOFF':
      out = renderTradeoff(input.tensionForTradeoff, input.said, input.tradeoffIndex ?? 0)
      break

    case 'ANALOGUE':
      out = `${lead(span, 'mentioned')}Had you seen this shape before? What did it remind you of?`
      break

    case 'ERROR':
      out = lead(span, 'said') + pickVariant(anchor, [
        lens ? ERROR_BY_LENS[lens] : ERROR_LEGACY,
        ERROR_TRAP,
      ])
      break

    case 'GOAL':
      out = lead(span, 'said') + (lens === 'church' ? GOAL_CHURCH : GOAL_DEFAULT)
      break

    // ── Incident-level coverage dimensions ──────────────────────────────────────

    case 'STAKE':
      out = 'In that moment, what were you most trying to protect?'
      break

    case 'READ':
      // anchor is the people the timeline named (see the answer route). The reducer
      // never emits READ without an anchor, so a nameless READ would be a bug; guard
      // anyway and fall back to a people-generic phrasing rather than a blank name.
      // A church call never puts a name in a question: the line above the call
      // asks the person to leave names out, and the question must not bring
      // them back.
      out = anchor && lens !== 'church'
        ? `What was your read on ${anchor} while this was happening?`
        : READ_PLAIN
      break

    case 'CALIBRATION':
      out = CALIBRATION_TEXT
      break

    default: {
      // The union is fully covered above; this keeps the switch exhaustive.
      const _exhaustive: never = input.probeType
      out = _exhaustive
    }
  }

  // Only when there is one to strip: the tidy steps in stripEmDashes touch
  // commas, and a quoted span must leave here exactly as the person said it.
  return /[—―]/.test(out) ? stripEmDashes(out) : out
}
