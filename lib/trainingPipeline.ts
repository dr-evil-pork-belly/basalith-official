/**
 * Training Data Pipeline
 *
 * Converts archive deposits, voice recordings, and contributor answers
 * into fine-tuning training pairs. Every pair gets scored for quality
 * and marked for inclusion above a threshold.
 *
 * Design:
 *  - createTrainingPair* functions insert instantly (no Claude call)
 *  - Scoring is deferred — callers fire 'training/pair-created' Inngest event
 *  - Backfill route processes historical deposits with inline scoring
 */

import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from './supabase-admin'

const anthropic = new Anthropic()

const QUALITY_THRESHOLD = 60

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
    wordCount < 20  ? 2 :
    wordCount < 50  ? 4 :
    wordCount < 100 ? 6 :
    wordCount < 200 ? 8 :
    wordCount < 500 ? 9 : 10

  try {
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{
        role:    'user',
        content: `Score this AI training pair 0-10 on each dimension.
PROMPT: ${prompt.substring(0, 200)}
COMPLETION: ${completion.substring(0, 400)}
Return ONLY valid JSON: {"specificity":N,"authenticity":N,"trainability":N}`,
      }],
    })

    const text    = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}'
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const scores  = JSON.parse(cleaned)

    const clamp = (v: unknown) => Math.min(10, Math.max(0, Math.round(Number(v) || 5)))

    const specificity_score  = clamp(scores.specificity)
    const authenticity_score = clamp(scores.authenticity)
    const trainability_score = clamp(scores.trainability)

    const quality_score = Math.round(
      specificity_score  * 2.5 +
      authenticity_score * 2.5 +
      trainability_score * 2.5 +
      length_score       * 2.5,
    )

    return { quality_score, specificity_score, authenticity_score, trainability_score, length_score }
  } catch {
    const quality_score = Math.round(length_score * 10)
    return { quality_score, specificity_score: 5, authenticity_score: 5, trainability_score: 5, length_score }
  }
}

// ── Create functions (insert only — no scoring) ───────────────────────────────

export async function createTrainingPairFromDeposit(
  deposit: { id?: string; archive_id: string; prompt: string; response: string },
  ownerName:  string,
  archiveName: string,
  language = 'en',
): Promise<string | null> {
  // Idempotency: skip if already processed
  if (deposit.id) {
    const { data: existing } = await supabaseAdmin
      .from('training_pairs')
      .select('id')
      .eq('source_id', deposit.id)
      .eq('source_type', 'deposit')
      .maybeSingle()
    if (existing) return null
  }

  const { data, error } = await supabaseAdmin
    .from('training_pairs')
    .insert({
      archive_id:    deposit.archive_id,
      source_id:     deposit.id ?? null,
      source_type:   'deposit',
      prompt:        deposit.prompt,
      completion:    deposit.response,
      system_prompt: buildPersonSystemPrompt(ownerName, archiveName),
      language,
      word_count:    deposit.response.split(/\s+/).filter(Boolean).length,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[trainingPipeline] createFromDeposit failed:', error.message)
    return null
  }
  return data.id
}

export async function createTrainingPairsFromVoice(
  recording: { id: string; archive_id: string; transcript: string; prompt?: string },
  ownerName:  string,
  archiveName: string,
  language = 'en',
): Promise<string[]> {
  if (!recording.transcript || recording.transcript.length < 50) return []

  // Idempotency
  const { data: existing } = await supabaseAdmin
    .from('training_pairs')
    .select('id')
    .eq('source_id', recording.id)
    .eq('source_type', 'voice')
    .limit(1)
  if (existing && existing.length > 0) return []

  const systemPrompt = buildPersonSystemPrompt(ownerName, archiveName)
  const ids: string[] = []

  if (recording.prompt && recording.transcript.length > 50) {
    const { data } = await supabaseAdmin
      .from('training_pairs')
      .insert({
        archive_id:    recording.archive_id,
        source_id:     recording.id,
        source_type:   'voice',
        prompt:        recording.prompt,
        completion:    recording.transcript,
        system_prompt: systemPrompt,
        language,
        word_count:    recording.transcript.split(/\s+/).filter(Boolean).length,
        metadata:      { source: 'voice_recording' },
      })
      .select('id')
      .single()
    if (data) ids.push(data.id)
    return ids
  }

  // Extract Q&A pairs from monologue via Claude
  try {
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{
        role:    'user',
        content: `Extract 2-3 Q&A pairs from this voice recording transcript where the question is something a family member might ask and the answer comes from the transcript in first person. Return ONLY a JSON array: [{"question":"...","answer":"..."}]\n\nTRANSCRIPT:\n${recording.transcript.substring(0, 1500)}`,
      }],
    })

    const text    = response.content[0].type === 'text' ? response.content[0].text.trim() : '[]'
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const pairs   = JSON.parse(cleaned) as { question: string; answer: string }[]

    for (const pair of pairs) {
      if (!pair.question || !pair.answer) continue
      const { data } = await supabaseAdmin
        .from('training_pairs')
        .insert({
          archive_id:    recording.archive_id,
          source_id:     recording.id,
          source_type:   'voice',
          prompt:        pair.question,
          completion:    pair.answer,
          system_prompt: systemPrompt,
          language,
          word_count:    pair.answer.split(/\s+/).filter(Boolean).length,
          metadata:      { source: 'voice_recording', extracted_from_monologue: true },
        })
        .select('id')
        .single()
      if (data) ids.push(data.id)
    }
  } catch (err) {
    console.error('[trainingPipeline] voice extraction failed:', err instanceof Error ? err.message : err)
  }

  return ids
}

