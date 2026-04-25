const STATS = [
  { n: '847',    label: 'Photographs archived'   },
  { n: '23',     label: 'Family contributors'    },
  { n: '6',      label: 'Decades preserved'      },
]

export default function StorySection() {
  return (
    <section
      data-reveal
      aria-label="An archive in progress"
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
        {/* Gold frame inset */}
        <div
          style={{
            position:   'absolute',
            inset:      '20px',
            border:     '1px solid rgba(184,150,62,0.25)',
            pointerEvents: 'none',
          }}
        />
        {/* Caption watermark */}
        <p
          style={{
            position:      'absolute',
            bottom:        '32px',
            left:          '32px',
            fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
            fontSize:      '0.45rem',
            letterSpacing: '0.3em',
            textTransform: 'uppercase' as const,
            color:         'rgba(250,240,220,0.45)',
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
          <p
            style={{
              fontFamily:  'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
              fontSize:    '1.25rem',
              fontStyle:   'italic',
              fontWeight:  300,
              lineHeight:  1.9,
              color:       'var(--color-text-secondary)',
            }}
          >
            Eleanor&rsquo;s archive contains 847 photographs spanning six decades.
            Her daughter Patricia has contributed 23 memories. Her grandchildren
            know her voice. Her great-grandchildren will too.
          </p>
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
                  fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
                  fontSize:     'clamp(2rem, 4vw, 3.25rem)',
                  fontWeight:   300,
                  lineHeight:   1,
                  color:        'var(--color-gold)',
                  marginBottom: '6px',
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
          section[aria-label="An archive in progress"] > div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
        }
      `}</style>
    </section>
  )
}
