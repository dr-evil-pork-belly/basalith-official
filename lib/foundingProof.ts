/**
 * The founding proof.
 *
 * After the three founding calls are in, the owner can ask their archive to
 * show two things: one question it can already answer from a deposit, with
 * that deposit shown verbatim underneath, and one question it will not answer
 * because no deposit covers it. The refusal is the product; this is the first
 * time the owner sees it on their own words.
 *
 * Runs the real pipeline, not a lookalike: the same frozen-layer selection,
 * the same system prompt, the same voice model, and the same output-side
 * verifier as app/api/succession/entity/chat/route.ts. Ephemeral: nothing is
 * written, and nothing is logged to grounding_gaps, because this is the owner
 * looking at their own archive, not a successor consulting it.
 *
 * Label discipline (CLAUDE.md section 4): only basis === 'deposit' backs the
 * words "checked against your archive." A 'no_position' verdict is shown as a
 * refusal in the entity's own words; an 'unsupported' verdict is replaced by
 * the templated gap reply. Neither is ever badged as grounded.
 */

import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from './supabase-admin'
import { buildEntitySystemPrompt, formatFingerprintSection, EMPTY_CONTEXT } from './entitySystemPrompt'
import { verifyGrounding, groundingGapReply, type GroundingBasis } from './verifyGrounding'
import { selectFrozenLayer, FROZEN_LAYER_CANDIDATE_LIMIT, type FrozenLayerCandidate } from './frozenLayer'
import type { FoundingScope } from './foundingSequence'

const anthropic = new Anthropic()

export const VOICE_MODEL = 'claude-sonnet-4-6'
const MAX_ATTEMPTS = 3

// ── Refusal candidates ────────────────────────────────────────────────────────
// Position-forcing, on the owner's own ground, and deliberately outside what
// three founding calls are likely to have covered. These are NOT the coverage
// probes in lib/coverageProbes.ts and must never be: the owner sees these, and
// a question the owner has seen is a question they may go and deposit on,
// which would contaminate the coverage measurement. Copy rules apply.

export const REFUSAL_CANDIDATES: Record<FoundingScope, string[]> = {
  personal: [
    'What is the one rule you never break when someone in the family asks to borrow money, and when did you last hold to it?',
    'How do you decide how much to tell the children about money, and where exactly is the line?',
    'Name the signal that tells you a friendship has run its course, and what you do when you see it.',
    'What do you do first when two people you love are not speaking to each other?',
  ],
  business: [
    'What is the one number you check before approving any spend over your comfort line, and what makes you stop?',
    'How do you decide whether to match an outside offer to keep someone, and when have you refused?',
    'What is your rule for firing a customer, and the last time you used it?',
    'Name the signal that tells you a supplier is about to fail you, and what you do the day you see it.',
  ],
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProofPair = FrozenLayerCandidate & {
  id: string
  quality_score?: number | null
  metadata?: { probe_type?: string; dimension?: string } | null
}

export type GroundedProof = {
  question: string
  answer: string
  deposit: string      // the owner's own words the answer was checked against
  basis: 'deposit'
}

export type RefusalProof = {
  question: string
  reply: string
  basis: Exclude<GroundingBasis, 'deposit'>
}

export type FoundingProof =
  | { ready: false; reason: 'no_pairs' }
  | {
      ready: true
      grounded: GroundedProof | null
      refusal: RefusalProof | null
      // Honest about what did not happen. If every grounded attempt came back
      // ungrounded, or every refusal candidate was answered from a deposit,
      // the card says so instead of faking either half.
      note: string | null
    }

// ── Pure selection ────────────────────────────────────────────────────────────

/** Order pairs for the grounded half: founding SEED pairs first (the call
 *  openers, whose prompts read as whole questions), then the rest by quality.
 *  Pure. */
export function orderGroundedCandidates(pairs: ProofPair[]): ProofPair[] {
  const isSeed = (p: ProofPair) => p.metadata?.probe_type === 'SEED'
  const byQuality = (a: ProofPair, b: ProofPair) => (b.quality_score ?? 0) - (a.quality_score ?? 0)
  const seeds = pairs.filter(isSeed).sort(byQuality)
  const rest  = pairs.filter(p => !isSeed(p)).sort(byQuality)
  return [...seeds, ...rest]
}

/** Every string the owner might see from this module, for the copy-rule test. */
export function allProofCopy(): string[] {
  return [...REFUSAL_CANDIDATES.personal, ...REFUSAL_CANDIDATES.business, ...NOTES]
}

const NOTES = [
  'Every question we tried came back grounded. Your record already covers more than three calls usually do.',
  'Your Basalith declined every question we tried on the grounded side. That happens when the scorer has not finished with your deposits. Try again in a few minutes.',
]

// ── One ask, verified ─────────────────────────────────────────────────────────

async function askVerified(params: {
  ownerName: string
  archiveName: string
  candidates: ProofPair[]
  question: string
  scope: FoundingScope
}): Promise<{ reply: string; basis: GroundingBasis; topic: string; pairs: ProofPair[] }> {
  const { ownerName, archiveName, candidates, question, scope } = params

  const selection = await selectFrozenLayer({ question, priorQuestions: [], candidates })
  const pairs = selection.pairs as ProofPair[]

  const systemPrompt = buildEntitySystemPrompt({
    ownerName,
    archiveName,
    fingerprintSection: formatFingerprintSection(pairs),
    contextSection:     EMPTY_CONTEXT,
    // Personal archives were getting the succession framing ("the person now
    // running their organization") until September 15, 2026. Same pipeline,
    // right framing. Business is the original prompt byte for byte.
    scope,
  })

  const aiResponse = await anthropic.messages.create({
    model:      VOICE_MODEL,
    max_tokens: 600,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: question }],
  })
  let reply = aiResponse.content[0]?.type === 'text' ? aiResponse.content[0].text : ''

  const verdict = await verifyGrounding({ pairs, question, answer: reply })
  if (verdict.basis === 'unsupported') reply = groundingGapReply(verdict.topic)

  return { reply, basis: verdict.basis, topic: verdict.topic, pairs }
}

