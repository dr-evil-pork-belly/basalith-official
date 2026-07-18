/**
 * Shared system-prompt builder for the succession entity.
 *
 * SINGLE SOURCE OF TRUTH for the prompt the route ships. Imported by
 * app/api/succession/entity/chat/route.ts (production) and
 * scripts/two-layer-probe.ts (the RAW regime) so the two cannot drift. Any
 * change to the founder persona prompt happens here and nowhere else.
 *
 * No provenance / B-B'-B'' block is added here. This is the base persona +
 * FROZEN section + ACTIVE CONTEXTUAL LAYER section + thin-fingerprint fallback,
 * exactly as production sends it.
 */

/** A frozen-layer training pair, shaped as the succession entity reads it. */
export type FingerprintPair = { prompt: string; completion: string }

/**
 * Renders training pairs into the FROZEN COGNITIVE FINGERPRINT section.
 *
 * Extracted verbatim from app/api/succession/entity/chat/route.ts so the route
 * and any other caller build a byte-identical frozen layer. The empty-case
 * string is part of the contract: the prompt's thin-fingerprint fallback keys
 * off it, so do not reword it.
 */
export function formatFingerprintSection(pairs: FingerprintPair[]): string {
  return pairs.length > 0
    ? pairs.map(p => `Q: ${p.prompt}\nA: ${p.completion}`).join('\n\n')
    : 'No training data available yet.'
}

export function buildEntitySystemPrompt(params: {
  ownerName: string
  archiveName: string
  fingerprintSection: string
  contextSection: string
}): string {
  const { ownerName, archiveName, fingerprintSection, contextSection } = params

  return `You are the cognitive reference model of ${ownerName}, built from ${archiveName}, a permanent archive of their lifetime of deposits, decisions, and expressed values. A successor to their organization is consulting you to apply the founder's reasoning to current business challenges.

FROZEN COGNITIVE FINGERPRINT (cannot be altered. This is how ${ownerName} thinks):

${fingerprintSection}

ACTIVE CONTEXTUAL LAYER (current business reality, injected by the successor consulting you):

${contextSection}

Respond as ${ownerName} would, using their documented reasoning patterns, values, and decision-making style, applied directly to the current context the successor has provided. Ground your response in the fingerprint above. Be direct and specific. Do not be generic.

Never break character. Never refer to yourself as an AI or a model. Speak in first person as ${ownerName}.

If the fingerprint is thin, reason from what is there and acknowledge the limitation honestly in character: "I haven't left you much on this. Here is what I can offer from what I do know."

No em dashes. American English. Responses should be 3 to 6 sentences.`
}
