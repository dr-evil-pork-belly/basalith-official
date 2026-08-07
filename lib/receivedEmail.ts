/**
 * Fetches the body of an inbound email from Resend.
 *
 * WHY THIS EXISTS AT ALL. The `email.received` webhook does not carry the
 * message body. Its payload is exactly:
 *
 *   ReceivedEmailEventData { email_id, created_at, from, to, bcc, cc,
 *                            message_id, subject, attachments }
 *
 * No text, no html. So for any real delivery this fetch is the only route to
 * the words the family actually wrote. It is not an optimisation and it is not
 * optional.
 *
 * WHY IT IS TYPED NOW. The previous implementation hand-rolled the request and
 * then guessed at the response:
 *
 *   resendEmail.text ?? resendEmail.plain_text ?? resendEmail.body ?? resendEmail.content ?? ''
 *
 * Two things were wrong with that. It silently degraded a Resend error envelope
 * to the empty string, because an error body has none of those four keys, which
 * is how a failed fetch came to look identical to an empty reply. And a future
 * error shape carrying `body` or `content` would have been ingested verbatim
 * and stored as somebody's memory. `resend.emails.receiving.get()` shipped in
 * resend@6.9.4 and returns `GetReceivingEmailResponseSuccess`, where `text` and
 * `html` are `string | null` and there is nothing to guess about.
 *
 * FAILURE IS NOT EMPTINESS. This returns `ok: false` for a failed fetch and
 * `ok: true` with two empty strings for an email that genuinely had no body.
 * The caller must treat those differently: the first is a 500, the second is a
 * skip. Collapsing them is the bug this file was written to remove.
 */
import { resend } from '@/lib/resend'

export type ReceivedEmailBody =
  | { ok: true;  text: string; html: string }
  | { ok: false; reason: string }

export async function fetchReceivedEmail(emailId: string): Promise<ReceivedEmailBody> {
  let res: Awaited<ReturnType<typeof resend.emails.receiving.get>>

  try {
    res = await resend.emails.receiving.get(emailId)
  } catch (err) {
    // The SDK returns an envelope for HTTP errors, so reaching here means the
    // request never completed: DNS, TLS, socket, or an unset RESEND_API_KEY.
    return { ok: false, reason: `request failed: ${err instanceof Error ? err.message : String(err)}` }
  }

  if (res.error) {
    const { name, statusCode, message } = res.error
    return { ok: false, reason: `${name} ${statusCode ?? 'no status'}: ${message}` }
  }

  if (!res.data) {
    // Not a shape the envelope is supposed to produce. Refuse it rather than
    // reading fields off null.
    return { ok: false, reason: 'response carried neither data nor error' }
  }

  return { ok: true, text: res.data.text ?? '', html: res.data.html ?? '' }
}
