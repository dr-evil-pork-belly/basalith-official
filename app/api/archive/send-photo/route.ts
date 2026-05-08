import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { PhotographEmail } from '@/emails/PhotographEmail'
import { render } from '@react-email/render'
import { t } from '@/lib/emailTranslations'
import { getEmailPhotoUrl } from '@/lib/photo-url'
import { sendWeChatPhoto } from '@/lib/wechat'

// ── Cadence helpers ───────────────────────────────────────────────────────────

function calculateNextSend(prefs: { cadence: string; send_time: string }): string {
  const now  = new Date()
  const next = new Date(now)
  if (prefs.cadence === 'daily')         next.setDate(next.getDate() + 1)
  else if (prefs.cadence === 'three_weekly') next.setDate(next.getDate() + 2)
  else if (prefs.cadence === 'weekly')   next.setDate(next.getDate() + 7)
  else                                   next.setDate(next.getDate() + 1)
  const [hours, minutes] = prefs.send_time.split(':')
  next.setHours(parseInt(hours), parseInt(minutes), 0, 0)
  return next.toISOString()
}

// ── All-photos-sent notification ──────────────────────────────────────────────

function buildAllPhotosSentEmail(
  archiveName:     string,
  contributorName: string,
): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">
  <div style="padding:32px">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 24px">
      ${archiveName.toUpperCase()}
    </p>
    <h2 style="font-family:Georgia,serif;font-size:22px;font-weight:300;color:#F0EDE6;margin:0 0 16px;line-height:1.4">
      ${contributorName} has seen all your photographs.
    </h2>
    <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;font-style:italic;color:#B8B4AB;line-height:1.8;margin:0 0 24px">
      Every photograph in your archive has been sent to ${contributorName}.
      To continue the daily photograph series, upload more photographs to your archive.
    </p>
    <p style="font-family:Georgia,serif;font-size:15px;font-weight:300;font-style:italic;color:#706C65;line-height:1.8;margin:0 0 32px">
      Each new photograph is an opportunity for ${contributorName} to share
      a memory you may not have heard. Old family albums, photographs from
      other relatives, and digitised prints all make excellent archive additions.
    </p>
    <a href="${siteUrl}/archive/label"
      style="display:inline-block;background:#C4A24A;color:#0A0908;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-decoration:none;padding:14px 28px">
      UPLOAD MORE PHOTOGRAPHS →
    </a>
  </div>
