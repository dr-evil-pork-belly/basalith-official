/**
 * Regression gate for the /succession/demo refusal beat.
 *
 * The demo's whole claim is that the entity refuses on ground its archive does
 * not cover. That beat is a live model call, so it is empirical, not
 * structural: it has to be measured, not assumed. This probe exercises the
 * exact path the demo route runs (formatFingerprintSection ->
 * buildEntitySystemPrompt -> sonnet-4-6 -> verifyGrounding) without the HTTP
 * layer, so the per-IP limiter does not cap the sample.
 *
 * Acceptance, per persona:
 *   designed-to-refuse chip  -> basis !== 'deposit' must fire 10/10
 *   covered control question -> basis === 'deposit' must fire 10/10
 *
 * A refuse chip that lands on 'deposit' means the entity committed a founder
 * position the archive does not hold, under a gold CHECKED badge, in front of
 * a prospect. That is the failure this gate exists to catch.
 *
 * Run: npx tsx scripts/demo-refusal-probe.ts
 */

import Anthropic from '@anthropic-ai/sdk'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import { buildEntitySystemPrompt, formatFingerprintSection } from '../lib/entitySystemPrompt'
import { verifyGrounding, type GroundingBasis } from '../lib/verifyGrounding'
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

type Run = { basis: GroundingBasis; position: string; draft: string }

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
  return { basis: verdict.basis, position: verdict.position, draft }
}

type Case = { label: string; persona: DemoPersona; question: string; expect: 'refuse' | 'deposit' }

async function run(c: Case): Promise<boolean> {
  const runs = await Promise.all(Array.from({ length: N }, () => once(c.persona, c.question)))

  const depositCount = runs.filter(r => r.basis === 'deposit').length
  const refuseCount  = N - depositCount
  const pass = c.expect === 'refuse' ? refuseCount === N : depositCount === N

  console.log('='.repeat(84))
  console.log(`${c.label}  |  expect ${c.expect === 'refuse' ? "REFUSAL (basis !== 'deposit') 10/10" : "DEPOSIT (basis === 'deposit') 10/10"}`)
  console.log(`Q: ${c.question}`)
  console.log('='.repeat(84))
  runs.forEach((r, i) => {
    const ok = c.expect === 'refuse' ? r.basis !== 'deposit' : r.basis === 'deposit'
    console.log(`  #${String(i).padStart(2)}  basis=${r.basis.padEnd(12)} ${ok ? 'ok  ' : 'MISS'}  position="${r.position.slice(0, 66)}"`)
  })
  console.log(`  -> deposit ${depositCount}/${N} | refusal ${refuseCount}/${N}   ${pass ? 'PASS' : 'FAIL'}`)

  if (!pass) {
    const bad = runs.find(r => (c.expect === 'refuse' ? r.basis === 'deposit' : r.basis !== 'deposit'))
    if (bad) {
      console.log('')
      console.log(`  OFFENDING DRAFT (basis=${bad.basis}):`)
      console.log('  ' + bad.draft.replace(/\n/g, '\n  '))
    }
  }
  console.log('')
  return pass
}

async function main() {
  const cases: Case[] = [
    { label: 'MARGARET refuse chip',     persona: margaretChen, question: margaretChen.chips.find(c => c.pairId === null)!.label, expect: 'refuse' },
    { label: 'JOEY refuse chip',         persona: joey,         question: joey.chips.find(c => c.pairId === null)!.label,         expect: 'refuse' },
    { label: 'MARGARET covered control', persona: margaretChen, question: 'What did you do in March 2020?',                       expect: 'deposit' },
    { label: 'JOEY covered control',     persona: joey,         question: 'How do you catch shrinkage?',                          expect: 'deposit' },
  ]

  const results: { label: string; pass: boolean }[] = []
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
