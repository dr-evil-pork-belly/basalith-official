import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import Anthropic from '@anthropic-ai/sdk'
import { getModule } from '@/lib/certificationContent'

export const maxDuration = 120

const anthropic = new Anthropic()

// Multiple-choice correct answers — keyed by questionId
const MC_CORRECT: Record<string, string> = {
  m1_q3: 'b',
  m1_q4: 'c',
  m1_q7: 'b',
  m3_q3: 'a',
}

async function scoreOpenText(
  questionPrompt: string,
  answer:         string,
): Promise<{ score: number; feedback: string }> {
  try {
    const res = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages:   [{
        role:    'user',
        content: `You are evaluating a Legacy Guide certification exam answer. Basalith is a service that builds person-specific AI entities from family archives — training data, not memory preservation.

QUESTION: ${questionPrompt.substring(0, 400)}

ANSWER: ${answer.substring(0, 800)}

Score 0-10 based on:
- Genuine understanding of what Basalith actually is (not just memory preservation)
- Ability to explain concepts clearly to a non-technical family
- Specificity and depth — generic answers score low, specific ones score high
- Warmth and emotional intelligence appropriate for working with elderly families

Return ONLY valid JSON:
{"score":7,"feedback":"One concrete sentence of specific feedback."}`,
      }],
    })
    const text    = res.content[0].type === 'text' ? res.content[0].text.trim() : '{}'
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed  = JSON.parse(cleaned)
    const score   = Math.min(10, Math.max(0, Math.round(Number(parsed.score) || 5)))
    return { score, feedback: String(parsed.feedback ?? '') }
  } catch {
    return { score: 5, feedback: 'Answer recorded.' }
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { archivistId, moduleNumber, answers } = body as {
    archivistId:  string
    moduleNumber: 1 | 2 | 3
    answers:      Array<{ questionId: string; answer: string; type: 'text' | 'mc' }>
  }

  if (!archivistId || !moduleNumber || !answers?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify module is unlocked for this guide
  const { data: cert } = await supabaseAdmin
    .from('guide_certifications')
    .select('*')
    .eq('archivist_id', archivistId)
    .maybeSingle()

  const statusKey = `module_${moduleNumber}_status` as keyof typeof cert
  if (cert && cert[statusKey] === 'locked') {
    return NextResponse.json({ error: 'Module is locked' }, { status: 403 })
  }

  // Retry cooldown: 24 hours after a failure
  if (cert && cert[statusKey] === 'failed') {
    const { data: lastAttempt } = await supabaseAdmin
      .from('guide_module_answers')
      .select('created_at')
      .eq('archivist_id', archivistId)
      .eq('module_number', moduleNumber)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastAttempt) {
      const hoursSince = (Date.now() - new Date(lastAttempt.created_at).getTime()) / 3_600_000
      if (hoursSince < 24) {
        return NextResponse.json({
          error:      `Retry available in ${Math.ceil(24 - hoursSince)} hours`,
          retryHours: Math.ceil(24 - hoursSince),
        }, { status: 429 })
      }
    }
  }

  // Load module content for question text
  const mod = getModule(moduleNumber)

  // Score each answer
  let totalScore = 0
  let maxScore   = 0
  const scoredAnswers: Array<{ questionId: string; score: number; feedback: string }> = []

  for (const { questionId, answer, type } of answers) {
    let score   = 0
    let feedback = ''

    if (type === 'mc') {
      const correct = MC_CORRECT[questionId]
      if (correct !== undefined) {
        score    = answer.toLowerCase() === correct ? 10 : 0
        feedback = score === 10 ? 'Correct.' : 'Incorrect.'
      } else {
        // Unknown MC question — give half credit
        score    = 5
        feedback = 'Recorded.'
      }
      maxScore += 10
    } else {
      // Find question text from content
      const examQ = mod?.examQuestions.find(q => q.id === questionId)
      const minWd = examQ?.minWords ?? 60
      const wc    = answer.trim().split(/\s+/).filter(Boolean).length

      if (wc < minWd) {
        score    = 0
        feedback = `Answer too short. Minimum ${minWd} words required.`
      } else {
        const result = await scoreOpenText(examQ?.prompt ?? questionId, answer)
        score        = result.score
        feedback     = result.feedback
      }
      maxScore += 10
    }

    totalScore += score
    scoredAnswers.push({ questionId, score, feedback })

    // Persist answer
    const { count: prevCount } = await supabaseAdmin
      .from('guide_module_answers')
      .select('id', { count: 'exact', head: true })
      .eq('archivist_id', archivistId)
      .eq('module_number', moduleNumber)

    await supabaseAdmin.from('guide_module_answers').insert({
      archivist_id:   archivistId,
      module_number:  moduleNumber,
      question_id:    questionId,
      answer,
      score,
      feedback,
      attempt_number: Math.floor((prevCount ?? 0) / answers.length) + 1,
    })
  }

  const percentScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
  const passed       = percentScore >= 80
  const now          = new Date().toISOString()

  // Build cert updates
  const updates: Record<string, unknown> = {
    [`module_${moduleNumber}_status`]: passed ? 'passed' : 'failed',
    [`module_${moduleNumber}_score`]:  percentScore,
  }
  if (passed) {
    updates[`module_${moduleNumber}_passed_at`] = now
    if (moduleNumber === 1) updates['module_2_status'] = 'available'
    if (moduleNumber === 2) updates['module_3_status'] = 'available'
    if (moduleNumber === 3) {
      updates['certified_at']        = now
      updates['certification_level'] = 'certified'
      updates['badge_issued']        = true
    }
  }

  await supabaseAdmin
    .from('guide_certifications')
    .upsert({ archivist_id: archivistId, ...updates }, { onConflict: 'archivist_id' })

  if (moduleNumber === 3 && passed) {
    await supabaseAdmin
      .from('archivists')
      .update({ certification_status: 'certified', certification_level: 'certified' })
      .eq('id', archivistId)
  }

  return NextResponse.json({ passed, score: percentScore, scoredAnswers })
}
