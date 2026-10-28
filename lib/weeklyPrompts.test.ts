import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { weeklyPromptGoesTo } from './weeklyPrompts'

// October 28, 2026. docs/GENERIC_QUESTIONS_SLICE_1_2026-10-28.md.
describe('who gets the Monday weekly prompt', () => {
  it('skips an owner on a succession record', () => {
    expect(weeklyPromptGoesTo({ tier: 'succession' })).toBe(false)
  })

  it('keeps every other record, and a record with no tier', () => {
    for (const tier of ['archive', 'family', 'personal', 'legacy', null, undefined]) {
      expect(weeklyPromptGoesTo({ tier })).toBe(true)
    }
  })

  it('is applied by the cron, which reads the tier', () => {
    const src = readFileSync(join(__dirname, '..', 'app', 'api', 'cron', 'weekly-prompt', 'route.ts'), 'utf8')
    expect(src).toMatch(/select\('[^']*\btier\b[^']*'\)/)
    expect(src).toContain('weeklyPromptGoesTo(archive)')
  })
})
