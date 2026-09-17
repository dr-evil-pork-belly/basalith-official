/**
 * Internal notifications. One helper, one convention.
 *
 * Every watch-mode send the founder reads (trial started, call 1 complete,
 * founding complete, paid) goes from Basalith <davidha@basalith.xyz> to
 * mrdavidha@gmail.com plus ADMIN_EMAIL, deduplicated, for both scopes. This
 * is the convention the founding completion email already used in
 * app/api/archive/b2b-question/answer/route.ts; it moved here September 17,
 * 2026 so the next send is not a fourth copy of the same three lines.
 * /api/apply keeps its own routing (business to both, personal to
 * ADMIN_EMAIL only) and is not on this helper on purpose.
 *
 * Routes call this under after() from next/server. Inngest functions call it
 * plainly inside a step. It never throws to the caller: a failed send is
 * logged, because none of these emails is load bearing for the customer.
 *
 * No copy rules apply beyond no em dashes. No owner ever receives one.
 */

import { resend } from './resend'

export const INTERNAL_FROM = 'Basalith <davidha@basalith.xyz>'

export function internalRecipients(env: NodeJS.ProcessEnv = process.env): string[] {
  const admin = env.ADMIN_EMAIL ?? 'legacy@basalith.xyz'
  return Array.from(new Set(['mrdavidha@gmail.com', admin]))
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function notifyInternal(input: { subject: string; text: string; html?: string }): Promise<void> {
  const html = input.html ?? `<pre style="font-family:'Courier New',monospace;font-size:13px;line-height:1.7;color:#1A1814">${esc(input.text)}</pre>`
  try {
    await resend.emails.send({
      from:    INTERNAL_FROM,
      to:      internalRecipients(),
      subject: input.subject,
      html,
      text:    input.text,
    })
  } catch (err) {
    console.error('[internalNotify] send failed:', input.subject, err instanceof Error ? err.message : err)
  }
}
