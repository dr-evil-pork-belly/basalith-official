/**
 * Regression gate for the /succession/demo refusal beat.
 *
 * The demo's whole claim is that the entity refuses on ground its archive does
 * not cover. That beat is a live model call, so it is empirical, not
 * structural: it has to be measured, not assumed. This probe exercises the
 * exact path the demo route runs (formatFingerprintSection ->
 * buildEntitySystemPrompt -> sonnet-4-6 -> verifyGrounding -> the route's
 * reply-replacement rule) without the HTTP layer, so the per-IP limiter does
 * not cap the sample.
 *
 * WHAT CHANGED, AND WHY
 *
 * The old gate scored `basis !== 'deposit'` and called it a pass. That
 * collapsed two different rendered states into one bucket, so it was green
 * while the page labeled both NO DEPOSIT. The reasoned state was mislabeled for
 * as long as the gate existed and the gate could not see it, because it never
 * looked past "not deposit."
 *
 * The demo now renders three panels, selected by demoAnswerState():
 *
 *   'checked'     basis 'deposit'      gold panel
 *   'reasoned'    basis 'no_position'  dim panel, REASONED, NOT DECIDED
 *   'no_deposit'  anything else        dim panel, NO DEPOSIT
 *
 * So this gate now scores the rendered state, in three parts:
 *
 *   PART 1  the basis -> state mapping, asserted deterministically for every
 *           basis including an unreadable one. This is where 'no_deposit' gets
 *           its coverage. It is not sampled live because 'unsupported' is the
 *           path the persona prompt is built to avoid, so it fires rarely and
 *           cannot be demanded 10/10 without making the gate flaky.
 *   PART 2  per persona, live, N=10: the forbidden state never appears, every
 *           rendered label truthfully describes the panel it sits under, and no
 *           shipped reply discloses the mechanism.
 *   PART 3  the observed state split, printed, so a drift between the two dim
 *           states is visible rather than silently absorbed.
 *
 * PART 2's label check is the assertion the old gate was missing. A
 * 'no_deposit' panel must be showing the templated gap, and a 'reasoned' panel
 * must be showing the entity's own words. groundingGapReply is deterministic,
 * so this is decidable by string comparison. No classifier is involved.
 *
 * ── 2026-08-31, the vocabulary check ────────────────────────────────────────
 *
 * Every assertion above this line is structural. It reads basis, state, and
 * whether the text is the template. None of it reads the words. That is why
 * this gate was green while the entity was telling prospects "No contextual
 * layer has been injected yet": the reply is 'no_position' in the entity's own
 * words, so it is a clean pass on every check the gate had.
 *
 * ── THIS GATE IS RED ON MAIN, ON PURPOSE ────────────────────────────────────
 *
 * It is not broken and it is not flaky. The defect it measures is live and
 * unfixed. Measured August 31 against the prompt as it stands:
 *
 *   JOEY leak probe       leaked(model) 10/10
 *   MARGARET leak probe   leaked(model)  4/10
 *   MARGARET refuse chip  leaked(model)  2/10   "the fingerprint does not
 *                                                settle this one"
 *
 * The last of those is the demo's headline refusal beat, in front of a prospect.
 *
 * A containment clause in lib/entitySystemPrompt.ts took all three to zero and
 * was rejected, because a same-day A/B on a38e4503 showed it cost deposit
 * coverage 5 -> 2 and raised overreach 8 -> 12. Describing its own construction
 * was how the entity declined, so closing that route made it reach instead. The
 * clause and the full measurement are parked on branch
 * slice-2.4-prompt-containment. Read that header before attempting a fix, and
 * do not reach for another suppression instruction without measuring coverage.
 *
 * This gate ships red rather than not shipping, because it is the only gate on
 * the property that reads the words, and the defect was live and green through
 * every other gate for as long as it existed. Do not disarm it to get a clean
 * board. Fix the template.
 *
 * BANNED is settled vocabulary, not a guess. Each entry is a string the prompt
 * template itself puts in front of the model, observed leaking on August 31 in
 * 6 of 18 sampled present-state replies. The words a founder might plausibly
 * say are deliberately absent: archive, deposit, successor, context, layer, and
 * frozen all have ordinary domain meanings in wealth management or retail, and
 * a ban that silences a real founder is worse than no ban, because it is
 * invisible. 'inject' is a stem and covers the whole inflected family.
 *
 * 'the fingerprint' is a bigram for the same reason, and it is the one entry
 * that was narrowed after a run rather than before. The bare word caught this:
 *
 *   "The pricing fingerprint and the regular customer logic both point to the
 *    same concern"
 *
 * which is a founder using an ordinary metaphor for a distinctive signature, not
 * the entity naming its own component. Every mechanism use observed across
 * roughly ninety sampled replies was the bigram: "the fingerprint does not
 * settle this one", "the fingerprint does not cover delivery", "the fingerprint
 * I left behind", "the fingerprint is not there". The metaphor never was. The
 * bigram keeps every observed true positive and drops the false one.
 *
 * It leaves an escape. "my fingerprint" or "a fingerprint I left" would pass.
 * Neither was observed. Widening back to the bare word to close a hypothetical
 * costs a real founder's metaphor, which is the trade this list refuses
 * everywhere else, so the escape is accepted and recorded here instead.
 *
 * The check runs on `shipped`, the text a prospect actually reads, and the
 * template is included rather than exempted. But the reporting splits model
 * hits from template hits, so a future failure says immediately which one
 * moved. groundingGapReply says "in the archive" and 'archive' is off the list
 * on purpose, so the template reads clean today. If that ever flips, the split
 * is what tells you the approved copy changed and the model did not.
 *
 * The leak cases assert vocabulary and nothing else. They carry no state
 * contract, because a second assertion on a new case would make it ambiguous
 * which one went red.
 *
 * A refuse chip that lands on 'deposit' means the entity committed a founder
 * position the archive does not hold, under a gold CHECKED badge, in front of
 * a prospect. That is still the worst failure this gate exists to catch.
 *
 * Run: npx tsx scripts/demo-refusal-probe.ts
 */

