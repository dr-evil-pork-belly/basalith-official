import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

// ── Helpers ────────────────────────────────────────────────────────────────────

function extractReplyText(text: string): string {
  const lines       = text.split('\n')
  const replyLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('>')) break
    if (line.includes('wrote:') && line.includes('On ')) break
    if (line.includes('-----Original Message-----')) break
    replyLines.push(line)
  }

  return replyLines.join('\n').trim()
}

function parseNameFromEmail(from: string): string {
  const match = from.match(/^([^<]+)</)
  return match ? match[1].trim() : ''
}

function parseEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/)
  return match ? match[1] : from.trim()
}

function buildConfirmationEmail(
  archiveName:     string,
  contributorName: string,
  replyText:       string,
  replyCount:      number,
): string {
  const firstName = contributorName.split(' ')[0]
  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:32px">
  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;color:#C4A24A;text-transform:uppercase">${archiveName}</p>
  <p style="font-size:18px;font-style:italic;color:#F0EDE6;line-height:1.6">Thank you${firstName ? ', ' + firstName : ''}.</p>
  <p style="font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8">Your memory has been added to ${archiveName}.</p>
  <blockquote style="border-left:2px solid rgba(196,162,74,0.4);padding-left:16px;margin:16px 0;font-style:italic;color:#706C65;font-size:14px">
    "${replyText.substring(0, 200)}${replyText.length > 200 ? '…' : ''}"
  </blockquote>
  <p style="font-size:14px;font-style:italic;color:#706C65;line-height:1.6">
    This photograph now has ${replyCount} ${replyCount === 1 ? 'memory' : 'memories'}. The archive is growing.
  </p>
  <hr style="border:none;border-top:1px solid rgba(240,237,230,0.06);margin:24px 0">
  <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;line-height:1.8">
    BASALITH · XYZ<br>${archiveName} · Generation I
  </p>
</body>
</html>`
}

// ── Webhook handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Log signature headers — Resend signs payloads when a webhook secret is configured.
    // We log but don't block; verification can be added once RESEND_WEBHOOK_SECRET is set.
    const svixId        = req.headers.get('svix-id')
    const svixTimestamp = req.headers.get('svix-timestamp')
    const svixSignature = req.headers.get('svix-signature')

    if (!svixId) {
      console.log('No signature headers — processing anyway')
    } else {
      console.log('Resend signature headers present:', { svixId, svixTimestamp, svixSignature: svixSignature?.slice(0, 20) + '…' })
    }

    const body = await req.json()

    // Log for debugging
    console.log('Inbound email received:', {
      from:       body.from,
      to:         body.to,
      subject:    body.subject,
      textLength: body.text?.length ?? 0,
    })

    // Resend sends `to` as a string, an array of strings, or an array of objects
    const toRaw     = Array.isArray(body.to) ? body.to[0] : body.to
    const replyAddress: string = typeof toRaw === 'object' && toRaw !== null
      ? (toRaw as { email?: string }).email ?? ''
      : String(toRaw ?? '')

    const from = body.from as string

    // Fall back to HTML → text conversion when plain text is absent
    const rawText: string = body.text
      || (body.html as string | undefined)?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      || ''

    const { data: session } = await supabaseAdmin
      .from('email_sessions')
      .select('*')
      .eq('reply_address', replyAddress)
      .single()

    if (!session) {
      console.log('No session for reply address:', replyAddress)
      return NextResponse.json({ received: true })
    }

    // 2. Extract reply text (strip quoted content)
    const replyText = extractReplyText(rawText)
    if (!replyText || replyText.length < 5) {
      return NextResponse.json({ received: true })
    }

    const contributorName  = parseNameFromEmail(from)
    const contributorEmail = parseEmailAddress(from)

    // 3. Claude parses the reply
    let parsed: {
      people_mentioned?: string[]
      year_estimate?: string | null
      location_mentioned?: string | null
      story_extracted?: string
      legacy_note?: string | null
    } = {}

    try {
      const aiResponse = await anthropic.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 500,
        system: `You parse family archive replies about photographs. Extract structured information from conversational text. Return ONLY valid JSON. No other text.`,
        messages: [{
          role:    'user',
          content: `Parse this reply about a family photograph:\n\n"${replyText}"\n\nReturn JSON:\n{\n  "people_mentioned": ["name1"],\n  "year_estimate": "1962" or null,\n  "location_mentioned": "place" or null,\n  "story_extracted": "the core memory in their words",\n  "legacy_note": "what they want remembered" or null\n}`,
        }],
      })

      const content = aiResponse.content[0]
      if (content.type === 'text') parsed = JSON.parse(content.text)
    } catch {
      parsed = { story_extracted: replyText }
    }

    // 4. Save reply
    await supabaseAdmin.from('email_replies').insert({
      session_id:         session.id,
      archive_id:         session.archive_id,
      photograph_id:      session.photograph_id,
      contributor_email:  contributorEmail,
      contributor_name:   contributorName,
      raw_reply:          replyText,
      people_mentioned:   parsed.people_mentioned ?? [],
      year_estimate:      parsed.year_estimate ?? null,
      location_mentioned: parsed.location_mentioned ?? null,
      story_extracted:    parsed.story_extracted ?? null,
      legacy_note:        parsed.legacy_note ?? null,
      ai_parsed:          true,
    })

    // 5. Save to labels
    await supabaseAdmin.from('labels').insert({
      photograph_id:     session.photograph_id,
      archive_id:        session.archive_id,
      labelled_by:       contributorName || contributorEmail,
      what_was_happening: parsed.story_extracted ?? replyText,
      legacy_note:       parsed.legacy_note ?? null,
      year_taken:        parsed.year_estimate ? parseInt(parsed.year_estimate) || null : null,
      location:          parsed.location_mentioned ?? null,
      people_tagged:     parsed.people_mentioned ?? [],
      is_primary_label:  false,
      essence_feed_status: 'pending',
    })

    // 6. Mark photograph labelled
    await supabaseAdmin
      .from('photographs')
      .update({ status: 'labelled' })
      .eq('id', session.photograph_id)

    // 7. Increment session reply count
    const newCount = (session.reply_count ?? 0) + 1
    await supabaseAdmin
      .from('email_sessions')
      .update({ reply_count: newCount })
      .eq('id', session.id)

    // 8. Send confirmation
    const { data: archive } = await supabaseAdmin
      .from('archives')
      .select('name')
      .eq('id', session.archive_id)
      .single()

    await resend.emails.send({
      from:    `${archive?.name ?? 'The Archive'} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
      to:      contributorEmail,
      subject: `Your memory has been saved · ${archive?.name ?? 'The Archive'}`,
      headers: {
        'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
        'X-Entity-Ref-ID':  `basalith-${session.archive_id}-${Date.now()}`,
        'Precedence':       'bulk',
      },
      html:    buildConfirmationEmail(
        archive?.name ?? 'The Archive',
        contributorName,
        replyText,
        newCount,
      ),
    })

    return NextResponse.json({ success: true })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('receive-reply error:', msg)
    // Always 200 to email provider so they don't retry
    return NextResponse.json({ received: true })
  }
}
