import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { NextResponse } from 'next/server'
import { WISDOM_SESSIONS } from '@/lib/wisdomSessions'
import { DIMENSIONS } from '@/lib/entityAccuracy'

export async function POST(req: Request) {
  try {
    const { archiveId } = await req.json()

    const { data: archive } = await supabaseAdmin
      .from('archives')
      .select('*')
      .eq('id', archiveId)
      .single()

    if (!archive?.owner_email) {
      return NextResponse.json({ skipped: true, reason: 'No owner email' })
    }

    // Labels added in the last 24 hours
    const since = new Date()
    since.setDate(since.getDate() - 1)

    const { data: recentLabels } = await supabaseAdmin
      .from('labels')
      .select('*, photographs(storage_path, ai_era_estimate)')
      .eq('archive_id', archiveId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(5)

    if (!recentLabels || recentLabels.length === 0) {
      return NextResponse.json({ skipped: true, reason: 'No new labels in last 24 hours' })
    }

    // Archive depth stats
    const { data: archiveData } = await supabaseAdmin
      .from('archives')
      .select('labelled_photos, current_streak')
      .eq('id', archiveId)
      .single()

    // Most documented decade
    const { data: decades } = await supabaseAdmin
      .from('decade_coverage')
      .select('*')
      .eq('archive_id', archiveId)
      .order('decade')

    const topDecade = decades?.sort((a, b) => b.photo_count - a.photo_count)[0]

    // Signed URL for first photograph
    let photoUrl: string | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firstPhoto = (recentLabels[0] as any)?.photographs
    if (firstPhoto?.storage_path) {
      const { data: signed } = await supabaseAdmin
        .storage
        .from('photographs')
        .createSignedUrl(firstPhoto.storage_path, 86400)
      photoUrl = signed?.signedUrl ?? null
    }

    // Build memories HTML
    const memoriesHtml = recentLabels.map(label => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const photo = (label as any).photographs
      return `
        <div style="margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid rgba(240,237,230,0.06)">
          <p style="font-family:Georgia,serif;font-size:16px;font-style:italic;color:#F0EDE6;line-height:1.7;margin:0 0 8px">
            &ldquo;${label.what_was_happening || ''}&rdquo;
          </p>
          <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#C4A24A;margin:0">
            &mdash; ${label.labelled_by || 'A contributor'}${photo?.ai_era_estimate ? ' &middot; ' + photo.ai_era_estimate : ''}
          </p>
        </div>
      `
    }).join('')

    const ownerFirstName = archive.owner_name?.split(' ')[0] || 'there'
    const archiveName    = archive.name || 'Your Archive'
    const dateStr        = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

    // Upcoming significant dates within 7 days
    const todayDate  = new Date()
    const todayMonth = todayDate.getMonth() + 1
    const todayDay   = todayDate.getDate()

    const { data: allDates } = await supabaseAdmin
      .from('significant_dates')
      .select('person_name, date_type, month, day, year')
      .eq('archive_id', archiveId)
      .eq('active', true)

    function daysUntilDigest(month: number, day: number): number {
      const now    = new Date()
      now.setHours(0, 0, 0, 0)
      const yr     = now.getFullYear()
      let target   = new Date(yr, month - 1, day)
      if (target.getTime() < now.getTime()) target = new Date(yr + 1, month - 1, day)
      return Math.ceil((target.getTime() - now.getTime()) / 86400000)
    }

    const soonDates = (allDates ?? [])
      .map(d => ({ ...d, days: daysUntilDigest(d.month, d.day) }))
      .filter(d => d.days <= 7)
      .sort((a, b) => a.days - b.days)

    const upcomingDatesHtml = soonDates.length > 0 ? `
  <div style="margin:0 0 32px;padding:20px 24px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:2px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#5C6166;text-transform:uppercase;margin:0 0 16px">
      COMING UP THIS WEEK
    </p>
    ${soonDates.map(d => `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px">
      <div style="min-width:36px;text-align:center">
        <p style="font-family:Georgia,serif;font-weight:700;font-size:1.4rem;color:${d.days === 0 ? '#C4A24A' : '#F0EDE6'};line-height:1;margin:0">${d.day}</p>
        <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:1px;color:#5C6166;margin:0;text-transform:uppercase">${['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.month]}</p>
      </div>
      <div>
        <p style="font-family:Georgia,serif;font-size:15px;color:#F0EDE6;margin:0 0 2px">${d.person_name}</p>
        <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:2px;color:#5C6166;margin:0;text-transform:uppercase">
          ${d.days === 0 ? 'TODAY' : d.days === 1 ? 'TOMORROW' : `IN ${d.days} DAYS`}
        </p>
      </div>
    </div>`).join('')}
  </div>` : ''

    // Monthly wisdom session section — shown only on the 1st of each month
    const isFirstOfMonth = new Date().getDate() === 1
    let wisdomSessionHtml = ''

    if (isFirstOfMonth) {
      // Determine recommended dimension (lowest scoring)
      const accuracyRows = await supabaseAdmin
        .from('entity_accuracy')
        .select('dimension, accuracy_score')
        .eq('archive_id', archiveId)

      const completedSessions = await supabaseAdmin
        .from('wisdom_sessions')
        .select('dimension')
        .eq('archive_id', archiveId)
        .eq('status', 'completed')

      const completedDims = (completedSessions.data || []).map((s: any) => s.dimension)
      const scoreMap: Record<string, number> = {}
      for (const row of (accuracyRows.data || [])) {
        scoreMap[row.dimension] = Math.round((row.accuracy_score ?? 0) * 100)
      }

      const allIds    = DIMENSIONS.map(d => d.id)
      const notDone   = allIds.filter(id => !completedDims.includes(id))
      let recommended = notDone[0] || allIds[0]
      let lowestScore = Infinity
      for (const id of notDone) {
        const score = scoreMap[id] ?? 0
        if (score < lowestScore) { lowestScore = score; recommended = id }
      }

      const session = WISDOM_SESSIONS[recommended]
      if (session) {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
        wisdomSessionHtml = `
  <div style="margin:32px 0;padding:24px 32px;border-left:3px solid rgba(196,162,74,0.6);background:rgba(196,162,74,0.04)">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;text-transform:uppercase;margin:0 0 12px">
      YOUR MONTHLY SESSION IS READY
    </p>
    <p style="font-family:Georgia,serif;font-size:18px;font-weight:700;color:#F0EDE6;margin:0 0 8px">
      This month: ${session.title}
    </p>
    <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#9DA3A8;line-height:1.7;margin:0 0 16px">
      &ldquo;${session.intro}&rdquo;
    </p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#706C65;margin:0 0 20px">
      5 QUESTIONS &middot; ${session.estimatedMinutes} MINUTES &middot; YOUR ENTITY IS WAITING
    </p>
    <a href="${baseUrl}/archive/wisdom" style="display:inline-block;background:rgba(196,162,74,1);color:#0A0A0B;font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:10px 20px;border-radius:2px">
      BEGIN THIS MONTH&rsquo;S SESSION →
    </a>
  </div>`
      }
    }

    // Voice nudge — shown max once per month when archive has fewer than 3 voice recordings
    let voiceNudgeHtml = ''
    if (isFirstOfMonth) {
      const { count: voiceCount } = await supabaseAdmin
        .from('voice_recordings')
        .select('id', { count: 'exact', head: true })
        .eq('archive_id', archiveId)

      if ((voiceCount ?? 0) < 3) {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
        voiceNudgeHtml = `
  <div style="margin:32px 0;padding:24px 32px;border-left:3px solid rgba(196,162,74,0.3);background:rgba(196,162,74,0.03)">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#706C65;text-transform:uppercase;margin:0 0 12px">
      YOUR VOICE IS NOT YET IN YOUR ARCHIVE
    </p>
    <p style="font-family:Georgia,serif;font-size:16px;font-style:italic;color:#F0EDE6;line-height:1.7;margin:0 0 8px">
      Your archive has photographs and family memories. But your voice is not yet preserved.
    </p>
    <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#9DA3A8;line-height:1.7;margin:0 0 20px">
      Two minutes. Say anything. Any language.
    </p>
    <a href="${baseUrl}/archive/voice" style="display:inline-block;background:transparent;color:#C4A24A;font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:10px 20px;border-radius:2px;border:1px solid rgba(196,162,74,0.4)">
      RECORD YOUR VOICE &rarr;
    </a>
  </div>`
      }
    }

    await resend.emails.send({
      from:    `${archiveName} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
      to:      archive.owner_email,
      subject: `${archiveName} · Today's memories`,
      html: `<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">

  <div style="padding:32px 32px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;color:#C4A24A;text-transform:uppercase;margin:0 0 4px">
      ${archiveName.toUpperCase()}
    </p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;margin:0">
      ${dateStr.toUpperCase()}
    </p>
  </div>

  ${photoUrl ? `
  <div style="margin:24px 0 0">
    <img src="${photoUrl}" style="width:100%;max-width:600px;display:block;height:auto" alt="Archive photograph">
  </div>
  ` : ''}

  <div style="padding:32px">

    <p style="font-size:20px;font-style:italic;color:#F0EDE6;line-height:1.5;margin:0 0 24px">
      ${recentLabels.length === 1
        ? `Someone remembered something, ${ownerFirstName}.`
        : `${recentLabels.length} people remembered something, ${ownerFirstName}.`}
    </p>

    <div style="border-left:2px solid rgba(196,162,74,0.3);padding-left:20px;margin:0 0 32px">
      ${memoriesHtml}
    </div>

  ${upcomingDatesHtml}

  ${wisdomSessionHtml}

  ${voiceNudgeHtml}

    <div style="border-top:1px solid rgba(240,237,230,0.06);padding-top:24px">
      <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#706C65;margin:0 0 4px">
        ARCHIVE DEPTH
      </p>
      <p style="font-size:28px;font-family:Georgia,serif;font-weight:700;color:#F0EDE6;margin:0 0 4px">
        ${archiveData?.labelled_photos || 0}
        <span style="font-size:16px;font-weight:300;color:#706C65"> memories preserved</span>
      </p>
      ${topDecade ? `
      <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#C4A24A;margin:4px 0 0">
        ${topDecade.decade.toUpperCase()} IS YOUR MOST DOCUMENTED DECADE
      </p>
      ` : ''}
    </div>

  </div>

  <div style="padding:0 32px 32px;border-top:1px solid rgba(240,237,230,0.06)">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;line-height:1.8;margin:24px 0 0">
      BASALITH &middot; XYZ<br>
      ${archiveName} &middot; Generation I<br>
      Your archive grows every day.
    </p>
  </div>

</body>`,
    })

    // Log notification
    await supabaseAdmin.from('owner_notifications').insert({
      archive_id: archiveId,
      type:       'morning_digest',
      subject:    `Daily digest — ${recentLabels.length} new ${recentLabels.length === 1 ? 'memory' : 'memories'}`,
      sent_to:    archive.owner_email,
      sent_at:    new Date().toISOString(),
      metadata:   { labelCount: recentLabels.length },
    })

    return NextResponse.json({ success: true, labelCount: recentLabels.length })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Morning digest error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
