'use client'

import { useState, useEffect } from 'react'

// Stone register: every color is a var(--portal-*) read (globals.css,
// .portal-stone). No hex literal belongs in this file.

interface TrainingStats {
  total:              number
  included:           number
  bySource:           Record<string, number>
  avgQuality:         number
  readyForFineTuning: boolean
  estimatedAccuracy:  string
}

const SERIF = 'var(--portal-serif)'
const MONO  = 'var(--portal-mono)'

const STAGES = [
  {
    name:      'The Echo Layer',
    threshold: 10,
    consumer:  'Your entity echoes you back.',
    unlocks:   'Accurate answers about your life: names, dates, relationships.',
  },
  {
    name:      'The Wisdom Compass',
    threshold: 50,
    consumer:  'Your entity reflects how you reason.',
    unlocks:   'Guidance that reflects your specific values, not generic advice.',
  },
  {
    name:      'The Full Portrait',
    threshold: 200,
    consumer:  'Your entity captures what shapes your judgment.',
    unlocks:   'The entity stops sounding like an advisor and starts sounding like a person.',
  },
  {
    name:      'The Cognitive Fingerprint',
    threshold: 500,
    consumer:  'Your entity sounds like you.',
    unlocks:   'Your linguistic cadence, characteristic framing, and relationship to uncertainty.',
  },
]

function getStage(count: number) {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (count >= STAGES[i].threshold) return { current: STAGES[i], index: i }
  }
  return { current: null, index: -1 }
}

function getNextStage(index: number) {
  return index < STAGES.length - 1 ? STAGES[index + 1] : null
}

export default function TrainingDataCard() {
  const [stats, setStats] = useState<TrainingStats | null>(null)

  useEffect(() => {
    fetch('/api/archive/training-data')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStats(d) })
      .catch(() => {})
  }, [])

  if (!stats || stats.total === 0) return null

  const count = stats.included
  const { current, index } = getStage(count)
  const next  = getNextStage(index)

  const progressPct = next
    ? Math.round(((count - (current?.threshold ?? 0)) / (next.threshold - (current?.threshold ?? 0))) * 100)
    : 100
  const capped = Math.min(progressPct, 100)

  return (
    <div
      className="rounded-sm mb-8 portal-card"
      style={{
        background: 'var(--portal-card)',
        border:     '1px solid var(--portal-card-line)',
        padding:    'clamp(1.1rem,3vw,1.5rem)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <p style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--portal-gold-ink)', marginBottom: '6px' }}>
            {current ? current.name : 'Building your Basalith'}
          </p>
          <p style={{ fontFamily: SERIF, fontSize: '17px', fontStyle: 'italic', fontWeight: 400, color: 'var(--portal-ink)', margin: 0, lineHeight: 1.5 }}>
            {current ? current.consumer : 'Keep adding memories.'}
          </p>
        </div>
        <p style={{ fontFamily: SERIF, fontSize: '28px', fontWeight: 300, color: 'var(--portal-ink)', letterSpacing: '-0.01em', margin: 0, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {count}
          <span style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--portal-label)', marginLeft: '8px' }}>
            deposits
          </span>
        </p>
      </div>

      {/* Progress toward next stage */}
      {next && (
        <div style={{ marginBottom: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '6px' }}>
            <span style={{ fontFamily: SERIF, fontSize: '14.5px', color: 'var(--portal-secondary)' }}>
              {next.threshold - count} more to {next.name}
            </span>
            <span style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.1em', color: 'var(--portal-label)', fontVariantNumeric: 'tabular-nums' }}>
              {capped}%
            </span>
          </div>
          <div style={{ height: '4px', background: 'var(--portal-rule)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height:       '100%',
              width:        `${capped}%`,
              background:   'var(--portal-btn)',
              borderRadius: '2px',
              transition:   'width 800ms ease',
            }} />
          </div>
          <p style={{ fontFamily: SERIF, fontSize: '14.5px', fontStyle: 'italic', color: 'var(--portal-secondary)', margin: '8px 0 0', lineHeight: 1.6 }}>
            Next: {next.consumer}
          </p>
        </div>
      )}

      {/* Completed all stages */}
      {!next && current && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--portal-rule)' }}>
          <p style={{ fontFamily: SERIF, fontSize: '15.5px', fontStyle: 'italic', color: 'var(--portal-gold-ink)', margin: 0, lineHeight: 1.7 }}>
            Your entity has reached The Cognitive Fingerprint.
            Ask us about voice fine-tuning.
          </p>
        </div>
      )}
    </div>
  )
}
