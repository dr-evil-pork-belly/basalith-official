/**
 * Courtesy notice for a reply that arrived after its token expired.
 *
 * The security requirement and the human requirement pull in opposite
 * directions here, so they are separated onto different channels:
 *
 *   The webhook response is byte-identical for an expired token and an unknown
 *   one. Nothing about which case occurred leaves the handler. That response
 *   goes to Resend, not to a person, so keeping it uniform costs nothing.
 *
 *   The person is told on a separate channel, and only if we already know who
 *   they are. sendReplyExpiredNotice sends ONLY to an address already on file
 *   for that archive: the archive's owner_email, or a contributor's email on
 *   that same archive. It never replies to the inbound `from` header.
 *
 * That condition is what stops this becoming an oracle. Someone probing tokens
 * from an address we do not know gets silence and learns nothing. A real family
 * member replying from the address we already mail gets told, in their own
 * words, with a way to finish.
 *
 * Copy rules: no em dashes, no exclamation points, American English, short
 * declarative sentences, no grief framing, no invented mechanism. The register
 * is an estate attorney, not an app notification.
 */

import { supabaseAdmin } from '../supabase-admin'
import { resend } from '../resend'

export type BuiltEmail = { subject: string; html: string; text: string }

export function buildReplyExpiredEmail(input: {
  archiveName: string
  firstName:   string
  replyText:   string
  portalUrl:   string
}): BuiltEmail {
  const { archiveName, firstName, replyText, portalUrl } = input

  const subject = `We could not save that reply · ${archiveName}`

  const greeting = firstName ? `${firstName},` : 'Hello,'

  const text = [
    greeting,
    '',
    'Your reply reached us, but the link it came from had expired, so it was not added to the archive.',
    '',
    'Reply links stay active for 30 days. This one was older than that.',
    '',
    'Nothing you wrote is lost. Here it is, in full:',
    '',
    replyText,
    '',
    `You can add it to the archive here: ${portalUrl}`,
    '',
    'Copy the text above into the archive and it will be saved as though it arrived on time.',
    '',
    `BASALITH`,
    archiveName,
    'Heritage Nexus Inc.',
  ].join('\n')

  const html = `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">

  <div style="padding:32px 32px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">${escapeHtml(archiveName.toUpperCase())}</p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;margin:0">A REPLY WE COULD NOT SAVE</p>
  </div>

  <div style="padding:32px">
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 24px">${escapeHtml(greeting)}</p>

    <p style="font-family:Georgia,serif;font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 20px">
      Your reply reached us, but the link it came from had expired, so it was not added to the archive.
      Reply links stay active for 30 days. This one was older than that.
    </p>

    <p style="font-family:Georgia,serif;font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 12px">
      Nothing you wrote is lost. Here it is, in full.
    </p>

    <div style="padding:24px 28px;border-left:3px solid rgba(196,162,74,0.5);background:rgba(196,162,74,0.04);margin:0 0 28px">
      <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;color:#F0EDE6;line-height:1.8;margin:0;white-space:pre-wrap">${escapeHtml(replyText)}</p>
    </div>

    <p style="font-family:Georgia,serif;font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 24px">
      Copy the text above into the archive and it will be saved as though it arrived on time.
    </p>

    <a href="${portalUrl}" style="display:inline-block;background:#C4A24A;color:#0A0908;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-decoration:none;padding:14px 28px;border-radius:2px">
      OPEN THE ARCHIVE
    </a>
  </div>

  <div style="padding:16px 32px 32px;border-top:1px solid rgba(240,237,230,0.06);margin-top:8px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;line-height:1.8;margin:0">
      BASALITH · XYZ<br>${escapeHtml(archiveName)}<br>Heritage Nexus Inc.
    </p>
  </div>

</body>
</html>`

  return { subject, html, text }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type ExpiredNoticeOutcome =
  | { sent: true;  to: string }
  | { sent: false; reason: 'sender_not_on_file' | 'no_archive' | 'lookup_failed' | 'send_failed'; detail?: string }

/**
 * Send the courtesy notice, but only to an address already on file for this
 * archive. `senderEmail` is the address the late reply came from; it is used
 * ONLY to decide whether we recognise the sender, never as the destination.
 * The destination is the matching on-file address.
 */
export async function sendReplyExpiredNotice(input: {
  archiveId:   string
  senderEmail: string
  replyText:   string
  siteUrl:     string
}): Promise<ExpiredNoticeOutcome> {
  const { archiveId, replyText, siteUrl } = input
  const senderEmail = input.senderEmail.trim().toLowerCase()
  if (!senderEmail) return { sent: false, reason: 'sender_not_on_file' }

  const { data: archive, error: archiveErr } = await supabaseAdmin
    .from('archives')
    .select('id, name, owner_email, owner_name')
    .eq('id', archiveId)
    .maybeSingle()

  if (archiveErr) return { sent: false, reason: 'lookup_failed', detail: archiveErr.message }
  if (!archive)   return { sent: false, reason: 'no_archive' }

  const { data: contributors, error: contribErr } = await supabaseAdmin
    .from('contributors')
    .select('email, name')
    .eq('archive_id', archiveId)

  if (contribErr) return { sent: false, reason: 'lookup_failed', detail: contribErr.message }

  const ownerEmail = archive.owner_email?.trim().toLowerCase() ?? null

  let destination: string | null = null
  let firstName = ''

  if (ownerEmail && ownerEmail === senderEmail) {
    destination = archive.owner_email as string
    firstName   = archive.owner_name?.split(' ')[0] ?? ''
  } else {
    const match = (contributors ?? []).find(c => c.email?.trim().toLowerCase() === senderEmail)
    if (match?.email) {
      destination = match.email
      firstName   = match.name?.split(' ')[0] ?? ''
    }
  }

  // Sender is not anyone we mail for this archive. Say nothing at all.
  if (!destination) return { sent: false, reason: 'sender_not_on_file' }

  const built = buildReplyExpiredEmail({
    archiveName: archive.name,
    firstName,
    replyText,
    portalUrl:   `${siteUrl}/archive/deposit`,
  })

  try {
    await resend.emails.send({
      from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
      to:      destination,
      subject: built.subject,
      html:    built.html,
      text:    built.text,
      headers: {
        'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
        'X-Entity-Ref-ID':  `basalith-reply-expired-${archiveId}`,
        'Precedence':       'bulk',
      },
    })
    return { sent: true, to: destination }
  } catch (e) {
    return { sent: false, reason: 'send_failed', detail: e instanceof Error ? e.message : String(e) }
  }
}
