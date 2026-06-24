import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from './supabase-admin'

// ── Types ────────────────────────────────────────────────────────────────────

export type Tier    = 'onramp' | 'standard' | 'deep'
export type Band    = 'p1' | 'p2' | 'p3'
export type Source  = 'p0' | 'p1' | 'p2' | 'p3'
export type Scope   = 'b2c' | 'b2b'
export type Channel = 'daily_email' | 'mirror_thread' | 'app_companion' | 'app_spark' | 'founder_web'

export interface DomainCoverage {
  domainId:        number
  slug:            string
  emotionalWeight: number
  density:         number
  avgDepth:        number
  lastTouched:     string | null
}

export interface HistoryEntry {
  domainId:      number | null
  questionId:    number | null
  b2bQuestionId: string | null
  servedAt:      string
  answeredAt:    string | null
}

export interface ElicitationQuestion {
  id:           number
  domainId:     number
  tier:         Tier
  questionText: string
}

export interface B2BQuestion {
  id:          string
  domainId:    number
  question:    string
  orderIndex:  number
}

export interface MirrorReflectionRow {
  id:             string
  reflection:     string
  threadQuestion: string
  depositIds:     string[]
}

export interface AnchorDeposit {
  id:       string
  prompt:   string
  response: string
}

export interface SelectNextQuestionResult {
  questionText:   string
  domainId:       number | null
  questionId:     number | null
  b2bQuestionId:  string | null
  framingUsed:    string | null
  source:         Source
}

export interface SelectNextQuestionParams {
  archiveId: string
  channel:   Channel
  now?:      Date
}

// ── Dependency injection (real implementations live at the bottom) ────────────

export interface Deps {
  getArchiveScope:        (archiveId: string) => Promise<Scope>
  getOwnerDepositCount:   (archiveId: string) => Promise<number>
  getCoverage:            (archiveId: string, scope: Scope) => Promise<DomainCoverage[]>
  getQuestionHistory:     (archiveId: string) => Promise<HistoryEntry[]>
  getNotQuiteRightReflection: (archiveId: string, now: Date) => Promise<MirrorReflectionRow | null>
  getElicitationQuestions:(domainIds: number[]) => Promise<ElicitationQuestion[]>
  getB2BQuestions:        (domainIds: number[]) => Promise<B2BQuestion[]>
  getAnchorDeposit:       (archiveId: string, domainId: number) => Promise<AnchorDeposit | null>
  getReflectionAnchorDeposit: (archiveId: string, reflection: MirrorReflectionRow) => Promise<AnchorDeposit | null>
  generateFramingSentence: (anchor: AnchorDeposit, questionText: string, domainEmotionalWeight: number) => Promise<string | null>
  generateP0Question:     (reflection: MirrorReflectionRow, anchor: AnchorDeposit | null) => Promise<{ questionText: string; framingUsed: string | null }>
  insertQuestionHistory:  (row: {
    archiveId:     string
    domainId:      number | null
    questionId:    number | null
    b2bQuestionId: string | null
    questionText:  string
    source:        Source
    channel:       Channel
    framingUsed:   string | null
  }) => Promise<void>
  random: () => number
}

// ── Constants ───────────────────────────────────────────────────────────────

const PRE_ECHO_MAX_DEPOSITS = 10   // < this -> P1
const STANDARD_MAX_DEPOSITS = 200  // < this -> P2, else P3

const WEIGHT3_MIN_GAP_DAYS  = 5
const UNANSWERED_REENTRY_DAYS = 30
const ANSWERED_COOLDOWN_DAYS  = 180

const DAY_MS = 24 * 60 * 60 * 1000

// ── Banding ─────────────────────────────────────────────────────────────────

export function band(depositCount: number): Band {
  if (depositCount < PRE_ECHO_MAX_DEPOSITS) return 'p1'
  if (depositCount < STANDARD_MAX_DEPOSITS) return 'p2'
  return 'p3'
}

// ── Coverage ranking ────────────────────────────────────────────────────────

export function effectiveDensity(d: DomainCoverage): number {
  return d.density * (d.avgDepth / 3)
}

function rankValue(d: DomainCoverage, b: Band): number {
  return b === 'p3' ? effectiveDensity(d) : d.density
}

// ── Cooldowns ───────────────────────────────────────────────────────────────

