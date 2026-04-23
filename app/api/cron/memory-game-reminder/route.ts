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

  const isAuthorized = expected && (headerSecret === expected || secretParam === expected)
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isTest = searchParams.get('test') === 'true'

  // Run on Fridays only (day 5)
  const today = new Date()
  if (!isTest && today.getDay() !== 5) {
    return NextResponse.json({ skipped: true, reason: 'Not Friday' })
  }

  // Find active sessions closing within the next 12 hours
  const now       = new Date()
  const in12Hours = new Date(now.getTime() + 12 * 60 * 60 * 1000)

  const { data: sessions } = await supabaseAdmin
    .from('memory_game_sessions')
    .select('id, archive_id, photograph_ids, closes_at, total_memories')
    .eq('status', 'active')
    .lte('closes_at', in12Hours.toISOString())

  let sent    = 0
  let skipped = 0

  for (const session of sessions ?? []) {
    try {
      const { data: archive } = await supabaseAdmin
        .from('archives')
        .select('id, name, family_name')
        .eq('id', session.archive_id)
        .single()

      if (!archive) { skipped++; continue }

      // Get all active contributors
      const { data: contributors } = await supabaseAdmin
        .from('contributors')
        .select('email, name')
        .eq('archive_id', session.archive_id)
        .eq('status', 'active')

      if (!contributors || contributors.length === 0) { skipped++; continue }

      // Get who has already contributed
      const { data: existing } = await supabaseAdmin
        .from('memory_game_contributions')
        .select('contributor_email, contributor_name, memory_text')
        .eq('session_id', session.id)

      const playedEmails = new Set((existing ?? []).map(c => c.contributor_email.toLowerCase()))

      // Find non-players
      const nonPlayers = contributors.filter(c => !playedEmails.has(c.email.toLowerCase()))
      if (nonPlayers.length === 0) { skipped++; continue }

      // Build leaderboard
      const countMap: Record<string, number> = {}
      for (const c of existing ?? []) {
        countMap[c.contributor_name || c.contributor_email] =
          (countMap[c.contributor_name || c.contributor_email] || 0) + 1
      }
      const leaderboard = Object.entries(countMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)

      const topName  = leaderboard[0]?.[0] ?? ''
      const topCount = leaderboard[0]?.[1] ?? 0

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
      const closesAt = new Date(session.closes_at)
      const hoursLeft = Math.max(0, Math.round((closesAt.getTime() - now.getTime()) / 3600000))

      const leaderboardHtml = leaderboard.map(([name, count]) => {
        const barWidth = leaderboard[0]?.[1] ? Math.round((count / leaderboard[0][1]) * 120) : 0
        return `
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
    <span style="font-family:'Courier New',monospace;font-size:11px;color:#9DA3A8;min-width:120px">${name}</span>
    <div style="width:${barWidth}px;height:6px;background:rgba(196,162,74,0.4);border-radius:2px"></div>
    <span style="font-family:'Courier New',monospace;font-size:10px;color:#706C65">${count}</span>
  </div>`
      }).join('')

      for (const contributor of nonPlayers) {
        try {
          await resend.emails.send({
            from:    `The ${archive.family_name} Archive <archive@basalith.xyz>`,
            to:      contributor.email,
            subject: `The game closes ${hoursLeft <= 3 ? 'soon' : 'today'}: ${session.total_memories} memories so far · ${archive.name}`,
            html: `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">

  <div style="padding:32px 32px 24px">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">
      THE ${(archive.family_name ?? archive.name).toUpperCase()} ARCHIVE
    </p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;margin:0 0 24px">
      MEMORY GAME · CLOSING ${hoursLeft <= 3 ? 'SOON' : 'TODAY'}
    </p>

    <p style="font-family:Georgia,serif;font-size:20px;font-weight:700;color:#F0EDE6;margin:0 0 8px">
      The game closes in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}.
    </p>
    <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#706C65;line-height:1.7;margin:0 0 24px">
      ${contributors.length} family member${contributors.length !== 1 ? 's' : ''} received this game.
      ${session.total_memories} memories have been contributed so far.
      ${topName ? `${topName} is leading with ${topCount} memories.` : ''}
    </p>
    <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#9DA3A8;margin:0 0 20px">
      You have not played yet. There is still time.
    </p>

    <a href="${siteUrl}/game/${session.id}"
      style="display:inline-block;font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#0A0908;background:#C4A24A;text-decoration:none;padding:10px 24px;border-radius:2px">
      PLAY NOW →
    </a>
  </div>

  ${leaderboardHtml ? `
  <div style="padding:0 32px 32px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#5C6166;margin:0 0 12px">
      CURRENT STANDINGS
    </p>
    ${leaderboardHtml}
    <div style="display:flex;align-items:center;gap:12px;margin-top:4px">
      <span style="font-family:'Courier New',monospace;font-size:11px;color:rgba(196,162,74,0.6);min-width:120px">You</span>
      <div style="width:4px;height:6px;background:rgba(255,255,255,0.08);border-radius:2px"></div>
      <span style="font-family:'Courier New',monospace;font-size:10px;color:#3A3830">0</span>
    </div>
  </div>` : ''}

  <div style="padding:0 32px 32px;border-top:1px solid rgba(240,237,230,0.06)">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;line-height:1.8;margin:20px 0 0">
      BASALITH · XYZ<br>
      The ${archive.family_name ?? archive.name} Archive
    </p>
  </div>

</body>
</html>`,
            headers: {
              'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
              'X-Entity-Ref-ID':  `basalith-${archive.id}-${Date.now()}`,
              'Precedence':       'bulk',
            },
          })
          sent++
        } catch (emailErr: unknown) {
          const msg = emailErr instanceof Error ? emailErr.message : String(emailErr)
          console.error('Reminder email failed:', contributor.email, msg)
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`Reminder failed for session ${session.id}:`, msg)
    }
  }

  return NextResponse.json({ sent, skipped, sessions: sessions?.length ?? 0 })
}