</body>
</html>`
}

// ── Main handler ──────────────────────────────────────────────────────────────

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

    const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
    let sentCount   = 0
    let firstSentPhoto: Record<string, unknown> | null = null
    const exhausted: string[] = []

    // 3. Process each contributor individually
    for (const contributor of contributors) {

      // ── 3A. Get photo IDs already sent to this contributor ──────────────────
      const { data: sentRows } = await supabaseAdmin
        .from('contributor_photo_sends')
        .select('photograph_id')
        .eq('contributor_id', contributor.id)

      const sentPhotoIds = (sentRows ?? []).map(r => r.photograph_id).filter(Boolean)

      // ── 3B. Select next unlabelled photo not yet sent ───────────────────────
      let photoQuery = supabaseAdmin
        .from('photographs')
        .select('*')
        .eq('archive_id', archiveId)
        .eq('status', 'unlabelled')
        .order('created_at', { ascending: true })
        .limit(1)

      if (sentPhotoIds.length > 0) {
        photoQuery = photoQuery.not('id', 'in', `(${sentPhotoIds.join(',')})`)
      }

      let { data: photoData } = await photoQuery
      let photo = photoData?.[0] ?? null

      // ── 3C. Fallback: any unsent photo (labelled or not) ────────────────────
      if (!photo) {
        let anyQuery = supabaseAdmin
          .from('photographs')
          .select('*')
          .eq('archive_id', archiveId)
          .order('created_at', { ascending: true })
          .limit(1)

        if (sentPhotoIds.length > 0) {
          anyQuery = anyQuery.not('id', 'in', `(${sentPhotoIds.join(',')})`)
        }

        const { data: anyPhotoData } = await anyQuery
        photo = anyPhotoData?.[0] ?? null

        if (!photo) {
          // All photos have been sent to this contributor
          console.log('[send-photos] all photos sent to:', contributor.name, '— notifying owner')
          exhausted.push(contributor.name ?? contributor.email)

          if (archive.owner_email) {
            void (async () => {
              try {
                await resend.emails.send({
                  from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
                  to:      archive.owner_email,
                  subject: `${contributor.name ?? contributor.email} has seen all your photographs`,
                  html:    buildAllPhotosSentEmail(archive.name, contributor.name ?? contributor.email),
                })
              } catch (e) {
                console.error('[send-photos] exhaustion email failed:', e instanceof Error ? e.message : e)
              }
            })()
          }
          continue
        }
      }

      // ── 3D. Generate photo URL ──────────────────────────────────────────────
      const photoUrl = await getEmailPhotoUrl(photo.storage_path)
      if (!photoUrl) {
        console.error(`[send-photos] could not generate URL for photo ${photo.id}`)
        continue
      }

      // ── 3E. Build unique reply address per contributor ──────────────────────
      const sessionCode  = Math.random().toString(36).substring(2, 8)
      const familySlug   = archive.family_name.toLowerCase().replace(/\s+/g, '-')
      const replyDomain  = process.env.RESEND_REPLY_DOMAIN ?? 'zoibrenae.resend.app'
      const replyAddress = `${familySlug}-${sessionCode}@${replyDomain}`

      const yearStr = photo.ai_era_estimate ? ` · ${photo.ai_era_estimate}` : ''
      const lang    = (contributor as { preferred_language?: string }).preferred_language ?? 'en'

      // ── 3F. Create session record ───────────────────────────────────────────
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

      // ── 3G. Send email ──────────────────────────────────────────────────────
      try {
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
      } catch (emailErr: unknown) {
        console.error(`[send-photos] email failed for ${contributor.email}:`, emailErr instanceof Error ? emailErr.message : emailErr)
        continue
      }

      // ── 3H. Record the send — idempotent via unique index ───────────────────
      try {
        await supabaseAdmin
          .from('contributor_photo_sends')
          .insert({
            archive_id:     archiveId,
            contributor_id: contributor.id,
            photograph_id:  photo.id,
            sent_at:        new Date().toISOString(),
          })
      } catch {
        // Unique constraint violation = already recorded — safe to ignore
      }

      sentCount++
      if (!firstSentPhoto) firstSentPhoto = photo
    }

    if (sentCount === 0 && exhausted.length === 0) {
      return NextResponse.json({ skipped: true, reason: 'No photos available for any contributor' })
    }

    // 4. WeChat send for archive owner (uses first photo sent this batch)
    if (firstSentPhoto && archive.wechat_open_id) {
      const wechatUrl = await getEmailPhotoUrl((firstSentPhoto as { storage_path: string }).storage_path).catch(() => null)
      if (wechatUrl) {
        void sendWeChatPhoto(archive.wechat_open_id, wechatUrl, archive.name, archive.preferred_language ?? 'en')
          .catch((e: unknown) => console.error('[send-photos] wechat failed:', e instanceof Error ? e.message : e))
      }
    }

    // 5. Owner daily photo — select their next unsent photo and record it
    if (archive.owner_email && firstSentPhoto) {
      try {
        const { data: ownerSentRows } = await supabaseAdmin
          .from('owner_photo_sends')
          .select('photograph_id')
          .eq('archive_id', archiveId)

        const ownerSentIds = (ownerSentRows ?? []).map(r => r.photograph_id).filter(Boolean)

        let ownerQuery = supabaseAdmin
          .from('photographs')
          .select('*')
          .eq('archive_id', archiveId)
          .eq('status', 'unlabelled')
          .order('created_at', { ascending: true })
          .limit(1)

        if (ownerSentIds.length > 0) {
          ownerQuery = ownerQuery.not('id', 'in', `(${ownerSentIds.join(',')})`)
        }

        const { data: ownerPhotoData } = await ownerQuery
        const ownerPhoto = ownerPhotoData?.[0] ?? null

        if (ownerPhoto) {
          await supabaseAdmin
            .from('owner_photo_sends')
            .insert({ archive_id: archiveId, photograph_id: ownerPhoto.id, sent_at: new Date().toISOString() })
        }
      } catch (e) {
        // Non-fatal — owner tracking is supplementary
        console.warn('[send-photos] owner_photo_sends failed:', e instanceof Error ? e.message : e)
      }
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
      success:      true,
      recipientCount: sentCount,
      exhausted,
      photographId: (firstSentPhoto as { id: string } | null)?.id ?? null,
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[send-photos] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
