import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { getDailyReflection, getDayOfYear } from '@/lib/dailyReflections'
import { createEmailReplySession, buildReplyAddress } from '@/lib/emailReplySessions'

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
    .select('id, name, family_name, owner_name, owner_email, preferred_language, tier')
    .eq('status', 'active')
    .not('owner_email', 'is', null)

  let sent = 0
  const dayOfYear = getDayOfYear()

  for (const archive of archives ?? []) {
    try {
      const lang        = archive.preferred_language ?? 'en'
      const firstName   = archive.owner_name?.split(' ')[0] ?? 'there'
      const twilioNumber   = process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER ?? '1-888-688-9168'
      const formattedPhone = twilioNumber.replace(/\+1(\d{3})(\d{3})(\d{4})/, '1-$1-$2-$3') || '1-888-688-9168'

      // ── Succession tier: serve B2B questions in sequence ──────────────────
      if (archive.tier === 'succession') {
        const [{ data: allQuestions }, { data: answeredDeposits }] = await Promise.all([
          supabaseAdmin
            .from('b2b_questions')
            .select('id, category, question, order_index')
            .order('order_index', { ascending: true }),
          supabaseAdmin
            .from('owner_deposits')
            .select('prompt')
            .eq('archive_id', archive.id)
            .eq('source_type', 'b2b_question'),
        ])

        const questions = allQuestions ?? []
        if (questions.length === 0) {
          console.warn(`[daily-reflection] No b2b_questions found — skipping succession archive ${archive.id}`)
          continue
        }

        const answeredSet = new Set((answeredDeposits ?? []).map(d => d.prompt))
        const unanswered  = questions.filter(q => !answeredSet.has(q.question))

        const b2bQuestion = unanswered.length > 0
          ? unanswered[0]
          : questions[(answeredDeposits?.length ?? 0) % questions.length]

        const subject = `Today's succession question · ${archive.name}`

        let replyTo: string | undefined
        try {
          const token = await createEmailReplySession({
            archiveId:     archive.id,
            contributorId: null,
            emailType:     'b2b_question',
            sparkId:       b2bQuestion.question.substring(0, 200),
          })
          replyTo = buildReplyAddress(token)
        } catch (e) {
          console.warn('[daily-reflection] b2b reply session failed:', e instanceof Error ? e.message : e)
        }

        console.log('[daily-reflection] succession — sending to:', archive.owner_email, 'category:', b2bQuestion.category, 'replyTo:', replyTo)
        await resend.emails.send({
          from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
          to:      archive.owner_email,
          replyTo,
          subject,
          html:    buildB2BQuestionEmail(archive.name, firstName, b2bQuestion.category, b2bQuestion.question, formattedPhone),
          headers: {
            'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
            'X-Entity-Ref-ID':  `basalith-${archive.id}-${Date.now()}`,
            'Precedence':       'bulk',
          },
        })

        sent++
        continue
      }

      // ── Standard tier: existing dimension-based reflection logic ──────────
      const { data: accuracy } = await supabaseAdmin
        .from('entity_accuracy')
        .select('dimension, accuracy_score')
        .eq('archive_id', archive.id)
        .order('accuracy_score', { ascending: true })
        .limit(3)

      const weakestDimension = accuracy?.[dayOfYear % 3]?.dimension ?? 'wisdom_and_lessons'
      const question         = getDailyReflection(weakestDimension, lang, dayOfYear)

      const subject = lang === 'zh'
        ? `今天的问题 · ${archive.name}`
        : `Today's question · ${archive.name}`

      let ownerReplyTo: string | undefined
      try {
        const replyToken = await createEmailReplySession({
          archiveId:     archive.id,
          contributorId: null,
          emailType:     'owner_daily',
          sparkId:       question.substring(0, 200),
        })
        ownerReplyTo = buildReplyAddress(replyToken)
      } catch (e) {
        console.warn('[daily-reflection] reply session failed:', e instanceof Error ? e.message : e)
      }

      console.log('[daily-reflection] sending to:', archive.owner_email, 'replyTo:', ownerReplyTo)
      await resend.emails.send({
        from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
        to:      archive.owner_email,
        replyTo: ownerReplyTo,
        subject,
        html:    buildDailyReflectionEmail(archive.name, firstName, question, formattedPhone, lang),
        headers: {
          'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
          'X-Entity-Ref-ID':  `basalith-${archive.id}-${Date.now()}`,
          'Precedence':       'bulk',
        },
      })

      sent++
    } catch (err: unknown) {
      console.error(`[daily-reflection] Failed for archive ${archive.id}:`, err instanceof Error ? err.message : err)
    }
  }

  // ── Nightly cleanup: clear magic link tokens older than 24 hours ──────────
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: clearedRows } = await supabaseAdmin
    .from('archives')
    .update({ magic_link_token: null, magic_link_created_at: null })
    .lt('magic_link_created_at', cutoff)
    .not('magic_link_token', 'is', null)
    .select('id')

  return Response.json({ sent, total: archives?.length ?? 0, dayOfYear, magicLinksCleared: clearedRows?.length ?? 0 })
}

