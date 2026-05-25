import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const secretParam  = searchParams.get('secret') || ''
  const authHeader   = req.headers.get('authorization') || ''
  const headerSecret = authHeader.replace('Bearer ', '')
  const expected     = process.env.CRON_SECRET || ''
  const isForce      = searchParams.get('force') === 'true'

  const isAuthorized = expected && (headerSecret === expected || secretParam === expected)
  if (!isAuthorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only run on Sundays (UTC) unless forced
  if (!isForce && new Date().getDay() !== 0) {
    return NextResponse.json({ skipped: true, reason: 'Not Sunday' })
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: archives } = await supabaseAdmin
    .from('archives')
    .select('id, name, owner_name, owner_email, current_streak, preferred_language')
    .eq('status', 'active')
    .not('owner_email', 'is', null)

  let sent = 0

  for (const archive of archives ?? []) {
    try {
      const [depositsRes, contribRes] = await Promise.all([
        supabaseAdmin
          .from('owner_deposits')
          .select('prompt, response, source_type')
          .eq('archive_id', archive.id)
          .gte('created_at', weekAgo)
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('contributor_questions')
          .select('answer_text')
          .eq('archive_id', archive.id)
          .eq('status', 'answered')
          .gte('answered_at', weekAgo),
      ])

      const deposits        = depositsRes.data ?? []
      const contribAnswers  = contribRes.data ?? []

      const voiceCount   = deposits.filter(d => d.source_type === 'voice_recording').length
      const journalCount = deposits.filter(d => d.source_type === 'journal').length
      const totalDeposits = deposits.length
      const labelsCount  = deposits.filter(d => d.source_type === 'photograph_label').length

      // Find most substantial deposit (longest response)
      const highlight = deposits
        .filter(d => d.response && d.response.length > 50)
        .sort((a, b) => (b.response?.length ?? 0) - (a.response?.length ?? 0))[0] ?? null

      if (totalDeposits === 0 && contribAnswers.length === 0 && (archive.current_streak ?? 0) === 0) {
        continue // Nothing to report this week
      }

      const firstName = archive.owner_name?.split(' ')[0] ?? 'there'
      const streak    = archive.current_streak ?? 0
      const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.ai'

      await resend.emails.send({
        from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
        to:      archive.owner_email,
        subject: `Your week in the archive · ${archive.name}`,
        html:    buildWeeklyReplayEmail({
          archiveName:      archive.name,
          firstName,
          voiceCount,
          journalCount,
          totalDeposits,
          labelsCount,
          contribCount:     contribAnswers.length,
          highlight:        highlight?.response ?? null,
          streak,
          siteUrl,
        }),
        headers: {
          'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
          'X-Entity-Ref-ID':  `basalith-replay-${archive.id}-${Date.now()}`,
          'Precedence':       'bulk',
        },
      })

      sent++
      console.log('[weekly-replay] sent to:', archive.owner_email)
    } catch (err: unknown) {
      console.error('[weekly-replay] failed for archive:', archive.id, err instanceof Error ? err.message : err)
    }
  }

  return NextResponse.json({ sent, total: archives?.length ?? 0 })
}

function buildWeeklyReplayEmail({
  archiveName,
  firstName,
  voiceCount,
  journalCount,
  totalDeposits,
  labelsCount,
  contribCount,
  highlight,
  streak,
  siteUrl,
}: {
  archiveName:   string
  firstName:     string
  voiceCount:    number
  journalCount:  number
  totalDeposits: number
  labelsCount:   number
  contribCount:  number
  highlight:     string | null
  streak:        number
  siteUrl:       string
}): string {
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const summaryLines: string[] = []
  if (voiceCount   > 0) summaryLines.push(`${voiceCount} voice ${voiceCount === 1 ? 'memory' : 'memories'} recorded`)
  if (journalCount > 0) summaryLines.push(`${journalCount} journal ${journalCount === 1 ? 'entry' : 'entries'}`)
  if (labelsCount  > 0) summaryLines.push(`${labelsCount} ${labelsCount === 1 ? 'photograph' : 'photographs'} labeled`)
  if (contribCount > 0) summaryLines.push(`${contribCount} family ${contribCount === 1 ? 'answer' : 'answers'} received`)
  if (summaryLines.length === 0) summaryLines.push('Your archive is waiting for you')

  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">

  <div style="padding:32px 32px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">
      ${archiveName.toUpperCase()}
    </p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;margin:0">
      WEEKLY REPLAY · ${dateStr.toUpperCase()}
    </p>
  </div>

  <div style="padding:32px">
    <p style="font-family:Georgia,serif;font-size:18px;font-weight:300;color:#B8B4AB;margin:0 0 24px">
      ${firstName},
    </p>
    <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;color:#B8B4AB;line-height:1.7;margin:0 0 24px">
      Here is what your archive captured this week.
    </p>

    <div style="border-left:3px solid rgba(196,162,74,0.4);padding:20px 24px;margin:0 0 28px;background:rgba(196,162,74,0.03)">
      <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;margin:0 0 16px">
        THIS WEEK
      </p>
      ${summaryLines.map(line => `
      <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;color:#F0EDE6;line-height:1.6;margin:0 0 8px">
        ${line}
      </p>`).join('')}
    </div>

    ${highlight ? `
    <div style="margin:0 0 28px">
      <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;margin:0 0 14px">
        SOMETHING YOU SAID THIS WEEK
      </p>
      <div style="border-left:3px solid rgba(196,162,74,0.5);padding:20px 24px;background:rgba(196,162,74,0.04)">
        <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;font-style:italic;color:#F0EDE6;line-height:1.7;margin:0">
          "${highlight.length > 400 ? highlight.substring(0, 400) + '...' : highlight}"
        </p>
      </div>
    </div>
    ` : ''}

    ${streak > 0 ? `
    <div style="background:rgba(196,162,74,0.06);border:1px solid rgba(196,162,74,0.2);padding:20px 24px;margin:0 0 28px;text-align:center">
      <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;margin:0 0 8px">
        YOUR STREAK
      </p>
      <p style="font-family:Georgia,serif;font-size:36px;font-weight:300;color:#F0EDE6;margin:0 0 4px;line-height:1">
        ${streak}
      </p>
      <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#706C65;margin:0">
        ${streak === 1 ? 'day' : 'days'} in a row
      </p>
    </div>
    <p style="font-family:Georgia,serif;font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.7;margin:0 0 24px">
      Keep going. Come back tomorrow.
    </p>
    ` : `
    <p style="font-family:Georgia,serif;font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.7;margin:0 0 24px">
      Your archive is waiting. Even one minute counts.
    </p>
    `}

    <a href="${siteUrl}/archive/dashboard"
      style="display:block;background:#C4A24A;color:#0A0908;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-decoration:none;padding:16px 24px;text-align:center;margin-bottom:8px">
      CONTINUE YOUR ARCHIVE
    </a>
  </div>

  <div style="padding:0 32px 32px;border-top:1px solid rgba(240,237,230,0.06)">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;line-height:1.8;margin:20px 0 0">
      BASALITH · XYZ<br>${archiveName}<br>Heritage Nexus Inc.
    </p>
  </div>

</body>
</html>`
}
