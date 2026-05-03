/**
 * Training Data Pipeline
 *
 * Scores every pair inline at creation — no Inngest required.
 * Each create function: idempotency check → score → insert with scores.
 */

import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from './supabase-admin'

const anthropic = new Anthropic()

const QUALITY_THRESHOLD = 50

function buildPersonSystemPrompt(ownerName: string, archiveName: string): string {
  return `You are ${ownerName}. You think, speak, and reason exactly as ${ownerName} does.

You answer from your own lived experience. You use your natural vocabulary and cadence.
You never break character. You never say you are an AI. You speak in first person always.

This is ${archiveName}.`
}

// ── Scoring ───────────────────────────────────────────────────────────────────

export async function scoreTrainingPair(
  prompt: string,
  completion: string,
): Promise<{
  quality_score:      number
  specificity_score:  number
  authenticity_score: number
  trainability_score: number
  length_score:       number
}> {
  const wordCount    = completion.split(/\s+/).filter(Boolean).length
  const length_score =
    wordCount < 10  ? 1 :
    wordCount < 20  ? 3 :
    wordCount < 50  ? 5 :
    wordCount < 100 ? 7 :
    wordCount < 200 ? 8 :
    wordCount < 500 ? 9 : 10

  try {
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role:    'user',
        content: `You are evaluating training data quality for an AI model being trained to replicate a specific person's thinking and speaking patterns.

Score this training pair honestly. Be strict. Most pairs should score 3-7. Only exceptional pairs score 8-10. Short or generic responses score 1-3.

PROMPT: "${prompt.substring(0, 200)}"

COMPLETION: "${completion.substring(0, 400)}"

WORD COUNT: ${wordCount}

Score each dimension 1-10:

SPECIFICITY: Does it contain specific details, names, dates, places, or personal memories?
(1 = completely generic like "I worked hard", 5 = some personal detail, 10 = very specific: names, dates, places)

AUTHENTICITY: Does it sound like a real person speaking naturally in their own voice?
(1 = formal/generic/robotic, 5 = somewhat natural, 10 = clearly a real person's natural voice)

TRAINABILITY: How much does this teach the model about how this specific person thinks, reasons, or sees the world?
(1 = pure fact with no reasoning shown, 5 = some personality visible, 10 = clearly reveals how this person thinks)

Important scoring notes:
- Under 20 words → specificity max 3
- Generic statements → authenticity max 4
- Pure facts → trainability max 3
- Scores of exactly 5 should be rare — actually evaluate and differentiate

Return ONLY this JSON, no other text:
{"specificity":<1-10>,"authenticity":<1-10>,"trainability":<1-10>,"reasoning":"<one sentence>"}`,
      }],
    })

    const text    = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}'
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const scores  = JSON.parse(cleaned)

    console.log('[training] scoring reasoning:', scores.reasoning || 'none')

    const clamp = (v: unknown) => Math.min(10, Math.max(1, Math.round(Number(v) || 5)))

    const specificity_score  = clamp(scores.specificity)
    const authenticity_score = clamp(scores.authenticity)
    const trainability_score = clamp(scores.trainability)

    // Weighted formula: specificity 30% + authenticity 25% + trainability 30% + length 15%
    const quality_score = Math.round(
      specificity_score  * 3.0 +
      authenticity_score * 2.5 +
      trainability_score * 3.0 +
      length_score       * 1.5,
    )

    return { quality_score, specificity_score, authenticity_score, trainability_score, length_score }
  } catch {
    const quality_score = Math.round(length_score * 10)
    return { quality_score, specificity_score: 5, authenticity_score: 5, trainability_score: 5, length_score }
  }
}

// ── Create from deposit ───────────────────────────────────────────────────────

