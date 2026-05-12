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

async function generateEntityLetter(
  ownerName:      string,
  archiveName:    string,
  firstName:      string,
  recentPrompts:  string[],
): Promise<string> {
  try {
    const res = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 500,
      system:     buildPersonSystemPrompt(ownerName, archiveName),
      messages: [{
        role:    'user',
        content: `Write a short personal letter from the entity to ${firstName}.

The letter should:
- Be written in first person as if the entity is speaking to ${firstName}
- Reference something specific recently shared about these topics: ${recentPrompts.slice(0, 4).join('; ')}
- Show what the entity now understands that it did not before
- End with one question that would help the entity learn something it is still missing
- Be warm but not sentimental
- Be 150-200 words maximum
- Start with "Dear ${firstName},"

Return only the letter text.`,
      }],
    })
    return res.content[0].type === 'text' ? res.content[0].text.trim() : ''
  } catch (err: any) {
    console.error('[entity-letter] Claude error:', err.message)
    return ''
  }
}

function buildEntityLetterEmail(
  firstName:   string,
  archiveName: string,
  letter:      string,
  portalUrl:   string,
): string {
  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">

  <div style="padding:32px 32px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">${archiveName.toUpperCase()}</p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;margin:0">A LETTER FROM YOUR ENTITY</p>
  </div>

  <div style="padding:32px">
    <div style="padding:28px;border:1px solid rgba(196,162,74,0.15);border-top:2px solid rgba(196,162,74,0.5);background:rgba(196,162,74,0.03);margin:0 0 32px">
      <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;font-style:italic;color:#F0EDE6;line-height:1.9;margin:0;white-space:pre-line">${letter}</p>
    </div>

    <div style="padding:20px 24px;border-left:3px solid rgba(196,162,74,0.2);margin:0 0 32px">
      <p style="font-family:Georgia,serif;font-size:15px;font-weight:300;color:#706C65;line-height:1.8;margin:0">
        This letter was written by your entity based on what it has learned from you.
        If it says something that does not feel right — correct it.
        If it asks something you want to answer — reply to this email or visit your archive.
      </p>
    </div>

    <a href="${portalUrl}" style="display:inline-block;background:#C4A24A;color:#0A0908;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-decoration:none;padding:14px 28px;border-radius:2px">
      VISIT YOUR ARCHIVE →
    </a>
  </div>

  <div style="padding:16px 32px 32px;border-top:1px solid rgba(240,237,230,0.06);margin-top:8px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;line-height:1.8;margin:0">
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

  // Quarterly: Jan/Apr/Jul/Oct 1st
  if (!isTest && !force) {
    const now = new Date()
    const isQuarterStart = now.getUTCDate() === 1 && [0, 3, 6, 9].includes(now.getUTCMonth())
    if (!isQuarterStart) return Response.json({ skipped: true, reason: 'Not start of quarter' })
  }

  const { data: archives } = await supabaseAdmin
    .from('archives')
    .select('id, name, owner_email, owner_name, preferred_language')
    .eq('status', 'active')
    .not('owner_email', 'is', null)

  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
  const quarter  = `Q${Math.floor(new Date().getUTCMonth() / 3) + 1}-${new Date().getUTCFullYear()}`
  let sent = 0
  const skipped: string[] = []

  for (const archive of archives ?? []) {
    try {
      // Only for archives with 50+ training pairs
      const { count: pairCount } = await supabaseAdmin
        .from('training_pairs')
        .select('id', { count: 'exact', head: true })
        .eq('archive_id', archive.id)
        .eq('included_in_training', true)

      if ((pairCount ?? 0) < 50) { skipped.push(`${archive.name} (only ${pairCount} pairs)`); continue }

      // Idempotency
      const { data: existing } = await supabaseAdmin
        .from('owner_notifications')
        .select('id')
        .eq('archive_id', archive.id)
        .eq('type', 'entity_letter')
        .filter('metadata->>quarter', 'eq', quarter)
        .maybeSingle()

      if (existing && !force) { skipped.push(`${archive.name} (already sent ${quarter})`); continue }

      // Get recent high-quality deposits for context
      const { data: recentPairs } = await supabaseAdmin
        .from('training_pairs')
        .select('prompt')
        .eq('archive_id', archive.id)
        .eq('included_in_training', true)
        .order('quality_score', { ascending: false })
        .limit(8)

      const recentPrompts = (recentPairs ?? []).map(p => p.prompt.substring(0, 80))

      const firstName  = archive.owner_name?.split(' ')[0] ?? 'there'
      const letter     = await generateEntityLetter(archive.owner_name ?? firstName, archive.name, firstName, recentPrompts)

      if (!letter) { skipped.push(`${archive.name} (letter generation failed)`); continue }

      const subject = `A letter from your entity · ${archive.name}`

      await resend.emails.send({
        from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
        to:      archive.owner_email,
        subject,
        html:    buildEntityLetterEmail(firstName, archive.name, letter, `${siteUrl}/archive/entity`),
        headers: {
          'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
          'X-Entity-Ref-ID':  `basalith-entity-letter-${archive.id}-${quarter}`,
          'Precedence':       'bulk',
        },
      })

      await supabaseAdmin.from('owner_notifications').insert({
        archive_id: archive.id,
        type:       'entity_letter',
        subject,
        sent_to:    archive.owner_email,
        sent_at:    new Date().toISOString(),
        metadata:   { quarter },
      })

      sent++
    } catch (err: any) {
      console.error(`[entity-letter] ${archive.id}:`, err.message)
      skipped.push(`${archive.name} (error)`)
    }
  }

  return Response.json({ sent, total: archives?.length ?? 0, skipped })
}
