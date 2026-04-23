import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { getDailyReflection, getDayOfYear } from '@/lib/dailyReflections'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const secretParam  = searchParams.get('secret') || ''
  const authHeader   = req.headers.get('authorization') || ''
  const headerSecret = authHeader.replace('Bearer ', '')
  const expectedSecret = process.env.CRON_SECRET || ''

  const isAuthorized = expectedSecret && (
    headerSecret === expectedSecret ||
    secretParam  === expectedSecret
  )

  if (!isAuthorized) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isTest = searchParams.get('test') === 'true'

  const hour = new Date().getUTCHours()
  if (!isTest && hour !== 8) {
    return Response.json({ skipped: true, reason: 'Not 8am UTC' })
  }

  const { data: archives } = await supabaseAdmin
    .from('archives')
    .select('id, name, family_name, owner_name, owner_email, preferred_language')
    .eq('status', 'active')
    .not('owner_email', 'is', null)

  let sent = 0
  const dayOfYear = getDayOfYear()

  for (const archive of archives ?? []) {
    try {
      const lang = archive.preferred_language ?? 'en'

      // Find weakest 3 dimensions for this archive
      const { data: accuracy } = await supabaseAdmin
        .from('entity_accuracy')
        .select('dimension, accuracy_score')
        .eq('archive_id', archive.id)
        .order('accuracy_score', { ascending: true })
        .limit(3)

      // Rotate through weakest 3 dimensions based on day of year
      const weakestDimension = accuracy?.[dayOfYear % 3]?.dimension ?? 'wisdom_and_lessons'

      const question = getDailyReflection(weakestDimension, lang, dayOfYear)

      const firstName      = archive.owner_name?.split(' ')[0] ?? 'there'
      const twilioNumber   = process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER ?? '1-888-688-9168'
      const formattedPhone = twilioNumber.replace(/\+1(\d{3})(\d{3})(\d{4})/, '1-$1-$2-$3') || '1-888-688-9168'

      const subject = lang === 'zh'
        ? `今天的问题 · ${archive.name}`
        : `Today's question · ${archive.name}`

      await resend.emails.send({
        from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
        to:      archive.owner_email,
        subject,
        html:    buildDailyReflectionEmail(archive.name, firstName, question, formattedPhone, lang),
        headers: {
          'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
          'X-Entity-Ref-ID':  `basalith-${archive.id}-${Date.now()}`,
          'Precedence':       'bulk',
        },
      })

      sent++
    } catch (err: any) {
      console.error(`[daily-reflection] Failed for archive ${archive.id}:`, err.message)
    }
  }

  return Response.json({ sent, total: archives?.length ?? 0, dayOfYear })
}

function buildDailyReflectionEmail(
  archiveName:  string,
  firstName:    string,
  question:     string,
  phoneNumber:  string,
  lang:         string,
): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
  const dateStr = new Date().toLocaleDateString(
    lang === 'zh' ? 'zh-CN' : 'en-US',
    { month: 'long', day: 'numeric' },
  )

  if (lang === 'zh') {
    return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">

  <div style="padding:32px 32px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">
      ${archiveName.toUpperCase()}
    </p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;margin:0">
      今日问题 · ${dateStr}
    </p>
  </div>

  <div style="padding:32px">

    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 8px">
      ${firstName}，
    </p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 24px">
      今天的问题是：
    </p>

    <div style="border-left:3px solid rgba(196,162,74,0.5);padding:20px 24px;margin:0 0 32px;background:rgba(196,162,74,0.04)">
      <p style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#F0EDE6;line-height:1.7;margin:0;font-style:italic">
        ${question}
      </p>
    </div>

    <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;color:#B8B4AB;margin:0 0 8px">
      您可以用以下方式回答：
    </p>

    <div style="background:rgba(196,162,74,0.06);border:1px solid rgba(196,162,74,0.2);padding:20px 24px;margin:0 0 16px">
      <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;color:#C4A24A;margin:0 0 8px">
        最简单的方式 — 打电话
      </p>
      <p style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#F0EDE6;margin:0 0 4px;letter-spacing:2px">
        ${phoneNumber}
      </p>
      <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#706C65;margin:0">
        用普通话或广东话都可以。无需登录。
      </p>
    </div>

    <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#3A3830;margin:0 0 16px;text-align:center">
      或者
    </p>

    <div style="text-align:center;margin:0 0 24px">
      <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#706C65;margin:0 0 8px">
        直接回复这封邮件
      </p>
      <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#706C65;margin:0">
        用中文写下您的回答即可
      </p>
    </div>

    <div style="border-top:1px solid rgba(240,237,230,0.06);padding-top:20px;text-align:center">
      <p style="font-family:Georgia,serif;font-size:13px;font-style:italic;color:#3A3830;margin:0">
        您的故事值得被永远保存。
      </p>
    </div>

  </div>

  <div style="padding:0 32px 32px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;line-height:1.8;margin:0">
      BASALITH · XYZ<br>${archiveName}<br>Heritage Nexus Inc.
    </p>
  </div>

</body>
</html>`
  }

  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">

  <div style="padding:32px 32px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">
      ${archiveName.toUpperCase()}
    </p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;margin:0">
      TODAY'S QUESTION · ${dateStr.toUpperCase()}
    </p>
  </div>

  <div style="padding:32px">

    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 24px">
      ${firstName},
    </p>

    <div style="border-left:3px solid rgba(196,162,74,0.5);padding:20px 24px;margin:0 0 32px;background:rgba(196,162,74,0.04)">
      <p style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#F0EDE6;line-height:1.7;margin:0;font-style:italic">
        "${question}"
      </p>
    </div>

    <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;color:#B8B4AB;margin:0 0 16px">
      Answer by calling:
    </p>

    <div style="background:rgba(196,162,74,0.06);border:1px solid rgba(196,162,74,0.2);padding:20px 24px;margin:0 0 24px">
      <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;color:#C4A24A;margin:0 0 8px">
        CALL TO RECORD YOUR ANSWER
      </p>
      <p style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#F0EDE6;margin:0 0 4px;letter-spacing:2px">
        ${phoneNumber}
      </p>
      <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#706C65;margin:0">
        Speak in any language. No login needed.
      </p>
    </div>

    <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#706C65;margin:0 0 8px;text-align:center">
      Or reply to this email with your answer.
    </p>

    <div style="border-top:1px solid rgba(240,237,230,0.06);padding-top:20px;text-align:center;margin-top:24px">
      <p style="font-family:Georgia,serif;font-size:13px;font-style:italic;color:#3A3830;margin:0">
        Your stories are worth keeping.
      </p>
    </div>

  </div>

  <div style="padding:0 32px 32px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;line-height:1.8;margin:0">
      BASALITH · XYZ<br>${archiveName}<br>Heritage Nexus Inc.
    </p>
  </div>

</body>
</html>`
}