function lastServedAt(domainId: number, history: HistoryEntry[]): number {
  for (const h of history) {
    if (h.domainId === domainId) return new Date(h.servedAt).getTime()
  }
  return -Infinity
}

/**
 * General domain eligibility for P1-P3 (never applied to P0):
 * - never the same domain as the immediately preceding serve
 * - weight-3 domains: min 5 days since last served, and never immediately
 *   after another weight-3 domain
 */
export function getEligibleDomains(
  coverage: DomainCoverage[],
  history:  HistoryEntry[],
  now:      Date,
): DomainCoverage[] {
  const lastServe         = history[0] ?? null
  const lastDomainId      = lastServe?.domainId ?? null
  const lastDomain        = lastDomainId !== null ? coverage.find(d => d.domainId === lastDomainId) : undefined
  const lastWasWeight3    = lastDomain?.emotionalWeight === 3

  return coverage.filter(d => {
    if (d.domainId === lastDomainId) return false

    if (d.emotionalWeight === 3) {
      if (lastWasWeight3) return false

      const last = lastServedAt(d.domainId, history)
      if (last !== -Infinity && now.getTime() - last < WEIGHT3_MIN_GAP_DAYS * DAY_MS) return false
    }

    return true
  })
}

// ── Domain selection ────────────────────────────────────────────────────────

/**
 * Pre-Echo (P1): only emotional_weight === 1 domains, rotating among the 3
 * lowest-density of those. "Rotation" = pick the least-recently-served of the
 * three, subject to the consecutive-domain cooldown.
 */
export function pickDomainP1(
  coverage: DomainCoverage[],
  history:  HistoryEntry[],
  now:      Date,
): DomainCoverage | null {
  const weight1 = coverage.filter(d => d.emotionalWeight === 1)
  if (weight1.length === 0) return null

  const lowestThree = [...weight1].sort((a, b) => a.density - b.density).slice(0, 3)

  const lastDomainId = history[0]?.domainId ?? null
  let pool = lowestThree.filter(d => d.domainId !== lastDomainId)
  if (pool.length === 0) pool = lowestThree // fallback if cooldown would empty the pool

  return pool.reduce((least, d) =>
    lastServedAt(d.domainId, history) < lastServedAt(least.domainId, history) ? d : least,
  )
}

/**
 * Standard (P2) / Deep (P3): 80% lowest-(effective-)density eligible domain,
 * 20% uniformly random eligible domain.
 */
export function pickDomainP2P3(
  coverage: DomainCoverage[],
  history:  HistoryEntry[],
  b:        Band,
  random:   () => number,
  now:      Date,
): DomainCoverage | null {
  let eligible = getEligibleDomains(coverage, history, now)
  if (eligible.length === 0) eligible = coverage // fallback if cooldowns exclude everything
  if (eligible.length === 0) return null

  const lowest = eligible.reduce((least, d) =>
    rankValue(d, b) < rankValue(least, b) ? d : least,
  )

  if (random() < 0.8) return lowest

  const idx = Math.min(eligible.length - 1, Math.floor(random() * eligible.length))
  return eligible[idx]
}

// ── Question selection within a domain ─────────────────────────────────────

function isQuestionEligible(
  questionId: number | string,
  history:    HistoryEntry[],
  now:        Date,
): boolean {
  for (const h of history) {
    if (h.questionId !== questionId && h.b2bQuestionId !== questionId) continue

    const servedMs = new Date(h.servedAt).getTime()

    if (h.answeredAt) {
      const answeredMs = new Date(h.answeredAt).getTime()
      if (now.getTime() - answeredMs < ANSWERED_COOLDOWN_DAYS * DAY_MS) return false
    } else {
      if (now.getTime() - servedMs < UNANSWERED_REENTRY_DAYS * DAY_MS) return false
    }
  }
  return true
}

function tiersForBand(b: Band): Tier[] {
  if (b === 'p1') return ['onramp']
  if (b === 'p2') return ['onramp', 'standard']
  return ['onramp', 'standard', 'deep']
}

export function pickQuestionB2C(
  domainId: number,
  b:        Band,
  history:  HistoryEntry[],
  bank:     ElicitationQuestion[],
  now:      Date,
): ElicitationQuestion | null {
  const allowedTiers = tiersForBand(b)

  const candidates = bank.filter(q =>
    q.domainId === domainId &&
    allowedTiers.includes(q.tier) &&
    isQuestionEligible(q.id, history, now),
  )
  if (candidates.length === 0) return null

  return candidates.reduce((least, q) =>
    lastServedQuestionAt(q.id, history) < lastServedQuestionAt(least.id, history) ? q : least,
  )
}

