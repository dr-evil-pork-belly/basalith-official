import { describe, it, expect } from 'vitest'
import { buildEntitySystemPrompt, PROMPT_SCOPE_SUBSTITUTIONS, EMPTY_CONTEXT, formatFingerprintSection } from './entitySystemPrompt'

const base = {
  ownerName:          'Margaret Chen',
  archiveName:        'The Meridian Archive',
  fingerprintSection: formatFingerprintSection([{ prompt: 'Q', completion: 'A' }]),
  contextSection:     EMPTY_CONTEXT,
}

describe('entity system prompt scope', () => {
  it('is byte-identical to the original with no scope and with scope business', () => {
    const none     = buildEntitySystemPrompt(base)
    const business = buildEntitySystemPrompt({ ...base, scope: 'business' })
    expect(business).toBe(none)
    expect(none).toContain('The person now running their organization is asking you to apply the founder\'s reasoning to what they face today.')
    expect(none).toContain('A successor acting on a position Margaret Chen never took')
  })

  it('applies every substitution exactly once for scope personal, and leaves the rest untouched', () => {
    const business = buildEntitySystemPrompt(base)
    const personal = buildEntitySystemPrompt({ ...base, scope: 'personal' })
    expect(personal).not.toBe(business)
    for (const [from, to] of PROMPT_SCOPE_SUBSTITUTIONS) {
      expect(business.split(from).length - 1, from).toBe(1)
      expect(personal, to).toContain(to)
      expect(personal, from).not.toContain(from)
    }
    // The grounding rules are the same text in both.
    for (const rule of [
      'Where the record does not settle the question, do not settle it.',
      'Never invent a policy, a number, a rule, or a past decision that is not in the record above.',
      'Never break character. Never refer to yourself as an AI or a model.',
      'No em dashes. American English. Responses should be 3 to 6 sentences.',
    ]) {
      expect(business).toContain(rule)
      expect(personal).toContain(rule)
    }
  })

  it('never frames a personal archive around a successor or an organization', () => {
    const personal = buildEntitySystemPrompt({ ...base, scope: 'personal' })
    expect(personal).not.toMatch(/\bsuccessor\b/i)
    expect(personal).not.toMatch(/\borganization\b/i)
    expect(personal).not.toMatch(/running the business/i)
    expect(personal).not.toMatch(/\bhandover\b/i)
  })
})
