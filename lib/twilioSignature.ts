/**
 * Twilio webhook signature verification. One pattern for every /api/twilio route.
 *
 * Twilio signs a request by HMAC-SHA1 over the exact URL it requested with the
 * sorted POST parameters appended, keyed on the account auth token. That means
 * the body has to be parsed before the signature can be checked. The order is
 * parse, verify, then act. The achievable property, and the one these routes
 * hold to, is that no database read, no download, no write, and no use of any
 * query parameter happens before verification passes.
 *
 * FAIL CLOSED. An absent TWILIO_AUTH_TOKEN rejects the request. The old
 * per-route validator returned true in that case, which meant unsetting one
 * environment variable silently turned a validating route into an open one. On
 * the route that hands out the <Record action> URL, that is the whole guard.
 * The token is set in production, so the bypass bought nothing there, and there
 * is no local Twilio traffic, so it bought nothing in development either.
 */
import { NextResponse, type NextRequest } from 'next/server'
import twilio from 'twilio'

export type TwilioRejection =
  | 'no_auth_token'
  | 'no_signature'
  | 'unreadable_body'
  | 'bad_signature'

export type TwilioVerification =
  | { ok: true;  params: Record<string, string> }
  | { ok: false; reason: TwilioRejection }

/**
 * The URL Twilio signed.
 *
 * Twilio signs the URL it actually requested, query string included. For the
 * voice route that is the number's configured webhook URL. For recording and
 * continue it is the <Record action> / <Gather action> URL, which this codebase
 * builds itself from NEXT_PUBLIC_SITE_URL, so rebuilding it from the same base
 * plus the incoming path and query reproduces it byte for byte.
 *
 * req.url is not usable directly. Behind Vercel the host on it is the internal
 * deployment host, not the public one Twilio called.
 */
export function twilioWebhookUrl(req: NextRequest): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.ai').replace(/\/+$/, '')
  const { pathname, search } = new URL(req.url)
  return `${base}${pathname}${search}`
}

/**
 * Parse the form body and verify the signature over it. On success the parsed
 * parameters come back with the verdict, because a request body can only be
 * read once and every caller needs them.
 */
export async function verifyTwilioRequest(req: NextRequest): Promise<TwilioVerification> {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) return { ok: false, reason: 'no_auth_token' }

  const signature = req.headers.get('X-Twilio-Signature')
  if (!signature) return { ok: false, reason: 'no_signature' }

  let params: Record<string, string>
  try {
    const formData = await req.formData()
    params = Object.fromEntries(
      [...formData.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : '']),
    )
  } catch {
    return { ok: false, reason: 'unreadable_body' }
  }

  if (!twilio.validateRequest(authToken, signature, twilioWebhookUrl(req), params)) {
    return { ok: false, reason: 'bad_signature' }
  }

  return { ok: true, params }
}

/**
 * The rejection. 403 with no TwiML on all three routes.
 *
 * TRADEOFF, stated so nobody softens it later. The voice route used to answer a
 * failed check with <Hangup/>, so a genuine caller hit by a validation bug heard
 * a clean goodbye. A 403 means they hear Twilio's own error message instead.
 * That is accepted: consistency and testability across the three routes are
 * worth more, and the correct response to a validation bug is to fix the bug,
 * not to make it sound better. A forged request never deserved TwiML either way.
 */
export function twilioForbidden(route: string, reason: TwilioRejection): NextResponse {
  console.error(`[${route}] REJECTED, ${reason}`)
  return new NextResponse('Forbidden', {
    status:  403,
    headers: { 'Content-Type': 'text/plain' },
  })
}