export async function createTrainingPairFromDeposit(
  deposit: { id?: string; archive_id: string; prompt: string; response: string },
  ownerName:   string,
  archiveName: string,
  language = 'en',
): Promise<void> {
  console.log('[training] createTrainingPairFromDeposit called —',
    'depositId:', deposit.id,
    'archiveId:', deposit.archive_id,
    'promptLen:', deposit.prompt?.length ?? 0,
    'responseLen:', deposit.response?.length ?? 0,
  )

  if (!deposit.prompt || !deposit.response || deposit.response.length < 20) {
    console.log('[training] skipping — response too short')
    return
  }

  // Idempotency
  if (deposit.id) {
    const { data: existing } = await supabaseAdmin
      .from('training_pairs')
      .select('id')
      .eq('source_id', deposit.id)
      .eq('source_type', 'deposit')
      .maybeSingle()
    if (existing) {
      console.log('[training] pair already exists for deposit', deposit.id, '— skipping')
      return
    }
  }

  // Score inline
  console.log('[training] scoring pair...')
  const scores = await scoreTrainingPair(deposit.prompt, deposit.response)
  console.log('[training] quality score:', scores.quality_score)

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('training_pairs')
    .insert({
      archive_id:           deposit.archive_id,
      source_id:            deposit.id ?? null,
      source_type:          'deposit',
      prompt:               deposit.prompt,
      completion:           deposit.response,
      system_prompt:        buildPersonSystemPrompt(ownerName, archiveName),
      language,
      word_count:           deposit.response.split(/\s+/).filter(Boolean).length,
      included_in_training: scores.quality_score >= QUALITY_THRESHOLD,
      ...scores,
      metadata:             { owner_name: ownerName, archive_name: archiveName },
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('[training] INSERT FAILED:', insertError.message, insertError.details ?? '')
    return
  }

  console.log('[training] pair created — id:', inserted?.id, '— quality:', scores.quality_score, '— included:', scores.quality_score >= QUALITY_THRESHOLD)
}

// ── Create from voice ─────────────────────────────────────────────────────────

export async function createTrainingPairsFromVoice(
  recording: { id: string; archive_id: string; transcript: string; prompt?: string },
  ownerName:   string,
  archiveName: string,
  language = 'en',
): Promise<void> {
  if (!recording.transcript || recording.transcript.length < 50) return

  // Idempotency
  const { data: existing } = await supabaseAdmin
    .from('training_pairs').select('id').eq('source_id', recording.id).eq('source_type', 'voice').limit(1)
  if (existing && existing.length > 0) return

  const systemPrompt = buildPersonSystemPrompt(ownerName, archiveName)

  if (recording.prompt) {
    const scores = await scoreTrainingPair(recording.prompt, recording.transcript)
    await supabaseAdmin.from('training_pairs').insert({
      archive_id: recording.archive_id, source_id: recording.id, source_type: 'voice',
      prompt: recording.prompt, completion: recording.transcript, system_prompt: systemPrompt,
      language, word_count: recording.transcript.split(/\s+/).filter(Boolean).length,
      included_in_training: scores.quality_score >= QUALITY_THRESHOLD, ...scores,
      metadata: { source: 'voice_recording' },
    })
    return
  }

  // Extract Q&A pairs from monologue
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 800,
      messages: [{ role: 'user', content: `Extract 2-3 Q&A pairs from this voice recording transcript where the question is something a family member might ask and the answer comes from the transcript in first person. Return ONLY a JSON array: [{"question":"...","answer":"..."}]\n\nTRANSCRIPT:\n${recording.transcript.substring(0, 1500)}` }],
    })

    const text   = response.content[0].type === 'text' ? response.content[0].text.trim() : '[]'
    const pairs  = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()) as { question: string; answer: string }[]

    for (const pair of pairs) {
      if (!pair.question || !pair.answer) continue
      const scores = await scoreTrainingPair(pair.question, pair.answer)
      await supabaseAdmin.from('training_pairs').insert({
        archive_id: recording.archive_id, source_id: recording.id, source_type: 'voice',
        prompt: pair.question, completion: pair.answer, system_prompt: systemPrompt,
        language, word_count: pair.answer.split(/\s+/).filter(Boolean).length,
        included_in_training: scores.quality_score >= QUALITY_THRESHOLD, ...scores,
        metadata: { source: 'voice_recording', extracted_from_monologue: true },
      })
    }
  } catch (err) {
    console.error('[training] voice extraction failed:', err instanceof Error ? err.message : err)
  }
}