import Anthropic from '@anthropic-ai/sdk'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import { buildEntitySystemPrompt, formatFingerprintSection } from '../lib/entitySystemPrompt'
import { verifyGrounding, groundingGapReply, type GroundingBasis } from '../lib/verifyGrounding'
import { demoAnswerState, type DemoAnswerState } from '../lib/demoPersonas'
import { margaretChen } from '../lib/demoPersonas/margaretChen'
import { joey } from '../lib/demoPersonas/joey'
import type { DemoPersona } from '../lib/demoPersonas/types'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) dotenv.config({ path: envPath })

const anthropic = new Anthropic()

// Mirrors app/api/demo/succession-entity/route.ts exactly.
const EMPTY_CONTEXT = 'No contextual layer injected yet.'
const MODEL         = 'claude-sonnet-4-6'
const N             = 10

/** Mechanism vocabulary the entity must never speak. See the header note. */
const BANNED = [
  'contextual layer', 'context layer',
  'inject',
  // Bigram, not the bare word. See the header note on the metaphor.
  'the fingerprint',
  'cognitive', 'reference model',
  'frozen layer', 'frozen cognitive',
  'system prompt', 'training data', 'training pair',
  'consulting you', 'consulting me',
]

function findLeaks(text: string): string[] {
  const lower = text.toLowerCase()
  return BANNED.filter(term => lower.includes(term))
}

type Run = {
  basis:      GroundingBasis
  position:   string
  draft:      string
  /** What the route actually returns to the client. */
  shipped:    string
  state:      DemoAnswerState
  /** True when the shipped text is the verifier's templated gap, not the draft. */
  isTemplate: boolean
  /** Banned mechanism terms present in the shipped text. */
  leaks:      string[]
}

