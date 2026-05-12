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

  // Find sessions that have expired and haven't had a summary sent
  const now = new Date()

  const { data: sessions } = await supabaseAdmin
    .from('memory_game_sessions')
    .select('id, archive_id, photograph_ids, closes_at, total_memories')
    .lt('closes_at', now.toISOString())
    .eq('summary_sent', false)
    .neq('status', 'expired')

  let sent    = 0
  let skipped = 0

  for (const session of sessions ?? []) {
    try {
      // Mark session complete
      await supabaseAdmin
        .from('memory_game_sessions')
        .update({ status: 'complete' })
        .eq('id', session.id)

      const { data: archive } = await supabaseAdmin
        .from('archives')
        .select('id, name, family_name')
        .eq('id', session.archive_id)
        .single()

      if (!archive) { skipped++; continue }

      // Get all contributions for this session
      const { data: contributions } = await supabaseAdmin
        .from('memory_game_contributions')
        .select('contributor_name, contributor_email, photograph_id, memory_text, created_at')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true })

      if (!contributions || contributions.length === 0) {
        // Still mark summary as sent to avoid re-processing
        await supabaseAdmin
          .from('memory_game_sessions')
          .update({ summary_sent: true })
          .eq('id', session.id)
        skipped++
        continue
      }

      // Build leaderboard
      const countMap: Record<string, number> = {}
      for (const c of contributions) {
        const key = c.contributor_name || c.contributor_email
        countMap[key] = (countMap[key] || 0) + 1
      }
      const leaderboard = Object.entries(countMap)
        .sort((a, b) => b[1] - a[1])

      const winner      = leaderboard[0]?.[0] ?? ''
      const winnerCount = leaderboard[0]?.[1] ?? 0

      // Best memory = longest memory_text
      const bestMemory = [...contributions].sort(
        (a, b) => (b.memory_text?.length ?? 0) - (a.memory_text?.length ?? 0)
      )[0]

      // Winner's best memory (longest from winner)
      const winnerMemories = contributions.filter(
        c => (c.contributor_name || c.contributor_email) === winner
      )
      const winnerBestMemory = [...winnerMemories].sort(
        (a, b) => (b.memory_text?.length ?? 0) - (a.memory_text?.length ?? 0)
      )[0]

      // Photos with zero contributions
      const photoContribCount: Record<string, number> = {}
      for (const c of contributions) {
        if (c.photograph_id) {
          photoContribCount[c.photograph_id] = (photoContribCount[c.photograph_id] || 0) + 1
        }
      }
      const photosWithNoStories = (session.photograph_ids ?? []).filter(
        (pid: string) => !photoContribCount[pid]
      )

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'

      const maxCount = leaderboard[0]?.[1] ?? 1
      const leaderboardHtml = leaderboard.map(([name, count], i) => {
        const barWidth = Math.round((count / maxCount) * 120)
        return `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
      <span style="font-family:'Courier New',monospace;font-size:11px;color:#5C6166;width:20px;flex-shrink:0">${i + 1}</span>
      <span style="font-family:'Courier New',monospace;font-size:11px;color:${i === 0 ? '#C4A24A' : '#9DA3A8'};min-width:120px;flex-shrink:0">${name}</span>
      <div style="width:${barWidth}px;height:6px;background:${i === 0 ? 'rgba(196,162,74,0.6)' : 'rgba(240,237,230,0.12)'};border-radius:2px;flex-shrink:0"></div>
      <span style="font-family:'Courier New',monospace;font-size:10px;color:#5C6166">${count}</span>
    </div>`
      }).join('')

      const noStoriesHtml = photosWithNoStories.length > 0 ? `
  <div style="margin:24px 0;padding:20px 24px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:2px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#5C6166;margin:0 0 12px">
      STILL MISSING STORIES (${photosWithNoStories.length})
    </p>
    <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#706C65;margin:0 0 12px">
      These photographs had no contributions this week.
    </p>
    <a href="${siteUrl}/game/${session.id}"
      style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#C4A24A;text-decoration:none">
      ADD A MEMORY →
    </a>
  </div>` : ''

      // Get all unique contributor emails to send summary
      const { data: allContributors } = await supabaseAdmin
        .from('contributors')
        .select('email, name')
        .eq('archive_id', session.archive_id)
        .eq('status', 'active')

      const emailTargets = allContributors ?? []

      const weekDate = new Date(session.closes_at).toLocaleDateString('en-US', {
        month: 'long',
        day:   'numeric',
        year:  'numeric',
      })

      for (const recipient of emailTargets) {
        try {
          await resend.emails.send({
            from:    `The ${archive.family_name} Archive <archive@basalith.xyz>`,
            to:      recipient.email,
            subject: `Game over: ${contributions.length} memories preserved this week · ${archive.name}`,
            html: `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">

  <div style="padding:32px 32px 24px">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">
      THE ${(archive.family_name ?? archive.name).toUpperCase()} ARCHIVE
    </p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;margin:0 0 24px">
      WEEKLY MEMORY GAME · SUMMARY · ${weekDate.toUpperCase()}
    </p>

    <h2 style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#F0EDE6;margin:0 0 8px">
      Game over.
    </h2>
    <p style="font-family:Georgia,serif;font-size:16px;font-style:italic;color:#706C65;line-height:1.7;margin:0 0 24px">
      This week your family contributed <strong style="color:#F0EDE6">${contributions.length} memories</strong> across ${session.photograph_ids?.length ?? 0} photographs.
    </p>
  </div>

  ${winner ? `
  <div style="margin:0 32px 24px;padding:20px 24px;border-left:3px solid rgba(196,162,74,0.6);background:rgba(196,162,74,0.04)">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;margin:0 0 8px">
      THIS WEEK'S WINNER
    </p>
    <p style="font-family:Georgia,serif;font-size:18px;font-weight:700;color:#F0EDE6;margin:0 0 4px">
      ${winner}
    </p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#706C65;margin:0 0 16px">
      ${winnerCount} MEMORIES CONTRIBUTED
    </p>
    ${winnerBestMemory ? `
    <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#B8B4AB;line-height:1.7;margin:0">
      &ldquo;${winnerBestMemory.memory_text}&rdquo;
    </p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;margin:8px 0 0">
      &mdash; ${winner}
    </p>` : ''}
  </div>` : ''}

  <div style="padding:0 32px 24px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#5C6166;margin:0 0 16px">
      FINAL STANDINGS
    </p>
    ${leaderboardHtml}
  </div>

  ${bestMemory && bestMemory.contributor_name !== winner ? `
  <div style="margin:0 32px 24px;padding:20px 24px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:2px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#5C6166;margin:0 0 12px">
      BEST MEMORY OF THE WEEK
    </p>
    <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#B8B4AB;line-height:1.7;margin:0 0 8px">
      &ldquo;${bestMemory.memory_text}&rdquo;
    </p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;margin:0">
      &mdash; ${bestMemory.contributor_name || 'A contributor'}
    </p>
  </div>` : ''}

  ${noStoriesHtml}

  <div style="padding:16px 32px 32px">
    <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#5C6166;line-height:1.7;margin:0 0 4px">
      New game every Wednesday.
    </p>
    <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#5C6166;margin:0 0 20px">
      See you next week.
    </p>
  </div>

  <div style="padding:0 32px 32px;border-top:1px solid rgba(240,237,230,0.06)">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;line-height:1.8;margin:20px 0 0">
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
          console.error('Summary email failed:', recipient.email, msg)
        }
      }

      // Mark summary sent
      await supabaseAdmin
        .from('memory_game_sessions')
        .update({ summary_sent: true })
        .eq('id', session.id)

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`Summary failed for session ${session.id}:`, msg)
    }
  }

  return NextResponse.json({ sent, skipped, sessions: sessions?.length ?? 0 })
}
