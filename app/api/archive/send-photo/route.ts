import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { PhotographEmail } from '@/emails/PhotographEmail'
import { render } from '@react-email/render'
import { t } from '@/lib/emailTranslations'
import { getEmailPhotoUrl } from '@/lib/photo-url'
import { sendWeChatPhoto } from '@/lib/wechat'

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

async function getExcludedPhotoIds(
  archiveId:     string,
  contributorId: string,
  contributorName:  string | null,
  contributorEmail: string,
): Promise<string[]> {
  // Photos this contributor has already been sent
  const [{ data: sentRows }, { data: labeledRows }] = await Promise.all([
    supabaseAdmin
      .from('contributor_photo_sends')
      .select('photograph_id')
      .eq('contributor_id', contributorId),

    // Photos this contributor has already labeled — match by name or email
    supabaseAdmin
      .from('labels')
      .select('photograph_id')
      .eq('archive_id', archiveId)
      .or(
        [
          contributorName  ? `labelled_by.eq.${contributorName}` : null,
          `labelled_by.eq.${contributorEmail}`,
        ].filter(Boolean).join(',')
      ),
  ])

  return [
    ...(sentRows   ?? []).map((r: { photograph_id: string }) => r.photograph_id),
    ...(labeledRows ?? []).map((r: { photograph_id: string }) => r.photograph_id),
  ].filter(Boolean)
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

    // 2. Get active contributors — include id for per-contributor tracking
    const { data: contributors } = await supabaseAdmin
      .from('contributors')
      .select('id, email, name, access_token, preferred_language')
      .eq('archive_id', archiveId)
      .eq('status', 'active')

    if (!contributors?.length) {
      return NextResponse.json({ skipped: true, reason: 'No active contributors' })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
    let sentCount = 0
    let firstPhotoSent: Record<string, unknown> | null = null
    let firstSession: Record<string, unknown> | null = null
    const exhaustedContributors: string[] = []

    // 3. Process each contributor individually — each gets their own next unsent photo
    for (const contributor of contributors) {
      try {
        // Get photo IDs this contributor has already seen (sent or labeled)
        const excludedIds = await getExcludedPhotoIds(
          archiveId,
          contributor.id,
          contributor.name ?? null,
          contributor.email,
        )

        // Select the next photo for this contributor
        let photoQuery = supabaseAdmin
          .from('photographs')
          .select('*')
          .eq('archive_id', archiveId)
          .eq('is_best_in_cluster', true)
          .order('priority_score', { ascending: false })
          .limit(1)

        if (excludedIds.length > 0) {
          photoQuery = photoQuery.not('id', 'in', `(${excludedIds.join(',')})`)
        }

        const { data: photos } = await photoQuery
        const photo = photos?.[0]

        if (!photo) {
          // This contributor has seen all available photos — track and continue
          exhaustedContributors.push(contributor.name ?? contributor.email)
          console.log(`send-photo: ${contributor.email} has seen all photos in archive ${archiveId}`)
          continue
        }

        // Get photo URL
        const photoUrl = await getEmailPhotoUrl(photo.storage_path)
        if (!photoUrl) {
          console.error(`send-photo: could not generate URL for photo ${photo.id}`)
          continue
        }

        // Build unique reply address per contributor
        const sessionCode  = Math.random().toString(36).substring(2, 8)
        const familySlug   = archive.family_name.toLowerCase().replace(/\s+/g, '-')
        const replyDomain  = process.env.RESEND_REPLY_DOMAIN ?? 'zoibrenae.resend.app'
        const replyAddress = `${familySlug}-${sessionCode}@${replyDomain}`

        const yearStr      = photo.ai_era_estimate ? ` · ${photo.ai_era_estimate}` : ''
        const lang         = (contributor as { preferred_language?: string }).preferred_language ?? 'en'

        // Create session record for this contributor's send (enables reply matching)
        const { data: session } = await supabaseAdmin
          .from('email_sessions')
          .insert({
            archive_id:          archiveId,
            photograph_id:       photo.id,
            sent_at:             new Date().toISOString(),
            reply_window_closes: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            recipients:          [contributor.email],
            subject_line:        `${archive.name}${yearStr} · ${t('doYouKnowThisMoment', lang)}`,
            reply_address:       replyAddress,
          })
          .select()
          .single()

        // Send email
        const portalUrl = contributor.access_token
          ? `${siteUrl}/contribute/${contributor.access_token}`
          : null

        const emailHtml = await render(
          PhotographEmail({
            archiveName:     archive.name,
            familyName:      archive.family_name,
            photographUrl:   photoUrl,
            yearEstimate:    photo.ai_era_estimate ?? null,
            subjectContext:  '',
            replyAddress,
            contributorName: contributor.name ?? '',
            sessionId:       session?.id ?? '',
            portalUrl,
            lang,
          })
        )

        await resend.emails.send({
          from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
          to:      contributor.email,
          replyTo: replyAddress,
          subject: `${archive.name}${yearStr} · ${t('doYouKnowThisMoment', lang)}`,
          html:    emailHtml,
          headers: {
            'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
            'X-Entity-Ref-ID':  `basalith-${archiveId}-${contributor.id}-${Date.now()}`,
            'Precedence':       'bulk',
          },
        })

        // Record the send — ON CONFLICT DO NOTHING keeps it idempotent
        await supabaseAdmin
          .from('contributor_photo_sends')
          .upsert(
            {
              archive_id:     archiveId,
              contributor_id: contributor.id,
              photograph_id:  photo.id,
              sent_at:        new Date().toISOString(),
            },
            { onConflict: 'contributor_id,photograph_id', ignoreDuplicates: true }
          )

        sentCount++
        if (!firstPhotoSent) { firstPhotoSent = photo; firstSession = session }

      } catch (contribErr: unknown) {
        console.error(
          `send-photo: failed for contributor ${contributor.email}:`,
          contribErr instanceof Error ? contribErr.message : contribErr
        )
      }
    }

    // 4. Notify archive owner if any contributors have exhausted all photos
    if (exhaustedContributors.length > 0 && archive.owner_email) {
      void (async () => {
        try {
          const names = exhaustedContributors.join(', ')
          await resend.emails.send({
            from:    `Basalith <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
            to:      archive.owner_email,
            subject: `${archive.name} · Upload more photographs`,
            html:    `<p style="font-family:Georgia,serif;font-size:16px;color:#333;line-height:1.7">
              ${names} ${exhaustedContributors.length === 1 ? 'has' : 'have'} seen all the photographs in your archive.<br><br>
              Upload more photographs to continue the daily series.
            </p>
            <p><a href="${siteUrl}/archive/label" style="font-family:monospace;font-size:13px;color:#C4A24A">Upload photographs →</a></p>`,
          })
        } catch (e) {
          console.error('send-photo: exhaustion notification failed:', e instanceof Error ? e.message : e)
        }
      })()
    }

    // 5. Send via WeChat if the archive owner is linked (uses first photo sent)
    if (firstPhotoSent && archive.wechat_open_id) {
      const lang = archive.preferred_language ?? 'en'
      const photoUrl = await getEmailPhotoUrl((firstPhotoSent as { storage_path: string }).storage_path).catch(() => null)
      if (photoUrl) {
        void sendWeChatPhoto(archive.wechat_open_id, photoUrl, archive.name, lang)
          .catch((e: unknown) => console.error('send-photo: wechat send failed:', e instanceof Error ? e.message : e))
      }
    }

    if (sentCount === 0 && exhaustedContributors.length === 0) {
      return NextResponse.json({ skipped: true, reason: 'No photos available' })
    }

    // 6. Update delivery timestamps
    await supabaseAdmin
      .from('email_preferences')
      .update({
        last_sent_at: new Date().toISOString(),
        next_send_at: calculateNextSend(prefs),
      })
      .eq('archive_id', archiveId)

    return NextResponse.json({
      success:              true,
      recipientCount:       sentCount,
      exhaustedContributors,
      photographId:         (firstPhotoSent as { id: string } | null)?.id ?? null,
      sessionId:            (firstSession as { id: string } | null)?.id  ?? null,
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('send-photo error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
