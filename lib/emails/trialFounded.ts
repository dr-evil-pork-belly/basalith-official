/**
 * The welcome a trial owner gets when their payment founds the record they
 * already have. Sent by provisionOnFoundingFee through
 * lib/billing/convertTrial.ts. Slice C, October 9, 2026.
 *
 * It is not lib/emails/foundingWelcome.ts. That one greets a person whose
 * Basalith was just created and tells them the Founding has not started. This
 * person has already done at least one call and seen the proof, so this email
 * says what is on the record and what comes after it.
 *
 * Copy rules (enforced by the test): no em dash, no exclamation point, no
 * hyphenated word, American English, short declarative sentences, the word
 * "archive" never rendered. Every number is read from the record at send time
 * (ConvertProgress). Nothing here promises a call, a date, or a person.
 *
 * No password, no Guide, no "complete" (skeleton section 6, approved September
 * 17, 2026). No one time sign in link either: the person is signed in when
 * they pay, and a link that works once would be dead by the time most people
 * read this. The email names the sign in page.
 *
 * Same dark register as every other transactional email. They move to the
 * recut together (docs/DESIGN_RECUT_2026-09-28.md, left for later).
 */

export type TrialFoundedInput = {
  familyName:     string
  ownerName:      string | null
  deposits:       number
  callsCompleted: number
  nextCall:       1 | 2 | 3 | null
  siteUrl?:       string
}

export type BuiltEmail = { subject: string; html: string; text: string }

export const TRIAL_FOUNDED_SUBJECT = 'Your Basalith is founded.'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function trialFoundedLines(input: TrialFoundedInput): {
  eyebrow: string; heading: string; opened: string; holds: string | null
  next: string; nextUrl: string; nextLabel: string; open: string; signIn: string; footer: string
} {
  const site   = input.siteUrl ?? 'https://basalith.ai'
  const first  = input.ownerName?.trim().split(/\s+/)[0] || null
  const family = input.familyName
  const done   = input.nextCall === null

  const count = `${input.deposits} ${input.deposits === 1 ? 'deposit' : 'deposits'}`
  const holds = input.deposits > 0
    ? (done
        ? `It holds ${count}, in your own words. All three founding calls are on the record.`
        : input.callsCompleted > 0
          ? `It holds ${count}, in your own words, from ${input.callsCompleted} of the three founding calls.`
          : `It holds ${count}, in your own words.`)
    : null

  return {
    eyebrow:   `THE ${family.toUpperCase()} BASALITH`,
    heading:   first ? `Your Basalith is founded, ${first}.` : 'Your Basalith is founded.',
    opened:    `Your payment went through. The ${family} Basalith is held in your name, and everything you have said so far is in it.`,
    holds,
    next:      done ? 'Your next question is on your dashboard.' : `Call ${input.nextCall} is ready when you are.`,
    nextUrl:   done ? `${site}/archive/dashboard` : `${site}/archive/founding`,
    nextLabel: done ? 'Open your Basalith' : `Begin call ${input.nextCall}`,
    open:      'You can now invite the people who know you and add your photographs.',
    signIn:    `To come back, sign in at ${site}/archive-login with this email address. We will send you a sign in link.`,
    footer:    `The ${family} Basalith`,
  }
}

export function buildTrialFoundedEmail(input: TrialFoundedInput): BuiltEmail {
  const l = trialFoundedLines(input)

  const text = [
    l.eyebrow,
    '',
    l.heading,
    '',
    l.opened,
    ...(l.holds ? ['', l.holds] : []),
    '',
    l.next,
    l.nextUrl,
    '',
    l.open,
    '',
    l.signIn,
    '',
    'BASALITH',
    l.footer,
    'Human Augmentation Technologies Corp.',
  ].join('\n')

  const p = (s: string, margin = '0 0 20px', size = 15) =>
    `<p style="font-size:${size}px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:${margin}">${esc(s)}</p>`

  const html = `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:32px">
  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;text-transform:uppercase;margin:0 0 16px">
    ${esc(l.eyebrow)}
  </p>
  <h1 style="font-size:26px;font-weight:300;color:#F0EDE6;margin:0 0 16px">
    ${esc(l.heading)}
  </h1>
  ${p(l.opened)}
  ${l.holds ? p(l.holds) : ''}
  <div style="background:rgba(196,162,74,0.08);border:1px solid rgba(196,162,74,0.3);border-top:3px solid rgba(196,162,74,0.8);padding:24px;margin:0 0 24px">
    <p style="font-size:15px;font-weight:300;color:#F0EDE6;line-height:1.8;margin:0 0 14px">${esc(l.next)}</p>
    <a href="${esc(l.nextUrl)}" style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;color:#C4A24A;text-decoration:none;text-transform:uppercase">${esc(l.nextLabel)}</a>
  </div>
  ${p(l.open, '0 0 20px', 14)}
  ${p(l.signIn, '0 0 24px', 14)}
  <hr style="border:none;border-top:1px solid rgba(240,237,230,0.06);margin:24px 0">
  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;color:#8B9196;line-height:1.8;margin:0">
    BASALITH<br>${esc(l.footer)}<br>Human Augmentation Technologies Corp.
  </p>
</body>
</html>`

  return { subject: TRIAL_FOUNDED_SUBJECT, html, text }
}

/** Every string the owner might read, for the copy rule test. */
export function allTrialFoundedCopy(): string[] {
  const out: string[] = [TRIAL_FOUNDED_SUBJECT]
  const cases: TrialFoundedInput[] = [
    { familyName: 'Chen', ownerName: 'Margaret Chen', deposits: 12, callsCompleted: 1, nextCall: 2 },
    { familyName: 'Chen', ownerName: null,            deposits: 1,  callsCompleted: 0, nextCall: 1 },
    { familyName: 'Chen', ownerName: 'Margaret',      deposits: 0,  callsCompleted: 0, nextCall: 1 },
    { familyName: 'Chen', ownerName: 'Margaret Chen', deposits: 41, callsCompleted: 3, nextCall: null },
  ]
  for (const c of cases) {
    const l = trialFoundedLines(c)
    out.push(l.eyebrow, l.heading, l.opened, l.next, l.nextLabel, l.open, l.signIn, l.footer)
    if (l.holds) out.push(l.holds)
  }
  return out
}
