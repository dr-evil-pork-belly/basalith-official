import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'

// One-time endpoint: send Amy's apology email.
// POST with { archiveId?, contributorId?, contributorName? }
// Finds Amy in contributors, sends the apology.

function validateGodAuth(req: NextRequest): boolean {
  const cookie   = req.cookies.get('god-mode-auth')?.value
  const expected = process.env.GOD_MODE_PASSWORD || process.env.CRON_SECRET || ''
  return !!expected && cookie === expected
}

export async function POST(req: NextRequest) {
  if (!validateGodAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body        = await req.json().catch(() => ({}))
  const nameFilter  = (body.contributorName as string | undefined) ?? 'Amy'
  const archiveId   = body.archiveId as string | undefined

  // Find the contributor
  let query = supabaseAdmin
    .from('contributors')
    .select('id, name, email, archive_id')
    .ilike('name', `%${nameFilter}%`)
    .eq('status', 'active')
    .limit(5)

  if (archiveId) query = query.eq('archive_id', archiveId)

  const { data: contributors, error } = await query

  if (error || !contributors?.length) {
    return NextResponse.json({ error: 'Contributor not found', filter: nameFilter }, { status: 404 })
  }

  const results = []

  for (const contributor of contributors) {
    try {
      await resend.emails.send({
        from:    `Basalith <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
        to:      contributor.email,
        subject: 'A note about your photograph emails',
        html: `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:560px;margin:0 auto;padding:0">
  <div style="padding:40px">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 28px">
      BASALITH
    </p>
    <p style="font-family:Georgia,serif;font-size:18px;font-weight:300;color:#F0EDE6;margin:0 0 20px">
      ${contributor.name?.split(' ')[0] ?? 'Hi'} —
    </p>
    <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;font-style:italic;color:#B8B4AB;line-height:1.9;margin:0 0 20px">
      We found and fixed a bug that was causing you to see the same photographs more than once.
    </p>
    <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;font-style:italic;color:#B8B4AB;line-height:1.9;margin:0 0 20px">
      Starting tonight, every photograph you receive will be one you have not seen before.
    </p>
    <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;font-style:italic;color:#706C65;line-height:1.9;margin:0 0 32px">
      Thank you for letting us know. Your feedback made the product better.
    </p>
    <p style="font-family:Georgia,serif;font-size:15px;font-weight:300;color:#5C6166;margin:0">
      Basalith
    </p>
  </div>
</body>
</html>`,
      })
      results.push({ contributor: contributor.email, status: 'sent' })
    } catch (e) {
      results.push({ contributor: contributor.email, status: 'failed', error: e instanceof Error ? e.message : 'Unknown' })
    }
  }

  return NextResponse.json({ sent: results.filter(r => r.status === 'sent').length, results })
}
