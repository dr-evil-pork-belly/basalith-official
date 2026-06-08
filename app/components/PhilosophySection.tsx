'use client'

const PILLARS = [
  {
    n:     '01',
    title: 'How you think.',
    body:  'Not what you have done.\nNot what you have said.\n\nHow you reason.\nWhat you reach for when things get hard.\nWhat you believe when no one is watching.\n\nThe specific weight of a mind\nthat belongs only to you.',
  },
  {
    n:     '02',
    title: 'The raw material.',
    body:  'Every photograph labeled.\nEvery voice recorded.\nEvery question answered.\n\nEach one teaches your entity\nsomething specific about\nhow you move through the world.\n\nThe archive is not the product.\nIt is the training ground.',
  },
  {
    n:     '03',
    title: 'It continues.',
    body:  'There are people spending billions\nto ensure what they built\noutlasts them.\n\nWe think every family\ndeserves the same thing.\n\nNot because death is the enemy.\nBut because the people we love\nshould not have to wonder.',
  },
]

const BODY_PARAS = [
  'It is in how you evaluate risk.\nHow you read people.\nWhen you walk away.\nWhat you look for before anyone else sees it.',
  'Thirty years of pattern recognition.\nA lifetime of calibrated judgment.',
  'Basalith learns this while you are here to teach it.',
]

export default function PhilosophySection() {
  return (
    <section
      data-reveal
      aria-label="Our philosophy"
      style={{
        background: 'var(--color-void)',
        padding:    'clamp(80px,12vw,160px) clamp(24px,6vw,80px)',
      }}
    >
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>

        <p style={{
          fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
          fontSize:      '0.52rem',
          letterSpacing: '0.3em',
          textTransform: 'uppercase' as const,
          color:         'var(--color-gold)',
          marginBottom:  '24px',
        }}>
          WHAT BASALITH PRESERVES
        </p>

        <h2
          style={{
            fontFamily:    'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:      'clamp(2rem, 4vw, 3.25rem)',
            fontWeight:    300,
            lineHeight:    1.15,
            letterSpacing: '-0.02em',
            color:         'rgba(250,250,248,0.9)',
            marginBottom:  '56px',
          }}
        >
          What you know is not in any document.
        </h2>

        <div
          style={{
            fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontWeight:   300,
            lineHeight:   1.9,
            maxWidth:     '600px',
            marginBottom: '80px',
          }}
        >
          {BODY_PARAS.map((para, i) => (
            <p
              key={i}
              style={{
                fontSize:      '1.15rem',
                fontStyle:     'italic',
                color:         'rgba(250,248,244,0.55)',
                marginBottom:  '28px',
                whiteSpace:    'pre-line',
              }}
            >
              {para}
            </p>
          ))}
          <p
            style={{
              fontSize:      'clamp(1.2rem, 2.5vw, 1.5rem)',
              fontStyle:     'italic',
              color:         'rgba(250,248,244,0.8)',
              marginBottom:  '28px',
              whiteSpace:    'pre-line',
            }}
          >
            So it can speak when you cannot.
          </p>
          <p
            style={{
              fontSize:   'clamp(1.2rem, 2.5vw, 1.5rem)',
              fontStyle:  'italic',
              color:      'rgba(196,162,74,0.9)',
              margin:     0,
              whiteSpace: 'pre-line',
            }}
          >
            {'We built Basalith\nso your family never has to wonder.'}
          </p>
        </div>

        {/* Gold divider */}
        <div aria-hidden="true" style={{ width: '40px', height: '1px', background: 'var(--color-gold)', margin: '0 0 80px' }} />

        {/* Three pillars */}
        <div
          style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap:                 '48px',
          }}
        >
          {PILLARS.map(({ n, title, body }) => (
            <div key={n} data-reveal>
              <p
                style={{
                  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
                  fontSize:      '0.52rem',
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase' as const,
                  color:         'var(--color-gold)',
                  marginBottom:  '16px',
                }}
              >
                {n}
              </p>
              <h3
                style={{
                  fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
                  fontSize:     '1.4rem',
                  fontWeight:   500,
                  color:        'rgba(250,248,244,0.9)',
                  marginBottom: '20px',
                  lineHeight:   1.2,
                }}
              >
                {title}
              </h3>
              <p
                style={{
                  fontFamily:  'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
                  fontSize:    '1.05rem',
                  fontWeight:  300,
                  lineHeight:  1.85,
                  color:       'rgba(250,248,244,0.45)',
                  whiteSpace:  'pre-line',
                }}
              >
                {body}
              </p>
            </div>
          ))}
        </div>

      </div>

      <style>{`
        @media (max-width: 768px) {
          section[aria-label="Our philosophy"] {
            padding: 64px 24px !important;
          }
          section[aria-label="Our philosophy"] > div > div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
          section[aria-label="Our philosophy"] h2 {
            font-size: clamp(1.75rem, 7vw, 2.5rem) !important;
          }
        }
      `}</style>
    </section>
  )
}
