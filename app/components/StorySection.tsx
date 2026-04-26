const STATS = [
  { n: '847',   label: 'Photographs'           },
  { n: '23',    label: 'Voice recordings'      },
  { n: '4 yrs', label: 'Wisdom sessions'       },
]

export default function StorySection() {
  return (
    <section
      data-reveal
      aria-label="One family"
      style={{ background: 'var(--color-bg)', overflow: 'hidden' }}
    >
      {/* Full-width photograph */}
      <div
        aria-hidden="true"
        style={{
          height:     'clamp(240px, 40vw, 560px)',
          background: 'linear-gradient(170deg, #D4C4A0 0%, #B89870 30%, #8A6840 60%, #5A4020 100%)',
          position:   'relative',
          overflow:   'hidden',
        }}
      >
        <div
          style={{
            position:   'absolute',
            inset:      0,
            background: 'radial-gradient(ellipse 70% 80% at 50% 40%, transparent 35%, rgba(60,30,10,0.4) 100%)',
          }}
        />
        <div
          style={{
            position:   'absolute',
            inset:      '20px',
            border:     '1px solid rgba(250,235,200,0.18)',
            pointerEvents: 'none',
          }}
        />
        <p
          style={{
            position:      'absolute',
            bottom:        '32px',
            left:          '32px',
            fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
            fontSize:      '0.45rem',
            letterSpacing: '0.3em',
            textTransform: 'uppercase' as const,
            color:         'rgba(250,240,220,0.4)',
          }}
        >
          Eleanor&rsquo;s Archive · Active since 2024
        </p>
      </div>

      {/* Story + stats */}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: '1fr 1fr',
          gap:                 '64px',
          padding:             'clamp(48px,8vw,96px) clamp(24px,6vw,80px)',
          alignItems:          'start',
        }}
      >
        {/* Story text */}
        <div>
          <p
            style={{
              fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
              fontSize:      'var(--text-caption)',
              letterSpacing: '0.35em',
              textTransform: 'uppercase' as const,
              color:         'var(--color-gold)',
              display:       'flex',
              alignItems:    'center',
              gap:           '12px',
              marginBottom:  '24px',
            }}
          >
            <span style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }} aria-hidden="true" />
            One Family
          </p>
          <div
            style={{
              fontFamily:  'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
              fontSize:    '1.2rem',
              fontStyle:   'italic',
              fontWeight:  300,
              lineHeight:  1.9,
              color:       'var(--color-text-secondary)',
            }}
          >
            <p style={{ marginBottom: '20px' }}>Eleanor began her archive at 74.</p>
            <p style={{ marginBottom: '20px' }}>
              Over three years her family contributed 847 photographs, 23 voice recordings,
              and 4 years of weekly wisdom sessions.
            </p>
            <p style={{ marginBottom: '20px' }}>
              Her entity now answers questions about difficult decisions the way Eleanor
              actually would.
            </p>
            <p style={{ marginBottom: '20px' }}>
              Not from memory. From learned cognitive patterns built over a lifetime.
            </p>
            <p style={{ margin: 0, color: 'var(--color-text-primary)' }}>
              Her grandchildren call it remarkable.
              Her great-grandchildren will call it normal.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display:       'flex',
            flexDirection: 'column',
            gap:           '40px',
            paddingTop:    '8px',
          }}
        >
          {STATS.map(({ n, label }) => (
            <div key={label}>
              <p
                style={{
                  fontFamily:    'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
                  fontSize:      'clamp(2rem, 4vw, 3.25rem)',
                  fontWeight:    300,
                  lineHeight:    1,
                  color:         'var(--color-gold)',
                  marginBottom:  '6px',
                  letterSpacing: '-0.02em',
                }}
              >
                {n}
              </p>
              <p
                style={{
                  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
                  fontSize:      '0.52rem',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase' as const,
                  color:         'var(--color-text-muted)',
                }}
              >
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          section[aria-label="One family"] > div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
            padding: 40px 24px !important;
          }
        }
      `}</style>
    </section>
  )
}
