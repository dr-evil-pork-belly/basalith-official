import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'
import { classifyDeposit } from '@/lib/classifyDeposit'
import { triggerMemoryChain } from '@/lib/memoryChain'

export const dynamic = 'force-dynamic'

// ── Strip quoted reply text ───────────────────────────────────────────────────

function extractReplyBody(rawText: string, htmlBody?: string): string {
  // Remove zero-width / invisible chars Gmail sometimes injects
  let text = (rawText ?? '').replace(/[​-‍﻿]/g, '').trim()

  // HTML fallback when plain text is absent or empty
  if (!text && htmlBody) {
    text = htmlBody
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  if (!text) return ''

  // Gmail multiline quote header spans 2-3 lines:
  //   On Sat, May 23, 2026 at 11:37 PM
  //   Archive Name <archive@basalith.xyz>
  //   wrote:
  // Match lazily across up to 300 chars so we don't overshoot into body.
  const gmailPattern = /\r?\nOn [\s\S]{5,300}?wrote:\r?\n/
  const gmailParts   = text.split(gmailPattern)
  if (gmailParts[0].trim().length > 0) {
    return gmailParts[0].trim()
  }

  // Fallback: line-by-line for other email clients
  const lines: string[] = []
  for (const line of text.split('\n')) {
    if (line.trimStart().startsWith('>')) break
    if (/^On .+ wrote:/.test(line))       break
    if (line.includes('-----Original Message-----')) break
    if (line.includes('________________________________')) break
    lines.push(line)
  }
  return lines.join('\n').trim()
}

function parseEmailAddress(from: string): string {
  const m = from.match(/<([^>]+)>/)
  return m ? m[1] : from.trim()
}

function parseDisplayName(from: string): string {
  const m = from.match(/^([^<]+)</)
  return m ? m[1].trim() : ''
}

// ── Confirmation email ────────────────────────────────────────────────────────

function buildConfirmationEmail(archiveName: string, firstName: string): string {
  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:32px">
  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 20px">${archiveName.toUpperCase()}</p>
  <p style="font-family:Georgia,serif;font-size:18px;font-style:italic;color:#F0EDE6;line-height:1.6;margin:0 0 12px">
    Thank you${firstName ? ', ' + firstName : ''}.
  </p>
  <p style="font-family:Georgia,serif;font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 24px">
    Your memory has been added to the archive.
  </p>
  <hr style="border:none;border-top:1px solid rgba(240,237,230,0.06);margin:0 0 20px">
  <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;line-height:1.8;margin:0">
    BASALITH · XYZ<br>${archiveName}
  </p>
</body>
</html>`
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    // Resend wraps the email fields under body.data in their inbound webhook v2.
    // Fall back to body directly for any older or test payloads.
    const email = body.data ?? body

    // Normalise to/from: Resend may send strings, arrays of strings, or arrays
    // of objects ({ email, name }) depending on webhook version.
    function extractAddress(raw: unknown): string {
      const first = Array.isArray(raw) ? raw[0] : raw
      if (typeof first === 'object' && first !== null) {
        return (first as Record<string, string>).email ?? ''
      }
      return String(first ?? '')
    }

    const to   = extractAddress(email.to)
    const from = extractAddress(email.from)

    // Some inbound webhook payloads carry only an email_id with no body content.
    // When that happens, fetch the full email from the Resend API.
    let emailText: string = email.text ?? email.plain_text ?? ''
    let emailHtml: string = email.html ?? ''
    if (!emailText && !emailHtml && email.email_id) {
      const resendRes   = await fetch(
        `https://api.resend.com/emails/receiving/${email.email_id}`,
        { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } },
      )
      const resendEmail = await resendRes.json()
      console.log('[inbound] receiving API response:', JSON.stringify(resendEmail).substring(0, 500))
      emailText = resendEmail.text ?? resendEmail.plain_text ?? resendEmail.body ?? resendEmail.content ?? ''
      emailHtml = resendEmail.html ?? ''
    }

    const rawText = emailText

    // Log raw shape so Vercel shows exactly what Resend is sending
    console.log('[inbound] received — to:', to, 'from:', from,
      'to_type:', Array.isArray(email.to) ? `array[${email.to.length}] of ${typeof email.to[0]}` : typeof email.to,
      'text_len:', rawText.length, 'html_len:', emailHtml.length,
      'via_data_wrapper:', body.data != null)

    console.log('[inbound] text_preview:', rawText.substring(0, 150))

    const replyText = extractReplyBody(rawText, emailHtml)

    console.log('[inbound] extracted:', replyText.substring(0, 150), 'len:', replyText.length)

    if (!replyText || replyText.length < 2) {
      console.log('[inbound] empty reply — skipping')
      return NextResponse.json({ ok: true, skipped: 'empty reply' })
    }

    // ── Route 1: Token-based session (spark / story_prompt) ──────────────────
    const tokenMatch = to.match(/reply\+([a-f0-9]+)@/)
    if (tokenMatch) {
      const token = tokenMatch[1]

      const { data: session } = await supabaseAdmin
        .from('email_reply_sessions')
        .select('*, archives(id, name, owner_name, preferred_language), contributors(id, name, email)')
        .eq('token', token)
        .maybeSingle()

      if (!session) {
        console.log('[inbound] unknown token:', token)
        return NextResponse.json({ ok: true, skipped: 'unknown token' })
      }

      if (session.replied) {
        console.log('[inbound] already replied:', token)
        return NextResponse.json({ ok: true, skipped: 'already replied' })
      }

      const archiveId     = session.archive_id
      const contributorId = session.contributor_id
      const archive       = session.archives as { id: string; name: string; owner_name: string | null; preferred_language: string | null } | null
      const contributor   = session.contributors as { id: string; name: string; email: string } | null

      if (contributorId) {
        console.log('[inbound] contributor reply — contributor:', contributorId, 'archive:', archiveId)
      }

      // Save the reply
      if (session.email_type === 'contributor_question') {
        if (session.prompt_id) {
          const { error: cqError } = await supabaseAdmin
            .from('contributor_questions')
            .update({ status: 'answered' })
            .eq('id', session.prompt_id)
            .eq('status', 'pending')
          if (cqError) console.error('[inbound] contributor_question update failed:', cqError.message)
          else console.log('[inbound] contributor_question answered — id:', session.prompt_id)
        }
      } else if (session.email_type === 'spark') {
        const { error: sparkError } = await supabaseAdmin.from('daily_spark_responses').insert({
          archive_id:     archiveId,
          contributor_id: contributorId,
          spark_id:       session.spark_id ?? 'unknown',
          spark_text:     session.spark_id ?? '',
          response_text:  replyText,
          response_type:  'text',
          is_owner:       !contributorId,
        })
        if (sparkError) console.error('[inbound] spark save failed:', sparkError.message)
      } else if (session.email_type === 'story_prompt') {
        if (!contributorId || !session.prompt_id) {
          console.error('[inbound] missing contributorId or prompt_id — cannot update story prompt', {
            contributorId,
            promptId: session.prompt_id,
          })
        } else {
          const { error: promptError } = await supabaseAdmin
            .from('contributor_story_prompts')
            .update({ answered: true, answer_text: replyText, answered_at: new Date().toISOString() })
            .eq('archive_id', archiveId)
            .eq('contributor_id', contributorId)
            .eq('prompt_id', session.prompt_id)
            .eq('answered', false)
          if (promptError) {
            console.error('[inbound] story prompt update failed:', promptError.message)
          } else {
            console.log('[inbound] story prompt answered')
          }
        }
      } else if (session.email_type === 'photograph') {
        const photographId = session.photograph_id as string | null
        if (!photographId) {
          console.error('[inbound] photograph session missing photograph_id:', session.id)
        } else {
          const senderName = parseDisplayName(from) || (contributor?.name ?? parseEmailAddress(from))
          const { error: labelErr } = await supabaseAdmin.from('labels').insert({
            archive_id:         archiveId,
            photograph_id:      photographId,
            what_was_happening: replyText,
            labelled_by:        senderName,
            created_at:         new Date().toISOString(),
          })
          if (labelErr) {
            console.error('[inbound] photograph label insert:', labelErr.message)
          } else {
            console.log('[inbound] photograph labeled via email reply, photo:', photographId)
          }
        }
      }

      // Log owner replies explicitly. 'mirror' replies (the weekly "keep going"
      // thread) need no special casing: they fall through to the generic
      // owner_deposits save + training pair below, exactly like owner_daily.
      if (session.email_type === 'owner_daily' || session.email_type === 'owner_weekly' || session.email_type === 'conversational' || session.email_type === 'mirror') {
        console.log('[inbound] owner reply received — type:', session.email_type, 'archive:', archiveId.substring(0, 8))
      }

      // Pre-Echo conversational prompts are tagged distinctly so the onboarding
      // path is trackable. They still flow through owner_deposits and the
      // training pipeline below exactly like any other owner reply.
      const depositSourceType = session.email_type === 'conversational'
        ? 'conversational'
        : 'email_reply'

      // Always save to owner_deposits — no reply is ever lost even if the
      // type-specific save above failed or the session had null IDs
      const { data: deposit, error: depositError } = await supabaseAdmin
        .from('owner_deposits')
        .insert({
          archive_id:     archiveId,
          prompt:         session.prompt_id || session.spark_id || 'Email reply',
          response:       replyText,
          source_type:    depositSourceType,
          contributor_id: contributorId ?? null,
        })
        .select('id, archive_id, prompt, response, source_type')
        .single()
      if (depositError) console.error('[inbound] deposit save failed:', depositError.message)
      else console.log('[inbound] owner_deposits saved — id:', deposit?.id?.substring(0, 8))

      // Elicitation engine: mark the most recent unanswered served question for
      // this archive as answered by this deposit. Owner replies only.
      if (deposit && !contributorId) {
        const historyCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
        const { data: historyRow } = await supabaseAdmin
          .from('question_history')
          .select('id')
          .eq('archive_id', archiveId)
          .is('answered_deposit_id', null)
          .gte('served_at', historyCutoff)
          .order('served_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (historyRow) {
          const { error: historyError } = await supabaseAdmin
            .from('question_history')
            .update({ answered_deposit_id: deposit.id, answered_at: new Date().toISOString() })
            .eq('id', historyRow.id)
          if (historyError) console.error('[inbound] question_history update failed:', historyError.message)
          else console.log('[inbound] question_history answered — id:', historyRow.id)
        }
      }

      // Domain classification — owner deposits only, fire-and-forget
      if (deposit && !contributorId) {
        void classifyDeposit({ depositId: deposit.id, archiveId, text: replyText })
      }

      // Training pair
      if (deposit && archive) {
        createTrainingPairFromDeposit(
          deposit,
          archive.owner_name ?? '',
          archive.name ?? '',
          archive.preferred_language ?? 'en',
          contributorId ? 'contributor' : 'owner',
        ).catch(() => {})
      }

      // Memory chain — only for contributor replies (owner has no contributor row)
      if (replyText.length > 50 && archiveId && contributorId && archive) {
        const promptText = session.email_type === 'spark'
          ? (session.spark_id ?? 'a spark question')
          : (session.prompt_id ?? 'a story prompt')
        triggerMemoryChain(archiveId, contributorId, promptText, replyText, archive.owner_name ?? '').catch(() => {})
      }

      // Mark session replied
      await supabaseAdmin
        .from('email_reply_sessions')
        .update({ replied: true, replied_at: new Date().toISOString() })
        .eq('token', token)

      // Confirmation email
      const senderEmail = parseEmailAddress(from)
      const senderName  = parseDisplayName(from) || contributor?.name || ''
      const firstName   = senderName.split(' ')[0]
      if (senderEmail && archive) {
        resend.emails.send({
          from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
          to:      senderEmail,
          subject: `Your memory has been saved · ${archive.name}`,
          html:    buildConfirmationEmail(archive.name, firstName),
          headers: { 'X-Entity-Ref-ID': `basalith-confirm-${archiveId}-${Date.now()}` },
        }).catch(() => {})
      }

      console.log('[inbound] saved spark/prompt reply — type:', session.email_type, 'token:', token)
      return NextResponse.json({ ok: true, saved: session.email_type })
    }

    // ── Route 2: Legacy photo-reply pattern (existing email_sessions) ─────────
    const { data: emailSession } = await supabaseAdmin
      .from('email_sessions')
      .select('id, archive_id, photograph_id, recipients')
      .eq('reply_address', to.toLowerCase())
      .maybeSingle()

    if (emailSession) {
      // Forward to existing receive-reply handler logic
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.ai'
      await fetch(`${siteUrl}/api/archive/receive-reply`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ from, to, text: rawText }),
      })
      return NextResponse.json({ ok: true, forwarded: 'receive-reply' })
    }

    console.log('[inbound] no matching session for:', to)
    return NextResponse.json({ ok: true, skipped: 'no matching session' })

  } catch (err) {
    console.error('[inbound] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