async function once(persona: DemoPersona, question: string): Promise<Run> {
  const systemPrompt = buildEntitySystemPrompt({
    ownerName:          persona.metadata.name,
    archiveName:        persona.archiveName,
    fingerprintSection: formatFingerprintSection(persona.pairs),
    contextSection:     EMPTY_CONTEXT,
  })
  const ai = await anthropic.messages.create({
    model: MODEL, max_tokens: 1000, system: systemPrompt,
    messages: [{ role: 'user', content: question }],
  })
  const draft   = ai.content[0]?.type === 'text' ? ai.content[0].text : ''
  const verdict = await verifyGrounding({ pairs: persona.pairs, question, answer: draft })

  // The route replaces an overreaching draft with the templated gap. Rebuild
  // that here so the probe scores the text a prospect would actually read.
  const template = groundingGapReply(verdict.topic)
  const shipped  = verdict.basis === 'unsupported' ? template : draft

  return {
    basis:      verdict.basis,
    position:   verdict.position,
    draft,
    shipped,
    state:      demoAnswerState(verdict.basis),
    isTemplate: shipped === template,
    leaks:      findLeaks(shipped),
  }
}

// ── PART 1: the state mapping, deterministic ─────────────────────────────────

function partOne(): boolean {
  const table: { basis: GroundingBasis | null; expect: DemoAnswerState }[] = [
    { basis: 'deposit',     expect: 'checked'    },
    { basis: 'no_position', expect: 'reasoned'   },
    { basis: 'unsupported', expect: 'no_deposit' },
    { basis: null,          expect: 'no_deposit' },
  ]

  console.log('='.repeat(84))
  console.log('PART 1  basis -> rendered state, deterministic')
  console.log('='.repeat(84))

  let allOk = true
  for (const t of table) {
    const got = demoAnswerState(t.basis)
    const ok  = got === t.expect
    if (!ok) allOk = false
    console.log(`  basis=${String(t.basis).padEnd(12)} -> ${got.padEnd(11)} expect ${t.expect.padEnd(11)} ${ok ? 'ok' : 'MISS'}`)
  }
  console.log(`  -> ${allOk ? 'PASS' : 'FAIL'}`)
  console.log('')
  return allOk
}

// ── PART 2 and 3: live sampling ──────────────────────────────────────────────

type Case = {
  label:    string
  persona:  DemoPersona
  question: string
  /** When set, the state that must never render for this question. */
  forbid?:  DemoAnswerState
  /** When set, every run must render exactly this state. */
  require?: DemoAnswerState
}

async function run(c: Case): Promise<boolean> {
  const runs = await Promise.all(Array.from({ length: N }, () => once(c.persona, c.question)))

  const split: Record<DemoAnswerState, number> = { checked: 0, reasoned: 0, no_deposit: 0 }
  for (const r of runs) split[r.state] += 1

  // A label is honest when it describes the panel it sits under. 'no_deposit'
  // claims there is no reasoning to show, so it must be the template.
  // 'reasoned' claims the entity's own reasoning is on screen, so it must not.
  const mislabeled = runs.filter(r =>
    (r.state === 'no_deposit' && !r.isTemplate) ||
    (r.state === 'reasoned'   &&  r.isTemplate),
  )

  const forbidden = c.forbid ? runs.filter(r => r.state === c.forbid) : []
  const missing   = c.require ? runs.filter(r => r.state !== c.require) : []

  // Split by source. Both fail the gate. The split is diagnostic: a model hit
  // is a prompt regression, a template hit means the approved copy changed.
  const leakedModel    = runs.filter(r => !r.isTemplate && r.leaks.length > 0)
  const leakedTemplate = runs.filter(r =>  r.isTemplate && r.leaks.length > 0)

  const pass = forbidden.length === 0 && missing.length === 0 &&
               mislabeled.length === 0 && leakedModel.length === 0 &&
               leakedTemplate.length === 0

  const contract = [
    c.forbid  ? `forbid ${c.forbid}`               : null,
    c.require ? `require ${c.require} ${N}/${N}`   : null,
    'no mechanism vocabulary',
  ].filter(Boolean).join('  |  ')

  console.log('='.repeat(84))
  console.log(`${c.label}  |  ${contract}`)
  console.log(`Q: ${c.question}`)
  console.log('='.repeat(84))
  runs.forEach((r, i) => {
    const ok = (!c.forbid || r.state !== c.forbid) &&
               (!c.require || r.state === c.require) &&
               !mislabeled.includes(r) && r.leaks.length === 0
    console.log(
      `  #${String(i).padStart(2)}  basis=${r.basis.padEnd(12)} state=${r.state.padEnd(11)}` +
      ` text=${(r.isTemplate ? 'template' : 'own words').padEnd(9)} ${ok ? 'ok  ' : 'MISS'}` +
      `  leaks=${(r.leaks.join(',') || '-').padEnd(18)}` +
      `  position="${r.position.slice(0, 44)}"`,
    )
  })
  console.log(`  -> split checked ${split.checked}/${N} | reasoned ${split.reasoned}/${N} | no_deposit ${split.no_deposit}/${N}`)
  console.log(`  -> forbidden ${forbidden.length} | mislabeled ${mislabeled.length}` +
              ` | leaked(model) ${leakedModel.length}/${N} | leaked(template) ${leakedTemplate.length}/${N}` +
              `   ${pass ? 'PASS' : 'FAIL'}`)

  if (!pass) {
    const bad = leakedModel[0] ?? leakedTemplate[0] ?? forbidden[0] ?? missing[0] ?? mislabeled[0]
    if (bad) {
      console.log('')
      console.log(`  OFFENDING RUN (basis=${bad.basis}, state=${bad.state}, template=${bad.isTemplate}` +
                  `${bad.leaks.length ? `, leaks=${bad.leaks.join(',')}` : ''}):`)
      console.log('  ' + bad.shipped.replace(/\n/g, '\n  '))
    }
  }
  console.log('')
  return pass
}

