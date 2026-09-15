import { describe, it, expect } from 'vitest'
import { classifySystemFor, timelineSystemFor } from './incidentClassifier'

// The classifier prompts are product logic. These tests pin two things: the
// business prompt is the original, and the personal prompt actually differs at
// every substitution point (a .replace that fails to match is a silent no-op,
// which is exactly the failure these guard against).

describe('classifier scope', () => {
  it('business prompt is the original framing', () => {
    const b = classifySystemFor('business')
    expect(b).toContain('a single answer a founder gave to one interview probe about a past business decision')
    expect(b).toContain("the probe and the founder's answer")
    expect(b).toContain('true ONLY if the founder has clearly finished')
    expect(b).toContain('(for example "speed vs certainty")')
    expect(timelineSystemFor('business')).toContain("You read a founder's narrative")
    expect(timelineSystemFor('business')).toContain('where the founder chose among options')
  })

  it('personal prompt carries no founder or business framing', () => {
    const p = classifySystemFor('personal')
    expect(p).not.toMatch(/founder/i)
    expect(p).not.toMatch(/business decision/i)
    expect(p).toContain('a single answer a person gave to one interview probe about a past decision in their own life')
    expect(p).toContain("the probe and the person's answer")
    expect(p).toContain('true ONLY if the person has clearly finished')
    expect(p).toContain("in the person's own terms")
    expect(p).toContain('Never translate a family or personal tension into business vocabulary.')
    const t = timelineSystemFor('personal')
    expect(t).not.toMatch(/founder/i)
    expect(t).toContain("You read a person's narrative")
    expect(t).toContain('where the person chose among options')
  })

  it('the two classify prompts differ only at the substitution points', () => {
    const b = classifySystemFor('business')
    const p = classifySystemFor('personal')
    expect(p).not.toBe(b)
    // Everything after the field rules for tension is shared verbatim.
    const tail = 'dimensionSignal: whether this one answer covered a coverage dimension'
    expect(b.slice(b.indexOf(tail))).toBe(p.slice(p.indexOf(tail)))
    // Same JSON shape line in both.
    const shape = '{"anchor":"<string>","containsRule":<true|false>'
    expect(b).toContain(shape)
    expect(p).toContain(shape)
  })
})
