import { describe, it, expect } from 'vitest'
import { includeInTraining } from './trainingPipeline'

describe('training inclusion', () => {
  it('gates an open deposit by the scorer at 50', () => {
    expect(includeInTraining(49)).toBe(false)
    expect(includeInTraining(50)).toBe(true)
    expect(includeInTraining(49, null)).toBe(false)
    expect(includeInTraining(49, '')).toBe(false)
  })

  it('includes an incident-interview turn on the interview\'s say-so, whatever the score', () => {
    for (const probe of ['SEED', 'TIMELINE', 'CUE', 'OPTION', 'BASIS', 'BOUNDARY', 'ERROR', 'TRADEOFF']) {
      expect(includeInTraining(18, probe)).toBe(true)
      expect(includeInTraining(61, probe)).toBe(true)
    }
  })
})
