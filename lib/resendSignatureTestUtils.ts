/**
 * Signs a body the way Resend does, for tests and for the live probe script.
 *
 * This is the sender half of lib/resendSignature.ts. It exists so a test can
 * drive the real handler through the real verifier instead of stubbing it out.
 * A test that mocks the verifier proves nothing about the verifier.
 *
 * Not imported by any route. Nothing in this file runs in production.
 */
import { Webhook } from 'svix'

export type SvixHeaders = {
  'svix-id':        string
  'svix-timestamp': string
  'svix-signature': string
}

/**
 * Build the three headers Resend sends for `body` under `secret`.
 *
 * `at` moves the timestamp, which is how the replay tests reach outside svix's
 * five minute tolerance. `id` is the message id, stable across Resend's retries
 * of the same message.
 */
export function signResendPayload(
  body:   string,
  secret: string,
  opts:   { id?: string; at?: Date } = {},
): SvixHeaders {
  const id = opts.id ?? 'msg_basalith_test'
  const at = opts.at ?? new Date()
  return {
    'svix-id':        id,
    'svix-timestamp': String(Math.floor(at.getTime() / 1000)),
    'svix-signature': new Webhook(secret).sign(id, at, body),
  }
}
