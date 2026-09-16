/**
 * The family entity on the grounded pipeline.
 *
 * Everything /api/archive/entity-chat needs to answer a family member the way
 * the succession route answers a successor: the same frozen layer selection,
 * the same prompt builder (scope personal), the same verifier, the same gap
 * reply. Built September 16, 2026 from the recon in
 * docs/FAMILY_ENTITY_RECON_2026-09-16.md. Decisions taken with the founder:
 *
 *   1. One voice. The grounded reference voice for owner and contributor
 *      alike. No companion behavior on this path.
 *   2. Owner-only corpus. The frozen layer for a family archive is built from
 *      pairs in the owner's own voice (OWNER_PAIR_SOURCES). Contributor pairs
 *      ("X, who has known me as my Y, once said") are excluded from BOTH the
 *      prompt and the verifier, so the two always see the same material and a
 *      relative's account can never ground the owner's position. Labeled
 *      hearsay, where the auditor sees reported material under its own rule,
 *      is its own later slice and changes a shared prompt.
 *   3. Language. The personal prompt answers in the language of the question;
 *      the gap reply is drawn from a table by the caller's preferred language.
 *   5. The switch. archives.entity_pipeline, 'context' (the pre-move builder
 *      in lib/entityContext.ts) or 'grounded' (this module). Read tolerantly
 *      so a schema without the column stays on 'context'. TEMPORARY: when the
 *      last archive is on 'grounded', delete lib/entityContext.ts, the
 *      'context' branch of the route, and the eval generator that reads it.
 *
 * Pure helpers are exported for tests; the model calls are in one function.
 */

import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from './supabase-admin'
import { buildEntitySystemPrompt, formatFingerprintSection, EMPTY_CONTEXT } from './entitySystemPrompt'
import { selectFrozenLayer, describeSelection, FROZEN_LAYER_CANDIDATE_LIMIT, type FrozenLayerCandidate } from './frozenLayer'
import { verifyGrounding, groundingGapReply, normalizeGapLanguage, type GroundingBasis } from './verifyGrounding'

export type EntityPipeline = 'context' | 'grounded'

/** Mirrors the succession route: Sonnet for the voice, Sonnet inside the verifier. */
export const FAMILY_VOICE_MODEL      = 'claude-sonnet-4-6'
export const FAMILY_VOICE_MAX_TOKENS = 1000

/**
 * training_pairs.source_type values that are the owner speaking. Everything
 * else is someone else's words about the owner and is left out of the frozen
 * layer on the family route (decision 2). 'label' is excluded pending a read
 * of the code that writes it; the September 16 sizing query showed label pairs
 * on three archives and the recon did not find their creator.
 *
 * VERIFIED against the live distinct source_type values on September 16,
 * 2026: companion, contributor, deposit, label, owner, voice.
 */
export const OWNER_PAIR_SOURCES = ['deposit', 'owner', 'companion', 'voice'] as const

/** Pair sources whose source_id is an owner_deposits.id, for usage tracking. */
export const DEPOSIT_BACKED_SOURCES = ['deposit', 'owner', 'companion'] as const

export type FamilyPair = FrozenLayerCandidate & {
  id:          string
  source_type: string
  source_id:   string | null
}

export type HistoryTurn = { role: 'user' | 'assistant'; content: string }

// ── Pure helpers ──────────────────────────────────────────────────────────────

/**
 * The statement heuristic the route has always used to auto-deposit an owner's
 * message: not a question, over thirty characters. Moved here unchanged so it
 * can be tested; the rule itself is not revisited in this slice.
 */
export function isDeposit(message: string): boolean {
  const trimmed = message.trim()
  if (trimmed.endsWith('?')) return false
  const questionStarters = [
    'what', 'how', 'why', 'when', 'where', 'who',
    'can', 'could', 'would', 'should',
    'do', 'does', 'is', 'are', 'will',
  ]
  const firstWord = trimmed.split(' ')[0].toLowerCase()
  if (questionStarters.includes(firstWord)) return false
  return trimmed.length > 30
}

/**
 * Coerce whatever the client sent as history into clean turns. Both web
 * clients send { role: 'user' | 'assistant', content: string }; anything else
 * is dropped rather than forwarded to the model.
 */
export function sanitizeHistory(raw: unknown): HistoryTurn[] {
  if (!Array.isArray(raw)) return []
  const out: HistoryTurn[] = []
  for (const t of raw) {
    if (!t || typeof t !== 'object') continue
    const role    = (t as { role?: unknown }).role
    const content = (t as { content?: unknown }).content
    if ((role === 'user' || role === 'assistant') && typeof content === 'string' && content.trim()) {
      out.push({ role, content })
    }
  }
  return out
}

