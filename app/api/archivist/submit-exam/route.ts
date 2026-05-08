import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import Anthropic from '@anthropic-ai/sdk'
import { getCertModule } from '@/lib/certificationContent'
import { resend } from '@/lib/resend'

export const maxDuration = 120

const anthropic = new Anthropic()

async function scoreOpenAnswer(
  prompt:          string,
  scoringCriteria: string,
  answer:          string,
  minWords:        number,
): Promise<{ score: number; feedback: string; strength: string; improvement: string }> {
  const wc = answer.trim().split(/\s+/).filter(Boolean).length
  if (wc < minWords) {
    return { score: 0, feedback: `Answer too short — ${wc} of ${minWords} words minimum.`, strength: '', improvement: `Write at least ${minWords} words.` }
  }

  try {
    const res = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages:   [{
        role:    'user',
        content: `You are grading a Legacy Guide certification exam. Legacy Guides conduct 90-minute founding sessions with elderly families, helping them build Basalith archives — cognitive AI models trained on a person's deposits, voice recordings, and wisdom sessions.

QUESTION: ${prompt.substring(0, 350)}

SCORING CRITERIA: ${scoringCriteria}

ANSWER (${wc} words): ${answer.substring(0, 900)}

Grade strictly but fairly. A score of 8+ requires genuine understanding, not just correct facts. Generic answers cap at 6. Under minimum words: max 4.

Return ONLY valid JSON — no other text:
{"score":7,"feedback":"One concrete sentence about the answer.","strength":"What they did well.","improvement":"One specific thing that would strengthen this answer."}`,
      }],
    })
    const text    = res.content[0].type === 'text' ? res.content[0].text.trim() : '{}'
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed  = JSON.parse(cleaned)
    return {
      score:       Math.min(10, Math.max(0, Math.round(Number(parsed.score) || 5))),
      feedback:    String(parsed.feedback  ?? ''),
      strength:    String(parsed.strength  ?? ''),
      improvement: String(parsed.improvement ?? ''),
    }
  } catch {
    return { score: 5, feedback: 'Answer recorded.', strength: '', improvement: '' }
  }
}

