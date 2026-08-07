/**
 * Photograph reply ingest, for the legacy `email_sessions` path.
 *
 * This was app/api/archive/receive-reply/route.ts. It is a library function now,
 * and that route is deleted.
 *
 * WHY IT MOVED
 *
 * The route was a public, unauthenticated POST endpoint that ran a Sonnet call
 * and wrote email_replies, labels, photographs.status and email_sessions on
 * every request. Its only legitimate caller was our own server, doing an HTTP
 * round trip to itself from app/api/resend/inbound/route.ts.
 *
 * A Resend webhook did point at it, at https://basalith.xyz/api/archive/receive-reply.
 * Verified August 6, 2026: that URL returns 404, because basalith.xyz serves the
 * white paper repo and has no /api/archive/* at all. It had been delivering into
 * a 404 for four months. So Resend never actually reached this handler, which is
 * also why svix signature verification was the wrong fix: an internal forward
 * carries no svix headers and verification would have broken the only real
 * caller.
 *
 * Calling this directly removes the public surface entirely. Nothing external
 * called it and, per the 404 above, nothing external could.
 *
 * WHAT CHANGED BEYOND THE MOVE
 *
 * 1. reply_window_closes is enforced on entry. The column has always existed and
 *    send-photo:310 has always set it to 48 hours, and poll-replies:123 has always
 *    filtered on it. This handler never did. That is not theoretical: one reply in
 *    email_replies was written after its own session's window had closed.
 * 2. Every Supabase error is destructured and surfaced. The old code checked none
 *    of its four writes and returned HTTP 200 on every failure by design.
 */

import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from './supabase-admin'
import { resend } from './resend'

const anthropic = new Anthropic()

export type PhotoReplyIngestResult =
  | { status: 'saved';           replyId: string; archiveId: string; replyCount: number }
  | { status: 'unknown_address' }
  | { status: 'expired';         archiveId: string; windowClosedAt: string | null }
  | { status: 'empty_reply' }
  | { status: 'error';           message: string }

export function extractPhotoReplyText(text: string): string {
  const replyLines: string[] = []
  for (const line of (text ?? '').split('\n')) {
    if (line.startsWith('>')) break
    if (line.includes('wrote:') && line.includes('On ')) break
    if (line.includes('-----Original Message-----')) break
    replyLines.push(line)
  }
  return replyLines.join('\n').trim()
}

export function parseNameFromEmail(from: string): string {
  const match = from.match(/^([^<]+)</)
  return match ? match[1].trim() : ''
}

export function parseEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/)
  return match ? match[1] : (from ?? '').trim()
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
  <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;line-height:1.8">
    BASALITH · XYZ<br>${archiveName} · Generation I
  </p>