function buildDailyReflectionEmail(
  archiveName:  string,
  firstName:    string,
  question:     string,
  phoneNumber:  string,
  lang:         string,
): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.ai'
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
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;margin:0">
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

    <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#5C6166;margin:0 0 16px;text-align:center">
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
      <p style="font-family:Georgia,serif;font-size:13px;font-style:italic;color:#5C6166;margin:0">
        您的故事值得被永远保存。
      </p>
    </div>

  </div>

  <div style="padding:0 32px 32px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;line-height:1.8;margin:0">
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
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;margin:0">
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
      <p style="font-family:Georgia,serif;font-size:13px;font-style:italic;color:#5C6166;margin:0">
        Your stories are worth keeping.
      </p>
    </div>

  </div>

  <div style="padding:0 32px 32px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;line-height:1.8;margin:0">
      BASALITH · XYZ<br>${archiveName}<br>Heritage Nexus Inc.
    </p>
  </div>

</body>
</html>`
}

function buildB2BQuestionEmail(
  archiveName:  string,
  firstName:    string,
  category:     string,
  question:     string,
  phoneNumber:  string,
): string {
  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.ai'
  const dateStr  = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const eyebrow  = category.toUpperCase()

  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">

  <div style="padding:32px 32px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">
      ${archiveName.toUpperCase()}
    </p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;margin:0">
      ${eyebrow} · ${dateStr.toUpperCase()}
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
      Reply to this email with your answer. Your response is captured and woven into your entity.
    </p>

    <div style="background:rgba(196,162,74,0.06);border:1px solid rgba(196,162,74,0.2);padding:16px 24px;margin:0 0 24px">
      <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;color:#C4A24A;margin:0 0 6px">
        OR CALL TO RECORD YOUR ANSWER
      </p>
      <p style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#F0EDE6;margin:0 0 4px;letter-spacing:2px">
        ${phoneNumber}
      </p>
      <p style="font-family:Georgia,serif;font-size:13px;font-style:italic;color:#706C65;margin:0">
        No login needed.
      </p>
    </div>

    <div style="border-top:1px solid rgba(240,237,230,0.06);padding-top:20px;text-align:center;margin-top:24px">
      <p style="font-family:Georgia,serif;font-size:13px;font-style:italic;color:#5C6166;margin:0 0 8px">
        Your judgment deserves to outlast you.
      </p>
      <a href="${siteUrl}/archive/entity" style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#C4A24A;text-decoration:none">
        VIEW YOUR ENTITY
      </a>
    </div>

  </div>

  <div style="padding:0 32px 32px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;line-height:1.8;margin:0">
      BASALITH · XYZ<br>${archiveName}<br>Heritage Nexus Inc.
    </p>
  </div>

</body>
</html>`
}