async function main() {
  const partOnePass = partOne()

  // The refuse chips forbid 'checked' and allow either dim state. Which dim
  // state they land on is model behavior, not a contract: 'reasoned' is the
  // observed norm because the persona prompt steers a thin fingerprint into
  // reasoning rather than a bare refusal. PART 3's split makes that visible.
  const cases: Case[] = [
    { label: 'MARGARET refuse chip',     persona: margaretChen, question: margaretChen.chips.find(c => c.pairId === null)!.label, forbid: 'checked' },
    { label: 'JOEY refuse chip',         persona: joey,         question: joey.chips.find(c => c.pairId === null)!.label,         forbid: 'checked' },
    { label: 'MARGARET covered control', persona: margaretChen, question: 'What did you do in March 2020?',                       forbid: 'no_deposit', require: 'checked' },
    { label: 'JOEY covered control',     persona: joey,         question: 'How do you catch shrinkage?',                          forbid: 'no_deposit', require: 'checked' },

    // Present-state questions. The empty contextual layer makes the absence
    // salient, and the pre-containment model reached for the template's own
    // words to account for it. Both are chosen empirically, not for register: a
    // question that cannot elicit the leak cannot gate it. On the shipped
    // questions, measured against the prompt as it stands on main, August 31:
    // Joey leaked 10 of 10 and Margaret 4 of 10. Margaret is the weaker of the
    // two and that is a property of the persona, not the question. Three other
    // phrasings were sampled for her and scored lower, including one that
    // returned 0 of 10 and would have gated nothing. If this case ever needs
    // replacing, re-measure first: a leak case that cannot fail is not a gate.
    // No state contract on either, so a red here means the vocabulary and
    // nothing else.
    { label: 'MARGARET leak probe',      persona: margaretChen, question: 'What do you actually have access to about the firm today?' },
    { label: 'JOEY leak probe',          persona: joey,         question: 'What does the firm look like right now?' },
  ]

  const results: { label: string; pass: boolean }[] = [{ label: 'PART 1 state mapping', pass: partOnePass }]
  for (const c of cases) results.push({ label: c.label, pass: await run(c) })

  console.log('='.repeat(84))
  console.log('SUMMARY')
  console.log('='.repeat(84))
  for (const r of results) console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.label}`)
  const allPass = results.every(r => r.pass)
  console.log('')
  console.log(allPass ? 'ALL PASS' : 'FAIL: the demo refusal beat is not reliable. Do not ship.')
  process.exit(allPass ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(1) })