</body>
</html>`
}

export async function ingestPhotoReply(input: {
  from:         string
  replyAddress: string
  rawText:      string
  now?:         Date
}): Promise<PhotoReplyIngestResult> {
  const { from, replyAddress, rawText } = input
  const now = input.now ?? new Date()

  const { data: session, error: sessionErr } = await supabaseAdmin
    .from('email_sessions')
    .select('id, archive_id, photograph_id, reply_count, reply_window_closes, recipients')
    .eq('reply_address', replyAddress)
    .maybeSingle()

  // A read failure is not an unknown address. Surfacing it keeps a Postgres
  // error from being reported as a bogus reply address.
  if (sessionErr) return { status: 'error', message: `email_sessions read failed: ${sessionErr.message}` }
  if (!session)   return { status: 'unknown_address' }

  // Expiry, enforced here for the first time. A null window is treated as
  // closed rather than as unlimited: failing closed is the point.
  const closesAt = session.reply_window_closes ? new Date(session.reply_window_closes).getTime() : 0
  if (!Number.isFinite(closesAt) || closesAt <= now.getTime()) {
    return {
      status:         'expired',
      archiveId:      session.archive_id as string,
      windowClosedAt: (session.reply_window_closes as string | null) ?? null,
    }
  }

  const replyText = extractPhotoReplyText(rawText)
  if (!replyText || replyText.length < 5) return { status: 'empty_reply' }

  const contributorName  = parseNameFromEmail(from)
  const contributorEmail = parseEmailAddress(from)

  let parsed: {
    people_mentioned?:   string[]
    year_estimate?:      string | null
    location_mentioned?: string | null
    story_extracted?:    string
    legacy_note?:        string | null
  } = {}

  try {
    const aiResponse = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 500,
      system:     `You parse family archive replies about photographs. Extract structured information from conversational text. Return ONLY valid JSON. No other text.`,
      messages: [{
        role:    'user',
        content: `Parse this reply about a family photograph:\n\n"${replyText}"\n\nReturn JSON:\n{\n  "people_mentioned": ["name1"],\n  "year_estimate": "1962" or null,\n  "location_mentioned": "place" or null,\n  "story_extracted": "the core memory in their words",\n  "legacy_note": "what they want remembered" or null\n}`,
      }],
    })
    const content = aiResponse.content[0]
    if (content.type === 'text') parsed = JSON.parse(content.text)
  } catch {
    // Model or JSON failure is not fatal. The family's own words are the asset.
    parsed = { story_extracted: replyText }
  }

  const { data: savedReply, error: replyErr } = await supabaseAdmin
    .from('email_replies')
    .insert({
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
    .select('id')
    .single()

  // The reply itself is the record of the family's words. If it does not land,
  // nothing downstream should pretend it did.
  if (replyErr) return { status: 'error', message: `email_replies insert failed: ${replyErr.message}` }

  const { error: labelErr } = await supabaseAdmin.from('labels').insert({
    photograph_id:       session.photograph_id,
    archive_id:          session.archive_id,
    labelled_by:         contributorName || contributorEmail,
    what_was_happening:  parsed.story_extracted ?? replyText,
    legacy_note:         parsed.legacy_note ?? null,
    year_taken:          parsed.year_estimate ? parseInt(parsed.year_estimate) || null : null,
    location:            parsed.location_mentioned ?? null,
    people_tagged:       parsed.people_mentioned ?? [],
    is_primary_label:    false,
    essence_feed_status: 'pending',
  })
  if (labelErr) return { status: 'error', message: `labels insert failed: ${labelErr.message}` }

  if (session.photograph_id) {
    const { error: photoErr } = await supabaseAdmin
      .from('photographs')
      .update({ status: 'labelled' })
      .eq('id', session.photograph_id)
    if (photoErr) return { status: 'error', message: `photographs update failed: ${photoErr.message}` }
  }

  const newCount = (session.reply_count ?? 0) + 1
  const { error: countErr } = await supabaseAdmin
    .from('email_sessions')
    .update({ reply_count: newCount })
    .eq('id', session.id)
  if (countErr) return { status: 'error', message: `email_sessions reply_count update failed: ${countErr.message}` }

  const { data: archive, error: archiveErr } = await supabaseAdmin
    .from('archives')
    .select('name')
    .eq('id', session.archive_id)
    .maybeSingle()
  if (archiveErr) return { status: 'error', message: `archives read failed: ${archiveErr.message}` }

  const archiveName = archive?.name ?? 'The Archive'

  // The reply is already saved. A confirmation that fails to send is worth
  // logging, but it must not turn a successful save into a reported failure.
  try {
    await resend.emails.send({
      from:    `${archiveName} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
      to:      contributorEmail,
      subject: `Your memory has been saved · ${archiveName}`,
      headers: {
        'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
        'X-Entity-Ref-ID':  `basalith-${session.archive_id}-${savedReply.id}`,
      'Precedence':       'bulk',
      },
      html: buildConfirmationEmail(archiveName, contributorName, replyText, newCount),
    })
  } catch (e) {
    console.error('[photoReplyIngest] confirmation send failed:', e instanceof Error ? e.message : e)
  }

  return {
    status:     'saved',
    replyId:    savedReply.id as string,
    archiveId:  session.archive_id as string,
    replyCount: newCount,
  }
}
