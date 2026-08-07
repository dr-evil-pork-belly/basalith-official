/**
 * Resend inbound webhook signature verification.
 *
 * Resend signs webhooks with Svix. Three headers carry the proof: `svix-id`,
 * `svix-timestamp`, and `svix-signature`. The signed content is
 * `{id}.{timestamp}.{raw body}`, HMAC-SHA256 under the endpoint secret, base64,
 * prefixed `v1,`. The secret is a base64 string, conventionally `whsec_`-prefixed.
 *
 * WHY THIS EXISTS. /api/resend/inbound is a public POST that writes into family
 * archives. The reply token in the To address bounds who can write and for how
 * long, but it does not authenticate the caller. Anyone holding a live token
 * could POST directly with Resend never involved. This closes that.
 *
 * RAW BODY. The signature covers the exact bytes. The body is read as text and
 * handed to svix, which JSON.parses it only after the HMAC matches. Nothing in
 * the payload is interpreted before the signature is proven, so a forged body
 * never reaches a parser, a database read, or a write.
 *
 * FAIL CLOSED. An absent secret rejects. So does an unparseable one. The Twilio
 * verifier next door learned this the hard way: its predecessor returned true
 * when the token was missing, which meant unsetting one environment variable
 * silently reopened the route. Here there is no path that returns ok without a
 * matching signature.
 *
 * The secret is read inside the function, not at module scope, so it can be
 * removed at runtime and the route still fails closed rather than holding a
 * value captured at import.
 *
 * REPLAY WINDOW, and the tradeoff it forces. svix hard-codes a five minute
 * timestamp tolerance and exposes no way to widen it. Resend retries a non-200
 * at 5s, 5m, 30m, 2h, 5h, 10h. Whether Svix re-stamps `svix-timestamp` per
 * attempt is NOT CONFIRMED by Resend's or Svix's published docs. If it does not,
 * only the first delivery and the 5s retry land inside the window and every
 * later retry is refused as stale. That is accepted: a five minute replay window
 * on a route that writes to an archive is worth more than a retry ladder we have
 * never needed. It is stated here so nobody later reads a stale-timestamp 401 in
 * the logs as a bug in this file.
 */
import { NextResponse } from 'next/server'
import { Webhook, WebhookVerificationError } from 'svix'

export type ResendRejection =
  | 'no_secret'
  | 'unusable_secret'
  | 'no_signature_headers'
  | 'unreadable_body'
  | 'bad_signature'
  | 'unparseable_payload'

export type ResendVerification =
  | { ok: true;  payload: unknown }
  | { ok: false; reason: ResendRejection }

/**
 * Verify the Svix signature over the raw request body.
 *
 * On success the decoded payload comes back with the verdict, because a request
 * body can only be read once and svix has already parsed it.
 */
export async function verifyResendWebhook(req: Request): Promise<ResendVerification> {
  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET
  if (!secret) return { ok: false, reason: 'no_secret' }

  const id        = req.headers.get('svix-id')
  const timestamp = req.headers.get('svix-timestamp')
  const signature = req.headers.get('svix-signature')
  if (!id || !timestamp || !signature) return { ok: false, reason: 'no_signature_headers' }

  let webhook: Webhook
  try {
    // Throws on an empty secret and on one that is not valid base64. A secret we
    // cannot use is a secret we do not have.
    webhook = new Webhook(secret)
  } catch {
    return { ok: false, reason: 'unusable_secret' }
  }

  let raw: string
  try {
    raw = await req.text()
  } catch {
    return { ok: false, reason: 'unreadable_body' }
  }

  try {
    const payload = webhook.verify(raw, {
      'svix-id':        id,
      'svix-timestamp': timestamp,
      'svix-signature': signature,
    })
    if (payload === null || typeof payload !== 'object') {
      return { ok: false, reason: 'unparseable_payload' }
    }
    return { ok: true, payload }
  } catch (err) {
    // Bad HMAC, missing header, stale or future timestamp all arrive as
    // WebhookVerificationError. Anything else is a signed body that is not JSON,
    // which Resend does not send.
    return {
      ok:     false,
      reason: err instanceof WebhookVerificationError ? 'bad_signature' : 'unparseable_payload',
    }
  }
}

/**
 * The rejection. One status, one body, for every reason.
 *
 * The reason is logged and never returned. A caller learns only that it was not
 * accepted, not whether the secret is unset, the headers are absent, the HMAC is
 * wrong, or the timestamp is stale.
 *
 * 401 rather than 200. A silent 200 would hide a wrong or missing secret behind
 * a green dashboard while every real family reply was dropped. A non-200 makes
 * the misconfiguration loud: Resend retries, marks the message failed, and
 * disables an endpoint that keeps failing. That alarm is the point.
 */
export function resendUnauthorized(route: string, reason: ResendRejection): NextResponse {
  console.error(`[${route}] REJECTED, ${reason}`)
  return new NextResponse('Unauthorized', {
    status:  401,
    headers: { 'Content-Type': 'text/plain' },
  })
}