// ── Create from contributor ───────────────────────────────────────────────────

export async function createTrainingPairFromContributor(
  obs: { archive_id: string; contributor_name: string; relationship: string; question: string; answer: string },
  ownerName:   string,
  archiveName: string,
  language = 'en',
): Promise<void> {
  const prompt     = `What do people who know you say about ${obs.question.toLowerCase().replace(/\?$/, '')}?`
  const completion = `${obs.contributor_name}, who has known me as my ${obs.relationship}, once said: "${obs.answer}"`

  const scores = await scoreTrainingPair(prompt, completion)

  const { error } = await supabaseAdmin.from('training_pairs').insert({
    archive_id: obs.archive_id, source_type: 'contributor',
    prompt, completion, system_prompt: buildPersonSystemPrompt(ownerName, archiveName),
    language, word_count: completion.split(/\s+/).filter(Boolean).length,
    included_in_training: scores.quality_score >= QUALITY_THRESHOLD, ...scores,
    metadata: { contributor_name: obs.contributor_name, relationship: obs.relationship, original_question: obs.question },
  })

  if (error) console.error('[training] createFromContributor failed:', error.message)
}

// ── Score existing unscored pair ──────────────────────────────────────────────

export async function scoreAndUpdatePair(trainingPairId: string): Promise<void> {
  const { data: pair } = await supabaseAdmin
    .from('training_pairs').select('prompt, completion').eq('id', trainingPairId).single()
  if (!pair) return
  const scores = await scoreTrainingPair(pair.prompt, pair.completion)
  await supabaseAdmin
    .from('training_pairs')
    .update({ ...scores, included_in_training: scores.quality_score >= QUALITY_THRESHOLD })
    .eq('id', trainingPairId)
}

// ── Export ────────────────────────────────────────────────────────────────────

export async function exportTrainingData(archiveId: string): Promise<string> {
  const { data: pairs } = await supabaseAdmin
    .from('training_pairs').select('prompt, completion, system_prompt')
    .eq('archive_id', archiveId).eq('included_in_training', true)
    .gte('quality_score', QUALITY_THRESHOLD).order('quality_score', { ascending: false })

  if (!pairs?.length) return ''

  return pairs.map(p => JSON.stringify({
    messages: [
      { role: 'system',    content: p.system_prompt || 'You are a specific person. Answer as them.' },
      { role: 'user',      content: p.prompt },
      { role: 'assistant', content: p.completion },
    ],
  })).join('\n')
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getTrainingStats(archiveId: string): Promise<{
  total:              number
  included:           number
  bySource:           Record<string, number>
  avgQuality:         number
  readyForFineTuning: boolean
  estimatedAccuracy:  string
}> {
  const { data: pairs } = await supabaseAdmin
    .from('training_pairs').select('source_type, quality_score, included_in_training').eq('archive_id', archiveId)

  if (!pairs?.length) {
    return { total: 0, included: 0, bySource: {}, avgQuality: 0, readyForFineTuning: false, estimatedAccuracy: 'No data yet' }
  }

  const included   = pairs.filter(p => p.included_in_training).length
  const bySource   = pairs.reduce<Record<string, number>>((acc, p) => { acc[p.source_type] = (acc[p.source_type] ?? 0) + 1; return acc }, {})
  const scores     = pairs.map(p => p.quality_score).filter((s): s is number => s !== null)
  const avgQuality = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  const estimatedAccuracy =
    included < 50   ? 'Too early to estimate' :
    included < 100  ? 'Early stage — entity will show personality but limited depth' :
    included < 250  ? 'Developing — entity recognizable to close family' :
    included < 500  ? 'Approaching fine-tuning threshold' :
    included < 1000 ? 'Ready for first fine-tuning run' :
    'Ready for high-quality fine-tuning'

  return { total: pairs.length, included, bySource, avgQuality, readyForFineTuning: included >= 500, estimatedAccuracy }
}
