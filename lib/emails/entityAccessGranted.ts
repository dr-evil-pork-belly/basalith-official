/**
 * Sent to one contributor when the owner lets them ask the Basalith questions.
 * October 6, 2026. Record: docs/ENTITY_ACCESS_2026-10-06.md.
 *
 * Sent by POST /api/archive/entity-readiness, action 'grant', once, at the
 * moment access changes from closed to open for that person. A second grant
 * to someone who already has it sends nothing.
 *
 * Copy rules (enforced): no em dashes, no exclamation points, American
 * English, short declarative sentences, no hyphenated words, no "archive".
 * Every mechanism sentence is true of the grounded path, which is the only
 * path a contributor is answered on (lib/entityAccess.ts accessBlock):
 *
 *   "answers from what X has recorded"   the frozen layer is the owner's own
 *                                        pairs only (lib/familyEntity.ts)
 *   "where the record is silent, it      Control B replaces an unsupported
 *    says so"                            draft with the gap reply
 *   "your questions are saved"           entity_conversations, written by the
 *                                        route after every turn
 *
 * The link is the contributor's own portal link. It carries their token, as
 * the invitation email already does. Sign in by emailed code is a later slice.
 *
 * English only. The palette matches every other transactional email until the
 * email pass moves them all together.
 */

export type EntityAccessGrantedInput = {
  ownerName:       string
  contributorName: string | null
  portalUrl:       string
}

export type BuiltEmail = { subject: string; html: string; text: string }

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function firstNameOf(full: string | null | undefined): string | null {
  const t = (full ?? '').trim().split(/\s+/)[0]
  return t ? t : null
}

export const ENTITY_ACCESS_BUTTON = 'Ask a question'

export function entityAccessGrantedLines(input: EntityAccessGrantedInput): {
  subject: string; greeting: string; invite: string; how: string; saved: string; link: string
} {
  const ownerFirst = firstNameOf(input.ownerName) ?? 'The owner'
  const first      = firstNameOf(input.contributorName)
  return {
    subject:  `${ownerFirst} has opened their Basalith to you.`,
    greeting: first ? `${first},` : 'Hello,',
    invite:   `${ownerFirst} has invited you to ask their Basalith questions.`,
    how:      `It answers from what ${ownerFirst} has recorded, in ${ownerFirst}'s own words. Where the record is silent, it says so.`,
    saved:    `Your questions are saved to ${ownerFirst}'s Basalith.`,
    link:     'This link is yours. Please do not pass it on.',
  }
}

export function buildEntityAccessGrantedEmail(input: EntityAccessGrantedInput): BuiltEmail {
  const l = entityAccessGrantedLines(input)

  const text = [
    l.greeting,
    '',
    l.invite,
    '',
    l.how,
    '',
    `${ENTITY_ACCESS_BUTTON}: ${input.portalUrl}`,
    '',
    l.saved,
    l.link,
    '',
    'Basalith',
    'Heritage Nexus Inc.',
  ].join('\n')

  const html = `
<div style="background:#0A0908;padding:40px 20px;font-family:Georgia,serif;color:#F0EDE6">
  <div style="max-width:560px;margin:0 auto">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;color:#C4A24A;margin:0 0 28px;text-transform:uppercase">Basalith</p>
    <p style="font-size:16px;font-weight:300;line-height:1.8;margin:0 0 16px">${esc(l.greeting)}</p>
    <p style="font-size:16px;font-weight:300;line-height:1.8;margin:0 0 16px;color:#F0EDE6">${esc(l.invite)}</p>
    <div style="border-left:2px solid rgba(196,162,74,0.5);padding:4px 0 4px 18px;margin:0 0 28px">
      <p style="font-size:16px;font-weight:300;line-height:1.8;margin:0;color:#B8B4AB">${esc(l.how)}</p>
    </div>
    <p style="margin:0 0 32px"><a href="${esc(input.portalUrl)}" style="display:inline-block;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#0A0908;background:#C4A24A;text-decoration:none;padding:14px 28px">${ENTITY_ACCESS_BUTTON}</a></p>
    <p style="font-size:14px;font-weight:300;line-height:1.8;margin:0 0 4px;color:#B8B4AB">${esc(l.saved)}</p>
    <p style="font-size:14px;font-weight:300;line-height:1.8;margin:0 0 32px;color:#B8B4AB">${esc(l.link)}</p>
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;color:#A29B90;margin:0">Basalith · Heritage Nexus Inc.</p>
  </div>
</div>`.trim()

  return { subject: l.subject, html, text }
}

/** Every string a contributor might read, for a copy rule check. */
export function allEntityAccessGrantedCopy(): string[] {
  const l = entityAccessGrantedLines({ ownerName: 'Test Person', contributorName: 'Some One', portalUrl: 'https://basalith.ai/contribute/x' })
  return [l.subject, l.greeting, l.invite, l.how, l.saved, l.link, ENTITY_ACCESS_BUTTON]
}
