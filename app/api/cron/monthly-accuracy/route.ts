import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { DIMENSIONS } from '@/lib/entityAccuracy'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic()

function validateCronAuth(req: NextRequest): boolean {
  const { searchParams } = new URL(req.url)
  const secret    = searchParams.get('secret') || req.headers.get('authorization')?.replace('Bearer ', '') || ''
  const expected  = process.env.CRON_SECRET || ''
  return !!expected && secret === expected
}

// Dimension explanations for what a low score means the entity lacks
const DIMENSION_GAP: Record<string, string> = {
  professional_philosophy: 'The entity cannot yet speak to how you think about work, leadership, or building things.',
  relationship_to_family:  'The entity lacks depth on how you feel about family and what it means to you.',
  core_values:             'The entity does not yet know what you believe most deeply about how to live.',
  defining_experiences:    'The entity is missing the moments that shaped who you became.',
  wisdom_and_lessons:      'The entity cannot share the things you know now that you wish you had known earlier.',
  approach_to_people:      'The entity does not understand how you read people or build relationships.',
  approach_to_money:       'The entity lacks understanding of what money means to you and how you think about it.',
  early_life:              'The entity does not know enough about where you came from and what formed you.',
  spiritual_beliefs:       'The entity cannot speak to what you believe about meaning, purpose, or faith.',
  fears_and_vulnerabilities: 'The entity does not know what you are afraid of or where you feel most human.',
}

async function generateOwnerQuestion(
  dimensionId: string,
  dimensionLabel: string,
  firstName: string,
  lang: string,
): Promise<string> {
  const langInstr = lang === 'zh' ? 'Write in Simplified Chinese.' :
    lang === 'yue' ? 'Write in Cantonese using Traditional Chinese characters.' :
    lang === 'ja'  ? 'Write in polite Japanese.' :
    lang === 'es'  ? 'Write in Spanish.' :
    lang === 'ko'  ? 'Write in Korean.' :
    lang === 'vi'  ? 'Write in Vietnamese.' :
    lang === 'tl'  ? 'Write in Filipino (Tagalog).' : 'Write in English.'

  try {
    const res = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [{
        role:    'user',
        content: `Generate one personal reflection question for someone building a legacy archive.

The question targets this dimension: ${dimensionLabel}
The person's first name: ${firstName}

Requirements:
- 1-2 sentences, specific and personal
- Not generic ("tell me about yourself")
- Starts with something concrete ("Think about a time...", "What was the moment...", "Who taught you...")
- ${langInstr}

Return only the question text.`,
      }],
    })
    return res.content[0].type === 'text' ? res.content[0].text.trim() : ''
  } catch {
    return `What is one thing about your ${dimensionLabel.toLowerCase()} that you have never fully put into words?`
  }
}