function lastServedQuestionAt(questionId: number | string, history: HistoryEntry[]): number {
  for (const h of history) {
    if (h.questionId === questionId || h.b2bQuestionId === questionId) {
      return new Date(h.servedAt).getTime()
    }
  }
  return -Infinity
}

/** B2B: original question sequence (order_index) orders within the domain. */
export function pickQuestionB2B(
  domainId: number,
  history:  HistoryEntry[],
  bank:     B2BQuestion[],
  now:      Date,
): B2BQuestion | null {
  const candidates = bank
    .filter(q => q.domainId === domainId && isQuestionEligible(q.id, history, now))
    .sort((a, b) => a.orderIndex - b.orderIndex)

  return candidates[0] ?? null
}

// ── Grounded framing validation ────────────────────────────────────────────

const GENERIC_PRAISE = /\b(thoughtful|wise|special|insightful|remarkable|amazing|wonderful|inspiring|brilliant)\b/i

export function validateFraming(text: string | null | undefined): boolean {
  if (!text) return false
  const trimmed = text.trim()
  if (!trimmed) return false
  if (trimmed.includes('—')) return false
  if (trimmed.length > 400) return false
  if (GENERIC_PRAISE.test(trimmed)) return false
  if (trimmed.includes('!')) return false
  return true
}

// Grounded framing for the P2/P3 daily question (defaultGenerateFramingSentence).
// Stricter than validateFraming above, which also covers the P0 repair bridge
// (defaultGenerateP0Question), whose system prompt intentionally permits
// "I notice" / tentative phrasing that this contract forbids.
export type FramingRejectionReason =
  | 'empty'
  | 'em_dash'
  | 'too_long'
  | 'generic_praise'
  | 'exclamation'
  | 'question_mark'
  | 'too_many_words'
  | 'i_notice'
  | 'multiple_sentences'

