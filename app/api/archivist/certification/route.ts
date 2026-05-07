import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120

const anthropic = new Anthropic()

// Correct answers for multiple-choice questions
const MC_ANSWERS: Record<string, string> = {
  'm1_q3':   'b',
  'm1_q4':   'c',
  'm1_q7':   'b',
  'm3_q3_a': 'true',   // a — photographs count
  'm3_q3_c': 'true',   // c — entity accuracy
  'm3_q3_e': 'true',   // e — training pair count
  'm3_q3_f': 'true',   // f — contributor count
  'm3_q3_b': 'false',  // b — actual photographs (NO)
  'm3_q3_d': 'false',  // d — private voice recordings (NO)
}

const MIN_WORDS: Record<string, number> = {
  m1_q1: 100, m1_q2: 80, m1_q5: 80, m1_q6: 60, m1_q8: 80, m1_q9: 100, m1_q10: 60,
  m2_q1: 100, m2_q2: 100, m2_q3: 80, m2_q4: 80, m2_q5: 60, m2_q6: 200, m2_q7: 80, m2_q8: 100,
  m3_q1: 80, m3_q2: 80, m3_q4: 60, m3_q5: 60, m3_q6: 80,
}

async function scoreOpenText(question: string, answer: string): Promise<{ score: number; feedback: string }> {
  try {
    const res = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages:   [{
        role:    'user',
        content: `Score this exam answer for a Legacy Guide certification. The guide will use Basalith to help elderly families preserve their life histories and build AI entities.

QUESTION: ${question.substring(0, 300)}

ANSWER: ${answer.substring(0, 800)}

Score 0-10 based on:
- Accuracy of understanding Basalith's purpose and model
- Ability to explain clearly to a non-technical family client
- Depth of genuine comprehension (not just keyword repetition)
- Natural, empathetic language appropriate for this type of work

Return ONLY valid JSON, no other text:
{"score":5,"feedback":"One specific sentence of actionable feedback.","passed":true}`,
      }],
    })

    const text    = res.content[0].type === 'text' ? res.content[0].text.trim() : '{}'
    const parsed  = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
    const score   = Math.min(10, Math.max(0, Math.round(Number(parsed.score) || 5)))
    return { score, feedback: parsed.feedback || '' }
  } catch {
    return { score: 5, feedback: 'Answer recorded.' }
  }
}

