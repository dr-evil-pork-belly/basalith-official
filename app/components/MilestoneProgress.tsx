// Renders on a void (var(--color-void)) band. Every color here is a dark-background
// value, hardcoded on purpose. The root theme tokens on this site are the
// LIGHT marketing palette (--color-surface is white, --color-text-muted is
// var(--color-text-muted)), and the locked state used to reach for them, which painted a
// white card with dark grey text onto black and then faded the whole card to
// 45 percent. Contrast table in globals.css: --color-text-muted on dark is
// 3.49:1, never use. Fixed September 14, 2026.
//
// Locked stages are no longer ghosted. A stage the reader has not reached is
// still copy the reader is meant to read. Reached and active stages carry the
// gold tint and border; locked stages carry a plain dark card.

const STAGES = [
  {
    num:       '01',
    name:      'The Echo Layer',
    threshold: 10,
    timeline:  'Day one to week two',
    consumer:  'Your entity echoes you back.',
    unlocks:   'Accurate answers about your life: names, dates, key relationships, core family history.',
  },
  {
    num:       '02',
    name:      'The Wisdom Compass',
    threshold: 50,
    timeline:  'First month',
    consumer:  'Your entity reflects how you reason.',
    unlocks:   'Guidance that reflects your specific approach to risk, family, and values, not generic advice.',
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
  fontFamily:    'var(--font-space-mono)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.18em',
}
const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-newsreader), Georgia, serif',
}

// Measured against var(--color-void). See the contrast table in globals.css.
const ON_DARK = {
  gold:      'var(--color-gold)',                 //  8.16:1
  primary:   'var(--on-dark)',   // 15.09:1
  body:      'var(--on-dark-2)',  //  7.36:1
  label:     'var(--on-dark-2)',  //  5.94:1
  cardLock:  'rgba(247,245,241,0.03)',
  ruleLock:  'rgba(247,245,241,0.12)',
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
    <section aria-label="Your progress" style={{ padding: 'clamp(64px,8vw,96px) clamp(24px,6vw,80px)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <p style={{ ...MONO, fontSize: '0.78rem', color: ON_DARK.gold, marginBottom: '12px' }}>
          Your progress
        </p>
        <h2 style={{
          ...SERIF,
          fontSize:      'clamp(1.75rem,3vw,2.5rem)',
          fontWeight: 400,
          lineHeight:    1.15,
          color:         ON_DARK.primary,
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
            const lit        = isActive || isComplete
            return (
              <div
                key={stage.num}
                style={{
                  padding:    '24px 20px',
                  background: isComplete ? 'rgba(160,132,80,0.07)' : isActive ? 'rgba(160,132,80,0.04)' : ON_DARK.cardLock,
                  border:     `1px solid ${isComplete ? 'rgba(160,132,80,0.4)' : isActive ? 'rgba(160,132,80,0.2)' : ON_DARK.ruleLock}`,
                }}
              >
                <p style={{ ...MONO, fontSize: '0.78rem', color: ON_DARK.gold, marginBottom: '12px' }}>
                  {stage.num}
                </p>
                <p style={{
                  ...MONO, fontSize: '0.78rem',
                  color:        lit ? ON_DARK.primary : 'var(--on-dark-2)',
                  marginBottom: '16px', lineHeight: 1.4,
                }}>
                  {stage.name}
                </p>
                <p style={{
                  ...SERIF, fontSize: '1rem', fontStyle: 'italic', fontWeight: 400,
                  color:        ON_DARK.gold,
                  marginBottom: '14px', lineHeight: 1.65,
                }}>
                  {stage.consumer}
                </p>
                <p style={{ ...SERIF, fontSize: '0.95rem', fontWeight: 400, color: ON_DARK.body, lineHeight: 1.7, marginBottom: '14px' }}>
                  {stage.unlocks}
                </p>
                <p style={{ ...MONO, fontSize: '0.78rem', color: ON_DARK.label, lineHeight: 1.6 }}>
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
