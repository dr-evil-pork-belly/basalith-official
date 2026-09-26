/**
 * Founding welcome email for the paid Stripe flow. Sent by Inngest
 * provisionOnFoundingFee after a founder's combined founding + subscription
 * charge succeeds and the archive is provisioned.
 *
 * Copy rules (enforced): no em dashes, American English, short declarative
 * sentences, no invented numbers, timelines,
 * or mechanisms, and no selling with "AI". The email states what the customer
 * bought and what happens next. It promises nothing that is not real.
 *
 * September 25, 2026 (docs/SUCCESSION_CHECKOUT_FIXES_2026-09-25.md):
 * - It no longer says "Your founding is complete." Payment opens the Basalith;
 *   the Founding (three calls, lib/foundingSequence.ts) has not started yet.
 * - It no longer prints a password. Password sign-in is retired
 *   (app/api/archive-login and app/api/archive/mobile-login answer 410), so the
 *   password it printed opened nothing and sat in an inbox in plain text.
 * - It no longer says to save the sign-in link as a permanent entry. A
 *   generated sign-in link works once and expires.
 * - It is succession-aware: a business owner reads about the business.
 */

export type FoundingWelcomeInput = {
  familyName:   string
  firstName:    string
  guideName:    string | null
  tierLabel:    string
  /** 'succession' or 'b2c'. Anything else reads as b2c. */
  segment:      string
  /**
   * True (the default) when this email follows a payment. The manual activation
   * shim (lib/billing/legacyActivation.ts) passes false: it also resumes paused
   * Basaliths and can run with no payment, so it says neither that a payment
   * went through nor that the Founding has not started.
   */
  paid?:        boolean
  magicLinkUrl: string | null
  loginUrl:     string
}

export type BuiltEmail = { subject: string; html: string; text: string }

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildFoundingWelcomeEmail(input: FoundingWelcomeInput): BuiltEmail {
  const { familyName, firstName, magicLinkUrl, loginUrl } = input
  const succession = input.segment === 'succession'
  // No Guide network (September 2026). The founder reads and runs every founding.
  const guideName = input.guideName ?? 'The founder of Basalith'
  const foundingUrl = loginUrl.replace(/\/archive-login\/?$/, '/archive/founding')

  const h = {
    family:  escapeHtml(familyName),
    first:   escapeHtml(firstName),
    guide:   escapeHtml(guideName),
    login:   escapeHtml(loginUrl),
    founding: escapeHtml(foundingUrl),
    link:    magicLinkUrl ? escapeHtml(magicLinkUrl) : null,
  }

  const subject = `The ${familyName} Basalith is open.`

  const paid = input.paid !== false
  const opened = paid
    ? `Your payment went through, and the ${familyName} Basalith is open. It is private and held in your name.`
    : `The ${familyName} Basalith is active. It is private and held in your name.`
  const calls = succession
    ? 'three conversations about the hardest calls you made running the business, in your own words'
    : 'three conversations about the hardest calls you ever made, in your own words'
  const founding = paid
    ? `The first step is the Founding: ${calls}. Begin whenever you are ready. There is no rush.`
    : `If you have not begun the Founding, it is the place to start: ${calls}. Begin whenever you are ready. There is no rush.`
  const extra = succession
    ? null
    : 'You can also start adding your photographs and records at any time.'
  const personal = `${guideName} will be in touch.`
  const linkNote = `This link works once and then expires. After that, sign in at ${loginUrl} with this email address and we will send you a new link.`
  const footerLine = succession
    ? `The ${familyName} Basalith`
    : `The ${familyName} Basalith · Generation I`

  const p = (text: string, margin = '0 0 20px', size = 15) =>
    `<p style="font-size:${size}px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:${margin}">${text}</p>`

  const accessBlockHtml = h.link
    ? `
  <div style="background:rgba(196,162,74,0.08);border:1px solid rgba(196,162,74,0.3);border-top:3px solid rgba(196,162,74,0.8);padding:24px;margin:0 0 24px">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;color:#C4A24A;margin:0 0 12px;text-transform:uppercase">
      Your sign-in link
    </p>
    <p style="font-size:14px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 12px">
      Use the link below to enter your Basalith. No password is required.
    </p>
    <a href="${h.link}"
      style="display:inline-block;font-family:'Courier New',monospace;font-size:11px;color:#C4A24A;word-break:break-all;margin:0 0 10px">
      ${h.link}
    </a>
    <p style="font-size:13px;color:#B8B4AB;margin:0;line-height:1.7">
      ${escapeHtml(linkNote)}
    </p>
  </div>`
    : `
  <div style="background:rgba(196,162,74,0.04);border:1px solid rgba(196,162,74,0.15);padding:24px;margin:0 0 24px">
    <p style="font-size:14px;color:#B8B4AB;line-height:1.8;margin:0">
      Sign in at <strong style="color:#F0EDE6">${h.login}</strong> with this email address. We will send you a sign-in link.
    </p>
  </div>`

  const html = `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:32px">
  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;text-transform:uppercase;margin:0 0 16px">
    THE ${h.family.toUpperCase()} BASALITH
  </p>
  <h1 style="font-size:26px;font-weight:300;color:#F0EDE6;margin:0 0 16px">
    Welcome to Basalith, ${h.first}.
  </h1>
  ${p(escapeHtml(opened))}

  ${accessBlockHtml}

  ${p(escapeHtml(founding), '0 0 12px', 14)}
  <p style="font-size:14px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 20px">
    Begin the Founding at <a href="${h.founding}" style="color:#C4A24A">${h.founding}</a>
  </p>
  ${extra ? p(escapeHtml(extra), '0 0 20px', 14) : ''}
  ${p(escapeHtml(personal), '0 0 24px', 14)}
  <hr style="border:none;border-top:1px solid rgba(240,237,230,0.06);margin:24px 0">
  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;color:#8B9196;line-height:1.8;margin:0">
    BASALITH<br>${escapeHtml(footerLine)}<br>Heritage Nexus Inc.
  </p>
</body>
</html>`

  const accessTextLines = magicLinkUrl
    ? ['Your sign-in link (no password required):', magicLinkUrl, linkNote]
    : [`Sign in at ${loginUrl} with this email address. We will send you a sign-in link.`]

  const text = [
    `THE ${familyName.toUpperCase()} BASALITH`,
    '',
    `Welcome to Basalith, ${firstName}.`,
    '',
    opened,
    '',
    ...accessTextLines,
    '',
    founding,
    `Begin the Founding at ${foundingUrl}`,
    '',
    ...(extra ? [extra, ''] : []),
    personal,
    '',
    'BASALITH',
    footerLine,
    'Heritage Nexus Inc.',
  ].join('\n')

  return { subject, html, text }
}