// GET — return certification status for a guide
export async function GET(req: NextRequest) {
  const archivistId = new URL(req.url).searchParams.get('archivistId')
  if (!archivistId) return NextResponse.json({ error: 'archivistId required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('guide_certifications')
    .select('*')
    .eq('archivist_id', archivistId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-create if doesn't exist
  if (!data) {
    const { data: created } = await supabaseAdmin
      .from('guide_certifications')
      .insert({ archivist_id: archivistId })
      .select('*')
      .single()
    return NextResponse.json(created)
  }

  return NextResponse.json(data)
}

// POST — submit exam answers for scoring
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

  // Get current certification record
  const { data: cert } = await supabaseAdmin
    .from('guide_certifications')
    .select('*')
    .eq('archivist_id', archivistId)
    .maybeSingle()

  const statusKey = `module_${moduleNumber}_status` as keyof typeof cert
  if (cert && cert[statusKey] === 'locked') {
    return NextResponse.json({ error: 'Module is locked' }, { status: 403 })
  }

  // Get attempt number
  const { count: prevAttempts } = await supabaseAdmin
    .from('guide_module_answers')
    .select('id', { count: 'exact', head: true })
    .eq('archivist_id', archivistId)
    .eq('module_number', moduleNumber)

  const attemptNumber = ((prevAttempts ?? 0) / answers.length) + 1

  // Check retry cooldown (24 hours after failure)
  if (cert && cert[statusKey] === 'failed') {
    const lastAttemptRes = await supabaseAdmin
      .from('guide_module_answers')
      .select('created_at')
      .eq('archivist_id', archivistId)
      .eq('module_number', moduleNumber)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastAttemptRes.data) {
      const hoursSince = (Date.now() - new Date(lastAttemptRes.data.created_at).getTime()) / 3_600_000
      if (hoursSince < 24) {
        return NextResponse.json({
          error: `Retry available in ${Math.ceil(24 - hoursSince)} hours`,
          retryHours: Math.ceil(24 - hoursSince),
        }, { status: 429 })
      }
    }
  }

  // Score each answer
  const QUESTIONS_FOR_MODULE: Record<number, Record<string, string>> = {
    1: {
      m1_q1:  'Explain the difference between a generative AI chatbot and a Basalith entity.',
      m1_q2:  "A prospective client asks: 'Is this just like ChatGPT but with my family's photos?' How do you respond?",
      m1_q3:  'What is the primary purpose of the archive? (multiple choice)',
      m1_q4:  'When does a Basalith entity become meaningfully accurate? (multiple choice)',
      m1_q5:  'What makes Basalith different from a memory preservation service?',
      m1_q6:  "Explain the Zuckerberg positioning in your own words without using the word 'billionaire'.",
      m1_q7:  'What is a training pair? (multiple choice)',
      m1_q8:  "A client asks: 'Will the entity sound exactly like me immediately?' What do you tell them?",
      m1_q9:  'What are the three doors of the Basalith homepage and why does each door exist?',
      m1_q10: 'Why is the founding fee non-negotiable?',
    },
    2: {
      m2_q1: 'A client begins crying when describing their spouse. You are 20 minutes in. What do you do?',
      m2_q2: 'The client keeps giving one-sentence answers. How do you draw out richer responses without making them feel interrogated?',
      m2_q3: "The client says: 'I don't think I have anything interesting to say. My life has been pretty ordinary.' How do you respond?",
      m2_q4: 'You are 75 minutes in with 15 minutes left and have not covered professional philosophy or core values. What do you do?',
      m2_q5: 'A client wants to take a phone call halfway through the session. How do you handle this?',
      m2_q6: 'Write the opening 5 minutes of a founding session in script form.',
      m2_q7: "A client asks: 'What happens to all this data if Basalith shuts down?' What do you tell them?",
      m2_q8: 'How do you close the founding session in a way that motivates the client to continue contributing after you leave?',
    },
    3: {
      m3_q1: 'Walk through the steps to submit a new client for review after a successful founding session.',
      m3_q2: "A client's contributor portal link is not working. What are the three most likely causes and how do you resolve each?",
      m3_q3: 'What information can you see in the guide dashboard about a client\'s archive content? (select all that apply)',
      m3_q4: 'A client asks you to log into their archive and listen to their voice recordings. What do you do?',
      m3_q5: 'What is your responsibility if a client tells you they want to cancel their archive?',
      m3_q6: 'A client\'s archive has been active for 6 months but shows only 8 training pairs included. What does this tell you?',
    },
  }

  const questionMap = QUESTIONS_FOR_MODULE[moduleNumber] ?? {}
  let totalScore    = 0
  let maxScore      = 0
  const scoredAnswers: Array<{ questionId: string; score: number; feedback: string }> = []

  for (const { questionId, answer, type } of answers) {
    let score   = 0
    let feedback = ''

    if (type === 'mc') {
      const correctKey = `${questionId}`
      const expected   = MC_ANSWERS[correctKey]
      if (expected !== undefined) {
        score    = answer.toLowerCase() === expected ? 10 : 0
        feedback = score === 10 ? 'Correct.' : 'Incorrect.'
      }
      maxScore += 10
    } else {
      // Check minimum word count
      const minWords   = MIN_WORDS[questionId] ?? 60
      const wordCount  = answer.trim().split(/\s+/).filter(Boolean).length
      if (wordCount < minWords) {
        score    = 0
        feedback = `Minimum ${minWords} words required. You wrote ${wordCount}.`
      } else {
        const question    = questionMap[questionId] ?? questionId
        const result      = await scoreOpenText(question, answer)
        score             = result.score
        feedback          = result.feedback
      }
      maxScore += 10
    }

    totalScore += score
    scoredAnswers.push({ questionId, score, feedback })

    // Save individual answer
    await supabaseAdmin.from('guide_module_answers').insert({
      archivist_id:   archivistId,
      module_number:  moduleNumber,
      question_id:    questionId,
      answer,
      score,
      feedback,
      attempt_number: Math.round(attemptNumber),
    })
  }

  // Calculate percentage score out of 100
  const percentScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
  const passed       = percentScore >= 80
  const now          = new Date().toISOString()

  // Build update payload
  const updates: Record<string, unknown> = {
    [`module_${moduleNumber}_status`]: passed ? 'passed' : 'failed',
    [`module_${moduleNumber}_score`]:  percentScore,
  }
  if (passed) {
    updates[`module_${moduleNumber}_passed_at`] = now
    // Unlock next module
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

  // Update archivist certification_status if fully certified
  if (moduleNumber === 3 && passed) {
    await supabaseAdmin
      .from('archivists')
      .update({ certification_status: 'certified', certification_level: 'certified' })
      .eq('id', archivistId)
  }

  return NextResponse.json({
    passed,
    score:          percentScore,
    scoredAnswers,
    retryAvailable: !passed,
  })
}
