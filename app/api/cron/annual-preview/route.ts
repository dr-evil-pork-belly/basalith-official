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

function buildPersonSystemPrompt(ownerName: string, archiveName: string): string {
  return `You are ${ownerName}. You think, speak, and reason exactly as ${ownerName} does.
You answer from your own lived experience. You use your natural vocabulary and cadence.
You never break character. You never say you are an AI. You speak in first person always.
This is ${archiveName}.`
}

async function generateConversation(
  ownerName:     string,
  archiveName:   string,
  recentPrompts: string[],
): Promise<string> {
  try {
    const res = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 400,
      system:     buildPersonSystemPrompt(ownerName, archiveName),
      messages: [{
        role:    'user',
        content: `Generate a simulated conversation between a future grandchild and this person's entity.

The grandchild is asking something meaningful — not factual, but personal.

Recent deposits for context (to make the answer feel specific to this person):
${recentPrompts.slice(0, 6).join('\n')}

Format exactly as:
Grandchild: "[a personal, specific question]"
Entity: "[answer in first person, drawing from the context above]"

Keep it under 150 words total. Make it feel real and moving. The answer should feel genuinely like this specific person — not generic wisdom.`,
      }],
    })
    return res.content[0].type === 'text' ? res.content[0].text.trim() : ''
  } catch (err: any) {
    console.error('[annual-preview] Claude error:', err.message)
    return ''
  }
}

function buildAnnualPreviewEmail(
  firstName:    string,
  archiveName:  string,
  archiveYears: number,
  conversation: string,
  portalUrl:    string,
): string {
  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">

  <div style="padding:32px 32px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">${archiveName.toUpperCase()}</p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;margin:0">
      YEAR ${archiveYears} · A PREVIEW FROM THE FUTURE
    </p>
  </div>

  <div style="padding:32px">
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 24px">${firstName},</p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.7;margin:0 0 8px">
      Your archive is ${archiveYears} year${archiveYears !== 1 ? 's' : ''} old.
    </p>
    <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;font-style:italic;color:#706C65;line-height:1.7;margin:0 0 32px">
      Here is a conversation your grandchildren might have with your entity someday.
    </p>

    <div style="margin:0 0 32px;padding:24px 28px;border:1px solid rgba(240,237,230,0.1);background:rgba(240,237,230,0.02)">
      <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;font-style:italic;color:#F0EDE6;line-height:1.9;margin:0;white-space:pre-line">${conversation}</p>
    </div>

    <div style="height:1px;background:rgba(196,162,74,0.15);margin:0 0 28px"></div>

    <p style="font-family:Georgia,serif;font-size:15px;font-weight:300;color:#706C65;line-height:1.8;margin:0 0 8px">
      This is based on what the archive knows today.
    </p>
    <p style="font-family:Georgia,serif;font-size:15px;font-weight:300;color:#706C65;line-height:1.8;margin:0 0 32px">
      The more you add the more accurately it speaks.
    </p>

    <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;font-style:italic;color:#B8B4AB;line-height:1.8;margin:0 0 32px">
      What would you want them to know that is not yet in your archive?
    </p>

    <a href="${portalUrl}" style="display:inline-block;background:#C4A24A;color:#0A0908;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-decoration:none;padding:14px 28px;border-radius:2px">
      ADD TO YOUR ARCHIVE →
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
  const force  = searchParams.get('force') === 'true'

  const { data: archives } = await supabaseAdmin
    .from('archives')
    .select('id, name, owner_email, owner_name, preferred_language, created_at, last_annual_preview_year')
    .eq('status', 'active')
    .not('owner_email', 'is', null)

  const now     = new Date()
  const thisYear = now.getUTCFullYear()
  const todayM   = now.getUTCMonth() + 1
  const todayD   = now.getUTCDate()
  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
  let sent = 0
  const skipped: string[] = []

  for (const archive of archives ?? []) {
    try {
      const createdAt   = new Date(archive.created_at)
      const archiveYears = thisYear - createdAt.getUTCFullYear()

      if (archiveYears < 1) { skipped.push(`${archive.name} (< 1 year old)`); continue }

      // Check if anniversary is today
      const isAnniversary = force || isTest ||
        (createdAt.getUTCMonth() + 1 === todayM && createdAt.getUTCDate() === todayD)

      if (!isAnniversary) { skipped.push(`${archive.name} (not today)`); continue }

      // Idempotency: once per year
      if (archive.last_annual_preview_year === thisYear && !force) {
        skipped.push(`${archive.name} (already sent ${thisYear})`)
        continue
      }

      // Get recent high-quality deposits for context
      const { data: recentPairs } = await supabaseAdmin
        .from('training_pairs')
        .select('prompt')
        .eq('archive_id', archive.id)
        .eq('included_in_training', true)
        .order('quality_score', { ascending: false })
        .limit(8)

      const recentPrompts = (recentPairs ?? []).map(p => p.prompt.substring(0, 80))
      if (!recentPrompts.length) { skipped.push(`${archive.name} (no training data)`); continue }

      const firstName    = archive.owner_name?.split(' ')[0] ?? 'there'
      const conversation = await generateConversation(archive.owner_name ?? firstName, archive.name, recentPrompts)
      if (!conversation) { skipped.push(`${archive.name} (generation failed)`); continue }

      const subject = `Year ${archiveYears} · A preview from the future · ${archive.name}`

      await resend.emails.send({
        from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
        to:      archive.owner_email,
        subject,
        html:    buildAnnualPreviewEmail(firstName, archive.name, archiveYears, conversation, `${siteUrl}/archive/deposit`),
        headers: {
          'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
          'X-Entity-Ref-ID':  `basalith-annual-preview-${archive.id}-${thisYear}`,
          'Precedence':       'bulk',
        },
      })

      // Mark as sent for this year
      await supabaseAdmin
        .from('archives')
        .update({ last_annual_preview_year: thisYear })
        .eq('id', archive.id)

      sent++
    } catch (err: any) {
      console.error(`[annual-preview] ${archive.id}:`, err.message)
      skipped.push(`${archive.name} (error)`)
    }
  }

  return Response.json({ sent, total: archives?.length ?? 0, skipped })
}
