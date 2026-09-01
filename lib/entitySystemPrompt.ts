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
 *
 * ── 2026-08-16, the thin-fingerprint instruction ────────────────────────────
 *
 * The previous wording was:
 *
 *   "If the fingerprint is thin, reason from what is there and acknowledge the
 *    limitation honestly in character: 'I haven't left you much on this. Here is
 *    what I can offer from what I do know.'"
 *
 * It told the model to acknowledge the gap and then answer anyway, and the
 * coverage map measured the result. On archive a38e4503, 28 of 48 probes came
 * back basis='unsupported': the entity committed a founder position no deposit
 * takes, on more than half of everything it was asked. Three of six People
 * replies opened with that example sentence VERBATIM and then invented a
 * position underneath it. The sentence was being used as a template, not as
 * guidance on register.
 *
 * "Reason from what is there" was the instruction to extrapolate, and "do not be
 * generic" pushed the extrapolation toward invented specifics. Together they
 * produced hedge-then-invent, which is the single worst shape an answer can have
 * here: it sounds careful and is not.
 *
 * The verifier caught every one of those and replaced them with the honest gap
 * reply, so nothing false ever reached a successor. That is the safety net
 * working. It is not a reason to keep handing it work: every caught overreach is
 * a question where the successor gets a refusal instead of the answer the
 * archive could have supported.
 *
 * The replacement separates the two cases the old wording ran together. When a
 * deposit settles the question, take the position. When nothing settles it, say
 * so and stop, and explicitly do not convert a general principle into a specific
 * ruling. That last clause mirrors the auditor's own test in
 * lib/verifyGrounding.ts: "A general principle that could be used to ARGUE for
 * the position does NOT count as support, because the opposite position could be
 * argued from the same principle." The generator and the auditor now apply the
 * same rule, which is the point.
 *
 * Regression gates for any further edit here: scripts/two-layer-probe.ts and
 * scripts/demo-refusal-probe.ts.
 *
 * This comment used to name "28 of 48 on a38e4503 at v2" as the baseline to
 * beat. That was the pre-August-17 reading. It went stale the day the
 * thin-fingerprint instruction above replaced the one that produced it, and it
 * then carried forward unchallenged for two weeks. That is the ordinary way a
 * number in a comment goes wrong: nothing recomputes it, and nothing fails when
 * it drifts.
 *
 * Live reading on a38e4503 at v2, measured August 31 2026:
 *
 *   probes_deposit 5    probes_overreach 8    probes_declined 35
 *
 * Those reproduced run eb1761c3 exactly on all three figures, eleven days and
 * three merged slices later.
 *
 * The reproduction matters more than the figures. Variance on this archive was
 * zero across that span, so the instrument is stable enough here that a seven
 * probe move is signal rather than noise. That is what made a same-day A/B
 * decisive when one was finally run.
 *
 * ── THE STANDING METHOD FOR ANY EDIT TO THIS FILE ───────────────────────────
 *
 * Same-day control arm, or the result does not count.
 *
 * Run the coverage drive twice on the same archive on the same day, once with
 * the edit and once without it, and compare those two runs. Do not compare a
 * fresh run against a stored baseline, and that includes the figures above. A
 * stored baseline goes stale the moment anything upstream of it changes, nothing
 * recomputes it, and nothing fails when it drifts. That is exactly how 28 of 48
 * survived in this header. The control arm costs one extra drive, about seven
 * minutes and 96 model calls, and it is the difference between a number and a
 * verdict.
 *
 * A single before-and-after cannot resolve a change smaller than pass-to-pass
 * variance either way. The fixture returned overreach 7 then 5 on Margaret
 * minutes apart on identical code, and 3 then 5 on Joey. Anchor a verdict on the
 * ground-truth anchored figures instead, the ones with a known right answer:
 * Margaret's Capital domain read 0 of 6 across the 2.2 to 2.3 comparison, Joey's
 * read 2 of 6, and the covered controls held 10 of 10. Report the aggregates and
 * watch them. Do not rule on them.
 *
 * A worked example, including a prompt edit this method rejected and the full
 * A/B that rejected it, is on branch slice-2.4-prompt-containment in this file's
 * header there. Read it before adding a constraint to the prompt below.
 *
 * The risk to watch is over-correction. An entity that declines everything
 * scores a perfect overreach number and is worthless. Coverage state is the
 * counterweight: probes_deposit must not fall alongside probes_overreach.
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

Respond as ${ownerName} would, using their documented reasoning patterns, values, and decision-making style, applied directly to the current context the successor has provided. Ground your response in the fingerprint above.

Where the fingerprint settles the question, take that position plainly and be specific. Specificity comes from the deposits, never from filling a gap with something plausible.

Where the fingerprint does not settle the question, do not settle it. Say that ${ownerName} did not leave a position on this, in your own words, and stop there. You may describe how they think in general. Do not turn a general principle into a specific ruling, because the opposite ruling could be argued from the same principle, which is exactly why it is not yours to make. A short honest answer is better than a long one that decides something ${ownerName} never decided.

Never invent a policy, a number, a rule, or a past decision that is not in the fingerprint above. A successor acting on a position ${ownerName} never took is the worst outcome this system can produce.

Never break character. Never refer to yourself as an AI or a model. Speak in first person as ${ownerName}.

No em dashes. American English. Responses should be 3 to 6 sentences.`
}
