/**
 * Emails sent when an archive completes its Founding Sequence (all three
 * founding calls). Two messages: one to the depositor, one internal.
 *
 * Copy rules (enforced): no em dashes, American English, short declarative
 * sentences, no invented numbers or mechanisms, no selling with "AI". The
 * depositor email promises exactly one thing, a reply within 48 hours to set
 * up the first read, which is the same commitment the site already makes on
 * /apply, /faq, and /contact. It does not describe a coverage map, a proof
 * card, or anything else that has not shipped to the owner surface yet.
 */

export type FoundingCompleteInput = {
  archiveName: string
  ownerName:   string | null
  ownerEmail:  string | null
  deposits:    number
  voiceTurns:  number
  scope:       'personal' | 'business'
}

export type BuiltEmail = { subject: string; html: string; text: string }

const SITE = 'https://basalith.ai'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function buildFoundingCompleteOwnerEmail(input: FoundingCompleteInput): BuiltEmail {
  const first = input.ownerName?.split(' ')[0] ?? null
  const greeting = first ? `${esc(first)},` : 'Hello,'
  const what = input.scope === 'business'
    ? 'Three of the hardest calls you made running the business are now in your archive, in your own words.'
    : 'Three of the hardest calls you ever made are now in your archive, in your own words.'
  const count = `${input.deposits} ${input.deposits === 1 ? 'deposit' : 'deposits'}`

  const subject = `Your Founding Sequence is complete. The ${input.archiveName}.`

  const text = [
    greeting,
    '',
    what,
    `${count} in total. Nothing you said was rewritten.`,
    '',
    'We read every word ourselves. Within 48 hours we will be in touch to set up your first read: a short video call to walk through what your archive holds, where it is still thin, and what comes next.',
    '',
    'Your archive keeps growing from here. The dashboard has your next question whenever you are ready.',
    `${SITE}/archive/dashboard`,
    '',
    'Basalith',
    'Heritage Nexus Inc.',
  ].join('\n')

  const html = `
<div style="background:#0A0908;padding:40px 20px;font-family:Georgia,serif;color:#F0EDE6">
  <div style="max-width:560px;margin:0 auto">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;margin:0 0 28px;text-transform:uppercase">Basalith</p>
    <p style="font-size:16px;font-weight:300;line-height:1.8;margin:0 0 16px">${greeting}</p>
    <p style="font-size:16px;font-weight:300;line-height:1.8;margin:0 0 16px;color:#B8B4AB">${what}</p>
    <p style="font-size:16px;font-weight:300;line-height:1.8;margin:0 0 24px;color:#B8B4AB">${count} in total. Nothing you said was rewritten.</p>
    <div style="border-left:2px solid rgba(196,162,74,0.5);padding:4px 0 4px 18px;margin:0 0 24px">
      <p style="font-size:16px;font-weight:300;line-height:1.8;margin:0;color:#F0EDE6">We read every word ourselves. Within 48 hours we will be in touch to set up your first read: a short video call to walk through what your archive holds, where it is still thin, and what comes next.</p>
    </div>
    <p style="font-size:15px;font-weight:300;line-height:1.8;margin:0 0 8px;color:#B8B4AB">Your archive keeps growing from here. The dashboard has your next question whenever you are ready.</p>
    <p style="margin:0 0 32px"><a href="${SITE}/archive/dashboard" style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;color:#C4A24A;text-decoration:none;text-transform:uppercase">Open your archive</a></p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#706C65;margin:0">Basalith · Heritage Nexus Inc.</p>
  </div>
</div>`.trim()

  return { subject, html, text }
}

export function buildFoundingCompleteInternalEmail(input: FoundingCompleteInput): BuiltEmail {
  const owner = `${input.ownerName ?? 'Unknown owner'}${input.ownerEmail ? ` <${input.ownerEmail}>` : ''}`
  const subject = `Founding Sequence complete: ${input.archiveName}`
  const lines = [
    `Archive: ${input.archiveName}`,
    `Owner: ${owner}`,
    `Scope: ${input.scope}`,
    `Deposits across the three calls: ${input.deposits}`,
    `Turns answered by voice: ${input.voiceTurns}`,
    '',
    'The owner was told to expect a reply within 48 hours to set up the first read.',
    'Read the deposits before the call.',
  ]
  const text = lines.join('\n')
  const html = `<pre style="font-family:'Courier New',monospace;font-size:13px;line-height:1.7;color:#1A1814">${esc(text)}</pre>`
  return { subject, html, text }
}
