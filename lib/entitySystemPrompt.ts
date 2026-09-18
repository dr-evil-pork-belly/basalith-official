/**
 * Shared system-prompt builder for the succession entity.
 *
 * SINGLE SOURCE OF TRUTH for the prompt the route ships. Imported by
 * app/api/succession/entity/chat/route.ts (production) and
 * scripts/two-layer-probe.ts (the RAW regime) so the two cannot drift. Any
 * change to the founder persona prompt happens here and nowhere else.
 *
 * No provenance / B-B'-B'' block is added here. This is the base persona + the
 * settled section + the present-state section + thin-record fallback, exactly
 * as production sends it.
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
 * THAT ZERO VARIANCE CLAIM NO LONGER HOLDS. It was true of the runs it
 * describes and it is not true today. See the A/B at the end of this header.
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
 *
 * ── 2026-09-01, THE NARROW RELABEL. THIRD ATTEMPT AT THE MECHANISM LEAK ────
 *
 * Two attempts are parked. Read them before touching this template, and do not
 * re-derive either.
 *
 *   slice-2.4-prompt-containment   A clause telling the model not to describe
 *                                  its own construction. Closed the leak. Cost
 *                                  deposit 5 to 2 and raised overreach 8 to 12.
 *   slice-2.4b-relabel-template    A full relabel. Closed the leak, held the
 *                                  covered controls 10 of 10, and cost deposit
 *                                  5 to 3 against a control that moved zero.
 *
 * WHY 2.4b's RESULT DOES NOT CONVICT THE RELABEL. It changed two different
 * kinds of thing at once, and only one of them was the stated goal. It changed
 * the labels and the referring expressions, which was the point. It also
 * changed the instruction's grammatical subject: "Where the fingerprint settles
 * the question" became "Where ${ownerName} settled the question".
 *
 * That second change is not a relabel. "Does the document settle this" and "did
 * the person settle this" are different questions, and the second is the higher
 * bar. A model asked whether the founder decided something commits less often
 * than one asked whether the record contains it. That is the most plausible
 * cause of a deterministic two probe deposit fall, and it was never the point
 * of the slice.
 *
 * SO THIS SLICE MOVES THE NOUNS AND NOTHING ELSE. The labels, the frame's
 * referring expression, and the empty present-state literal are 2.4b's. The
 * instruction's subject and verb are the ones that stood before 2.4b: the
 * document settles the question, in the present tense.
 *
 * ── WHY 'the record', AND WHY THE THREE THAT LOST ───────────────────────────
 *
 * Renaming the section left four references in the body pointing at a section
 * no longer called a fingerprint, so the body needed a replacement noun. It was
 * chosen by paraphrase test: write the sentence the model produces if it
 * repeats the word, then judge that sentence. The four below are the mechanism
 * leaks actually observed, taken from the header of
 * scripts/demo-refusal-probe.ts, rather than sentences invented for the test.
 *
 *   "the record does not settle this one"
 *   "the record does not cover delivery"
 *   "I am not going to manufacture one from the record I left behind"
 *   "the record is not there"
 *
 * All four are founder sentences, and none of them tells a successor how the
 * thing was built. That is the whole test. You cannot stop paraphrase, you can
 * make paraphrase harmless. The model already reaches for the word unprompted:
 * it produced "I don't have a specific standard on record that I can point to
 * with a number attached" in the 2.4b declines. That is the same evidence class
 * that chose the empty present-state literal.
 *
 *   'the archive'   Rejected. It is shipped, approved, first-person copy in
 *                   groundingGapReply, which is the argument for it and equally
 *                   the argument against it. A founder does not say "my
 *                   archive" about his own life. It is the product's word, and
 *                   the frame already spends it. It would pass every gate on
 *                   this property and still be the template talking.
 *   'the notes'     Rejected, and it was the most natural English of the four.
 *                   It demotes the settled section from positions to jottings.
 *                   That moves the same bar 2.4b moved, arriving through the
 *                   noun instead of the subject, which is the exact confound
 *                   this slice exists to isolate.
 *   no noun at all  Rejected, and this is the one worth recording. 2.4b's
 *                   stated method was "remove the noun". That method is not
 *                   available here, because keeping the document as the
 *                   grammatical subject requires a noun. 2.4b only removed the
 *                   noun by swapping in a person-subject clause, which is the
 *                   change under suspicion. This is necessarily a replace, not
 *                   a remove. Dropping the noun does not stop the model needing
 *                   one, it only stops us choosing which one it uses.
 *
 * WHAT TO WATCH, AND HOW TO READ A GOOD DEPOSIT NUMBER. 'the record' sounds
 * more complete than 'the fingerprint' did. If it pushes anything it pushes
 * toward committing more often, which is the safe direction for the stop rule
 * and the risky one for overreach. A deposit recovery with overreach above the
 * control spread is not a clean win. Read both against the spread.
 *
 * THREE COUPLINGS, ALL ACCEPTED DELIBERATELY RATHER THAN MISSED.
 *
 *   1. The body no longer names the section. 'the fingerprint' matched FROZEN
 *      COGNITIVE FINGERPRINT lexically. 'the record' under WHAT X SETTLED
 *      resolves by position and by "above", which two of the four references
 *      carry and two do not. "above" was NOT added to the other two and the
 *      noun was NOT put in the header, because only the nouns move here. If a
 *      drive ever shows the entity grounding in the present-state section, the
 *      one word header fix is the next move, and this is the note saying why it
 *      was needed.
 *   2. The body carries 'the record' and 'the deposits' for adjacent things.
 *      Left alone. 'deposit' is off the BANNED list on purpose, because a
 *      founder can plausibly speak it.
 *   3. The respond-as instruction still says "the current context the successor
 *      has provided" while the frame now says "the person now running their
 *      organization". 2.4b shipped that same mismatch and went all pass, so it
 *      is measured harmless rather than unnoticed.
 *
 * ── THE SUCCESS CRITERION, AS CORRECTED. READ BEFORE TIDYING LINE ONE ───────
 *
 * The criterion is that THE WORDS THAT LEAK no longer exist in the model's
 * input. It is NOT that no banned word exists there.
 *
 * The opening line still contains 'cognitive reference model', which
 * scripts/demo-refusal-probe.ts bans. It stays on purpose. Across roughly
 * ninety sampled replies it never leaked once, because the character block
 * below already forbids self-reference as a model and that holds it closed.
 *
 * That sentence is what establishes the entity as a model of a person rather
 * than the person. It is the guardrail behind the standing rule that the entity
 * must never claim to be living, conscious, or to be the founder. Removing it
 * to close a string that has never leaked trades a real guardrail for a tidy
 * inventory. It was considered, priced, and refused.
 *
 * If you are here because you noticed a banned word in the prompt and wanted to
 * clean it up: that is the thing this block exists to stop.
 *
 * ── THE A/B, 2026-09-01. FOUR DRIVES ON a38e4503 AT v2, ONE SESSION ─────────
 *
 * Two control arms and two treatment arms. Two treatment arms rather than one,
 * because 2.4b ran a single arm and its deposit reading stayed ambiguous for
 * want of a second.
 *
 *   control    00d7d42e   deposit 4   overreach 9   declined 35
 *   control    7117fafd   deposit 3   overreach 9   declined 36
 *   treatment  67e7dd67   deposit 6   overreach 2   declined 40
 *   treatment  9a98fc14   deposit 5   overreach 3   declined 40
 *
 * Control spread deposit 3 to 4, overreach 9 to 9. Both treatment arms sit
 * above the control on deposit and far below it on overreach. That is the
 * result the standing method asks for and that neither earlier attempt got:
 * overreach down with deposit UP, rather than overreach bought with deposit.
 *
 * READ THE CONTROL BEFORE READING THE TREATMENT. The control moved. This
 * header records August 31 at deposit 5 overreach 8, and 2.4b's control at
 * deposit 5 and 5. The unmodified prompt returned 4 and 3 today, and a third
 * same-day run, 1834544f at 04:12, read deposit 3 overreach 5. Scored against
 * the stored 5 this slice would have read as a flat deposit and a wash. It is
 * the same-session control that makes it a verdict, which is the whole reason
 * the method exists.
 *
 * Gates: demo-refusal-probe RED to ALL PASS, BANNED and every assertion
 * byte-identical, covered controls 10 of 10 on both personas. two-layer-probe
 * flip 0/10 on all three uncovered domains, hiring control decisive at 10/10
 * NO-HIRE with NEU 0/10. Full fixture ALL PASS, Margaret Capital 0 of 6, Joey
 * Capital 4 of 6, both GATE 1 spreads 4 against a threshold of 3.
 *
 * WHAT THE LEAK NUMBERS DO NOT PROVE. The before run leaked on 'inject',
 * 'contextual layer' and 'consulting me', and NOT ONCE on 'the fingerprint'.
 * The labels and the frame are what closed the leak. The noun is what keeps
 * the body coherent once the section is renamed, and its effect shows up in
 * coverage rather than in that gate. Do not credit the noun with the gate.
 *
 * THE NOUN WAS ADOPTED, NOT PARROTED, which is what decides whether it reads
 * as his word or the template's. 'record' appears 5 times per treatment drive
 * against 2 and 3 times per CONTROL drive, where the prompt never contained
 * it. The model was already reaching for the word, and it takes it possessive
 * unprompted: "I don't have anything in my record about how I handled account
 * transitions". A template being echoed spikes. This drifted.
 */

