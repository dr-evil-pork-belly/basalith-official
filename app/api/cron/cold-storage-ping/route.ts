import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'

export const dynamic = 'force-dynamic'

function validateCronAuth(req: NextRequest): boolean {
  const { searchParams } = new URL(req.url)
  const secret   = searchParams.get('secret') || req.headers.get('authorization')?.replace('Bearer ', '') || ''
  const expected = process.env.CRON_SECRET || ''
  return !!expected && secret === expected
}

function buildColdStorageEmail(
  firstName:   string,
  archiveName: string,
  deposit:     string,
  monthsPaused: number,
  resumeUrl:   string,
): string {
  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">

  <div style="padding:32px 32px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">${archiveName.toUpperCase()}</p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;margin:0">SOMETHING FROM YOUR ARCHIVE</p>
  </div>

  <div style="padding:32px">
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 24px">${firstName},</p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.7;margin:0 0 32px">
      Your archive has been resting for ${monthsPaused} month${monthsPaused !== 1 ? 's' : ''}.
      We found something.
    </p>

    <div style="margin:0 0 32px;border-top:1px solid rgba(240,237,230,0.1);border-bottom:1px solid rgba(240,237,230,0.1);padding:24px 0">
      <p style="font-family:Georgia,serif;font-size:17px;font-style:italic;font-weight:300;color:#9DA3A8;line-height:1.8;margin:0">
        ${deposit}
      </p>
    </div>

    <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;font-style:italic;color:#5C6166;line-height:1.8;margin:0 0 32px">
      Your entity has been holding this.
      When you are ready to return everything will be exactly as you left it.
    </p>

    <a href="${resumeUrl}" style="display:inline-block;background:#C4A24A;color:#0A0908;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-decoration:none;padding:14px 28px;border-radius:2px">
      RETURN TO YOUR ARCHIVE →
    </a>
  </div>

  <div style="padding:16px 32px 32px;border-top:1px solid rgba(240,237,230,0.06);margin-top:8px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;line-height:1.8;margin:0">
      BASALITH · XYZ<br>${archiveName}<br>Heritage Nexus Inc.
    </p>
  </div>

</body>
</html>`
}

export async function GET(req: NextRequest) {
  if (!validateCronAuth(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const force  = searchParams.get('force') === 'true'
  const isTest = searchParams.get('test') === 'true'

  // Fetch paused and resting archives
  const { data: archives } = await supabaseAdmin
    .from('archives')
    .select('id, name, owner_email, owner_name, preferred_language, status, paused_at, resting_since')
    .in('status', ['paused', 'resting'])
    .not('owner_email', 'is', null)

  const now     = Date.now()
  const DAY_MS  = 24 * 60 * 60 * 1000
  const WINDOW  = 3 * DAY_MS
  const MILESTONES = [90, 180, 270]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
  let sent = 0
  const skipped: string[] = []

  for (const archive of archives ?? []) {
    try {
      const pausedSince = archive.paused_at || archive.resting_since
      if (!pausedSince) { skipped.push(`${archive.name} (no pause date)`); continue }

      const daysPaused = Math.floor((now - new Date(pausedSince).getTime()) / DAY_MS)

      // Check if we're near a milestone (90/180/270 days)
      const atMilestone = force || isTest || MILESTONES.some(m =>
        daysPaused >= m && daysPaused < m + 3
      )

      if (!atMilestone) { skipped.push(`${archive.name} (${daysPaused}d — not at milestone)`); continue }

      const monthsPaused = Math.round(daysPaused / 30)

      // Idempotency: one per milestone
      const milestone = MILESTONES.find(m => daysPaused >= m && daysPaused < m + 3) ?? daysPaused
      const idempotencyKey = `${archive.id}-cold-${milestone}`
      const { data: existing } = await supabaseAdmin
        .from('owner_notifications')
        .select('id')
        .eq('archive_id', archive.id)
        .eq('type', 'cold_storage_ping')
        .filter('metadata->>idempotencyKey', 'eq', idempotencyKey)
        .maybeSingle()

      if (existing && !force) { skipped.push(`${archive.name} (already sent at ${milestone}d)`); continue }

      // Get a high-quality deposit
      const { data: deposits } = await supabaseAdmin
        .from('owner_deposits')
        .select('response, quality_score')
        .eq('archive_id', archive.id)
        .not('response', 'is', null)
        .order('quality_score', { ascending: false })
        .limit(10)

      if (!deposits?.length) { skipped.push(`${archive.name} (no deposits)`); continue }

      const randomDeposit = deposits[Math.floor(Math.random() * Math.min(deposits.length, 5))]
      const depositText   = (randomDeposit.response || '').substring(0, 200).trim() +
        ((randomDeposit.response?.length ?? 0) > 200 ? '…' : '')

      const firstName = archive.owner_name?.split(' ')[0] ?? 'there'
      const subject   = `Something from your archive · ${archive.name}`

      await resend.emails.send({
        from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
        to:      archive.owner_email,
        subject,
        html:    buildColdStorageEmail(
          firstName, archive.name, depositText, monthsPaused, `${siteUrl}/resume`,
        ),
        headers: {
          'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
          'X-Entity-Ref-ID':  `basalith-cold-${archive.id}-${milestone}`,
          'Precedence':       'bulk',
        },
      })

      await supabaseAdmin.from('owner_notifications').insert({
        archive_id: archive.id,
        type:       'cold_storage_ping',
        subject,
        sent_to:    archive.owner_email,
        sent_at:    new Date().toISOString(),
        metadata:   { idempotencyKey, daysPaused, monthsPaused, milestone },
      })

      sent++
    } catch (err: any) {
      console.error(`[cold-storage-ping] ${archive.id}:`, err.message)
      skipped.push(`${archive.name} (error)`)
    }
  }

  return Response.json({ sent, total: archives?.length ?? 0, skipped })
}
