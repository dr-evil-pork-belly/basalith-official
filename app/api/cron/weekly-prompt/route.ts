import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { DIMENSIONS } from '@/lib/entityAccuracy'
import { getWeeklyPrompt, getWeekNumber } from '@/lib/weeklyPrompts'

export async function GET(req: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET || ''
  const receivedHeader = req.headers.get('authorization') || ''
  const receivedSecret = receivedHeader.replace('Bearer ', '')

  console.log('Auth check:', {
    expected: expectedSecret,
    received: receivedSecret,
    matches: receivedSecret === expectedSecret
  })

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return Response.json({
      error: 'Unauthorized',
      hint: `Expected: "${expectedSecret}", Received: "${receivedSecret}"`,
    }, { status: 401 })
  }

  const isTest = new URL(req.url).searchParams.get('test') === 'true'

  // Only run on Mondays (skip check in test mode)
  if (!isTest) {
    const day = new Date().getDay() // 1 = Monday
    if (day !== 1) {
      return Response.json({ skipped: true, reason: 'Not Monday' })
    }
  }

  const { data: archives } = await supabaseAdmin
    .from('archives')
    .select('id, name, family_name, owner_email, owner_name')
    .eq('status', 'active')
    .not('owner_email', 'is', null)

  if (!archives || archives.length === 0) {
    return Response.json({ sent: 0, message: 'No active archives' })
  }

  const weekNumber = getWeekNumber()
  let sent = 0

  for (const archive of archives) {
    try {
      // Find weakest dimension from entity_accuracy table
      const { data: accuracyRows } = await supabaseAdmin
        .from('entity_accuracy')
        .select('dimension, accuracy_score')
        .eq('archive_id', archive.id)
        .order('accuracy_score', { ascending: true })
        .limit(1)

      const weakestDimension = accuracyRows?.[0]?.dimension ?? 'wisdom_and_lessons'
      const weakestScore     = Math.round((accuracyRows?.[0]?.accuracy_score ?? 0) * 100)

      const dimension      = DIMENSIONS.find(d => d.id === weakestDimension)
      const dimensionLabel = dimension?.label       ?? 'Wisdom and Lessons'
      const dimensionDesc  = dimension?.description ?? 'What you have learned from living'

      const prompt        = getWeeklyPrompt(weakestDimension, weekNumber)
      const ownerFirstName = archive.owner_name?.split(' ')[0] ?? 'there'

      // Overall accuracy for display
      const { data: allAccuracy } = await supabaseAdmin
        .from('entity_accuracy')
        .select('accuracy_score')
        .eq('archive_id', archive.id)

      const overallScore = allAccuracy && allAccuracy.length > 0
        ? Math.round(allAccuracy.reduce((s, a) => s + a.accuracy_score, 0) / allAccuracy.length * 100)
        : 0

      await resend.emails.send({
        from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
        to:      archive.owner_email,
        subject: `This week's question — ${archive.name}`,
        html:    buildWeeklyPromptEmail({
          archiveName:      archive.name,
          ownerFirstName,
          dimensionLabel,
          dimensionDesc,
          weakestScore,
          overallScore,
          prompt,
          weekNumber,
        }),
      })

      sent++
      console.log(`[weekly-prompt] Sent to: ${archive.owner_email}`)
    } catch (err: any) {
      console.error(`[weekly-prompt] Failed for archive ${archive.id}:`, err.message)
    }
  }

  return Response.json({ sent, total: archives.length, weekNumber, isTest })
}

// ── Email builder ──────────────────────────────────────────────────────────────

function buildWeeklyPromptEmail({
  archiveName,
  dimensionLabel,
  dimensionDesc,
  weakestScore,
  overallScore,
  prompt,
  weekNumber,
}: {
  archiveName:      string
  ownerFirstName:   string
  dimensionLabel:   string
  dimensionDesc:    string
  weakestScore:     number
  overallScore:     number
  prompt:           string
  weekNumber:       number
}): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
  const depthLabel = getDepthLabel(overallScore)

  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">

  <div style="padding:32px 32px 24px;border-bottom:1px solid rgba(240,237,230,0.06)">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">
      ${archiveName.toUpperCase()}
    </p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;margin:0">
      MONDAY PROMPT · WEEK ${weekNumber} · ${dateStr}
    </p>
  </div>

  <div style="padding:32px">

    <div style="margin-bottom:24px">
      <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;margin:0 0 8px">
        THIS WEEK'S FOCUS
      </p>
      <p style="font-family:Georgia,serif;font-size:18px;font-weight:700;color:#F0EDE6;margin:0 0 4px">
        ${dimensionLabel}
      </p>
      <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#706C65;margin:0 0 12px">
        ${dimensionDesc}
      </p>
      <div style="display:flex;align-items:center;gap:12px">
        <div style="flex:1;height:4px;background:rgba(240,237,230,0.08);border-radius:2px;overflow:hidden">
          <div style="height:100%;background:#C4A24A;border-radius:2px;width:${weakestScore}%"></div>
        </div>
        <p style="font-family:'Courier New',monospace;font-size:10px;color:#706C65;margin:0;white-space:nowrap">
          ${weakestScore}% DEPTH
        </p>
      </div>
    </div>

    <div style="border-left:3px solid rgba(196,162,74,0.5);padding:20px 24px;margin:0 0 24px;background:rgba(196,162,74,0.03)">
      <p style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#F0EDE6;line-height:1.6;margin:0;font-style:italic">
        &ldquo;${prompt}&rdquo;
      </p>
    </div>

    <a href="${siteUrl}/archive/entity"
      style="display:block;background:#C4A24A;color:#0A0908;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-decoration:none;padding:14px 24px;text-align:center;margin-bottom:16px">
      ANSWER THIS QUESTION →
    </a>

    <p style="font-family:Georgia,serif;font-size:13px;font-style:italic;color:#3A3830;text-align:center;margin:0 0 24px">
      Takes about 5 minutes. Your answer goes directly into your entity.
    </p>

    <div style="border-top:1px solid rgba(240,237,230,0.06);margin:0 0 20px"></div>

    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#706C65;margin:0 0 8px">
      YOUR ENTITY · CURRENT DEPTH
    </p>
    <p style="font-family:Georgia,serif;font-size:36px;font-weight:700;color:#F0EDE6;margin:0 0 4px;line-height:1">
      ${overallScore}%
    </p>
    <p style="font-family:Georgia,serif;font-size:13px;font-style:italic;color:#706C65;margin:0 0 12px">
      ${depthLabel}
    </p>
    <p style="font-family:Georgia,serif;font-size:13px;font-style:italic;color:#3A3830;margin:0">
      Answer this week's question and watch your ${dimensionLabel} score improve.
    </p>

  </div>

  <div style="padding:0 32px 32px;border-top:1px solid rgba(240,237,230,0.06)">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;line-height:1.8;margin:20px 0 0">
      BASALITH · XYZ<br>
      ${archiveName}<br>
      <a href="${siteUrl}/archive/dashboard" style="color:#3A3830">View your archive</a>
    </p>
  </div>

</body>
</html>`
}

function getDepthLabel(score: number): string {
  if (score >= 80) return 'Speaking with authority'
  if (score >= 60) return 'Speaking with depth'
  if (score >= 40) return 'Taking shape'
  if (score >= 20) return 'Still learning'
  return 'Just beginning'
}