export function validateGroundedFramingReason(text: string | null | undefined): FramingRejectionReason | null {
  if (!text) return 'empty'
  const trimmed = text.trim()
  if (!trimmed) return 'empty'
  if (trimmed.includes('—')) return 'em_dash'
  if (trimmed.length > 400) return 'too_long'
  if (GENERIC_PRAISE.test(trimmed)) return 'generic_praise'
  if (trimmed.includes('!')) return 'exclamation'
  if (trimmed.includes('?')) return 'question_mark'

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length
  if (wordCount > 45) return 'too_many_words'

  if (/\bi notice\b/i.test(trimmed)) return 'i_notice'

  // Allow exactly one trailing terminator (period plus optional closing
  // quote/paren). Anything else with a '.' left over is a second sentence.
  const withoutTrailing = trimmed.replace(/[.!?]+["'’”)]*$/, '')
  if (withoutTrailing.includes('.')) return 'multiple_sentences'

  return null
}

export function validateGroundedFraming(text: string | null | undefined): boolean {
  return validateGroundedFramingReason(text) === null
}

// ── Main selection ──────────────────────────────────────────────────────────

export async function selectNextQuestion(
  params: SelectNextQuestionParams,
  deps:   Deps = defaultDeps,
): Promise<SelectNextQuestionResult> {
  const { archiveId, channel } = params
  const now = params.now ?? new Date()

  // ── P0: REPAIR ──────────────────────────────────────────────────────────
  const reflection = await deps.getNotQuiteRightReflection(archiveId, now)
  if (reflection) {
    const anchor = await deps.getReflectionAnchorDeposit(archiveId, reflection)
    const { questionText, framingUsed } = await deps.generateP0Question(reflection, anchor)

    await deps.insertQuestionHistory({
      archiveId,
      domainId:      null,
      questionId:    null,
      b2bQuestionId: null,
      questionText,
      source:        'p0',
      channel,
      framingUsed,
    })

    return { questionText, domainId: null, questionId: null, b2bQuestionId: null, framingUsed, source: 'p0' }
  }

  // ── Determine scope, band, coverage, history ───────────────────────────
  const scope        = await deps.getArchiveScope(archiveId)
  const depositCount = await deps.getOwnerDepositCount(archiveId)
  const b            = band(depositCount)
  const coverage     = await deps.getCoverage(archiveId, scope)
  const history      = await deps.getQuestionHistory(archiveId)

  const domain = b === 'p1'
    ? pickDomainP1(coverage, history, now)
    : pickDomainP2P3(coverage, history, b, deps.random, now)

  if (!domain) {
    throw new Error(`selectNextQuestion: no eligible domain for archive ${archiveId} (scope ${scope}, band ${b})`)
  }

  // ── Pick question within the domain ────────────────────────────────────
  let questionText:  string
  let questionId:    number | null = null
  let b2bQuestionId: string | null = null

  if (scope === 'b2b') {
    const bank = await deps.getB2BQuestions([domain.domainId])
    const q    = pickQuestionB2B(domain.domainId, history, bank, now)
    if (!q) throw new Error(`selectNextQuestion: no eligible b2b question for domain ${domain.domainId}`)
    questionText  = q.question
    b2bQuestionId = q.id
  } else {
    const bank = await deps.getElicitationQuestions([domain.domainId])
    const q    = pickQuestionB2C(domain.domainId, b, history, bank, now)
    if (!q) throw new Error(`selectNextQuestion: no eligible elicitation question for domain ${domain.domainId}`)
    questionText = q.questionText
    questionId   = q.id
  }

  // ── Grounded framing (P2/P3 only, when an anchor deposit exists) ───────
  let framingUsed: string | null = null
  if (b !== 'p1') {
    const anchor = await deps.getAnchorDeposit(archiveId, domain.domainId)
    if (anchor) {
      const sentence = await deps.generateFramingSentence(anchor, questionText, domain.emotionalWeight)
      if (validateGroundedFraming(sentence)) framingUsed = sentence!.trim()
    }
  }

  await deps.insertQuestionHistory({
    archiveId,
    domainId:      domain.domainId,
    questionId,
    b2bQuestionId,
    questionText,
    source:        b,
    channel,
    framingUsed,
  })

  return { questionText, domainId: domain.domainId, questionId, b2bQuestionId, framingUsed, source: b }
}

// ── Default (real) dependency implementations ───────────────────────────────

const anthropic = new Anthropic()

const FRAMING_SYSTEM_PROMPT = `You are the cognitive reference model of a person. In a moment they will be asked a new question. Your job is to write ONE short bridge sentence that connects something real they shared before to the topic of the question ahead.

CONTRACT: the bridge is one declarative sentence, maximum 30 words. It is not a question, not a reflection, and not an observation about how the person feels.

RULES:
1. Never ask a question. The question ahead is the only question. Do not echo it, hint at it, or add a question of your own.
2. Do not open with or use "I notice". Vary your openings. Prefer plain references such as "You once mentioned..." or "A while back you described...".
3. Do not attribute feelings or mental states ("you're sitting with", "carrying", "the tension you feel"). State what they SAID, not what they feel.
4. What they shared must connect naturally to the topic of the question ahead. If the only thing available is from a much heavier emotional register than the question ahead, or otherwise does not connect, respond with exactly: NONE
5. Closely paraphrase the thing they shared. Never invent specifics. No em dashes. American English. No exclamation points, no question marks.

One sentence only. No preamble, no quotation marks, no labels. If you cannot meet all of the above, respond with exactly: NONE`

async function defaultGenerateFramingSentence(
  anchor: AnchorDeposit,
  questionText: string,
  domainEmotionalWeight: number,
): Promise<string | null> {
  try {
    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 100,
      system:     FRAMING_SYSTEM_PROMPT,
      messages:   [{
        role: 'user',
        content: `They shared: ${anchor.response}\n\nThe question ahead (domain emotional weight ${domainEmotionalWeight} of 3, where 1 is light/everyday and 3 is heavy/significant): ${questionText}`,
      }],
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : ''
    if (!text || text === 'NONE') return null
    return text
  } catch (err) {
    console.warn('[selectNextQuestion] framing generation failed:', err instanceof Error ? err.message : err)
    return null
  }
}

const P0_SYSTEM_PROMPT = `You are the cognitive reference model of a person. Last week you shared a reflection with them, including a follow-up question. They told you that reflection was "not quite right."

Your task: write one short bridge sentence anchored in the specific thing they originally shared (close paraphrase, tentative voice, "I notice" / "it seems" / "I had been thinking"), followed on a new line by ANSWER: and then one short, gentle clarifying question that invites them to correct or refine what you got wrong.

Rules:
- Never invent details.
- Never use generic praise (thoughtful, wise, special, insightful, remarkable, amazing, wonderful, inspiring, brilliant).
- No em dashes. American English. No exclamation points.
- If you cannot ground the bridge sentence in what they said, write NONE on the first line, then ANSWER: and the clarifying question on the next line.`

async function defaultGenerateP0Question(
  reflection: MirrorReflectionRow,
  anchor:     AnchorDeposit | null,
): Promise<{ questionText: string; framingUsed: string | null }> {
  const fallbackQuestion =
    `Earlier I reflected: "${reflection.threadQuestion}" You mentioned that was not quite right. ` +
    `What part of that did not feel accurate, and how would you put it instead?`

  try {
    const context = anchor
      ? `They shared: ${anchor.response}\n\nThe reflection that was not quite right: ${reflection.reflection}\nThe follow-up question that came with it: ${reflection.threadQuestion}`
      : `The reflection that was not quite right: ${reflection.reflection}\nThe follow-up question that came with it: ${reflection.threadQuestion}`

    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 250,
      system:     P0_SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: context }],
    })

    const text  = response.content[0]?.type === 'text' ? response.content[0].text.trim() : ''
    const parts = text.split('ANSWER:')
    const bridge   = parts[0]?.trim() ?? ''
    const question = parts.slice(1).join('ANSWER:').trim()

    if (!question) return { questionText: fallbackQuestion, framingUsed: null }

    const framingUsed = validateFraming(bridge) && bridge !== 'NONE' ? bridge : null
    return { questionText: question, framingUsed }
  } catch (err) {
    console.warn('[selectNextQuestion] P0 generation failed:', err instanceof Error ? err.message : err)
    return { questionText: fallbackQuestion, framingUsed: null }
  }
}

