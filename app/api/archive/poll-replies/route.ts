import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase-admin'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic()

function extractReplyText(text: string): string {
  const lines      = text.split('\n')
  const replyLines: string[] = []
  for (const line of lines) {
    if (line.startsWith('>')) break
    if (line.includes('wrote:') && line.includes('On ')) break
    if (line.includes('-----Original')) break
    if (line.includes('________________________________')) break
    replyLines.push(line)
  }
  return replyLines.join('\n').trim()
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const isFromCron = authHeader === `Bearer ${process.env.CRON_SECRET}`
    const body       = await req.json().catch(() => ({}))
    const isManual   = body.manual === true

    if (!isFromCron && !isManual) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    // Fetch received emails from Resend inbound API
    // Resend types don't yet include the receiving endpoints — cast to any
    const received = await (resend.emails as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)
      ['retrieveAll']({ limit: 50 })
      .catch(() => ({ data: [] }))

    const receivedAny = received as { data?: unknown[] } | null
    const emails: Array<{ id: string; from: string | { email?: string; name?: string }; to: string | string[]; text?: string; html?: string }> = (receivedAny?.data as Array<{ id: string; from: string | { email?: string; name?: string }; to: string | string[]; text?: string; html?: string }>) ?? []

    if (!emails.length) {
      return NextResponse.json({ processed: 0, total: 0, message: 'No new emails' })
    }

    let processed = 0

    for (const email of emails) {
      // Skip if already processed
      const { data: existing } = await supabaseAdmin
        .from('email_replies')
        .select('id')
        .eq('resend_email_id', email.id)
        .single()

      if (existing) continue

      // Resolve session from To address
      const toRaw       = Array.isArray(email.to) ? email.to[0] : email.to
      const toAddress   = typeof toRaw === 'object' && toRaw !== null
        ? (toRaw as { email?: string }).email ?? ''
        : String(toRaw ?? '')

      const { data: session } = await supabaseAdmin
        .from('email_sessions')
        .select('*, archives(*)')
        .eq('reply_address', toAddress)
        .single()

      if (!session) continue

      // Fetch full email content
      const fullEmail = await (resend.emails as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)
        ['retrieve'](email.id)
        .catch(() => null) as { text?: string; html?: string } | null

      const rawText: string = fullEmail?.text
        || fullEmail?.html?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        || ''

      if (!rawText || rawText.length < 5) continue

      const replyText = extractReplyText(rawText)
      if (!replyText) continue

      // Parse with Claude
      let parsed: {
        people_mentioned?: string[]
        year_estimate?: string | null
        location_mentioned?: string | null
        story_extracted?: string
        legacy_note?: string | null
      } = {}

      try {
        const parseResponse = await anthropic.messages.create({
          model:      'claude-sonnet-4-6',
          max_tokens: 500,
          system:     'Parse family archive replies. Return ONLY valid JSON.',
          messages: [{
            role:    'user',
            content: `Parse this reply about a family photograph:\n"${replyText}"\n\nReturn JSON:\n{\n  "people_mentioned": [],\n  "year_estimate": null,\n  "location_mentioned": null,\n  "story_extracted": "core memory",\n  "legacy_note": null\n}`,
          }],
        })
        const content = parseResponse.content[0]
        if (content.type === 'text') parsed = JSON.parse(content.text)
      } catch {
        parsed = { story_extracted: replyText }
      }

      const fromEmail: string = typeof email.from === 'object' && email.from !== null
        ? (email.from as { email?: string }).email ?? ''
        : String(email.from ?? '')
      const fromName: string = typeof email.from === 'object' && email.from !== null
        ? (email.from as { name?: string }).name ?? ''
        : ''

      // Save reply
      await supabaseAdmin.from('email_replies').insert({
        session_id:         session.id,
        archive_id:         session.archive_id,
        photograph_id:      session.photograph_id,
        contributor_email:  fromEmail,
        contributor_name:   fromName,
        raw_reply:          replyText,
        people_mentioned:   parsed.people_mentioned ?? [],
        year_estimate:      parsed.year_estimate ?? null,
        location_mentioned: parsed.location_mentioned ?? null,
        story_extracted:    parsed.story_extracted ?? null,
        legacy_note:        parsed.legacy_note ?? null,
        ai_parsed:          true,
        resend_email_id:    email.id,
      })

      // Save to labels
      await supabaseAdmin.from('labels').insert({
        photograph_id:      session.photograph_id,
        archive_id:         session.archive_id,
        labelled_by:        fromName || fromEmail,
        what_was_happening: parsed.story_extracted ?? replyText,
        legacy_note:        parsed.legacy_note ?? null,
        people_tagged:      parsed.people_mentioned ?? [],
        is_primary_label:   false,
        essence_feed_status: 'pending',
      })

      // Update session reply count
      await supabaseAdmin
        .from('email_sessions')
        .update({ reply_count: (session.reply_count ?? 0) + 1 })
        .eq('id', session.id)

      // Send confirmation
      const archiveName = (session.archives as { name?: string } | null)?.name ?? 'Basalith'
      await resend.emails.send({
        from:    `${archiveName} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
        to:      fromEmail,
        subject: `Your memory has been saved`,
        html:    `<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:32px">
  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;color:#C4A24A">${archiveName.toUpperCase()}</p>
  <p style="font-size:18px;font-style:italic;color:#F0EDE6;line-height:1.6">Thank you${fromName ? ', ' + fromName.split(' ')[0] : ''}.</p>
  <p style="font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8">Your memory has been added to the archive permanently.</p>
  <blockquote style="border-left:2px solid rgba(196,162,74,0.4);padding-left:16px;margin:16px 0;font-style:italic;color:#706C65;font-size:14px">"${replyText.substring(0, 200)}${replyText.length > 200 ? '…' : ''}"</blockquote>
  <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;line-height:1.8">BASALITH · XYZ</p>
</body>`,
      })

      processed++
    }

    return NextResponse.json({
      processed,
      total:   emails.length,
      message: `Processed ${processed} new ${processed === 1 ? 'reply' : 'replies'}`,
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Poll replies error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
