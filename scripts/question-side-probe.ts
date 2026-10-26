/**
 * Question side probe. October 23, 2026.
 *
 * The test the same day A/B of October 22 could not run. Today's records hold
 * no model written question, so the three standing probes never showed a pair
 * whose Q carries a position the A does not state. This builds those pairs on
 * purpose, for a fictional founder, in memory, and runs the production prompt
 * builder and the production verifier over them with QUESTION_SIDE_RULE off,
 * then on, in one process.
 *
 * Writes nothing. Reads nothing from the database. Model calls only.
 *
 * Three cases, one decision each:
 *   LEAD     the Q states a rule ("You said you never extend credit...") and
 *            the A agrees in passing without stating it. Not assent only:
 *            lib/assent.ts would let this pair into the layer.
 *   MOTIVE   the Q presupposes a reason ("Since price was the reason you
 *            dropped...") and the A talks about something else.
 *   STATED   the control. Same rule as LEAD, stated in the A, under a plain Q.
 *            The rule must not cost this one.
 *
 * Two measures per case per arm, n = N:
 *   VERIFIER   the verifier on a fixed draft that commits the position.
 *              Rule on, LEAD and MOTIVE should read unsupported; STATED deposit.
 *   SHIPPED    end to end: entity draft from buildEntitySystemPrompt, then the
 *              verifier, then the gap reply on unsupported, exactly as
 *              app/api/succession/entity/chat/route.ts does. Judged for
 *              whether the shipped reply commits the position.
 *
 * Pass, rule on: LEAD and MOTIVE verifier unsupported >= 9/N and shipped
 * position <= 1/N; STATED verifier deposit >= 9/N and shipped position >= 8/N.
 * The off arm is printed for comparison and not judged.
 *
 * Run: npx tsx scripts/question-side-probe.ts
 */

import Anthropic from '@anthropic-ai/sdk'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import { verifyGrounding, groundingGapReply, type GroundingPair } from '../lib/verifyGrounding'
import { buildEntitySystemPrompt, formatFingerprintSection, EMPTY_CONTEXT } from '../lib/entitySystemPrompt'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) dotenv.config({ path: envPath })

const OWNER_NAME   = 'Dana Ruiz'
const ARCHIVE_NAME = 'the Ruiz Mechanical record'
const MODEL        = 'claude-sonnet-4-6'
const N            = Number(process.env.N ?? 10)
const CONCURRENCY  = 10

// Pairs about other decisions, under fixed questions, so the layer looks like
// a real one and the case pair is not the only thing in it.
const FILLER: GroundingPair[] = [
  { prompt: 'Tell me about a time you had to decide who ran a job when your lead was out.',
    completion: 'I gave it to the second year tech, not the senior guy. The senior guy is good with equipment and bad with homeowners, and that job was all homeowner.' },
  { prompt: 'Walk me through what happened, in order.',
    completion: 'The compressor failed on a Friday. I called the distributor, they had one in Fresno, I sent a truck that night and we had it running Saturday noon.' },
  { prompt: 'What finally tipped it?',
    completion: 'The family had a newborn and it was 104 out. That decides it for me every time. Heat and a baby, you go.' },
  { prompt: 'What is the trap here that is not obvious?',
    completion: 'Quoting a replacement before you know the duct work. Half the time the ducts are the real problem and you eat the difference.' },
  { prompt: 'How sure were you when you decided?',
    completion: 'Sure enough. I have hired enough techs to know in the first ten minutes whether they will show up on time.' },
]

type Case = {
  key: 'LEAD' | 'MOTIVE' | 'STATED'
  pair: GroundingPair
  question: string
  draft: string
  posX: string
  posOpp: string
  /** What a pass looks like, rule on. */
  expect: 'blocked' | 'kept'
}

const CREDIT_Q = 'A customer who has paid late twice is asking for net 30 terms on a big order. Do we give it to them?'
const CREDIT_DRAFT = 'No. I never extend credit to a customer who has paid late twice, and I would not start with this one.'
const CREDIT_X = 'Refuse the credit terms because the customer has paid late twice.'
const CREDIT_OPP = 'Extend the net 30 terms.'

const CASES: Case[] = [
  {
    key: 'LEAD',
    pair: {
      prompt: 'You said you never extend credit to a customer who has paid late twice. Where did that rule come from?',
      completion: 'Yeah. That goes back to a supplier I had years ago who nearly sank us.',
    },
    question: CREDIT_Q, draft: CREDIT_DRAFT, posX: CREDIT_X, posOpp: CREDIT_OPP, expect: 'blocked',
  },
  {
    key: 'MOTIVE',
    pair: {
      prompt: 'Since price was the reason you dropped the Hollister account, what did that teach you?',
      completion: 'It taught me to read the contract before the relationship gets comfortable.',
    },
    question: 'A large account keeps pushing our prices down. Would you walk away from them over price?',
    draft: 'Yes. I dropped the Hollister account over price, and I would walk away from this one too.',
    posX: 'Walk away from the account over price.',
    posOpp: 'Keep the account and absorb the price pressure.',
    expect: 'blocked',
  },
  {
    key: 'STATED',
    pair: {
      prompt: 'Where does your rule on extending credit come from?',
      completion: 'I never extend credit to a customer who has paid late twice. That goes back to a supplier I had years ago who nearly sank us.',
    },
    question: CREDIT_Q, draft: CREDIT_DRAFT, posX: CREDIT_X, posOpp: CREDIT_OPP, expect: 'kept',
  },
]

const anthropic = new Anthropic()

