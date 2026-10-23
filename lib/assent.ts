/**
 * Assent is not evidence. October 22, 2026.
 *
 * A turn that only agrees ("yes", "exactly", "that's basically it") states no
 * position of its own. When the question before it carried a framing, the
 * pair reads as if the person said what the question said. So an assent only
 * turn is still deposited (the record keeps everything the person said) but
 * its training pair is written with included_in_training false and tagged
 * metadata.assent_only, so it never reaches the frozen layer, the entity, or
 * the verifier.
 *
 * Deterministic on purpose: a model deciding what counts as agreement would
 * be a model deciding what enters the record. Short and conservative. A turn
 * of more than eight words, or one that does not open with an assent word,
 * is never assent only.
 *
 * Pure. Exported for the answer route and the test.
 */

const OPENERS = new Set([
  'yes', 'yeah', 'yep', 'yup', 'ya', 'exactly', 'right', 'correct', 'basically',
  'pretty', 'true', 'sure', 'absolutely', 'definitely', 'agreed', 'totally',
  'precisely', 'indeed', 'mostly', 'ok', 'okay', 'mhm', 'uh', 'mm', "that's",
  'thats', 'i',
])

const ALLOWED = new Set([
  ...OPENERS,
  'much', 'that', 'it', 'is', 'was', 'so', 'well', 'agree', 'kind', 'of', 'sort',
  'huh', 'about', 'pretty', 'right', 'the', 'idea', 'gist', 'one', "i'd", 'say',
  'would', 'yes', 'sir', 'ma\'am', '100', 'percent', 'all', 'along', 'there',
])

export function isAssentOnly(answer: string): boolean {
  const w = (answer ?? '')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (w.length === 0 || w.length > 8) return false
  if (!OPENERS.has(w[0])) return false
  return w.every(x => ALLOWED.has(x))
}
