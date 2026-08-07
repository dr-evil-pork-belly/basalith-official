import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'
import { classifyDeposit } from '@/lib/classifyDeposit'
import { triggerMemoryChain } from '@/lib/memoryChain'
import { resolveReplySession } from '@/lib/emailReplySessions'
import { sendReplyExpiredNotice } from '@/lib/emails/replyExpired'
import { ingestPhotoReply } from '@/lib/photoReplyIngest'
import { verifyResendWebhook, resendUnauthorized } from '@/lib/resendSignature'
import { fetchReceivedEmail } from '@/lib/receivedEmail'

export const dynamic = 'force-dynamic'

/**
 * The verified inbound payload.
 *
 * Resend has shipped several shapes of this event: fields at the top level or
 * wrapped under `data`, addresses as strings, arrays of strings, or arrays of
 * `{ email, name }`. The normalisers below absorb that, so the type stays as
 * loose as the wire format actually is. What makes the payload safe to read is
 * that its signature verified, not that it was typed.
 */
type InboundEmail = {
  to?:         unknown
  from?:       unknown
  text?:       string
  plain_text?: string
  html?:       string
  email_id?:   string
  data?:       InboundEmail
}

/**
 * The single response returned for every token that does not resolve to a live
 * session: unknown, expired, or already used. Byte-identical in all three cases,
 * so nothing about which one occurred leaves the handler.
 *
 * An expired token is told apart from an unknown one only internally, and only
 * so the courtesy notice can go to an address already on file. See
 * lib/emails/replyExpired.ts for why that is not an oracle.
 */