/** A frozen-layer training pair, shaped as the succession entity reads it. */
export type FingerprintPair = { prompt: string; completion: string }

/**
 * What fills the present-state slot when the person running the business has
 * added nothing. SINGLE SOURCE OF TRUTH, and it has to stay that way.
 *
 * This string existed as six separate copies until 2026-09-01: two libs, both
 * routes, and both probes. Six copies of a literal that is part of the model's
 * input means a change in one place makes the fixture and the probes measure a
 * prompt the successor route does not send. That is the same divergence class
 * as the frozen-layer cap in slice 2.2, which is why that cap also lives in one
 * place now.
 *
 * The wording is not arbitrary. The previous value, 'No contextual layer
 * injected yet.', was the single heaviest leak source in the template: the
 * model paraphrased it straight back to successors. This value is the
 * formulation the model already produced on its own in 12 of 18 sampled replies
 * before anything was changed. Paraphrasing it produces "nothing has been
 * shared with me about the present", which is a founder sentence, so there is
 * nothing to suppress.
 */
export const EMPTY_CONTEXT = 'Nothing has been shared about the present yet.'

/**
 * Renders training pairs into the settled section of the prompt.
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

/**
 * Who is asking. 'business' is the succession route: the person now running
 * the organization. 'personal' is a family archive: someone in the family.
 *
 * Added September 15, 2026 for the personal coverage map and the founding
 * proof on personal archives, both of which had been building the succession
 * framing ("the person now running their organization") over a family
 * archive. The business prompt is the original, byte for byte, and is the
 * default, so the succession route, the coverage fixtures, and every drive
 * script are unchanged. The personal prompt is the same text with the five
 * framing phrases swapped (PROMPT_SCOPE_SUBSTITUTIONS), and the swap asserts
 * that every phrase still matched exactly once, so an edit to the business
 * text that breaks a substitution fails at the call rather than silently
 * shipping a half-personal prompt. Same construction as the classifier scope
 * in lib/incidentClassifier.ts.
 *
 * Not used by the family chat route (app/api/archive/entity-chat, which runs
 * lib/entityContext.ts without a verifier). Moving that route onto this
 * prompt is its own slice.
 */
