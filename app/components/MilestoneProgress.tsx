const STAGES = [
  {
    num:       '01',
    name:      'The Echo Layer',
    threshold: 10,
    timeline:  'Day one to week two',
    consumer:  'Your entity echoes you back.',
    unlocks:   'Accurate answers about your life — names, dates, key relationships, core family history.',
  },
  {
    num:       '02',
    name:      'The Wisdom Compass',
    threshold: 50,
    timeline:  'First month',
    consumer:  'Your entity reflects how you reason.',
    unlocks:   'Guidance that reflects your specific approach to risk, family, and values — not generic advice.',
  },
  {
    num:       '03',
    name:      'The Full Portrait',
    threshold: 200,
    timeline:  'Months two to four',
    consumer:  'Your entity captures what shapes your judgment.',
    unlocks:   'Inner contradictions recognized. The entity stops sounding like an advisor and starts sounding like a specific person.',
  },
  {
    num:       '04',
    name:      'The Cognitive Fingerprint',
    threshold: 500,
    timeline:  'Months four to twelve',
    consumer:  'Your entity sounds like you.',
    unlocks:   'Distinct linguistic cadence, characteristic framing, and relationship to uncertainty fully adopted.',
  },
]

const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.25em',
}
const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}

export default function MilestoneProgress({ currentDeposits = 0 }: { currentDeposits?: number }) {
  function stageStatus(threshold: number): 'complete' | 'active' | 'locked' {
    if (currentDeposits >= threshold) return 'complete'
    const stageIndex = STAGES.findIndex(s => s.threshold === threshold)
    const prevThreshold = stageIndex > 0 ? STAGES[stageIndex - 1].threshold : 0
    if (currentDeposits >= prevThreshold) return 'active'
    return 'locked'
  }

  return (
    <section aria-label="Your archive journey" style={{ padding: 'clamp(64px,8vw,96px) clamp(24px,6vw,80px)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <p style={{ ...MONO, fontSize: '0.52rem', color: 'var(--color-gold)', marginBottom: '12px' }}>
          Your Archive Journey
        </p>
        <h2 style={{
          ...SERIF,
          fontSize:      'clamp(1.75rem,3vw,2.5rem)',
          fontWeight:    300,
          lineHeight:    1.15,
          color:         'rgba(250,248,244,0.9)',
          letterSpacing: '-0.02em',
          marginBottom:  '48px',
        }}>
          Four stages. Each one deeper than the last.
        </h2>

        <div className="milestone-grid" style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap:                 '2px',
        }}>
          {STAGES.map(stage => {
            const status = stageStatus(stage.threshold)
            const isActive   = status === 'active'
            const isComplete = status === 'complete'
            return (
              <div
                key={stage.num}
                style={{
                  padding:    '24px 20px',
                  background: isComplete ? 'rgba(196,162,74,0.07)' : isActive ? 'rgba(196,162,74,0.04)' : 'var(--color-surface)',
                  border:     `1px solid ${isComplete ? 'rgba(196,162,74,0.4)' : isActive ? 'rgba(196,162,74,0.2)' : 'var(--color-border)'}`,
                  opacity:    status === 'locked' ? 0.45 : 1,
                }}
              >
                <p style={{ ...MONO, fontSize: '0.44rem', color: 'var(--color-gold)', marginBottom: '12px' }}>
                  {stage.num}
                </p>
                <p style={{
                  ...MONO, fontSize: '0.5rem',
                  color:        isComplete || isActive ? 'rgba(250,248,244,0.85)' : 'var(--color-text-muted)',
                  marginBottom: '16px', lineHeight: 1.4,
                }}>
                  {stage.name}
                </p>
                <p style={{
                  ...SERIF, fontSize: '0.9rem', fontStyle: 'italic', fontWeight: 300,
                  color:        'var(--color-gold)',
                  marginBottom: '14px', lineHeight: 1.65,
                }}>
                  {stage.consumer}
                </p>
                <p style={{ ...SERIF, fontSize: '0.85rem', fontWeight: 300, color: 'var(--color-text-muted)', lineHeight: 1.7, marginBottom: '14px' }}>
                  {stage.unlocks}
                </p>
                <p style={{ ...MONO, fontSize: '0.4rem', color: 'var(--color-text-faint)' }}>
                  {stage.threshold}+ deposits · {stage.timeline}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .milestone-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 600px) {
          .milestone-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
