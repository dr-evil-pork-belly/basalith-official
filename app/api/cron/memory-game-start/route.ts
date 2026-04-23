import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'

export const dynamic = 'force-dynamic'

// ── Email builder ─────────────────────────────────────────────────────────────

function buildGameStartEmail(
  familyName:       string,
  firstName:        string,
  sessionId:        string,
  photos:           { id: string; ai_era_estimate?: string }[],
  photoUrls:        Record<string, string>,
  contributorCount: number,
  closesAt:         Date
): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'

  const closingTime = closesAt.toLocaleDateString('en-US', {
    weekday: 'long',
    month:   'long',
    day:     'numeric',
    hour:    'numeric',
    minute:  '2-digit',
  })

  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day:   'numeric',
    year:  'numeric',
  }).toUpperCase()

  const photosHtml = photos.slice(0, 5).map((photo, i) => {
    const url = photoUrls[photo.id]
    if (!url) return ''
    return `
  <div>
    <img src="${url}" width="600"
      style="display:block;width:100%;max-width:600px;height:auto;max-height:400px;object-fit:cover"
      alt="Photograph ${i + 1}">
    <div style="padding:12px 32px 20px;border-bottom:1px solid rgba(240,237,230,0.06)">
      <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#706C65;margin:0 0 8px">
        PHOTOGRAPH ${i + 1} OF ${photos.length}${photo.ai_era_estimate ? ' · ' + photo.ai_era_estimate.toUpperCase() : ''}
      </p>
      <a href="${siteUrl}/game/${sessionId}?photo=${photo.id}"
        style="display:inline-block;font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;text-decoration:none;border:1px solid rgba(196,162,74,0.3);padding:8px 20px">
        ADD YOUR MEMORY →
      </a>
    </div>
  </div>`
  }).join('')

  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">

  <div style="padding:32px 32px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">
      THE ${familyName.toUpperCase()} ARCHIVE
    </p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;margin:0">
      WEEKLY MEMORY GAME · ${dateStr}
    </p>
  </div>

  <div style="padding:24px 32px 0">
    <h2 style="font-family:Georgia,serif;font-size:26px;font-weight:700;color:#F0EDE6;margin:0 0 8px">
      This week's memory game is live.
    </h2>
    <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#706C65;margin:0 0 20px">
      ${photos.length} photograph${photos.length !== 1 ? 's' : ''}. ${contributorCount} family member${contributorCount !== 1 ? 's' : ''} playing.
      Closes ${closingTime}.
    </p>
  </div>

  ${photosHtml}

  <div style="padding:32px">
    <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#B8B4AB;line-height:1.7;margin:0 0 20px">
      Every memory you add goes directly into the archive permanently.
      Click ADD YOUR MEMORY on any photograph to contribute.
    </p>
    <a href="${siteUrl}/game/${sessionId}"
      style="display:inline-block;font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#0A0908;background:#C4A24A;text-decoration:none;padding:10px 24px;border-radius:2px">
      PLAY NOW →
    </a>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:rgba(196,162,74,0.5);margin:20px 0 0">
      CLOSES ${closingTime.toUpperCase()}
    </p>
  </div>

  <div style="padding:0 32px 32px;border-top:1px solid rgba(240,237,230,0.06)">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;line-height:1.8;margin:20px 0 0">
      BASALITH · XYZ<br>
      The ${familyName} Archive<br>
      Memory game every Wednesday.
    </p>
  </div>

</body>
</html>`
}

// ── Cron handler ──────────────────────────────────────────────────────────────

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

  // Run on Wednesdays only (day 3)
  const today = new Date()
  if (!isTest && today.getDay() !== 3) {
    return NextResponse.json({ skipped: true, reason: 'Not Wednesday' })
  }

  const { data: archives } = await supabaseAdmin
    .from('archives')
    .select('id, name, family_name')
    .eq('status', 'active')

  let sent  = 0
  let skipped = 0

  for (const archive of archives ?? []) {
    try {
      // Need at least 2 active contributors
      const { data: contributors } = await supabaseAdmin
        .from('contributors')
        .select('email, name')
        .eq('archive_id', archive.id)
        .eq('status', 'active')

      if (!contributors || contributors.length < 2) { skipped++; continue }

      // Select photographs not used in the last 14 days
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

      const { data: photos } = await supabaseAdmin
        .from('photographs')
        .select('id, storage_path, ai_era_estimate, priority_score')
        .eq('archive_id', archive.id)
        .eq('status', 'unlabelled')
        .eq('ai_processed', true)
        .or(`memory_game_used_at.is.null,memory_game_used_at.lt.${twoWeeksAgo.toISOString()}`)
        .order('priority_score', { ascending: false })
        .limit(20)

      if (!photos || photos.length < 3) { skipped++; continue }

      const selectedPhotos = photos.slice(0, 5)

      // Get 3-day signed URLs for all photos
      const photoUrls: Record<string, string> = {}
      for (const photo of selectedPhotos) {
        const { data: signed } = await supabaseAdmin
          .storage
          .from('photographs')
          .createSignedUrl(photo.storage_path, 86400 * 3)
        if (signed?.signedUrl) photoUrls[photo.id] = signed.signedUrl
      }

      // Create game session
      const closesAt = new Date()
      closesAt.setHours(closesAt.getHours() + 48)

      const { data: session } = await supabaseAdmin
        .from('memory_game_sessions')
        .insert({
          archive_id:     archive.id,
          photograph_ids: selectedPhotos.map(p => p.id),
          closes_at:      closesAt.toISOString(),
          status:         'active',
        })
        .select()
        .single()

      if (!session) { skipped++; continue }

      // Mark photos as used
      await supabaseAdmin
        .from('photographs')
        .update({ memory_game_used_at: new Date().toISOString() })
        .in('id', selectedPhotos.map(p => p.id))

      // Send game email to all contributors
      for (const contributor of contributors) {
        try {
          await resend.emails.send({
            from:    `The ${archive.family_name} Archive <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
            to:      contributor.email,
            subject: `This week's memory game is live · ${archive.name}`,
            html:    buildGameStartEmail(
              archive.family_name ?? archive.name,
              contributor.name ?? 'there',
              session.id,
              selectedPhotos,
              photoUrls,
              contributors.length,
              closesAt
            ),
            headers: {
              'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
              'X-Entity-Ref-ID':  `basalith-${archive.id}-${Date.now()}`,
              'Precedence':       'bulk',
            },
          })
        } catch (emailErr: unknown) {
          const msg = emailErr instanceof Error ? emailErr.message : String(emailErr)
          console.error('Game email failed:', contributor.email, msg)
        }
      }

      sent++
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`Memory game failed for archive ${archive.id}:`, msg)
    }
  }

  return NextResponse.json({ sent, skipped, total: archives?.length ?? 0 })
}
