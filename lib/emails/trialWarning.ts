/**
 * The day 23 trial warning. Sent once by trialWarn
 * (lib/inngest/trialFunctions.ts), seven days before a trial archive is
 * deleted. Copy is docs/SELF_SERVE_SKELETON_2026-09-17.md section 6 as
 * approved September 17, 2026, verbatim.
 *
 * Copy rules (enforced): no em dashes, no exclamation points, American
 * English, short declarative sentences, no invented numbers or mechanisms.
 * The date is the day the job will actually run (firstExpiryRunAfter), in
 * Pacific time, so the email says what happens.
 *
 * THE KEEP LINE. Slice C (trial to paid) is not live, so the keep line is a
 * reply: "Reply to this email and we will keep it open while you decide."
 * The caller sets replyTo to the address ADMIN_EMAIL resolves to, which the
 * founder reads. When slice C lands, this line becomes the Checkout button
 * and the reply-to can stay as a second path.
 *
 * THE EXPORT LINE. A real owner export exists: the button on
 * /archive/preferences posts /api/archive/export, which builds the zip in
 * the background and emails it. It does not refuse a trial. So the line
 * links there. If that surface ever goes away, remove the line rather than
 * point at a page that does not exist.
 *
 * English only in this slice; preferred_language is read by the cron and
 * not used here. Stated in the build doc's known limits.
 */

import { firstExpiryRunAfter, formatPacificDate } from '../trialExpiry'

export type TrialWarningInput = {
  archiveName: string
  ownerName: string | null
  deposits: number
  /** archives.trial_expires_at */
  expiresAt: Date
  siteUrl?: string
}

export type BuiltEmail = { subject: string; html: string; text: string }

export const TRIAL_WARNING_SUBJECT = 'Seven days left on your first call.'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function trialWarningLines(input: TrialWarningInput): { greeting: string; body: string; keep: string; export: string; exportUrl: string } {
  const site = input.siteUrl ?? 'https://basalith.ai'
  const first = input.ownerName?.split(' ')[0] ?? null
  const count = `${input.deposits} ${input.deposits === 1 ? 'deposit' : 'deposits'}`
  const date = formatPacificDate(firstExpiryRunAfter(input.expiresAt))
  return {
    greeting:  first ? `${first},` : 'Hello,',
    body:      `Your Basalith holds ${count} from your first call. It is deleted on ${date} unless you keep it.`,
    keep:      'Reply to this email and we will keep it open while you decide.',
    export:    'You can download everything in it from your Basalith settings.',
    exportUrl: `${site}/archive/preferences`,
  }
}

export function buildTrialWarningEmail(input: TrialWarningInput): BuiltEmail {
  const l = trialWarningLines(input)

  const text = [
    l.greeting,
    '',
    l.body,
    '',
    l.keep,
    '',
    l.export,
    l.exportUrl,
    '',
    'Basalith',
    'Heritage Nexus Inc.',
  ].join('\n')

  const html = `
<div style="background:#0A0908;padding:40px 20px;font-family:Georgia,serif;color:#F0EDE6">
  <div style="max-width:560px;margin:0 auto">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;margin:0 0 28px;text-transform:uppercase">Basalith</p>
    <p style="font-size:16px;font-weight:300;line-height:1.8;margin:0 0 16px">${esc(l.greeting)}</p>
    <p style="font-size:16px;font-weight:300;line-height:1.8;margin:0 0 24px;color:#B8B4AB">${esc(l.body)}</p>
    <div style="border-left:2px solid rgba(196,162,74,0.5);padding:4px 0 4px 18px;margin:0 0 24px">
      <p style="font-size:16px;font-weight:300;line-height:1.8;margin:0;color:#F0EDE6">${esc(l.keep)}</p>
    </div>
    <p style="font-size:15px;font-weight:300;line-height:1.8;margin:0 0 8px;color:#B8B4AB">${esc(l.export)}</p>
    <p style="margin:0 0 32px"><a href="${l.exportUrl}" style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;color:#C4A24A;text-decoration:none;text-transform:uppercase">Your Basalith settings</a></p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#706C65;margin:0">Basalith · Heritage Nexus Inc.</p>
  </div>
</div>`.trim()

  return { subject: TRIAL_WARNING_SUBJECT, html, text }
}

/** Every string the owner might see, for the copy-rule test. */
export function allTrialWarningCopy(): string[] {
  const l = trialWarningLines({ archiveName: 'Test Archive', ownerName: 'Test Person', deposits: 2, expiresAt: new Date('2026-10-18T03:31:00Z') })
  return [TRIAL_WARNING_SUBJECT, l.greeting, l.body, l.keep, l.export, 'Your Basalith settings']
}
