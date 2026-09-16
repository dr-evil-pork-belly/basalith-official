import Anthropic from '@anthropic-ai/sdk'

/**
 * Control B, the output-side grounding verifier for the succession entity.
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
export function groundingGapReply(topic: string, language: string = 'en'): string {
  const t = topic && topic.trim() ? topic.trim() : 'this'
  const lang = normalizeGapLanguage(language)
  if (lang !== 'en') return GAP_REPLY_BY_LANGUAGE[lang]
  return (
    `I haven't left a settled position on ${t} in the archive, so I won't put words in my own mouth now. ` +
    `That's a call you'll have to make with the people in the room. ` +
    `I'll tell you how I think in general, but I won't pretend I decided this one when I didn't.`
  )
}

/**
 * The same decline in the languages the product already serves by email
 * (lib/emailTranslations.ts). Added September 16, 2026 for the family entity,
 * whose callers write in their own languages. English is unchanged byte for
 * byte, because scripts/two-layer-probe.ts scores against it.
 *
 * These carry no topic. The auditor names the topic in English, and an
 * English phrase inside a Vietnamese sentence reads as exactly the seam it
 * is. A decline that names nothing is honest; a decline that half-translates
 * is not. Each string is a plain first-person refusal to invent a position,
 * with no template phrase a model could echo back. A native reader should
 * confirm each one before an archive in that language moves onto the
 * grounded route (the per-archive switch exists for this).
 */
export type GapReplyLanguage = 'en' | 'es' | 'ja' | 'ko' | 'tl' | 'vi' | 'yue' | 'zh'

export const GAP_REPLY_BY_LANGUAGE: Record<Exclude<GapReplyLanguage, 'en'>, string> = {
  es:  'No dejé una postura definida sobre esto en mi archivo, así que no voy a poner palabras en mi propia boca ahora. Esa es una decisión que tendrán que tomar entre ustedes. Puedo contarles cómo pienso en general, pero no voy a fingir que decidí esto cuando no lo hice.',
  ja:  'この件について、私はアーカイブにはっきりした考えを残していません。だから今、自分の口で言っていないことを言うつもりはありません。それは、そこにいる人たちと相談して決めることです。私がふだんどう考えるかは話せますが、決めていないことを決めたふりはしません。',
  ko:  '이 문제에 대해 나는 기록에 분명한 입장을 남기지 않았다. 그래서 지금 내가 하지 않은 말을 내 입에 넣지 않겠다. 그건 그 자리에 있는 사람들과 함께 내려야 할 결정이다. 내가 대체로 어떻게 생각하는지는 말해 줄 수 있지만, 결정하지 않은 일을 결정한 척하지는 않겠다.',
  tl:  'Wala akong iniwang malinaw na paninindigan tungkol dito sa aking archive, kaya hindi ko ilalagay ngayon sa sarili kong bibig ang hindi ko sinabi. Desisyon iyan na kailangan ninyong pagpasyahan kasama ang mga taong nandiyan. Masasabi ko kung paano ako mag-isip sa pangkalahatan, pero hindi ako magpapanggap na napagpasyahan ko ito gayong hindi naman.',
  vi:  'Tôi không để lại một lập trường rõ ràng về chuyện này trong hồ sơ của mình, nên bây giờ tôi sẽ không nói điều mà tôi chưa từng nói. Đó là quyết định mà các con phải cùng nhau đưa ra. Tôi có thể kể cách tôi thường suy nghĩ, nhưng tôi sẽ không giả vờ là mình đã quyết định khi tôi chưa hề quyết định.',
  yue: '呢件事我嘅檔案入面唔存在一個確定嘅立場，所以我家下唔會把我沒講過嘅話放入自己把口。呢個決定要你地同在場嘅人一齊做。我可以講下我平時點諸計，但我唔會裝作自己決定咗一件我沒決定過嘅事。',
  zh:  '关于这件事，我在档案里没有留下明确的立场，所以现在我不会把我没说过的话安在自己嘴上。这个决定要你们和在场的人一起做。我可以说说我平时怎么想，但我不会假装自己决定过一件我没决定过的事。',
}

/** 'en' for anything not in the table, including null and unknown codes. */
export function normalizeGapLanguage(language: string | null | undefined): GapReplyLanguage {
  const code = (language ?? '').trim().toLowerCase()
  if (code in GAP_REPLY_BY_LANGUAGE) return code as GapReplyLanguage
  return 'en'
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
