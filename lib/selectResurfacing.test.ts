import { describe, it, expect } from 'vitest'
import { classifyBand, frameTextFromKey } from './selectResurfacing'

describe('classifyBand', () => {
  it('matches an exact anniversary within +/-1 day', () => {
    expect(classifyBand(365)).toEqual({ key: 'anniversary_1y', prio: 1 })
    expect(classifyBand(366)).toEqual({ key: 'anniversary_1y', prio: 1 })
    expect(classifyBand(364)).toEqual({ key: 'anniversary_1y', prio: 1 })
    expect(classifyBand(730)).toEqual({ key: 'anniversary_2y', prio: 1 })
  })

  it('falls to about_a_year just outside the anniversary window', () => {
    expect(classifyBand(360)).toEqual({ key: 'about_a_year', prio: 2 })
    expect(classifyBand(375)).toEqual({ key: 'about_a_year', prio: 2 })
  })

  it('classifies the six-month window', () => {
    expect(classifyBand(167)).toEqual({ key: 'months_6', prio: 3 })
    expect(classifyBand(180)).toEqual({ key: 'months_6', prio: 3 })
    expect(classifyBand(198)).toEqual({ key: 'months_6', prio: 3 })
  })

  it('classifies the weeks window', () => {
    expect(classifyBand(30)).toEqual({ key: 'weeks', prio: 4 })
    expect(classifyBand(57)).toEqual({ key: 'weeks', prio: 4 })
    expect(classifyBand(75)).toEqual({ key: 'weeks', prio: 4 })
  })

  it('falls back to kept in the gaps', () => {
    expect(classifyBand(76)).toEqual({ key: 'kept', prio: 5 })
    expect(classifyBand(120)).toEqual({ key: 'kept', prio: 5 })
    expect(classifyBand(250)).toEqual({ key: 'kept', prio: 5 })
  })
})

describe('frameTextFromKey (en, deterministic)', () => {
  it('renders the one-year and N-year anniversaries', () => {
    expect(frameTextFromKey('anniversary_1y', 'en')).toBe('One year ago today, you told me this. I kept it.')
    expect(frameTextFromKey('anniversary_3y', 'en')).toBe('3 years ago today, you told me this. I kept it.')
  })

  it('renders the other bands', () => {
    expect(frameTextFromKey('about_a_year', 'en')).toBe('About a year ago, you told me this.')
    expect(frameTextFromKey('months_6', 'en')).toBe('Six months ago, you said this to me.')
    expect(frameTextFromKey('weeks', 'en')).toBe('A few weeks ago, you said this to me.')
    expect(frameTextFromKey('kept', 'en')).toBe('You told me this a while back. I kept it.')
  })

  it('uses the placeholder map for non-English archives (English fallback for now)', () => {
    // Cantonese copy is pending; the placeholder still substitutes N and renders.
    expect(frameTextFromKey('anniversary_2y', 'zh')).toBe('2 years ago today, you told me this. I kept it.')
    expect(frameTextFromKey('weeks', 'zh')).toBe('A few weeks ago, you said this to me.')
  })
})
