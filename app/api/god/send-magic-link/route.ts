import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  console.log('[send-magic-link] START')

  try {
    const cookieStore = await cookies()
    const godAuth     = cookieStore.get('god-mode-auth')?.value

    console.log('[send-magic-link] godAuth:', !!godAuth, 'expected:', !!process.env.GOD_MODE_PASSWORD)

    if (!godAuth || godAuth !== process.env.GOD_MODE_PASSWORD) {
      console.log('[send-magic-link] UNAUTHORIZED')
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[send-magic-link] auth passed')

    const { archiveId } = await req.json()
    if (!archiveId) return Response.json({ error: 'archiveId required' }, { status: 400 })

    const { data: archive, error: archiveError } = await supabaseAdmin
      .from('archives')
      .select('id, name, family_name, owner_name, owner_email, preferred_language')
      .eq('id', archiveId)
      .maybeSingle()

    console.log('[send-magic-link] archiveError:', archiveError?.message)
    console.log('[send-magic-link] archive:', archive?.id, archive?.name, 'email:', archive?.owner_email)

    if (!archive?.owner_email) {
      return Response.json({ error: 'Archive not found' }, { status: 404 })
    }

    // Fetch magic_link_token separately — column may not exist yet on older DBs
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('archives')
      .select('magic_link_token')
      .eq('id', archiveId)
      .maybeSingle()

    console.log('[send-magic-link] tokenError:', tokenError?.message)
    console.log('[send-magic-link] has token:', !!tokenData?.magic_link_token)

    let magicToken: string = tokenData?.magic_link_token ?? ''

    // Generate token on the fly if missing (existing archives pre-migration)
    if (!magicToken) {
      console.log('[send-magic-link] no token — generating one')
      magicToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      const { error: updateError } = await supabaseAdmin
        .from('archives')
        .update({
          magic_link_token:      magicToken,
          magic_link_created_at: new Date().toISOString(),
        })
        .eq('id', archiveId)

      console.log('[send-magic-link] token update error:', updateError?.message)
    }

    const siteUrl      = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
    const fromEmail    = process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'
    const magicLinkUrl = `${siteUrl}/api/archive/magic-login?token=${magicToken}`
    const firstName    = (archive.owner_name ?? archive.family_name).split(' ')[0]
    const isZh         = archive.preferred_language === 'zh'

    const subject = isZh
      ? `您的${archive.family_name}档案访问链接`
      : `Your link to The ${archive.family_name} Archive`

    const html = buildMagicLinkEmail({ familyName: archive.family_name, firstName, magicLinkUrl, siteUrl, isZh })

    await resend.emails.send({
      from:    `The ${archive.family_name} Archive <${fromEmail}>`,
      to:      archive.owner_email,
      subject,
      html,
      headers: {
        'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
        'X-Entity-Ref-ID':  `basalith-${archiveId}-${Date.now()}`,
        'Precedence':       'bulk',
      },
    })

    console.log('[send-magic-link] email sent to:', archive.owner_email)

    return Response.json({ success: true })

  } catch (error: any) {
    console.error('[send-magic-link] ERROR:', error.message, error.stack)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

function buildMagicLinkEmail({
  familyName,
  firstName,
  magicLinkUrl,
  siteUrl,
  isZh,
}: {
  familyName:   string
  firstName:    string
  magicLinkUrl: string
  siteUrl:      string
  isZh:         boolean
}): string {
  const heading   = isZh ? `${firstName}，` : `${firstName},`
  const intro     = isZh
    ? `以下是您访问${familyName}档案的专属链接。无需密码。`
    : `Here is your personal link to The ${familyName} Archive. No password needed.`
  const linkLabel = isZh ? '您的档案访问链接' : 'YOUR ARCHIVE LINK'
  const bookmark  = isZh
    ? '请收藏此链接。这是您访问档案的专属入口，永久有效。'
    : 'Bookmark this link. It is your personal entry to the archive and never expires.'

  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:560px;margin:0 auto;padding:0">

  <div style="padding:40px 40px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0">
      THE ${familyName.toUpperCase()} ARCHIVE
    </p>
  </div>

  <div style="padding:32px 40px 40px">

    <p style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#F0EDE6;margin:0 0 20px">
      ${heading}
    </p>

    <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#9DA3A8;line-height:1.8;margin:0 0 28px">
      ${intro}
    </p>

    <div style="background:rgba(196,162,74,0.06);border:1px solid rgba(196,162,74,0.2);padding:20px 24px;margin:0 0 28px">
      <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;margin:0 0 12px">
        ${linkLabel}
      </p>
      <a href="${magicLinkUrl}" style="font-family:Georgia,serif;font-size:14px;color:#C4A24A;word-break:break-all">
        ${magicLinkUrl}
      </a>
      <p style="font-family:Georgia,serif;font-size:13px;font-style:italic;color:#706C65;margin:12px 0 0;line-height:1.7">
        ${bookmark}
      </p>
    </div>

    <div style="border-top:1px solid rgba(240,237,230,0.06);padding-top:24px">
      <a href="${siteUrl}" style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;text-decoration:none">
        BASALITH · XYZ
      </a>
    </div>

  </div>

</body>
</html>`
}
