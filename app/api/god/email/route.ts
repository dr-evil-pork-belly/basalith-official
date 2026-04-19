import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'

export const dynamic = 'force-dynamic'

function validateGodAuth(req: NextRequest): boolean {
  const cookie   = req.cookies.get('god-mode-auth')?.value
  const expected = process.env.GOD_MODE_PASSWORD || process.env.CRON_SECRET || ''
  return !!expected && cookie === expected
}

export async function POST(req: NextRequest) {
  if (!validateGodAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { archiveId, type, customMessage } = await req.json()

    if (!archiveId || !type) {
      return NextResponse.json({ error: 'archiveId and type required' }, { status: 400 })
    }

    const { data: archive } = await supabaseAdmin
      .from('archives')
      .select('id, name, family_name, owner_name, owner_email')
      .eq('id', archiveId)
      .maybeSingle()

    if (!archive?.owner_email) {
      return NextResponse.json({ error: 'Archive not found or no owner email' }, { status: 404 })
    }

    const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL   ?? 'https://basalith.xyz'
    const fromEmail = process.env.RESEND_FROM_EMAIL       ?? 'archive@basalith.xyz'
    const firstName = archive.owner_name?.split(' ')[0]   ?? 'there'

    const templates: Record<string, { subject: string; body: string }> = {
      no_photos: {
        subject: `Your ${archive.name} archive is ready for your memories`,
        body:    `Your archive is set up and waiting. Uploading even a few photographs will bring it to life. Visit ${siteUrl}/archive/upload to begin.`,
      },
      entity_intro: {
        subject: `Your entity is ready to meet you`,
        body:    `The entity built from your archive is ready. You can speak with it now at ${siteUrl}/archive/entity.`,
      },
      wisdom_prompt: {
        subject: `A question worth answering`,
        body:    customMessage || `There is a question waiting for you in your archive. Visit ${siteUrl}/archive/deposit to share your answer.`,
      },
      general: {
        subject: `From the ${archive.name} archive`,
        body:    customMessage || '',
      },
    }

    const template = templates[type]
    if (!template || !template.body) {
      return NextResponse.json({ error: `Unknown type or empty message: ${type}` }, { status: 400 })
    }

    await resend.emails.send({
      from:    `${archive.name} <${fromEmail}>`,
      to:      archive.owner_email,
      subject: template.subject,
      html: `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:520px;margin:0 auto;padding:0">
  <div style="padding:40px 40px 32px">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 24px">
      ${archive.name.toUpperCase()}
    </p>
    <p style="font-family:Georgia,serif;font-size:18px;font-weight:700;color:#F0EDE6;margin:0 0 16px">
      ${firstName},
    </p>
    <p style="font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#9DA3A8;margin:0 0 24px">
      ${template.body}
    </p>
    <a href="${siteUrl}/archive/dashboard" style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;text-decoration:none">
      OPEN YOUR ARCHIVE &rarr;
    </a>
  </div>
</body>
</html>`,
      text: `${firstName},\n\n${template.body}\n\nOpen your archive: ${siteUrl}/archive/dashboard`,
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[god/email]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