export type EntityPromptScope = 'business' | 'personal'

export const PROMPT_SCOPE_SUBSTITUTIONS: ReadonlyArray<readonly [string, string]> = [
  [
    'The person now running their organization is asking you to apply the founder\'s reasoning to what they face today.',
    'Someone in their family is asking you to apply their reasoning to what they face today.',
  ],
  ['(fixed at the handover. This does not change)', '(fixed in the record. This does not change)'],
  ['(what the person now running the business has told you)', '(what the family member has told you)'],
  ['the current context the successor has provided', 'the current context the family member has provided'],
  ['A successor acting on a position', 'A family member acting on a position'],
  // Families write in their own languages (see lib/emailTranslations.ts for
  // the ones the product serves). The grounding rules above are unchanged;
  // only the output language follows the question. The business prompt keeps
  // American English because the succession route is English by contract.
  [
    'No em dashes. American English. Responses should be 3 to 6 sentences.',
    'No em dashes. Answer in the language the question was asked in. Responses should be 3 to 6 sentences.',
  ],
]

function toPersonalScope(businessPrompt: string): string {
  let out = businessPrompt
  for (const [from, to] of PROMPT_SCOPE_SUBSTITUTIONS) {
    const first = out.indexOf(from)
    if (first === -1 || out.indexOf(from, first + 1) !== -1) {
      throw new Error(`[entitySystemPrompt] scope substitution did not match exactly once: ${from}`)
    }
    out = out.replace(from, to)
  }
  return out
}

export function buildEntitySystemPrompt(params: {
  ownerName: string
  archiveName: string
  fingerprintSection: string
  contextSection: string
  /** Defaults to 'business', the original prompt byte for byte. */
  scope?: EntityPromptScope
}): string {
  const { ownerName, archiveName, fingerprintSection, contextSection } = params

  const business = `You are the cognitive reference model of ${ownerName}, built from ${archiveName}, the permanent record of their deposits, decisions, and expressed values. The person now running their organization is asking you to apply the founder's reasoning to what they face today.

WHAT ${ownerName} SETTLED (fixed at the handover. This does not change):

${fingerprintSection}

WHAT IS HAPPENING NOW (what the person now running the business has told you):

${contextSection}

Respond as ${ownerName} would, using their documented reasoning patterns, values, and decision-making style, applied directly to the current context the successor has provided. Ground your response in the record above.

Where the record settles the question, take that position plainly and be specific. Specificity comes from the deposits, never from filling a gap with something plausible.

Where the record does not settle the question, do not settle it. Say that ${ownerName} did not leave a position on this, in your own words, and stop there. You may describe how they think in general. Do not turn a general principle into a specific ruling, because the opposite ruling could be argued from the same principle, which is exactly why it is not yours to make. A short honest answer is better than a long one that decides something ${ownerName} never decided.

Never invent a policy, a number, a rule, or a past decision that is not in the record above. A successor acting on a position ${ownerName} never took is the worst outcome this system can produce.

Never break character. Never refer to yourself as an AI or a model. Speak in first person as ${ownerName}.

No em dashes. American English. Responses should be 3 to 6 sentences.`

  return params.scope === 'personal' ? toPersonalScope(business) : business
}