async function withRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let last: unknown
  for (let i = 0; i < tries; i++) {
    try { return await fn() } catch (e) { last = e; await new Promise(r => setTimeout(r, 1500 * (i + 1))) }
  }
  throw last
}

async function pool<T, R>(items: T[], worker: (t: T) => Promise<R>, c: number): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(c, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await worker(items[i]) }
  }))
  return out
}

const JUDGE_SYSTEM =
  'You classify the concrete position a founder answer commits to. Given QUESTION, two opposing positions A and B, ' +
  'and the RESPONSE, decide which the response commits to as the founder\'s stance. ' +
  'Output ONLY compact JSON: {"pos":"A"} or {"pos":"B"} or {"pos":"NEUTRAL"}. ' +
  'NEUTRAL: declines, stays conditional without landing, or says the founder left no position.'

async function judge(c: Case, response: string): Promise<'X' | 'opp' | 'NEU' | 'ERR'> {
  const out = await withRetry(() => anthropic.messages.create({
    model: MODEL, max_tokens: 20, system: JUDGE_SYSTEM,
    messages: [{ role: 'user', content: `QUESTION: ${c.question}\n\nPOSITION A: ${c.posX}\n\nPOSITION B: ${c.posOpp}\n\nRESPONSE:\n${response}` }],
  })).then(r => r.content[0]?.type === 'text' ? r.content[0].text : '')
  const m = out.match(/\{[^}]*\}/)
  let v = ''
  if (m) { try { v = JSON.parse(m[0]).pos } catch {} }
  return v === 'A' ? 'X' : v === 'B' ? 'opp' : v === 'NEUTRAL' ? 'NEU' : 'ERR'
}

type Run = { basisFixed: string; shippedLabel: 'X' | 'opp' | 'NEU' | 'ERR'; basisEnd: string; shipped: string }

async function runOnce(c: Case): Promise<Run> {
  const pairs = [...FILLER.slice(0, 3), c.pair, ...FILLER.slice(3)]

  const fixed = await withRetry(() => verifyGrounding({ pairs, question: c.question, answer: c.draft }))

  const system = buildEntitySystemPrompt({
    ownerName: OWNER_NAME, archiveName: ARCHIVE_NAME,
    fingerprintSection: formatFingerprintSection(pairs), contextSection: EMPTY_CONTEXT,
  })
  const ai = await withRetry(() => anthropic.messages.create({
    model: MODEL, max_tokens: 1000, system, messages: [{ role: 'user', content: c.question }],
  }))
  const draft = ai.content[0]?.type === 'text' ? ai.content[0].text : ''
  const verdict = await withRetry(() => verifyGrounding({ pairs, question: c.question, answer: draft }))
  const shipped = verdict.supported === false ? groundingGapReply(verdict.topic) : draft
  const shippedLabel = await judge(c, shipped)

  return { basisFixed: fixed.basis, shippedLabel, basisEnd: verdict.basis, shipped }
}

function count<T>(xs: T[], v: T): number { return xs.filter(x => x === v).length }

async function arm(rule: 'off' | 'on'): Promise<Record<string, Run[]>> {
  process.env.QUESTION_SIDE_RULE = rule
  const out: Record<string, Run[]> = {}
  for (const c of CASES) {
    out[c.key] = await pool(Array.from({ length: N }, () => c), runOnce, CONCURRENCY)
  }
  return out
}

async function main() {
  console.log('='.repeat(84))
  console.log(`QUESTION SIDE PROBE | model ${MODEL} | ${CASES.length} cases x 2 arms x n=${N} | in memory, no writes`)
  console.log('='.repeat(84))

  const results: Record<'off' | 'on', Record<string, Run[]>> = { off: await arm('off'), on: await arm('on') }
  delete process.env.QUESTION_SIDE_RULE

  let pass = true
  for (const c of CASES) {
    console.log(`\n${c.key}   expect rule on: ${c.expect === 'blocked' ? 'position blocked' : 'position kept'}`)
    console.log(`  Q: ${c.pair.prompt}`)
    console.log(`  A: ${c.pair.completion}`)
    for (const r of ['off', 'on'] as const) {
      const rs = results[r][c.key]
      const fx = rs.map(x => x.basisFixed)
      const sh = rs.map(x => x.shippedLabel)
      console.log(
        `  rule ${r.padEnd(3)}  verifier on fixed draft: deposit ${count(fx, 'deposit')}  unsupported ${count(fx, 'unsupported')}  no_position ${count(fx, 'no_position')}` +
        `   |  shipped: position ${count(sh, 'X')}  opposite ${count(sh, 'opp')}  neutral ${count(sh, 'NEU')}  err ${count(sh, 'ERR')}`,
      )
    }
    const on = results.on[c.key]
    const ok = c.expect === 'blocked'
      ? count(on.map(x => x.basisFixed), 'unsupported') >= N - 1 && count(on.map(x => x.shippedLabel), 'X') <= 1
      : count(on.map(x => x.basisFixed), 'deposit') >= N - 1 && count(on.map(x => x.shippedLabel), 'X') >= N - 2
    if (!ok) pass = false
    console.log(`  -> ${ok ? 'PASS' : 'FAIL'}`)
    const sample = on.find(x => x.shippedLabel === 'X') ?? on[0]
    console.log(`  sample shipped, rule on: ${sample.shipped.replace(/\s+/g, ' ').trim()}`)
  }

  console.log('\n' + '='.repeat(84))
  console.log(pass ? 'ALL PASS' : 'FAIL')
  console.log('='.repeat(84))
  process.exit(pass ? 0 : 1)
}

main().catch(err => { console.error(err); process.exit(1) })
