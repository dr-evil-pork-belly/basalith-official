import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { selectNextQuestion } from '@/lib/selectNextQuestion'
import { createEmailReplySession, buildReplyAddress, type CreateSessionOptions } from '@/lib/emailReplySessions'
import { loadOpenIncident, pickIncidentSeed } from '@/lib/incidentSession'
import { renderProbe } from '@/lib/renderProbe'

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

  for (const archive of archives ?? []) {
    try {
      const lang        = archive.preferred_language ?? 'en'
      const firstName   = archive.owner_name?.split(' ')[0] ?? 'there'
      const isSuccession = archive.tier === 'succession'

      let subject: string
      let html:    string
      let replyTo: string | undefined

      if (isSuccession) {
        // Seed-and-invite. The probe chain cannot run over email (each probe
        // needs the prior answer), so the daily email stops carrying the
        // interview. It shows the day's incident opener and links into the
        // founder portal, where the multi-turn interview actually runs. This
        // creates NO state: the portal's GET /next owns incident creation. We
        // mirror that route's read (continue an open incident, else a fresh
        // narrative seed) so the email and the portal agree on what is up. No
        // reply-to: answering by email cannot drive the chain.
        const open = await loadOpenIncident(archive.id)
        let opener:   string
        let category: string
        let continued = false

        if (open && open.state.pendingQuestion) {
          opener    = open.state.pendingQuestion
          category  = open.category
          continued = true
        } else {
          const seed = await pickIncidentSeed(archive.id)
          if (!seed) {
            console.warn('[daily-reflection] no incident seed for', archive.id, '— skipping')
            continue
          }
          opener   = renderProbe({ probeType: 'SEED', anchor: '', seedText: seed.seedText })
          category = seed.category
        }

        const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.ai'
        const portalUrl = `${siteUrl}/archive/dashboard`
        subject = `Your reflection is ready · ${archive.name}`
        html    = buildSuccessionInviteEmail(archive.name, firstName, category, opener, portalUrl, continued)
      } else {
        const twilioNumber   = process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER ?? '1-888-688-9168'
        const formattedPhone = twilioNumber.replace(/\+1(\d{3})(\d{3})(\d{4})/, '1-$1-$2-$3') || '1-888-688-9168'

        const result = await selectNextQuestion({ archiveId: archive.id, channel: 'daily_email' })
        const emailType: CreateSessionOptions['emailType'] =
          result.source === 'p1' ? 'conversational' : 'owner_daily'

        try {
          const token = await createEmailReplySession({
            archiveId:     archive.id,
            contributorId: null,
            emailType,
            sparkId:       result.questionText.substring(0, 200),
          })
          replyTo = buildReplyAddress(token)
        } catch (e) {
          console.warn('[daily-reflection] reply session failed:', e instanceof Error ? e.message : e)
        }

        subject = lang === 'zh'
          ? `今天的问题 · ${archive.name}`
          : `Today's question · ${archive.name}`
        html = buildDailyReflectionEmail(archive.name, firstName, result.questionText, formattedPhone, lang, result.framingUsed)
      }

      console.log('[daily-reflection] sending to:', archive.owner_email, '| succession:', isSuccession, '| replyTo:', replyTo ?? 'none')
      await resend.emails.send({
        from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
        to:      archive.owner_email,
        replyTo,
        subject,
        html,
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

  return Response.json({ sent, total: archives?.length ?? 0, magicLinksCleared: clearedRows?.length ?? 0 })
}

function buildDailyReflectionEmail(
  archiveName:  string,
  firstName:    string,
  question:     string,
  phoneNumber:  string,
  lang:         string,
  framing:      string | null = null,
): string {
  const framingHtml = framing
    ? `<p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#9A968C;line-height:1.7;margin:0 0 16px">${framing}</p>`
    : ''
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

    ${framingHtml}

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

    ${framingHtml}

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

// Succession daily email: a seed-and-invite, not a question-and-reply. The probe
// chain runs in the founder portal, so this email leads with the human reason to
// come reflect, shows the day's incident opener, and links into the portal. No
// reply-to and no phone affordance: answering by email cannot drive the chain.
// Copy obeys the standing rules (no em dashes, American English, short
// declarative sentences, no banned words, nothing implying the entity is alive).
function buildSuccessionInviteEmail(
  archiveName: string,
  firstName:   string,
  category:    string,
  opener:      string,
  portalUrl:   string,
  continued:   boolean = false,
): string {
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const eyebrow = continued ? `${category.toUpperCase()} · IN PROGRESS` : category.toUpperCase()

  const lead = continued
    ? 'You started a reflection and stepped away. It is still here whenever you are ready to finish it.'
    : 'Some of the calls you made still shape the people who came after you. Today there is one worth returning to.'

  const ctaLabel = continued ? 'Continue in your portal' : 'Begin in your portal'

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

    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 20px">
      ${firstName},
    </p>

    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.7;margin:0 0 24px">
      ${lead}
    </p>

    <div style="border-left:3px solid rgba(196,162,74,0.5);padding:20px 24px;margin:0 0 28px;background:rgba(196,162,74,0.04)">
      <p style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#F0EDE6;line-height:1.7;margin:0;font-style:italic">
        "${opener}"
      </p>
    </div>

    <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;color:#B8B4AB;line-height:1.7;margin:0 0 28px">
      This one is a conversation, not a single reply. Set aside a few quiet minutes and work through it one question at a time.
    </p>

    <div style="text-align:center;margin:0 0 28px">
      <a href="${portalUrl}" style="display:inline-block;font-family:'Courier New',monospace;font-size:12px;letter-spacing:3px;color:#0A0908;background:#C4A24A;text-decoration:none;padding:14px 32px">
        ${ctaLabel.toUpperCase()}
      </a>
    </div>

    <div style="border-top:1px solid rgba(240,237,230,0.06);padding-top:20px;text-align:center">
      <p style="font-family:Georgia,serif;font-size:13px;font-style:italic;color:#5C6166;margin:0">
        Your judgment deserves to outlast you.
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
