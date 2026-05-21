'use client'

import { useState, useEffect } from 'react'

interface TrainingStats {
  total:              number
  included:           number
  bySource:           Record<string, number>
  avgQuality:         number
  readyForFineTuning: boolean
  estimatedAccuracy:  string
}

const STAGES = [
  {
    name:      'The Echo Layer',
    threshold: 10,
    consumer:  'Your entity knows who you are.',
    unlocks:   'Accurate answers about your life — names, dates, relationships.',
    color:     'rgba(196,162,74,0.25)',
  },
  {
    name:      'The Wisdom Compass',
    threshold: 50,
    consumer:  'Your entity knows how you think.',
    unlocks:   'Guidance that reflects your specific values, not generic advice.',
    color:     'rgba(196,162,74,0.55)',
  },
  {
    name:      'The Full Portrait',
    threshold: 200,
    consumer:  'Your entity knows why you are the way you are.',
    unlocks:   'The entity stops sounding like an advisor and starts sounding like a person.',
    color:     'rgba(196,162,74,0.80)',
  },
  {
    name:      'The Cognitive Fingerprint',
    threshold: 500,
    consumer:  'Your entity sounds like you.',
    unlocks:   'Your linguistic cadence, characteristic framing, and relationship to uncertainty.',
    color:     '#C4A24A',
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
      className="rounded-sm mb-8"
      style={{
        background: 'rgba(196,162,74,0.03)',
        border:     '1px solid rgba(196,162,74,0.1)',
        padding:    'clamp(1rem,3vw,1.5rem)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <p style={{ fontFamily: 'monospace', fontSize: '0.4rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#C4A24A', marginBottom: '6px' }}>
            {current ? current.name : 'Building your archive'}
          </p>
          <p style={{ fontFamily: 'Georgia,serif', fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 300, color: '#F0EDE6', margin: 0, lineHeight: 1.5 }}>
            {current ? current.consumer : 'Keep adding memories.'}
          </p>
        </div>
        <p style={{ fontFamily: 'monospace', fontSize: '1.3rem', color: current ? '#C4A24A' : '#3A3830', letterSpacing: '-0.02em', margin: 0 }}>
          {count}
          <span style={{ fontSize: '0.45rem', letterSpacing: '0.1em', color: '#3A3830', marginLeft: '5px' }}>
            deposits
          </span>
        </p>
      </div>

      {/* Progress toward next stage */}
      {next && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '0.38rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#5C6166' }}>
              {next.threshold - count} more to {next.name}
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: '0.38rem', letterSpacing: '0.1em', color: '#5C6166' }}>
              {capped}%
            </span>
          </div>
          <div style={{ height: '4px', background: 'rgba(196,162,74,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height:       '100%',
              width:        `${capped}%`,
              background:   next.color,
              borderRadius: '2px',
              transition:   'width 800ms ease',
            }} />
          </div>
          <p style={{ fontFamily: 'Georgia,serif', fontSize: '0.78rem', fontStyle: 'italic', color: '#5C6166', margin: '8px 0 0', lineHeight: 1.6 }}>
            Next: {next.consumer}
          </p>
        </div>
      )}

      {/* Completed all stages */}
      {!next && current && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(196,162,74,0.1)' }}>
          <p style={{ fontFamily: 'Georgia,serif', fontSize: '0.88rem', fontStyle: 'italic', color: '#C4A24A', margin: 0, lineHeight: 1.7 }}>
            Your entity has reached The Cognitive Fingerprint.
            Contact your Legacy Guide to discuss voice fine-tuning.
          </p>
        </div>
      )}
    </div>
  )
}