async function defaultGetArchiveScope(archiveId: string): Promise<Scope> {
  const { data } = await supabaseAdmin.from('archives').select('tier').eq('id', archiveId).single()
  return data?.tier === 'succession' ? 'b2b' : 'b2c'
}

async function defaultGetOwnerDepositCount(archiveId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('owner_deposits')
    .select('id', { count: 'exact', head: true })
    .eq('archive_id', archiveId)
    .is('contributor_id', null)
  return count ?? 0
}

async function defaultGetCoverage(archiveId: string, scope: Scope): Promise<DomainCoverage[]> {
  const { data, error } = await supabaseAdmin.rpc('get_domain_coverage', {
    p_archive_id: archiveId,
    p_scope:      scope,
  })
  if (error) throw new Error(`get_domain_coverage failed: ${error.message}`)

  return (data ?? []).map((row: any) => ({
    domainId:        row.domain_id,
    slug:            row.slug,
    emotionalWeight: row.emotional_weight,
    density:         Number(row.density),
    avgDepth:        Number(row.avg_depth),
    lastTouched:     row.last_touched,
  }))
}

async function defaultGetQuestionHistory(archiveId: string): Promise<HistoryEntry[]> {
  const { data, error } = await supabaseAdmin
    .from('question_history')
    .select('domain_id, question_id, b2b_question_id, served_at, answered_at')
    .eq('archive_id', archiveId)
    .order('served_at', { ascending: false })
    .limit(500)
  if (error) throw new Error(`question_history fetch failed: ${error.message}`)

  return (data ?? []).map((row: any) => ({
    domainId:      row.domain_id,
    questionId:    row.question_id,
    b2bQuestionId: row.b2b_question_id,
    servedAt:      row.served_at,
    answeredAt:    row.answered_at,
  }))
}

