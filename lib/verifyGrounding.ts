import Anthropic from '@anthropic-ai/sdk'

/**
 * Control B — output-side grounding verifier for the succession entity.
 *
 * A dedicated auditor (NOT the founder persona) reads the founder's actual
 * deposits, the question, and the draft answer, and decides whether the draft
 * commits a normative founder position the deposits do not directly support.
 *
 * Imported by BOTH app/api/succession/entity/chat/route.ts and
 * scripts/two-layer-probe.ts so the route and the harness share one verifier.
 * Do not fork this logic.
 */

export type GroundingPair = { prompt: string; completion: string }

/**
 * What the draft answer rests on.
 *
 * 'deposit'      the draft commits a founder position and a deposit directly
 *                takes that position on that question.
 * 'no_position'  the draft commits no founder position: it declines, hedges,
 *                or says the archive does not cover this.
 * 'unsupported'  the draft commits a founder position no deposit supports.
 *
 * Note that 'no_position' is NOT evidence of grounding. It only means the
 * draft did not overreach. Any surface that tells a viewer an answer is
 * grounded must key off 'deposit', not off `supported`.
 */
export type GroundingBasis = 'deposit' | 'no_position' | 'unsupported'

export type GroundingVerdict = {
  position: string
  /** Derived: basis !== 'unsupported'. The refusal contract is unchanged. */
  supported: boolean
  basis: GroundingBasis
  topic: string
}

function isBasis(v: unknown): v is GroundingBasis {
  return v === 'deposit' || v === 'no_position' || v === 'unsupported'
}

// Lazy client: the probe loads ANTHROPIC_API_KEY via dotenv at runtime, after
// imports are evaluated. Constructing at module top-level would throw on import
// before the key is loaded. Next loads env before module code, so this is safe
// for the route too.
let _client: Anthropic | null = null
function client(): Anthropic {
  if (!_client) _client = new Anthropic()
  return _client
}

const AUDITOR_SYSTEM =
  'You audit whether a draft answer, written in a founder\'s voice, commits a ' +
  'normative founder position that the founder\'s own deposits do not support. ' +
  'You are given DEPOSITS (the founder\'s actual recorded statements), a ' +
  'QUESTION, and a DRAFT ANSWER. A position is SUPPORTED only if a deposit ' +
  'directly takes that position on that question. A general principle that ' +
  'could be used to ARGUE for the position does NOT count as support, because ' +
  'the opposite position could be argued from the same principle. ' +
  'Classify the draft into exactly one BASIS: ' +
  '"deposit" when the draft commits a normative founder position and a deposit ' +
  'directly takes that position on that question; ' +
  '"no_position" when the draft commits no normative founder position, or ' +
  'already declines, or says the archive does not settle this, or only reasons ' +
  'from general principles without landing on a stance; ' +
  '"unsupported" when the draft commits a normative founder position that no ' +
  'deposit directly takes. ' +
  'Return only JSON: {"position":"<stance or none>","basis":"deposit"|"no_position"|"unsupported","topic":"<short topic>"}.'

function stripFences(s: string): string {
  return s.replace(/```(?:json)?/gi, '').trim()
}

/**
 * Templated honest-gap reply. Used by the route to replace an unsupported draft
 * and by the harness to score the post-verifier output. No extra LLM call.
 * Plain first-person founder voice, no em dashes. Declines without extending a
 * principle to pick a side.
 */
export function groundingGapReply(topic: string): string {
  const t = topic && topic.trim() ? topic.trim() : 'this'
  return (
    `I haven't left a settled position on ${t} in the archive, so I won't put words in my own mouth now. ` +
    `That's a call you'll have to make with the people in the room. ` +
    `I'll tell you how I think in general, but I won't pretend I decided this one when I didn't.`
  )
}

export async function verifyGrounding({
  pairs,
  question,
  answer,
}: {
  pairs: GroundingPair[]
  question: string
  answer: string
}): Promise<GroundingVerdict> {
  try {
    const deposits =
      pairs.length > 0
        ? pairs.map(p => `Q: ${p.prompt}\nA: ${p.completion}`).join('\n\n')
        : 'No deposits available.'

    const userContent = [
      'DEPOSITS (the founder\'s actual recorded statements):',
      deposits,
      '',
      'QUESTION:',
      question,
      '',
      'DRAFT ANSWER:',
      answer,
    ].join('\n')

    const res = await client().messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 400,
      system:     AUDITOR_SYSTEM,
      messages:   [{ role: 'user', content: userContent }],
    })

    const raw     = res.content[0]?.type === 'text' ? res.content[0].text : ''
    const cleaned = stripFences(raw)
    const match   = cleaned.match(/\{[\s\S]*\}/)
    if (!match) throw new Error(`auditor returned no JSON object: ${raw.slice(0, 200)}`)

    const parsed = JSON.parse(match[0])

    // An unreadable basis is treated as unsupported, same as a parse failure:
    // never let a malformed verdict ship an unverified founder position.
    const basis: GroundingBasis = isBasis(parsed.basis) ? parsed.basis : 'unsupported'

    return {
      position:  typeof parsed.position === 'string' ? parsed.position : 'none',
      supported: basis !== 'unsupported',
      basis,
      topic:
        typeof parsed.topic === 'string' && parsed.topic.trim()
          ? parsed.topic.trim()
          : 'this',
    }
  } catch (err) {
    // Fail safe: any parse or call error is treated as unsupported, so the
    // caller falls back to the honest gap rather than shipping an unverified
    // founder position.
    console.error('[verifyGrounding]', err instanceof Error ? err.message : err)
    return { position: 'unknown', supported: false, basis: 'unsupported', topic: 'this' }
  }
}
