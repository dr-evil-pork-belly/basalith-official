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

function buildFamilyReactionsEmail(
  firstName:   string,
  archiveName: string,
  answers:     { contributorName: string; relationship: string; question: string; answer: string }[],
  portalUrl:   string,
): string {
  const answersHtml = answers.map(a => `
    <div style="margin:0 0 28px">
      <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:rgba(196,162,74,0.6);margin:0 0 6px">
        ${a.contributorName.toUpperCase()}${a.relationship ? ` · ${a.relationship}` : ''}
      </p>
      <p style="font-family:Georgia,serif;font-size:13px;font-style:italic;color:#5C6166;line-height:1.6;margin:0 0 8px">"${a.question}"</p>
      <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0">"${a.answer}"</p>
    </div>
    <div style="height:1px;background:rgba(240,237,230,0.06);margin:0 0 28px"></div>`).join('')

  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">

  <div style="padding:32px 32px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">${archiveName.toUpperCase()}</p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;margin:0">YOUR FAMILY ADDED MEMORIES</p>
  </div>

  <div style="padding:32px">
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 24px">${firstName},</p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#F0EDE6;line-height:1.7;margin:0 0 8px">The people who know you best added to your archive this week.</p>
    <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;font-style:italic;color:#706C65;margin:0 0 32px">Here is what they said.</p>

    ${answersHtml}

    <div style="padding:20px 24px;border-left:3px solid rgba(196,162,74,0.3);background:rgba(196,162,74,0.04);margin:0 0 32px">
      <p style="font-family:Georgia,serif;font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0">
        The entity is learning from what they shared. Is there anything here you want to respond to?
      </p>
    </div>

    <a href="${portalUrl}" style="display:inline-block;background:#C4A24A;color:#0A0908;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-decoration:none;padding:14px 28px;border-radius:2px">
      VISIT YOUR ARCHIVE →
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
  const isTest = searchParams.get('test') === 'true'

  // Weekly on Mondays — or in test mode
  if (!isTest) {
    const dow = new Date().getUTCDay()
    if (dow !== 1) return Response.json({ skipped: true, reason: 'Not Monday' })
  }

  const { data: archives } = await supabaseAdmin
    .from('archives')
    .select('id, name, owner_email, owner_name, preferred_language')
    .eq('status', 'active')
    .not('owner_email', 'is', null)

  const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
  const sevenDays  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString()
  const fourteenDays = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  let sent = 0
  const skipped: string[] = []

  for (const archive of archives ?? []) {
    try {
      // Get unnotified answers in the 7–14 day window
      const { data: pending } = await supabaseAdmin
        .from('contributor_questions')
        .select('id, question_text, answer_text, contributor_id, answered_at')
        .eq('archive_id', archive.id)
        .eq('status', 'answered')
        .eq('owner_notified', false)
        .gte('answered_at', fourteenDays)
        .lte('answered_at', sevenDays)
        .not('answer_text', 'is', null)
        .limit(5)

      if (!pending?.length) { skipped.push(`${archive.name} (no pending)`); continue }

      // Get contributor names
      const contributorIds = [...new Set(pending.map(a => a.contributor_id).filter(Boolean))]
      const { data: contributors } = await supabaseAdmin
        .from('contributors')
        .select('id, name, role')
        .in('id', contributorIds)

      const contribMap: Record<string, { name: string; role: string }> = {}
      for (const c of contributors ?? []) contribMap[c.id] = { name: c.name, role: c.role ?? '' }

      const answers = pending.map(a => ({
        contributorName: contribMap[a.contributor_id]?.name ?? 'A contributor',
        relationship:    contribMap[a.contributor_id]?.role ?? '',
        question:        a.question_text.substring(0, 100),
        answer:          (a.answer_text || '').substring(0, 120) + ((a.answer_text?.length ?? 0) > 120 ? '…' : ''),
      }))

      const firstName = archive.owner_name?.split(' ')[0] ?? 'there'
      const subject   = `Your family added memories this week · ${archive.name}`

      await resend.emails.send({
        from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
        to:      archive.owner_email,
        subject,
        html:    buildFamilyReactionsEmail(firstName, archive.name, answers, `${siteUrl}/archive/deposit`),
        headers: {
          'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
          'X-Entity-Ref-ID':  `basalith-reactions-${archive.id}-${Date.now()}`,
          'Precedence':       'bulk',
        },
      })

      // Mark all included answers as notified
      const answerIds = pending.map(a => a.id)
      await supabaseAdmin
        .from('contributor_questions')
        .update({ owner_notified: true, owner_notified_at: new Date().toISOString() })
        .in('id', answerIds)

      sent++
    } catch (err: any) {
      console.error(`[family-reactions] ${archive.id}:`, err.message)
      skipped.push(`${archive.name} (error)`)
    }
  }

  return Response.json({ sent, total: archives?.length ?? 0, skipped })
}