async function sendCertificationEmail(archivist: { name: string; email: string }) {
  const firstName = (archivist.name ?? '').split(' ')[0] || 'Guide'
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0A0908;margin:0;padding:0;font-family:Georgia,serif;">
<div style="max-width:560px;margin:0 auto;padding:60px 40px;">
  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#C4A24A;margin-bottom:32px">Heritage Nexus Inc.</p>
  <p style="font-size:18px;color:#9DA3A8;line-height:1.8;margin-bottom:0">${firstName},</p>
  <p style="font-size:24px;font-style:italic;color:#F0EDE6;line-height:1.4;margin-bottom:32px">You passed.</p>
  <p style="font-size:16px;color:#9DA3A8;line-height:1.9;margin-bottom:20px">All three modules. The philosophy, the session, the custodianship.</p>
  <p style="font-size:16px;color:#9DA3A8;line-height:1.9;margin-bottom:20px">You are now a Certified Legacy Guide.</p>
  <p style="font-size:16px;color:#9DA3A8;line-height:1.9;margin-bottom:20px">This means you have demonstrated that you understand what Basalith is, how to conduct a founding session, and where the boundaries of your role begin and end.</p>
  <p style="font-size:16px;color:#9DA3A8;line-height:1.9;margin-bottom:32px">It also means you passed an exam graded by an AI — which is either deeply ironic or perfectly appropriate depending on how you look at it. We think it is perfectly appropriate.</p>
  <p style="font-size:16px;color:#9DA3A8;line-height:1.9;margin-bottom:32px">Your guide dashboard is now fully unlocked. Your commission tracking is active. Your certification badge is live.</p>
  <div style="border-left:3px solid #C4A24A;padding:20px 24px;margin-bottom:36px">
    <p style="font-size:16px;color:#F0EDE6;line-height:1.9;margin:0">Find the families who are not ready to lose someone.<br>Sit with them.<br>Help them begin.<br><br>That is the work.</p>
  </div>
  <a href="https://basalith.xyz/archivist/dashboard" style="display:inline-block;background:#C4A24A;color:#0A0908;font-family:'Courier New',monospace;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;padding:16px 32px;text-decoration:none;margin-bottom:40px">OPEN YOUR DASHBOARD →</a>
  <p style="font-size:15px;color:#5C6166;line-height:1.8;margin:0">David Ha<br>Founder, Basalith<br>Heritage Nexus Inc.</p>
</div>
</body>
</html>`

  try {
    await resend.emails.send({
      from:    'Basalith <guide@basalith.xyz>',
      to:      archivist.email,
      subject: 'You are a Certified Legacy Guide · Basalith',
      html,
    })
  } catch (e) {
    console.warn('[submit-exam] certification email failed:', e instanceof Error ? e.message : e)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { archivistId, moduleNumber, answers } = body as {
    archivistId:  string
    moduleNumber: 1 | 2 | 3
    answers:      Array<{ questionId: string; answer: string; type: string }>
  }

  if (!archivistId || !moduleNumber || !answers?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Load module content for question prompts + scoring criteria
  const mod = getCertModule(moduleNumber)
  if (!mod) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

  const questionMap = Object.fromEntries(mod.examQuestions.map(q => [q.id, q]))

  // Check cert record
  const { data: cert } = await supabaseAdmin
    .from('guide_certifications')
    .select('*')
    .eq('archivist_id', archivistId)
    .maybeSingle()

  const statusKey = `module_${moduleNumber}_status` as keyof typeof cert
  if (cert && cert[statusKey] === 'locked') {
    return NextResponse.json({ error: 'Module is locked' }, { status: 403 })
  }

  // Retry cooldown
  if (cert?.retry_available_at) {
    const diff = new Date(cert.retry_available_at as string).getTime() - Date.now()
    if (diff > 0) {
      return NextResponse.json({
        error:      `Retry available in ${Math.ceil(diff / 3_600_000)} hours`,
        retryHours: Math.ceil(diff / 3_600_000),
      }, { status: 429 })
    }
  }

  // ── Score each answer ────────────────────────────────────────────────────────

  let   totalScore = 0
  let   maxScore   = 0
  const scoredAnswers: Array<{ questionId: string; score: number; feedback: string; strength: string; improvement: string }> = []

  for (const { questionId, answer, type } of answers) {
    const q = questionMap[questionId]
    if (!q) continue

    let score = 0; let feedback = ''; let strength = ''; let improvement = ''

    if (type === 'multiple_choice') {
      const correct = typeof q.correct === 'number' ? q.correct : -1
      score    = parseInt(answer, 10) === correct ? 10 : 0
      feedback = score === 10 ? 'Correct.' : 'Incorrect.'
      maxScore += 10

    } else if (type === 'multiple_choice_multi') {
      const selected: number[] = JSON.parse(answer || '[]')
      const correct: number[]  = Array.isArray(q.correct) ? q.correct : []
      const hits    = selected.filter(v => correct.includes(v)).length
      const fp      = selected.filter(v => !correct.includes(v)).length
      const partial = hits / correct.length
      score    = Math.round(10 * Math.max(0, partial - fp * 0.5))
      feedback = score === 10 ? 'All correct.' : score >= 7 ? 'Mostly correct.' : 'Review the correct options.'
      maxScore += 10

    } else {
      // open text
      const result = await scoreOpenAnswer(
        q.prompt,
        q.scoringCriteria ?? '',
        answer,
        q.minWords ?? 60,
      )
      score       = result.score
      feedback    = result.feedback
      strength    = result.strength
      improvement = result.improvement
      maxScore   += 10

      // Persist answer
      void (async () => {
        try {
          await supabaseAdmin.from('guide_module_answers').insert({
            archivist_id:   archivistId,
            module_number:  moduleNumber,
            question_id:    questionId,
            answer,
            score,
            feedback,
            strength,
            improvement,
            attempt_number: ((cert as Record<string, unknown>)?.[`module_${moduleNumber}_attempts`] as number ?? 0) + 1,
          })
        } catch {}
      })()
    }

    totalScore += score
    scoredAnswers.push({ questionId, score, feedback, strength, improvement })
  }

  const percentScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
  const passed       = percentScore >= mod.passingScore
  const now          = new Date().toISOString()
  const attemptsField = `module_${moduleNumber}_attempts`
  const prevAttempts  = Number((cert as Record<string, unknown>)?.[attemptsField] ?? 0)

  // Build cert update
  const updates: Record<string, unknown> = {
    [`module_${moduleNumber}_status`]:  passed ? 'passed' : 'failed',
    [`module_${moduleNumber}_score`]:   percentScore,
    [`module_${moduleNumber}_attempts`]: prevAttempts + 1,
    retry_available_at: passed ? null : new Date(Date.now() + 24 * 3_600_000).toISOString(),
  }
  if (passed) {
    updates[`module_${moduleNumber}_passed_at`] = now
    if (moduleNumber === 1) updates['module_2_status'] = 'available'
    if (moduleNumber === 2) updates['module_3_status'] = 'available'
    if (moduleNumber === 3) {
      updates['certified_at'] = now
    }
  }

  await supabaseAdmin
    .from('guide_certifications')
    .upsert({ archivist_id: archivistId, ...updates }, { onConflict: 'archivist_id' })

  // Mark archivist certified after all 3
  if (moduleNumber === 3 && passed) {
    await supabaseAdmin
      .from('archivists')
      .update({ certification_status: 'certified', certification_level: 'certified' })
      .eq('id', archivistId)

    // Send certification email (non-fatal)
    const { data: archivist } = await supabaseAdmin
      .from('archivists')
      .select('name, email')
      .eq('id', archivistId)
      .single()

    if (archivist?.email) {
      void (async () => {
        try { await sendCertificationEmail(archivist) } catch {}
      })()
    }
  }

  return NextResponse.json({ passed, score: percentScore, scoredAnswers })
}
