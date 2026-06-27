/**
 * Founding welcome email for the paid Stripe flow. Sent by Inngest
 * provisionOnFoundingFee after a founder's combined founding + subscription
 * charge succeeds and the archive is provisioned.
 *
 * Copy rules (enforced): no em dashes, American English, short declarative
 * sentences, "Legacy Guide" never "Archivist", no invented numbers, timelines,
 * or mechanisms, and no selling with "AI". The email states what the customer
 * bought and what happens next. It promises nothing that is not real.
 */

export type FoundingWelcomeInput = {
  familyName:   string
  firstName:    string
  guideName:    string | null
  tierLabel:    string
  magicLinkUrl: string | null
  password:     string
  loginUrl:     string
}

export type BuiltEmail = { subject: string; html: string; text: string }

export function buildFoundingWelcomeEmail(input: FoundingWelcomeInput): BuiltEmail {
  const { familyName, firstName, magicLinkUrl, password, loginUrl } = input
  const guideName = input.guideName ?? 'Your Legacy Guide'

  const subject = `Your Basalith archive is active. The ${familyName} Archive.`

  const accessBlockHtml = magicLinkUrl
    ? `
  <div style="background:rgba(196,162,74,0.08);border:1px solid rgba(196,162,74,0.3);border-top:3px solid rgba(196,162,74,0.8);padding:24px;margin:0 0 24px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;margin:0 0 12px;text-transform:uppercase">
      Your Personal Archive Link
    </p>
    <p style="font-size:14px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 12px">
      Use the link below to enter your archive. No password is required.
    </p>
    <a href="${magicLinkUrl}"
      style="display:inline-block;font-family:'Courier New',monospace;font-size:11px;color:#C4A24A;word-break:break-all;margin:0 0 10px">
      ${magicLinkUrl}
    </a>
    <p style="font-size:12px;font-style:italic;color:#706C65;margin:0;line-height:1.7">
      Save this link. It is your entry to the archive.
    </p>
  </div>
  <div style="background:rgba(196,162,74,0.04);border:1px solid rgba(196,162,74,0.12);padding:20px;margin:0 0 24px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;margin:0 0 12px;text-transform:uppercase">
      Password Login
    </p>
    <p style="font-size:13px;color:#B8B4AB;margin:0 0 6px"><strong style="color:#F0EDE6">Address:</strong> ${loginUrl}</p>
    <p style="font-size:13px;color:#B8B4AB;margin:0"><strong style="color:#F0EDE6">Password:</strong> ${password}</p>
  </div>`
    : `
  <div style="background:rgba(196,162,74,0.04);border:1px solid rgba(196,162,74,0.15);padding:24px;margin:0 0 24px">
    <p style="font-size:14px;color:#B8B4AB;line-height:1.8;margin:0 0 8px">
      Sign in any time at <strong style="color:#F0EDE6">${loginUrl}</strong> with this email address. We will send you a sign-in link.
    </p>
    <p style="font-size:13px;color:#B8B4AB;margin:0"><strong style="color:#F0EDE6">Password:</strong> ${password}</p>
  </div>`

  const html = `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:32px">
  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;text-transform:uppercase;margin:0 0 16px">
    THE ${familyName.toUpperCase()} ARCHIVE
  </p>
  <h1 style="font-size:26px;font-weight:300;color:#F0EDE6;margin:0 0 16px">
    Welcome to Basalith, ${firstName}.
  </h1>
  <p style="font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 20px">
    Your founding is complete. The ${familyName} Archive is now active.
  </p>
  <p style="font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 24px">
    ${guideName} will contact you to begin. Your archive is private and held in your name.
  </p>

  ${accessBlockHtml}

  <p style="font-size:14px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 24px">
    When you are ready, you can enter the archive and start adding your photographs and records. There is no rush. Your Legacy Guide will walk you through the first steps.
  </p>
  <hr style="border:none;border-top:1px solid rgba(240,237,230,0.06);margin:24px 0">
  <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;line-height:1.8;margin:0">
    BASALITH<br>The ${familyName} Archive · Generation I<br>Heritage Nexus Inc.
  </p>
</body>
</html>`

  const accessTextLines = magicLinkUrl
    ? [
        'Your personal archive link (no password required):',
        magicLinkUrl,
        '',
        `Password login: ${loginUrl}`,
        `Password: ${password}`,
      ]
    : [
        `Sign in at ${loginUrl} with this email address. We will send you a sign-in link.`,
        `Password: ${password}`,
      ]

  const text = [
    `THE ${familyName.toUpperCase()} ARCHIVE`,
    '',
    `Welcome to Basalith, ${firstName}.`,
    '',
    `Your founding is complete. The ${familyName} Archive is now active.`,
    '',
    `${guideName} will contact you to begin. Your archive is private and held in your name.`,
    '',
    ...accessTextLines,
    '',
    'When you are ready, you can enter the archive and start adding your photographs and records. There is no rush. Your Legacy Guide will walk you through the first steps.',
    '',
    'BASALITH',
    `The ${familyName} Archive · Generation I`,
    'Heritage Nexus Inc.',
  ].join('\n')

  return { subject, html, text }
}
