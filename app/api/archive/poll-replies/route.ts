import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase-admin'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const resend    = new Resend(process.env.RESEND_API_KEY)
const anthropic = new Anthropic()

// ── Resend REST helpers ────────────────────────────────────────────────────────
// The SDK does not support inbound/receiving endpoints yet — use REST directly.

async function fetchReceivedEmails() {
  const url = 'https://api.resend.com/emails/receiving?limit=50'

  console.log('Fetching received emails from:', url)

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type':  'application/json',
    },
  })

  console.log('Resend API status:', response.status)

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Resend API error:', response.status, errorText)
    return []
  }

  const data = await response.json()
  console.log('Resend API response keys:', Object.keys(data))
  console.log('Email count:', data?.data?.length ?? 0)

  return (data?.data ?? data ?? []) as unknown[]
}

async function fetchEmailById(id: string) {
  const response = await fetch(`https://api.resend.com/emails/${id}`, {
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type':  'application/json',
    },
  })
  if (!response.ok) return null
  return response.json() as Promise<{ text?: string; html?: string; from?: string | { email?: string; name?: string } }>
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function extractReplyText(text: string): string {
  if (!text) return ''
  const lines      = text.split('\n')
  const replyLines: string[] = []
  for (const line of lines) {
    if (line.startsWith('>')) break
    if (line.includes('wrote:') && line.includes('On ')) break
    if (line.includes('-----Original')) break
    if (line.includes('____________________')) break
    replyLines.push(line)
  }
  return replyLines.join('\n').trim()
}

