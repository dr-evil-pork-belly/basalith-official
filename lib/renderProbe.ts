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
 */

import type { ProbeType } from './incidentSession'

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

function renderTradeoff(tension?: string): string {
  if (tension) {
    const parts = tension.split(/\s+vs\.?\s+/i).map(p => p.trim()).filter(Boolean)
    if (parts.length === 2) {
      const x = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
      const y = parts[1]
      return `Suppose you could not protect both. ${x} or ${y}, which goes, and why?`
    }
  }
  return 'When two things you cared about pulled against each other here, which gave way?'
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function renderProbe(input: {
  probeType: ProbeType | 'SEED' | 'TIMELINE'
  anchor: string
  seedText?: string
  tensionForTradeoff?: string
}): string {
  const anchor = cleanAnchor(input.anchor ?? '')
  let out: string

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
      out = anchor
        ? `You said ${lowerSeam(anchor)}. What was the first sign, before that, that something was off?`
        : 'What was the first sign that something was off?'
      break

    case 'OPTION':
      out = 'Once you saw that, what did you seriously consider doing? Include what you decided against.'
      break

    case 'BASIS':
      out = pickVariant(anchor, [
        'What finally tipped it?',
        'Why that one over the next best option?',
      ])
      break

    case 'BOUNDARY':
      out = pickVariant(anchor, [
        'What would have had to be different for you to go the other way?',
        'Under what conditions do you reverse this?',
      ])
      break

    case 'TRADEOFF':
      out = renderTradeoff(input.tensionForTradeoff)
      break

    case 'ANALOGUE':
      out = 'Had you seen this shape before? What did it remind you of?'
      break

    case 'ERROR':
      out = pickVariant(anchor, [
        'Someone capable but new inherits this exact situation. Where do they get it wrong?',
        'What is the trap here that is not obvious?',
      ])
      break

    case 'GOAL':
      out = 'Set the decision aside. What were you actually trying to protect?'
      break

    default: {
      // The union is fully covered above; this keeps the switch exhaustive.
      const _exhaustive: never = input.probeType
      out = _exhaustive
    }
  }

  return stripEmDashes(out)
}
