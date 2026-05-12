import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic()

function validateCronAuth(req: NextRequest): boolean {
  const { searchParams } = new URL(req.url)
  const secret   = searchParams.get('secret') || req.headers.get('authorization')?.replace('Bearer ', '') || ''
  const expected = process.env.CRON_SECRET || ''
  return !!expected && secret === expected
}

async function generateAnniversaryQuestion(
  personName:  string,
  eventLabel:  string,
  dateType:    string,
  yearsAgo:    number | null,
  firstName:   string,
  lang:        string,
): Promise<string> {
  const langInstr = lang === 'zh' ? 'Write in Simplified Chinese.' :
    lang === 'yue' ? 'Write in Cantonese (Traditional Chinese).' :
    lang === 'ja'  ? 'Write in polite Japanese.' :
    lang === 'es'  ? 'Write in Spanish.' : 'Write in English.'

  try {
    const res = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 130,
      messages: [{
        role:    'user',
        content: `Generate one personal question for a legacy archive owner about a significant date.

Person/event: ${personName}
Type: ${dateType}
Years ago: ${yearsAgo ?? 'unknown'}
Archive owner's first name: ${firstName}

The question should:
- Reference the specific date/event
- Ask about something personal the archive entity would not know from just the date
- Be warm and specific, 1-2 sentences
- ${langInstr}

Return only the question text.`,
      }],
    })
    return res.content[0].type === 'text' ? res.content[0].text.trim() : ''
  } catch {
    return `What is something about ${personName} that you have never fully put into words?`
  }
}

function buildAnniversaryEmail(
  firstName:    string,
  archiveName:  string,
  personName:   string,
  dateType:     string,
  yearsAgo:     number | null,
  question:     string,
  portalUrl:    string,
  lang:         string,
): string {
  const typeLabel = dateType === 'birthday'            ? 'birthday'
    : dateType === 'death_anniversary'                 ? 'anniversary of passing'
    : dateType === 'wedding_anniversary'               ? 'anniversary'
    : 'significant date'

  const yearsLine = yearsAgo && yearsAgo > 0
    ? `<p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;margin:0 0 24px">${yearsAgo} YEARS AGO TODAY</p>`
    : ''

  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">

  <div style="padding:32px 32px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">${archiveName.toUpperCase()}</p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;margin:0">A QUESTION FOR TODAY</p>
  </div>

  <div style="padding:32px">
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 24px">${firstName},</p>

    <p style="font-family:Georgia,serif;font-size:22px;font-weight:300;color:#F0EDE6;line-height:1.3;margin:0 0 8px">${personName}</p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#5C6166;text-transform:uppercase;margin:0 0 20px">${typeLabel}</p>
    ${yearsLine}

    <p style="font-family:Georgia,serif;font-size:15px;font-weight:300;font-style:italic;color:#706C65;line-height:1.8;margin:0 0 32px">
      The entity knows some of this story.
    </p>

    <div style="padding:24px 28px;border-left:3px solid rgba(196,162,74,0.5);background:rgba(196,162,74,0.04);margin:0 0 32px">
      <p style="font-family:Georgia,serif;font-size:20px;font-weight:300;font-style:italic;color:#F0EDE6;line-height:1.7;margin:0">
        ${question}
      </p>
    </div>

    <a href="${portalUrl}" style="display:inline-block;background:#C4A24A;color:#0A0908;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-decoration:none;padding:14px 28px;border-radius:2px">
      RECORD YOUR ANSWER →
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

  const isTest = new URL(req.url).searchParams.get('test') === 'true'

  const { data: archives } = await supabaseAdmin
    .from('archives')
    .select('id, name, owner_email, owner_name, preferred_language')
    .eq('status', 'active')
    .not('owner_email', 'is', null)

  const now     = new Date()
  const todayM  = now.getUTCMonth() + 1
  const todayD  = now.getUTCDate()
  const todayY  = now.getUTCFullYear()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
  let sent = 0
  const skipped: string[] = []

  for (const archive of archives ?? []) {
    try {
      const { data: dates } = await supabaseAdmin
        .from('significant_dates')
        .select('id, person_name, date_type, month, day, year, notes, label')
        .eq('archive_id', archive.id)
        .eq('active', true)

      const matching = (dates ?? []).filter(d =>
        Number(d.month) === todayM && Number(d.day) === todayD
      )

      for (const date of matching) {
        // Idempotency: one per date per year
        const idempotencyKey = `${date.id}-${todayY}`
        const { data: existing } = await supabaseAdmin
          .from('owner_notifications')
          .select('id')
          .eq('archive_id', archive.id)
          .eq('type', 'anniversary_trigger')
          .filter('metadata->>idempotencyKey', 'eq', idempotencyKey)
          .maybeSingle()

        if (existing && !isTest) { skipped.push(`${archive.name}/${date.person_name}`); continue }

        const yearsAgo = date.year ? todayY - Number(date.year) : null
        const lang      = archive.preferred_language ?? 'en'
        const firstName = archive.owner_name?.split(' ')[0] ?? 'there'

        const question = await generateAnniversaryQuestion(
          date.person_name, date.label || date.person_name,
          date.date_type, yearsAgo, firstName, lang,
        )

        const subject = `A question for today · ${archive.name}`

        await resend.emails.send({
          from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
          to:      archive.owner_email,
          subject,
          html:    buildAnniversaryEmail(
            firstName, archive.name, date.person_name, date.date_type,
            yearsAgo, question, `${siteUrl}/archive/deposit`, lang,
          ),
          headers: {
            'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
            'X-Entity-Ref-ID':  `basalith-anniversary-${archive.id}-${idempotencyKey}`,
            'Precedence':       'bulk',
          },
        })

        await supabaseAdmin.from('owner_notifications').insert({
          archive_id: archive.id,
          type:       'anniversary_trigger',
          subject,
          sent_to:    archive.owner_email,
          sent_at:    new Date().toISOString(),
          metadata:   { idempotencyKey, dateId: date.id, personName: date.person_name, yearsAgo },
        })

        sent++
      }
    } catch (err: any) {
      console.error(`[anniversary-triggers] ${archive.id}:`, err.message)
      skipped.push(`${archive.name} (error)`)
    }
  }

  return Response.json({ sent, total: archives?.length ?? 0, skipped })
}
