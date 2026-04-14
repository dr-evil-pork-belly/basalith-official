import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { PhotographEmail } from '@/emails/PhotographEmail'
import { render } from '@react-email/render'

function calculateNextSend(prefs: { cadence: string; send_time: string }): string {
  const now  = new Date()
  const next = new Date(now)

  if (prefs.cadence === 'daily') {
    next.setDate(next.getDate() + 1)
  } else if (prefs.cadence === 'three_weekly') {
    next.setDate(next.getDate() + 2)
  } else if (prefs.cadence === 'weekly') {
    next.setDate(next.getDate() + 7)
  } else {
    next.setDate(next.getDate() + 1)
  }

  const [hours, minutes] = prefs.send_time.split(':')
  next.setHours(parseInt(hours), parseInt(minutes), 0, 0)

  return next.toISOString()
}

export async function POST(req: NextRequest) {
  try {
    const { archiveId } = await req.json()
    if (!archiveId) return NextResponse.json({ error: 'archiveId required' }, { status: 400 })

    // 1. Get archive and preferences
    const [{ data: archive }, { data: prefs }] = await Promise.all([
      supabaseAdmin.from('archives').select('*').eq('id', archiveId).single(),
      supabaseAdmin.from('email_preferences').select('*').eq('archive_id', archiveId).single(),
    ])

    if (!archive) return NextResponse.json({ error: 'Archive not found' }, { status: 404 })
    if (!prefs?.active) return NextResponse.json({ skipped: true, reason: 'No active preferences' })

    // 2. Get active contributors
    const { data: contributors } = await supabaseAdmin
      .from('contributors')
      .select('email, name')
      .eq('archive_id', archiveId)
      .eq('status', 'active')

    if (!contributors?.length) {
      return NextResponse.json({ skipped: true, reason: 'No active contributors' })
    }

    // 3. Pick the next unsent photograph
    const { data: sentRows } = await supabaseAdmin
      .from('email_sessions')
      .select('photograph_id')
      .eq('archive_id', archiveId)

    const sentIds = (sentRows ?? []).map(s => s.photograph_id).filter(Boolean)

    let query = supabaseAdmin
      .from('photographs')
      .select('*')
      .eq('archive_id', archiveId)
      .eq('is_best_in_cluster', true)
      .order('priority_score', { ascending: false })
      .limit(1)

    if (sentIds.length > 0) {
      query = query.not('id', 'in', `(${sentIds.join(',')})`)
    }

    const { data: photos } = await query
    const photo = photos?.[0]

    if (!photo) {
      return NextResponse.json({ skipped: true, reason: 'No unsent photographs' })
    }

    // 4. Get signed URL (24 hours)
    const { data: signedUrlData } = await supabaseAdmin.storage
      .from('photographs')
      .createSignedUrl(photo.storage_path, 86400)

    if (!signedUrlData?.signedUrl) {
      throw new Error('Could not generate photo URL')
    }

    // 5. Build unique reply address
    const sessionCode = Math.random().toString(36).substring(2, 8)
    const familySlug  = archive.family_name.toLowerCase().replace(/\s+/g, '-')
    const replyDomain = process.env.RESEND_REPLY_DOMAIN ?? 'zoibrenae.resend.app'
    const replyAddress = `${familySlug}-${sessionCode}@${replyDomain}`

    // 6. Subject line
    const yearStr     = photo.ai_era_estimate ? ` · ${photo.ai_era_estimate}` : ''
    const subjectLine = `${archive.name}${yearStr} · Do you know this moment?`

    // 7. Create session record
    const { data: session } = await supabaseAdmin
      .from('email_sessions')
      .insert({
        archive_id:          archiveId,
        photograph_id:       photo.id,
        sent_at:             new Date().toISOString(),
        reply_window_closes: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        recipients:          contributors.map(c => c.email),
        subject_line:        subjectLine,
        reply_address:       replyAddress,
      })
      .select()
      .single()

    // 8. Render email once, send to all contributors
    const emailHtml = await render(
      PhotographEmail({
        archiveName:     archive.name,
        familyName:      archive.family_name,
        photographUrl:   signedUrlData.signedUrl,
        yearEstimate:    photo.ai_era_estimate ?? null,
        subjectContext:  '',
        replyAddress,
        contributorName: '',
        sessionId:       session?.id ?? '',
      })
    )

    for (const contributor of contributors) {
      try {
        await resend.emails.send({
          from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
          to:      contributor.email,
          replyTo: replyAddress,
          subject: subjectLine,
          html:    emailHtml,
        })
      } catch (emailErr: unknown) {
        console.error(`send-photo: email failed for ${contributor.email}:`, emailErr instanceof Error ? emailErr.message : emailErr)
      }
    }

    // 9. Update delivery timestamps
    await supabaseAdmin
      .from('email_preferences')
      .update({
        last_sent_at: new Date().toISOString(),
        next_send_at: calculateNextSend(prefs),
      })
      .eq('archive_id', archiveId)

    return NextResponse.json({
      success:        true,
      photographId:   photo.id,
      sessionId:      session?.id,
      recipientCount: contributors.length,
      replyAddress,
      subjectLine,
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('send-photo error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