async function defaultGetNotQuiteRightReflection(archiveId: string, now: Date): Promise<MirrorReflectionRow | null> {
  const cutoff = new Date(now.getTime() - 7 * DAY_MS).toISOString()

  const { data } = await supabaseAdmin
    .from('mirror_reflections')
    .select('id, reflection, thread_question, deposit_ids, reacted_at')
    .eq('archive_id', archiveId)
    .eq('owner_reaction', 'not_quite_right')
    .gte('reacted_at', cutoff)
    .order('reacted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null
  return {
    id:             data.id,
    reflection:     data.reflection,
    threadQuestion: data.thread_question,
    depositIds:     data.deposit_ids ?? [],
  }
}

async function defaultGetElicitationQuestions(domainIds: number[]): Promise<ElicitationQuestion[]> {
  if (domainIds.length === 0) return []
  const { data, error } = await supabaseAdmin
    .from('elicitation_questions')
    .select('id, domain_id, tier, text')
    .in('domain_id', domainIds)
    .eq('scope', 'b2c')
    .eq('active', true)
  if (error) throw new Error(`elicitation_questions fetch failed: ${error.message}`)

  return (data ?? []).map((row: any) => ({
    id:           row.id,
    domainId:     row.domain_id,
    tier:         row.tier,
    questionText: row.text,
  }))
}

async function defaultGetB2BQuestions(domainIds: number[]): Promise<B2BQuestion[]> {
  if (domainIds.length === 0) return []
  const { data, error } = await supabaseAdmin
    .from('b2b_questions')
    .select('id, domain_id, question, order_index')
    .in('domain_id', domainIds)
    .eq('is_incident_seed', false)
    .order('order_index', { ascending: true })
  if (error) throw new Error(`b2b_questions fetch failed: ${error.message}`)

  return (data ?? []).map((row: any) => ({
    id:         row.id,
    domainId:   row.domain_id,
    question:   row.question,
    orderIndex: row.order_index ?? 0,
  }))
}

async function defaultGetAnchorDeposit(archiveId: string, domainId: number): Promise<AnchorDeposit | null> {
  const { data } = await supabaseAdmin
    .from('deposit_domain_scores')
    .select('deposit_id, weight, depth, owner_deposits(id, prompt, response)')
    .eq('archive_id', archiveId)
    .eq('domain_id', domainId)
    .order('weight', { ascending: false })
    .limit(1)
    .maybeSingle()

  const dep = (data as any)?.owner_deposits
  if (!dep) return null
  return { id: dep.id, prompt: dep.prompt, response: dep.response }
}

async function defaultGetReflectionAnchorDeposit(
  archiveId: string,
  reflection: MirrorReflectionRow,
): Promise<AnchorDeposit | null> {
  if (reflection.depositIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('owner_deposits')
      .select('id, prompt, response')
      .in('id', reflection.depositIds)
      .limit(1)
      .maybeSingle()
    if (data) return data as AnchorDeposit
  }

  const { data } = await supabaseAdmin
    .from('owner_deposits')
    .select('id, prompt, response')
    .eq('archive_id', archiveId)
    .is('contributor_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data as AnchorDeposit) ?? null
}

async function defaultInsertQuestionHistory(row: {
  archiveId:     string
  domainId:      number | null
  questionId:    number | null
  b2bQuestionId: string | null
  questionText:  string
  source:        Source
  channel:       Channel
  framingUsed:   string | null
}): Promise<void> {
  // answered_deposit_id / answered_at are deliberately left unset here -- the
  // reply handler populates those once the family responds to this question.
  const { error } = await supabaseAdmin.from('question_history').insert({
    archive_id:      row.archiveId,
    domain_id:       row.domainId,
    question_id:     row.questionId,
    b2b_question_id: row.b2bQuestionId,
    question_text:   row.questionText,
    source:          row.source,
    channel:         row.channel,
    framing_used:    row.framingUsed !== null,
  })
  if (error) console.warn('[selectNextQuestion] question_history insert failed:', error.message)
}

export const defaultDeps: Deps = {
  getArchiveScope:            defaultGetArchiveScope,
  getOwnerDepositCount:       defaultGetOwnerDepositCount,
  getCoverage:                defaultGetCoverage,
  getQuestionHistory:         defaultGetQuestionHistory,
  getNotQuiteRightReflection: defaultGetNotQuiteRightReflection,
  getElicitationQuestions:    defaultGetElicitationQuestions,
  getB2BQuestions:            defaultGetB2BQuestions,
  getAnchorDeposit:           defaultGetAnchorDeposit,
  getReflectionAnchorDeposit: defaultGetReflectionAnchorDeposit,
  generateFramingSentence:    defaultGenerateFramingSentence,
  generateP0Question:         defaultGenerateP0Question,
  insertQuestionHistory:      defaultInsertQuestionHistory,
  random:                     Math.random,
}