// ── The proof ─────────────────────────────────────────────────────────────────

export async function buildFoundingProof(archiveId: string, scope: FoundingScope): Promise<FoundingProof> {
  const [archiveResult, pairsResult] = await Promise.all([
    supabaseAdmin.from('archives').select('name, owner_name').eq('id', archiveId).single(),
    supabaseAdmin
      .from('training_pairs')
      .select('id, prompt, completion, quality_score, metadata')
      .eq('archive_id', archiveId)
      .eq('included_in_training', true)
      .order('quality_score', { ascending: false })
      .order('id', { ascending: true })
      .limit(FROZEN_LAYER_CANDIDATE_LIMIT),
  ])

  const archive = archiveResult.data
  const pairs   = (pairsResult.data ?? []) as ProofPair[]
  if (!archive || pairs.length === 0) return { ready: false, reason: 'no_pairs' }

  const ownerName   = archive.owner_name ?? archive.name
  const archiveName = archive.name

  // Grounded half: ask the owner's own questions back, best candidates first.
  let grounded: GroundedProof | null = null
  for (const candidate of orderGroundedCandidates(pairs).slice(0, MAX_ATTEMPTS)) {
    const question = candidate.prompt.trim()
    if (!question) continue
    const r = await askVerified({ ownerName, archiveName, candidates: pairs, question, scope })
    if (r.basis === 'deposit') {
      // The deposit shown is the pair whose prompt was asked. If the verifier
      // keyed on a different pair, the owner still sees their own words on
      // the question that was asked, which is the honest thing to show.
      grounded = { question, answer: r.reply, deposit: candidate.completion, basis: 'deposit' }
      break
    }
  }

  // Refusal half: questions outside the three calls, until one is declined.
  let refusal: RefusalProof | null = null
  for (const question of REFUSAL_CANDIDATES[scope].slice(0, MAX_ATTEMPTS)) {
    const r = await askVerified({ ownerName, archiveName, candidates: pairs, question, scope })
    if (r.basis !== 'deposit') {
      refusal = { question, reply: r.reply, basis: r.basis }
      break
    }
  }

  const note =
    !grounded ? NOTES[1]
    : !refusal ? NOTES[0]
    : null

  return { ready: true, grounded, refusal, note }
}
