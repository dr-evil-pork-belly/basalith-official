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

export default function TrainingDataCard() {
  const [stats, setStats] = useState<TrainingStats | null>(null)

  useEffect(() => {
    fetch('/api/archive/training-data')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStats(d) })
      .catch(() => {})
  }, [])

  if (!stats || stats.total === 0) return null

  const progress = Math.min(Math.round(stats.included / 500 * 100), 100)

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
            AI Training Data
          </p>
          <p style={{ fontFamily: 'Georgia,serif', fontSize: '0.9rem', fontWeight: 300, color: '#F0EDE6', margin: 0, lineHeight: 1.5 }}>
            {stats.estimatedAccuracy}
          </p>
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: '1.4rem', color: stats.readyForFineTuning ? '#C4A24A' : '#3A3830', letterSpacing: '-0.02em' }}>
          {stats.included}
          <span style={{ fontSize: '0.45rem', letterSpacing: '0.1em', color: '#3A3830', marginLeft: '5px' }}>/ 500</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span style={{ fontFamily: 'monospace', fontSize: '0.38rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#3A3830' }}>Fine-tuning threshold</span>
          <span style={{ fontFamily: 'monospace', fontSize: '0.38rem', letterSpacing: '0.1em', color: stats.readyForFineTuning ? '#C4A24A' : '#3A3830' }}>
            {progress}%
          </span>
        </div>
        <div style={{ height: '4px', background: 'rgba(196,162,74,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            height:     '100%',
            width:      `${progress}%`,
            background: stats.readyForFineTuning ? '#C4A24A' : 'rgba(196,162,74,0.35)',
            borderRadius: '2px',
            transition: 'width 800ms ease',
          }} />
        </div>
      </div>

      {/* Source breakdown */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        {Object.entries(stats.bySource).map(([source, count]) => (
          <span key={source} style={{ fontFamily: 'monospace', fontSize: '0.38rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3A3830' }}>
            {count} {source}
          </span>
        ))}
        {stats.avgQuality > 0 && (
          <span style={{ fontFamily: 'monospace', fontSize: '0.38rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.4)' }}>
            avg quality {stats.avgQuality}
          </span>
        )}
      </div>

      {stats.readyForFineTuning && (
        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(196,162,74,0.1)' }}>
          <p style={{ fontFamily: 'Georgia,serif', fontSize: '0.85rem', fontStyle: 'italic', color: '#C4A24A', margin: 0, lineHeight: 1.7 }}>
            Your archive has enough training data for a first fine-tuning run.
            Contact your Legacy Guide to initiate the process.
          </p>
        </div>
      )}
    </div>
  )
}
