import { describe, it, expect } from 'vitest'
import { buildFoundingWelcomeEmail, type FoundingWelcomeInput } from './foundingWelcome'

const base: FoundingWelcomeInput = {
  familyName:   'MOAFly Technologies',
  firstName:    'David',
  guideName:    null,
  tierLabel:    'Succession',
  segment:      'succession',
  magicLinkUrl: 'https://example.supabase.co/auth/v1/verify?token=abc&type=magiclink',
  loginUrl:     'https://basalith.ai/archive-login',
}

const all = (e: { subject: string; html: string; text: string }) => `${e.subject}\n${e.html}\n${e.text}`

describe('founding welcome email', () => {
  it('does not say the founding is complete: payment opens the Basalith, the Founding has not started', () => {
    for (const segment of ['succession', 'b2c']) {
      const e = buildFoundingWelcomeEmail({ ...base, segment })
      expect(all(e)).not.toMatch(/founding is complete/i)
      expect(e.text).toContain('The first step is the Founding')
      expect(e.text).toContain('https://basalith.ai/archive/founding')
    }
  })

  it('prints no password in either variant, with or without a sign-in link', () => {
    for (const magicLinkUrl of [base.magicLinkUrl, null]) {
      const e = buildFoundingWelcomeEmail({ ...base, magicLinkUrl })
      expect(all(e)).not.toMatch(/password:/i)
      expect(all(e)).not.toMatch(/password login/i)
    }
  })

  it('does not call a one-time sign-in link a permanent entry', () => {
    const e = buildFoundingWelcomeEmail(base)
    expect(all(e)).not.toMatch(/save this link/i)
    expect(e.text).toContain('This link works once and then expires.')
    expect(e.html).toContain(base.magicLinkUrl!.replace(/&/g, '&amp;'))
  })

  it('speaks to a business owner about the business, and to a family about photographs', () => {
    const s = buildFoundingWelcomeEmail(base)
    expect(s.text).toContain('running the business')
    expect(s.text).not.toMatch(/photographs|Generation I/)
    const f = buildFoundingWelcomeEmail({ ...base, familyName: 'Chen', segment: 'b2c' })
    expect(f.text).toContain('photographs')
    expect(f.text).toContain('The Chen Basalith · Generation I')
  })

  it('follows the copy rules: no em dash, no exclamation point, no "archive" in rendered text', () => {
    for (const segment of ['succession', 'b2c']) {
      for (const magicLinkUrl of [base.magicLinkUrl, null]) {
        const e = buildFoundingWelcomeEmail({ ...base, segment, magicLinkUrl })
        expect(all(e)).not.toMatch(/\u2014/)
        expect(e.text).not.toMatch(/!/)
        // URLs carry the route names; the words a reader reads do not.
        const words = e.text.replace(/https?:\/\/\S+/g, '')
        expect(words).not.toMatch(/archive/i)
      }
    }
  })

  it('escapes names that came from the application form', () => {
    const e = buildFoundingWelcomeEmail({ ...base, firstName: '<b>x</b>' })
    expect(e.html).not.toContain('<b>x</b>')
    expect(e.html).toContain('&lt;b&gt;x&lt;/b&gt;')
  })

  it('for a manual activation or a resume, claims no payment and no fresh start', () => {
    const e = buildFoundingWelcomeEmail({ ...base, paid: false, magicLinkUrl: null })
    expect(all(e)).not.toMatch(/payment/i)
    expect(e.text).not.toContain('The first step is the Founding')
    expect(e.text).toContain('If you have not begun the Founding')
    expect(e.text).toContain('Sign in at https://basalith.ai/archive-login')
  })
})
