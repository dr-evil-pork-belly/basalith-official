import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { buildPausedReminderEmail } from '@/lib/pauseEmails'

export const dynamic = 'force-dynamic'

function validateCronAuth(req: NextRequest): boolean {
  const { searchParams } = new URL(req.url)
  const secretParam    = searchParams.get('secret') || ''
  const authHeader     = req.headers.get('authorization') || ''
  const headerSecret   = authHeader.replace('Bearer ', '')
  const expectedSecret = process.env.CRON_SECRET || ''
  return !!expectedSecret && (headerSecret === expectedSecret || secretParam === expectedSecret)
}

export async function GET(req: NextRequest) {
  if (!validateCronAuth(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Run on the 1st of each month
  const isTest = new URL(req.url).searchParams.get('test') === 'true'
  if (!isTest && new Date().getUTCDate() !== 1) {
    return Response.json({ skipped: true, reason: 'Not the 1st of the month' })
  }

  // Find archives paused for ~6 months (180-210 days) or ~12 months (360-390 days)
  const now = Date.now()
  const SIX_MONTHS_MS  = 180 * 24 * 60 * 60 * 1000
  const YEAR_MS        = 365 * 24 * 60 * 60 * 1000
  const WINDOW_MS      = 30  * 24 * 60 * 60 * 1000  // 30-day window around each milestone

  const { data: paused } = await supabaseAdmin
    .from('archives')
    .select('id, name, owner_name, owner_email, preferred_language, paused_at')
    .eq('status', 'paused')
    .not('paused_at', 'is', null)
    .not('owner_email', 'is', null)

  let sent = 0
  const skipped: string[] = []

  for (const archive of paused ?? []) {
    const pausedMs    = now - new Date(archive.paused_at).getTime()
    const monthsPaused = Math.floor(pausedMs / (30 * 24 * 60 * 60 * 1000))

    const atSixMonths = pausedMs >= SIX_MONTHS_MS && pausedMs < SIX_MONTHS_MS + WINDOW_MS
    const atOneYear   = pausedMs >= YEAR_MS        && pausedMs < YEAR_MS + WINDOW_MS

    if (!atSixMonths && !atOneYear) {
      skipped.push(`${archive.name} (${monthsPaused}mo — not at milestone)`)
      continue
    }

    // Idempotency: check we haven't sent this milestone already this month
    const calMonth = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}`
    const { data: existing } = await supabaseAdmin
      .from('owner_notifications')
      .select('id')
      .eq('archive_id', archive.id)
      .eq('type', 'pause_reminder')
      .filter('metadata->>calMonth', 'eq', calMonth)
      .maybeSingle()

    if (existing) {
      skipped.push(`${archive.name} (already sent ${calMonth})`)
      continue
    }

    const firstName = archive.owner_name?.split(' ')[0] ?? 'there'
    const lang      = archive.preferred_language ?? 'en'
    const subject   = lang === 'zh' || lang === 'yue'
      ? `您的档案还在这里 · ${archive.name}`
      : `Your archive is still here · ${archive.name}`

    try {
      await resend.emails.send({
        from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
        to:      archive.owner_email,
        subject,
        html:    buildPausedReminderEmail(firstName, archive.name, monthsPaused, lang),
        headers: {
          'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
          'X-Entity-Ref-ID':  `basalith-pause-reminder-${archive.id}-${calMonth}`,
          'Precedence':       'bulk',
        },
      })

      await supabaseAdmin.from('owner_notifications').insert({
        archive_id: archive.id,
        type:       'pause_reminder',
        subject,
        sent_to:    archive.owner_email,
        sent_at:    new Date().toISOString(),
        metadata:   { calMonth, monthsPaused },
      })

      sent++
    } catch (err: any) {
      console.error(`[pause-reminder] Failed for ${archive.id}:`, err.message)
      skipped.push(`${archive.name} (email error)`)
    }
  }

  return Response.json({ sent, total: paused?.length ?? 0, skipped })
}