function buildMonthlyAccuracyEmail(
  firstName:         string,
  archiveName:       string,
  accuracyChanges:   { dimension: string; label: string; before: number; after: number; change: number }[],
  topDeposit:        string | null,
  weakest:           { label: string; score: number; explanation: string },
  targetQuestion:    string,
  portalUrl:         string,
): string {
  const rowsHtml = accuracyChanges.map(d => {
    const changeColor = d.change > 0 ? '#C4A24A' : d.change < 0 ? '#C47A7A' : '#706C65'
    const changeText  = d.change > 0 ? `↑ +${d.change}` : d.change < 0 ? `↓ ${d.change}` : '→'
    return `
    <tr>
      <td style="font-family:Georgia,serif;font-size:14px;color:#B8B4AB;padding:9px 0;border-bottom:1px solid rgba(240,237,230,0.08)">${d.label}</td>
      <td style="font-family:'Courier New',monospace;font-size:11px;text-align:right;padding:9px 0;border-bottom:1px solid rgba(240,237,230,0.08);white-space:nowrap">
        <span style="color:#F0EDE6">${d.before}% → ${d.after}%</span>&nbsp;<span style="color:${changeColor}">${changeText}</span>
      </td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">

  <div style="padding:32px 32px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">${archiveName.toUpperCase()}</p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;margin:0">MONTHLY ENTITY REPORT</p>
  </div>

  <div style="padding:32px">
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 24px">${firstName},</p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#F0EDE6;line-height:1.7;margin:0 0 32px">Here is what your entity learned this month.</p>

    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;margin:0 0 12px">WHAT CHANGED</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 32px">${rowsHtml}</table>

    ${topDeposit ? `
    <div style="margin:0 0 32px">
      <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;margin:0 0 12px">WHAT MOVED THE NEEDLE</p>
      <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#706C65;line-height:1.8;margin:0">"${topDeposit}"</p>
    </div>` : ''}

    <div style="margin:0 0 32px;padding:20px 24px;border-left:3px solid rgba(196,162,74,0.3);background:rgba(196,162,74,0.04)">
      <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#A08A52;margin:0 0 8px">NEEDS ATTENTION</p>
      <p style="font-family:Georgia,serif;font-size:15px;font-weight:300;color:#F0EDE6;line-height:1.7;margin:0">
        ${weakest.label} is at ${weakest.score}%. ${weakest.explanation}
      </p>
    </div>

    <div style="margin:0 0 32px;padding:24px 28px;border-left:3px solid rgba(196,162,74,0.5);background:rgba(196,162,74,0.04)">
      <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#A08A52;margin:0 0 12px">ONE QUESTION THIS MONTH</p>
      <p style="font-family:Georgia,serif;font-size:20px;font-weight:300;font-style:italic;color:#F0EDE6;line-height:1.7;margin:0">${targetQuestion}</p>
    </div>

    <a href="${portalUrl}" style="display:inline-block;background:#C4A24A;color:#0A0908;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-decoration:none;padding:14px 28px;border-radius:2px">
      ANSWER THIS QUESTION →
    </a>
  </div>

  <div style="padding:16px 32px 32px;border-top:1px solid rgba(240,237,230,0.06);margin-top:8px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;line-height:1.8;margin:0">
      BASALITH · ACTIVE ARCHIVE<br>${archiveName}<br>Heritage Nexus Inc.
    </p>
  </div>

</body>
</html>`
}

export async function GET(req: NextRequest) {
  if (!validateCronAuth(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const isTest = searchParams.get('test') === 'true'
  const force  = searchParams.get('force') === 'true'

  if (!isTest && !force && new Date().getUTCDate() !== 1) {
    return Response.json({ skipped: true, reason: 'Not the 1st of the month' })
  }

  const { data: archives } = await supabaseAdmin
    .from('archives')
    .select('id, name, owner_email, owner_name, preferred_language, created_at')
    .eq('status', 'active')
    .not('owner_email', 'is', null)

  const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
  const calMonth  = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}`
  let sent = 0
  const skipped: string[] = []

  for (const archive of archives ?? []) {
    try {
      // Idempotency
      const { data: existing } = await supabaseAdmin
        .from('owner_notifications')
        .select('id')
        .eq('archive_id', archive.id)
        .eq('type', 'monthly_accuracy')
        .filter('metadata->>calMonth', 'eq', calMonth)
        .maybeSingle()

      if (existing && !force) { skipped.push(archive.name); continue }

      // Get current accuracy scores
      const { data: accuracy } = await supabaseAdmin
        .from('entity_accuracy')
        .select('dimension, accuracy_score')
        .eq('archive_id', archive.id)

      if (!accuracy?.length) { skipped.push(`${archive.name} (no accuracy data)`); continue }

      // Get last month's snapshot from previous notification
      const { data: lastNotif } = await supabaseAdmin
        .from('owner_notifications')
        .select('metadata')
        .eq('archive_id', archive.id)
        .eq('type', 'monthly_accuracy')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const lastScores: Record<string, number> = (lastNotif?.metadata as any)?.scores ?? {}

      // Build accuracy change rows
      const accuracyChanges = DIMENSIONS.map(dim => {
        const current = accuracy.find(a => a.dimension === dim.id)
        const after   = Math.round((current?.accuracy_score ?? 0) * 100)
        const before  = Math.round((lastScores[dim.id] ?? after) * 100) // default to same if no history
        return { dimension: dim.id, label: dim.label, before, after, change: after - before }
      }).sort((a, b) => b.change - a.change)

      // Get top training pair from last 30 days
      const { data: recentPairs } = await supabaseAdmin
        .from('training_pairs')
        .select('prompt, completion, quality_score')
        .eq('archive_id', archive.id)
        .eq('included_in_training', true)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('quality_score', { ascending: false })
        .limit(3)

      const topDeposit = recentPairs?.[0]?.prompt
        ? recentPairs[0].prompt.substring(0, 120) + (recentPairs[0].prompt.length > 120 ? '…' : '')
        : null

      // Find weakest dimension
      const weakestDim = [...accuracyChanges].sort((a, b) => a.after - b.after)[0]

      const lang      = archive.preferred_language ?? 'en'
      const firstName = archive.owner_name?.split(' ')[0] ?? 'there'

      // Generate targeted question for weakest dimension
      const targetQuestion = await generateOwnerQuestion(
        weakestDim.dimension, weakestDim.label, firstName, lang,
      )

      const subject = lang === 'zh' ? `您的实体本月 · ${archive.name}`
        : lang === 'yue' ? `你嘅實體今個月 · ${archive.name}`
        : lang === 'ja'  ? `今月のエンティティ · ${archive.name}`
        : lang === 'es'  ? `Su entidad este mes · ${archive.name}`
        : `Your entity this month · ${archive.name}`

      const portalUrl = `${siteUrl}/archive/entity`

      await resend.emails.send({
        from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
        to:      archive.owner_email,
        subject,
        html:    buildMonthlyAccuracyEmail(
          firstName,
          archive.name,
          accuracyChanges,
          topDeposit,
          {
            label:       weakestDim.label,
            score:       weakestDim.after,
            explanation: DIMENSION_GAP[weakestDim.dimension] ?? '',
          },
          targetQuestion,
          portalUrl,
        ),
        headers: {
          'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
          'X-Entity-Ref-ID':  `basalith-monthly-accuracy-${archive.id}-${calMonth}`,
          'Precedence':       'bulk',
        },
      })

      // Save snapshot for next month's comparison
      const scoreSnapshot: Record<string, number> = {}
      for (const a of accuracy) scoreSnapshot[a.dimension] = a.accuracy_score

      await supabaseAdmin.from('owner_notifications').insert({
        archive_id: archive.id,
        type:       'monthly_accuracy',
        subject,
        sent_to:    archive.owner_email,
        sent_at:    new Date().toISOString(),
        metadata:   { calMonth, scores: scoreSnapshot },
      })

      sent++
    } catch (err: any) {
      console.error(`[monthly-accuracy] ${archive.id}:`, err.message)
      skipped.push(`${archive.name} (error)`)
    }
  }

  return Response.json({ sent, total: archives?.length ?? 0, skipped })
}
