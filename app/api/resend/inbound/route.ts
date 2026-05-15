import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'
import { triggerMemoryChain } from '@/lib/memoryChain'

export const dynamic = 'force-dynamic'

// ── Strip quoted reply text ───────────────────────────────────────────────────

function extractReplyBody(text: string): string {
  const lines: string[] = []
  for (const line of text.split('\n')) {
    if (line.startsWith('>')) break
    if (/^On .+ wrote:/.test(line)) break
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

    const to      = Array.isArray(body.to)   ? body.to[0]   : (body.to   ?? '')
    const from    = Array.isArray(body.from) ? body.from[0] : (body.from ?? '')
    const rawText = body.text ?? body.plain_text ?? ''
    const replyText = extractReplyBody(rawText)

    if (!replyText || replyText.length < 3) {
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

      // Save the reply
      if (session.email_type === 'spark') {
        await supabaseAdmin.from('daily_spark_responses').insert({
          archive_id:     archiveId,
          contributor_id: contributorId,
          spark_id:       session.spark_id ?? 'unknown',
          spark_text:     session.spark_id ?? '',
          response_text:  replyText,
          response_type:  'text',
          is_owner:       !contributorId,
        })
      } else if (session.email_type === 'story_prompt') {
        await supabaseAdmin
          .from('contributor_story_prompts')
          .update({ answered: true, answer_text: replyText, answered_at: new Date().toISOString() })
          .eq('archive_id', archiveId)
          .eq('contributor_id', contributorId ?? '')
          .eq('prompt_id', session.prompt_id ?? '')
          .eq('answered', false)
      }

      // Save as owner_deposit (entity training)
      const { data: deposit } = await supabaseAdmin
        .from('owner_deposits')
        .insert({
          archive_id:  archiveId,
          prompt:      session.email_type === 'spark' ? 'Spark reply' : 'Story prompt reply',
          response:    replyText,
          source_type: session.email_type === 'spark' ? 'contributor' : 'contributor',
        })
        .select('id, archive_id, prompt, response, source_type')
        .single()

      // Training pair
      if (deposit && archive) {
        createTrainingPairFromDeposit(
          deposit,
          archive.owner_name ?? '',
          archive.name ?? '',
          archive.preferred_language ?? 'en',
          'contributor',
        ).catch(() => {})
      }

      // Memory chain for substantial replies
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
    const toAddress = to.toLowerCase().split('@')[0]

    const { data: emailSession } = await supabaseAdmin
      .from('email_sessions')
      .select('id, archive_id, photograph_id, recipients')
      .eq('reply_address', to.toLowerCase())
      .maybeSingle()

    if (emailSession) {
      // Forward to existing receive-reply handler logic
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
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
