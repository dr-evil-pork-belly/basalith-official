import { describe, it, expect } from 'vitest'
import { shouldShowPrompt } from './resurfacingPrompt'

describe('shouldShowPrompt — prompt-context show/hide branch', () => {
  it('shows the prompt for genuine-question source_types', () => {
    expect(shouldShowPrompt('spark', 'What did the kitchen smell like?')).toBe(true)
    expect(shouldShowPrompt('mirror', 'What do you think about standing there?')).toBe(true)
    expect(shouldShowPrompt('journal', 'What would you tell your younger self today?')).toBe(true)
  })

  it("hides the prompt for 'deposit' even when prompt is non-empty", () => {
    // owner_deposits.prompt for direct deposits is the label "Direct deposit".
    expect(shouldShowPrompt('deposit', 'Direct deposit')).toBe(false)
  })

  it('hides the prompt for non-whitelisted source_types', () => {
    expect(shouldShowPrompt('photograph_label', 'What do you remember about this moment?')).toBe(false)
    expect(shouldShowPrompt('free_capture', 'What is on your mind today?')).toBe(false)
  })

  it('hides the prompt when it is null, empty, or whitespace-only', () => {
    expect(shouldShowPrompt('spark', null)).toBe(false)
    expect(shouldShowPrompt('spark', undefined)).toBe(false)
    expect(shouldShowPrompt('journal', '')).toBe(false)
    expect(shouldShowPrompt('mirror', '   ')).toBe(false)
  })
})