function rejectToken() {
  return NextResponse.json({ ok: true, skipped: 'unknown token' })
}

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
  // Signature first, before anything else in this file runs. Not a parse, not a
  // token lookup, not a read. The reply token in the To address says who may
  // write; the Svix signature says the request came from Resend at all. Without
  // this the token was the whole of the auth and could be replayed straight at
  // the route. See lib/resendSignature.ts.
  const verified = await verifyResendWebhook(req)
  if (!verified.ok) return resendUnauthorized('inbound', verified.reason)

  try {
    const body = verified.payload as InboundEmail

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

    // A real inbound webhook carries no body, only an email_id, so this fetch is
    // the only route to what the family wrote. Test payloads that inline the
    // text skip it. See lib/receivedEmail.ts.
    let emailText: string = email.text ?? email.plain_text ?? ''
    let emailHtml: string = email.html ?? ''
    if (!emailText && !emailHtml && email.email_id) {
      const fetched = await fetchReceivedEmail(email.email_id)

      // A FAILED FETCH IS NOT AN EMPTY REPLY. It used to be indistinguishable
      // from one: the old guessing chain degraded a Resend error envelope to '',
      // which fell into the empty-reply skip below and answered 200. Resend
      // treats 200 as delivered and never retries, so a family's memory was
      // discarded permanently with nothing but a log line to show for it.
      //
      // Know what the 500 buys. It makes the failure loud, not recoverable. The
      // signature check that runs before this code enforces a five minute Svix
      // timestamp tolerance, so most of Resend's ladder (5m, 30m, 2h, 5h, 10h)
      // will be refused as stale on the way back in. That is accepted, and it is
      // still strictly better than a 200 that guarantees silent loss. Do not
      // widen the tolerance to compensate. See lib/resendSignature.ts.
      if (!fetched.ok) {
        console.error('[inbound] receiving API fetch failed, returning 500 — email_id:',
          email.email_id, 'reason:', fetched.reason)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
      }

      emailText = fetched.text
      emailHtml = fetched.html

      // Lengths only. The previous line here logged up to 500 characters of the
      // raw response, which for a successful fetch is the family's own words
      // sitting in the Vercel log.
      console.log('[inbound] receiving API ok — text_len:', emailText.length,
        'html_len:', emailHtml.length)
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

      const resolved = await resolveReplySession(token)

      // A database failure is not an unknown token. It used to arrive here as
      // `session = null` and be reported as a bogus token, which silently
      // discarded a real family reply. Return 500 so the failure is visible and
      // Resend retries, rather than swallowing a memory.
      if (resolved.status === 'error') {
        console.error('[inbound]', resolved.message)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
      }

      if (resolved.status === 'unknown') {
        console.log('[inbound] unknown token:', token)
        return rejectToken()
      }

      if (resolved.status === 'expired') {
        const s = resolved.session
        console.log('[inbound] expired token:', token,
          'archive:', String(s.archive_id).substring(0, 8),
          'created:', s.created_at, 'expired:', s.expires_at)

        // The write is refused. Separately, and only if this sender is already
        // on file for the archive, tell them their words were not lost.
        const senderEmail = parseEmailAddress(from)
        const notice = await sendReplyExpiredNotice({
          archiveId:   s.archive_id,
          senderEmail,
          replyText,
          siteUrl:     process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.ai',
        })
        console.log('[inbound] expired-token notice:',
          notice.sent ? `sent to on-file address` : `not sent (${notice.reason}${notice.detail ? ': ' + notice.detail : ''})`)

        return rejectToken()
      }

      if (resolved.status === 'replied') {
        console.log('[inbound] already replied:', token)
        return rejectToken()
      }

      const session       = resolved.session
      const archiveId     = session.archive_id
      const contributorId = session.contributor_id
      const archive       = session.archives ?? null
      const contributor   = session.contributors ?? null

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
      // owner_deposits is the permanent fallback for every email path, so when
      // it fails nothing else caught the reply. The code used to log that and
      // carry on, which meant the token below was marked replied (burning its
      // single use forever) and the family was emailed "Your memory has been
      // saved" with nothing saved. The comment above states the intent; this is
      // it implemented.
      //
      // Leave the token live, send no confirmation, and let Resend see a
      // failure. Same tolerance caveat as the fetch above: this makes the
      // failure loud, not reliably recoverable.
      //
      // FLAGGED, not fixed here: the type-specific writes further up (spark,
      // label) already ran and are not idempotent, so a retry that does verify
      // could duplicate one of those rows. A duplicate row is a far smaller harm
      // than a lost memory, and moving the deposit insert above that block would
      // change the sibling-write ordering, which is out of scope for this change.
      if (depositError || !deposit) {
        console.error('[inbound] deposit save failed, token left live and no confirmation sent:',
          depositError?.message ?? 'insert returned no row')
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
      }
      console.log('[inbound] owner_deposits saved — id:', deposit.id.substring(0, 8))

      // Elicitation engine: attach this deposit to the question it answers.
      // Owner replies only. A contributor reply is not an answer to the owner's
      // question and must never link.
      //
      // Preferred path: the session carries the question_history row the email
      // served, so we update that exact row. Fallback: sessions created before
      // question_history_id existed carry no id, so they keep the old heuristic
      // (most recent unanswered serve within 14 days), which is a guess and is
      // wrong whenever a reply arrives out of order. Those sessions are already
      // in flight and must still resolve, so the fallback is annotated, not
      // deleted. It warns so the two cases are distinguishable in the logs.
      if (!contributorId) {
        const servedHistoryId = session.question_history_id as number | null

        let targetHistoryId: number | null = servedHistoryId

        if (targetHistoryId === null) {
          console.warn(
            '[inbound] no question_history_id on session — falling back to the 14-day heuristic. token:',
            token,
          )
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

          targetHistoryId = historyRow?.id ?? null
        }

        if (targetHistoryId !== null) {
          const { error: historyError } = await supabaseAdmin
            .from('question_history')
            .update({ answered_deposit_id: deposit.id, answered_at: new Date().toISOString() })
            .eq('id', targetHistoryId)
          if (historyError) console.error('[inbound] question_history update failed:', historyError.message)
          else console.log('[inbound] question_history answered — id:', targetHistoryId,
            'via:', servedHistoryId !== null ? 'session_id' : 'heuristic')
        }
      }

      // Domain classification — owner deposits only, fire-and-forget
      if (!contributorId) {
        void classifyDeposit({ depositId: deposit.id, archiveId, text: replyText })
      }

      // Training pair
      if (archive) {
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

      // Mark session replied. The deposit is already saved, so this cannot fail
      // the request, but it is the whole of the single-use guard: if it does not
      // land the token stays live and can be redeemed again. Surface it.
      const { error: markErr } = await supabaseAdmin
        .from('email_reply_sessions')
        .update({ replied: true, replied_at: new Date().toISOString() })
        .eq('token', token)
      if (markErr) {
        console.error('[inbound] token not marked replied, it remains redeemable:', markErr.message)
      }

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
    // Called directly. This used to be an HTTP fetch to our own public
    // /api/archive/receive-reply, which is now deleted. See lib/photoReplyIngest.ts
    // for why. ingestPhotoReply enforces email_sessions.reply_window_closes on
    // entry, which nothing on this path has ever done.
    const photo = await ingestPhotoReply({ from, replyAddress: to.toLowerCase(), rawText })

    if (photo.status === 'error') {
      console.error('[inbound] photo reply ingest failed:', photo.message)
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }

    if (photo.status === 'expired') {
      console.log('[inbound] photo reply past its window — address:', to,
        'closed:', photo.windowClosedAt)

      const senderEmail = parseEmailAddress(from)
      const notice = await sendReplyExpiredNotice({
        archiveId:   photo.archiveId,
        senderEmail,
        replyText,
        siteUrl:     process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.ai',
      })
      console.log('[inbound] expired-window notice:',
        notice.sent ? 'sent to on-file address' : `not sent (${notice.reason})`)

      // Same uniform shape as an unmatched address.
      return NextResponse.json({ ok: true, skipped: 'no matching session' })
    }

    if (photo.status === 'saved') {
      console.log('[inbound] photo reply saved — reply:', photo.replyId, 'count:', photo.replyCount)
      return NextResponse.json({ ok: true, saved: 'photo_reply' })
    }

    // unknown_address and empty_reply both land here and are reported the same.
    console.log('[inbound] no matching session for:', to, `(${photo.status})`)
    return NextResponse.json({ ok: true, skipped: 'no matching session' })

  } catch (err) {
    console.error('[inbound] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