export async function createTrainingPairFromContributor(
  obs: {
    archive_id:        string
    contributor_name:  string
    relationship:      string
    question:          string
    answer:            string
  },
  ownerName:  string,
  archiveName: string,
  language = 'en',
): Promise<string | null> {
  const prompt     = `What do people who know you say about ${obs.question.toLowerCase().replace(/\?$/, '')}?`
  const completion = `${obs.contributor_name}, who has known me as my ${obs.relationship}, once said: "${obs.answer}"`

  const { data, error } = await supabaseAdmin
    .from('training_pairs')
    .insert({
      archive_id:    obs.archive_id,
      source_type:   'contributor',
      prompt,
      completion,
      system_prompt: buildPersonSystemPrompt(ownerName, archiveName),
      language,
      word_count:    completion.split(/\s+/).filter(Boolean).length,
      metadata:      { contributor_name: obs.contributor_name, relationship: obs.relationship, original_question: obs.question },
    })
    .select('id')
    .single()

  if (error) {
    console.error('[trainingPipeline] createFromContributor failed:', error.message)
    return null
  }
  return data.id
}

// ── Score and update an existing pair ────────────────────────────────────────

export async function scoreAndUpdatePair(trainingPairId: string): Promise<void> {
  const { data: pair } = await supabaseAdmin
    .from('training_pairs')
    .select('prompt, completion')
    .eq('id', trainingPairId)
    .single()

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
    .from('training_pairs')
    .select('prompt, completion, system_prompt')
    .eq('archive_id', archiveId)
    .eq('included_in_training', true)
    .gte('quality_score', QUALITY_THRESHOLD)
    .order('quality_score', { ascending: false })

  if (!pairs?.length) return ''

  return pairs
    .map(p =>
      JSON.stringify({
        messages: [
          { role: 'system',    content: p.system_prompt || 'You are a specific person. Answer as them.' },
          { role: 'user',      content: p.prompt },
          { role: 'assistant', content: p.completion },
        ],
      })
    )
    .join('\n')
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getTrainingStats(archiveId: string): Promise<{
  total:                number
  included:             number
  bySource:             Record<string, number>
  avgQuality:           number
  readyForFineTuning:   boolean
  estimatedAccuracy:    string
}> {
  const { data: pairs } = await supabaseAdmin
    .from('training_pairs')
    .select('source_type, quality_score, included_in_training')
    .eq('archive_id', archiveId)

  if (!pairs?.length) {
    return { total: 0, included: 0, bySource: {}, avgQuality: 0, readyForFineTuning: false, estimatedAccuracy: 'No data yet' }
  }

  const included     = pairs.filter(p => p.included_in_training).length
  const bySource     = pairs.reduce<Record<string, number>>((acc, p) => { acc[p.source_type] = (acc[p.source_type] ?? 0) + 1; return acc }, {})
  const scores       = pairs.map(p => p.quality_score).filter((s): s is number => s !== null)
  const avgQuality   = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  const estimatedAccuracy =
    included < 50   ? 'Too early to estimate' :
    included < 100  ? 'Early stage — entity will show personality but limited depth' :
    included < 250  ? 'Developing — entity recognizable to close family' :
    included < 500  ? 'Approaching fine-tuning threshold' :
    included < 1000 ? 'Ready for first fine-tuning run' :
    'Ready for high-quality fine-tuning'

  return { total: pairs.length, included, bySource, avgQuality, readyForFineTuning: included >= 500, estimatedAccuracy }
}