// ── POST handler ───────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const isFromCron = authHeader === `Bearer ${process.env.CRON_SECRET}`

    let isManual = false
    try {
      const body = await req.json()
      isManual   = body.manual === true
    } catch { /* no body — fine */ }

    if (!isFromCron && !isManual) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get active email sessions — build a reply-address lookup map
    const { data: sessions } = await supabaseAdmin
      .from('email_sessions')
      .select('*, archives(name, family_name)')
      .gt('reply_window_closes', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(20)

    if (!sessions?.length) {
      return NextResponse.json({ processed: 0, message: 'No active email sessions found' })
    }

    // Normalise keys to lowercase for case-insensitive matching
    const sessionMap: Record<string, typeof sessions[number]> = {}
    for (const session of sessions) {
      if (session.reply_address) {
        sessionMap[session.reply_address.toLowerCase()] = session
      }
    }

    console.log('Active session addresses:', Object.keys(sessionMap))

    // Fetch all emails from Resend
    const receivedEmails = await fetchReceivedEmails()

    if (!receivedEmails.length) {
      return NextResponse.json({ processed: 0, message: 'No emails found in Resend' })
    }

    let processed    = 0
    const errors: string[] = []

    for (const emailRaw of receivedEmails) {
      const email = emailRaw as {
        id?: string; email_id?: string
        to?: string | string[] | Array<{ email?: string }>
        from?: string | { email?: string; name?: string }
        subject?: string
        text?: string; html?: string
      }

      try {
        console.log('Processing email:', {
          id:      email.id ?? email.email_id,
          to:      email.to,
          from:    email.from,
          subject: email.subject,
        })

        // Match To address to an active session
        // Handle "Name <email>" display-name format and object shapes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toAddresses = (Array.isArray(email.to) ? email.to : [email.to]).map((addr: any) => {
          if (!addr) return ''
          const str = typeof addr === 'object'
            ? (addr.email ?? addr.address ?? '')
            : String(addr)
          const match = str.match(/<([^>]+)>/)
          return match ? match[1].toLowerCase() : str.toLowerCase().trim()
        }).filter(Boolean)

        let matchedSession: typeof sessions[number] | null = null
        let matchedAddress: string | null = null

        for (const toAddr of toAddresses) {
          if (sessionMap[toAddr]) {
            matchedSession  = sessionMap[toAddr]
            matchedAddress  = toAddr
            break
          }
        }

        console.log('Normalized to addresses:', toAddresses)
        console.log('Session keys:', Object.keys(sessionMap))
        console.log('Match found:', !!matchedSession)

        if (!matchedSession) {
          console.log('No session match for to:', toAddresses)
          continue
        }

        const emailId = email.id ?? email.email_id
        if (!emailId) continue

        // Idempotency check
        const { data: existing } = await supabaseAdmin
          .from('email_replies')
          .select('id')
          .eq('resend_email_id', emailId)
          .maybeSingle()

        if (existing) continue

        // Fetch full content
        const fullEmail = await fetchEmailById(emailId)

        const rawText: string = fullEmail?.text
          || fullEmail?.html?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
          || (email.text ?? '')

        const replyText = extractReplyText(rawText)
        if (!replyText || replyText.length < 3) continue

        // Resolve sender
        const fromRaw = email.from ?? fullEmail?.from ?? ''
        const fromEmail: string = typeof fromRaw === 'object' && fromRaw !== null
          ? (fromRaw as { email?: string }).email ?? ''
          : String(fromRaw).match(/<([^>]+)>/)?.[1] ?? String(fromRaw)
        const fromName: string = typeof fromRaw === 'object' && fromRaw !== null
          ? (fromRaw as { name?: string }).name ?? ''
          : String(fromRaw).match(/^([^<]+)</)?.[1]?.trim() ?? ''

        // Claude parsing
        let parsed: {
          people_mentioned?: string[]
          year_estimate?: string | null
          location_mentioned?: string | null
          story_extracted?: string
          legacy_note?: string | null
        } = { story_extracted: replyText }

        try {
          const parseResponse = await anthropic.messages.create({
            model:      'claude-sonnet-4-6',
            max_tokens: 400,
            system:     'Extract structured info from a family photo reply. Return ONLY valid JSON, nothing else.',
            messages: [{
              role:    'user',
              content: `Reply about a family photograph:\n"${replyText}"\n\nReturn JSON only:\n{\n  "people_mentioned": [],\n  "year_estimate": null,\n  "location_mentioned": null,\n  "story_extracted": "the memory in their words",\n  "legacy_note": null\n}`,
            }],
          })
          const content = parseResponse.content[0]
          if (content.type === 'text') parsed = JSON.parse(content.text)
        } catch {
          console.log('Claude parse failed, using raw text')
        }

        // Save reply
        await supabaseAdmin.from('email_replies').insert({
          session_id:         matchedSession.id,
          archive_id:         matchedSession.archive_id,
          photograph_id:      matchedSession.photograph_id,
          contributor_email:  fromEmail,
          contributor_name:   fromName,
          raw_reply:          replyText,
          people_mentioned:   parsed.people_mentioned ?? [],
          year_estimate:      parsed.year_estimate ?? null,
          location_mentioned: parsed.location_mentioned ?? null,
          story_extracted:    parsed.story_extracted ?? null,
          legacy_note:        parsed.legacy_note ?? null,
          ai_parsed:          true,
          resend_email_id:    emailId,
        })

        // Save to labels
        const { data: savedLabel } = await supabaseAdmin.from('labels').insert({
          photograph_id:      matchedSession.photograph_id,
          archive_id:         matchedSession.archive_id,
          labelled_by:        fromName || fromEmail,
          what_was_happening: parsed.story_extracted ?? replyText,
          legacy_note:        parsed.legacy_note ?? null,
          people_tagged:      parsed.people_mentioned ?? [],
          is_primary_label:   false,
          essence_feed_status: 'pending',
        }).select('id').single()

        // Trigger contribution alert to archive owner
        if (savedLabel?.id) {
          try {
            const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://basalith.xyz'
            await fetch(`${siteUrl}/api/archive/contribution-alert`, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({
                archiveId: matchedSession.archive_id,
                labelId:   savedLabel.id,
              }),
            })
          } catch {
            // Non-fatal — label already saved
          }
        }

        // Increment session reply count
        await supabaseAdmin
          .from('email_sessions')
          .update({ reply_count: (matchedSession.reply_count ?? 0) + 1 })
          .eq('id', matchedSession.id)

        // Send confirmation
        if (fromEmail) {
          const archiveName = (matchedSession.archives as { name?: string } | null)?.name ?? 'The Archive'
          const firstName   = fromName.split(' ')[0]

          await resend.emails.send({
            from:    `${archiveName} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
            to:      fromEmail,
            subject: `Your memory has been saved · ${archiveName}`,
            headers: {
              'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
              'X-Entity-Ref-ID':  `basalith-${matchedSession.archive_id}-${Date.now()}`,
              'Precedence':       'bulk',
            },
            html: `<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:32px">
  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;color:#C4A24A;text-transform:uppercase">${archiveName}</p>
  <p style="font-size:18px;font-style:italic;color:#F0EDE6;line-height:1.6">Thank you${firstName ? ', ' + firstName : ''}.</p>
  <p style="font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8">Your memory has been added to ${archiveName} permanently.</p>
  <blockquote style="border-left:2px solid rgba(196,162,74,0.4);padding-left:16px;margin:16px 0;font-style:italic;color:#706C65;font-size:14px">"${replyText.substring(0, 200)}${replyText.length > 200 ? '…' : ''}"</blockquote>
  <hr style="border:none;border-top:1px solid rgba(240,237,230,0.06);margin:24px 0">
  <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;line-height:1.8">BASALITH · XYZ<br>${archiveName} · Generation I</p>
</body>`,
          })
        }

        processed++

      } catch (emailErr: unknown) {
        const msg = emailErr instanceof Error ? emailErr.message : 'Unknown error'
        console.error('Error processing email:', msg)
        errors.push(msg)
      }
    }

    return NextResponse.json({
      processed,
      total:           receivedEmails.length,
      sessionsChecked: sessions.length,
      errors:          errors.length ? errors : undefined,
      message:         processed > 0
        ? `Saved ${processed} new ${processed === 1 ? 'reply' : 'replies'} to the archive`
        : 'No new replies found',
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Poll replies error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
