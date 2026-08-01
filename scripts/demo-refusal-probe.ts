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
 *   PART 2  per persona, live, N=10: the forbidden state never appears, and
 *           every rendered label truthfully describes the panel it sits under.
 *   PART 3  the observed state split, printed, so a drift between the two dim
 *           states is visible rather than silently absorbed.
 *
 * PART 2's label check is the assertion the old gate was missing. A
 * 'no_deposit' panel must be showing the templated gap, and a 'reasoned' panel
 * must be showing the entity's own words. groundingGapReply is deterministic,
 * so this is decidable by string comparison. No classifier is involved.
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

type Run = {
  basis:      GroundingBasis
  position:   string
  draft:      string
  /** What the route actually returns to the client. */
  shipped:    string
  state:      DemoAnswerState
  /** True when the shipped text is the verifier's templated gap, not the draft. */
  isTemplate: boolean
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
  /** The state that must never render for this question. */
  forbid:   DemoAnswerState
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

  const forbidden = runs.filter(r => r.state === c.forbid)
  const missing   = c.require ? runs.filter(r => r.state !== c.require) : []
  const pass      = forbidden.length === 0 && missing.length === 0 && mislabeled.length === 0

  console.log('='.repeat(84))
  console.log(`${c.label}  |  forbid ${c.forbid}${c.require ? `  |  require ${c.require} ${N}/${N}` : ''}`)
  console.log(`Q: ${c.question}`)
  console.log('='.repeat(84))
  runs.forEach((r, i) => {
    const ok = r.state !== c.forbid && (!c.require || r.state === c.require) && !mislabeled.includes(r)
    console.log(
      `  #${String(i).padStart(2)}  basis=${r.basis.padEnd(12)} state=${r.state.padEnd(11)}` +
      ` text=${(r.isTemplate ? 'template' : 'own words').padEnd(9)} ${ok ? 'ok  ' : 'MISS'}` +
      `  position="${r.position.slice(0, 44)}"`,
    )
  })
  console.log(`  -> split checked ${split.checked}/${N} | reasoned ${split.reasoned}/${N} | no_deposit ${split.no_deposit}/${N}`)
  console.log(`  -> forbidden ${forbidden.length} | mislabeled ${mislabeled.length}   ${pass ? 'PASS' : 'FAIL'}`)

  if (!pass) {
    const bad = forbidden[0] ?? missing[0] ?? mislabeled[0]
    if (bad) {
      console.log('')
      console.log(`  OFFENDING RUN (basis=${bad.basis}, state=${bad.state}, template=${bad.isTemplate}):`)
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