/** Earlier user turns, for retrieval context. Same rule as the succession route. */
export function priorQuestions(history: HistoryTurn[]): string[] {
  return history.filter(t => t.role === 'user').map(t => t.content)
}

/** Keep only pairs in the owner's own voice. */
export function ownerOnly<T extends { source_type: string }>(pairs: T[]): T[] {
  const allowed = new Set<string>(OWNER_PAIR_SOURCES)
  return pairs.filter(p => allowed.has(p.source_type))
}

/** owner_deposits ids behind the selected layer, for increment_deposit_access. */
export function depositIdsBehind(pairs: Pick<FamilyPair, 'source_type' | 'source_id'>[]): string[] {
  const backed = new Set<string>(DEPOSIT_BACKED_SOURCES)
  const ids = new Set<string>()
  for (const p of pairs) {
    if (backed.has(p.source_type) && p.source_id) ids.add(p.source_id)
  }
  return [...ids]
}

/**
 * The language for a gap reply. The contributor's preference first (they are
 * the one reading), then the archive's, then English. Unknown codes fall back
 * to English inside groundingGapReply.
 */
export function gapLanguage(contributorLanguage: string | null | undefined, archiveLanguage: string | null | undefined): string {
  return normalizeGapLanguage(contributorLanguage ?? archiveLanguage ?? 'en')
}

// ── Reads ─────────────────────────────────────────────────────────────────────

/**
 * Which pipeline this archive is on. Read on its own so a schema without the
 * column (the migration not yet pasted) degrades to 'context' instead of
 * failing the request. Same pattern as contributor_entity_access in
 * app/api/mobile/contributor-session/route.ts.
 */
export async function readEntityPipeline(archiveId: string): Promise<EntityPipeline> {
  const { data, error } = await supabaseAdmin
    .from('archives')
    .select('entity_pipeline')
    .eq('id', archiveId)
    .maybeSingle()
  if (error || !data) return 'context'
  return data.entity_pipeline === 'grounded' ? 'grounded' : 'context'
}

/** The owner-voice candidate set, in the same order the succession route reads. */
export async function loadFamilyCandidates(archiveId: string): Promise<FamilyPair[]> {
  const { data } = await supabaseAdmin
    .from('training_pairs')
    .select('id, prompt, completion, source_type, source_id')
    .eq('archive_id', archiveId)
    .eq('included_in_training', true)
    .in('source_type', [...OWNER_PAIR_SOURCES])
    .order('quality_score', { ascending: false })
    .order('id', { ascending: true })
    .limit(FROZEN_LAYER_CANDIDATE_LIMIT)
  return (data ?? []) as FamilyPair[]
}

// ── The answer ────────────────────────────────────────────────────────────────

let _client: Anthropic | null = null
function client(): Anthropic {
  if (!_client) _client = new Anthropic()
  return _client
}

export type GroundedFamilyReply = {
  reply:          string
  basis:          GroundingBasis
  topic:          string
  usedDepositIds: string[]
  selection:      string   // describeSelection, for the log line
}

/**
 * One grounded turn. Select the layer for this question, build the personal
 * prompt, draft with Sonnet, verify against the SAME layer, replace an
 * unsupported draft with the gap reply in the reader's language. No writes.
 */
export async function generateGroundedFamilyReply(params: {
  archiveId:   string
  ownerName:   string
  archiveName: string
  message:     string
  history:     HistoryTurn[]
  language:    string
  candidates?: FamilyPair[]
}): Promise<GroundedFamilyReply> {
  const { archiveId, ownerName, archiveName, message, history, language } = params
  const candidates = ownerOnly(params.candidates ?? (await loadFamilyCandidates(archiveId)))

  const selection = await selectFrozenLayer({
    question:       message,
    priorQuestions: priorQuestions(history),
    candidates,
  })
  const pairs = selection.pairs as FamilyPair[]

  const systemPrompt = buildEntitySystemPrompt({
    ownerName,
    archiveName,
    fingerprintSection: formatFingerprintSection(pairs),
    contextSection:     EMPTY_CONTEXT,
    scope:              'personal',
  })

  const draft = await client().messages.create({
    model:      FAMILY_VOICE_MODEL,
    max_tokens: FAMILY_VOICE_MAX_TOKENS,
    system:     systemPrompt,
    messages:   [...history, { role: 'user', content: message }],
  })
  let reply = draft.content[0]?.type === 'text' ? draft.content[0].text : ''

  // Verified against the same selected layer the draft was generated from.
  const verdict = await verifyGrounding({ pairs, question: message, answer: reply })
  if (verdict.supported === false) reply = groundingGapReply(verdict.topic, language)

  return {
    reply,
    basis:          verdict.basis,
    topic:          verdict.topic,
    usedDepositIds: depositIdsBehind(pairs),
    selection:      describeSelection(selection),
  }
}
