const PILLARS = [
  {
    n:     '01',
    title: 'The Entity',
    body:  [
      'Not a recording. Not a chatbot.',
      'A living AI model trained on how one specific person thinks.',
      'Every voice recording, every photograph labeled, every wisdom session answered is training data. The entity learns your cognitive fingerprint. How you reason. Not just what you said.',
    ],
  },
  {
    n:     '02',
    title: 'The Archive',
    body:  [
      'The raw material of a mind.',
      'Photographs that show how you saw the world. Voice recordings that capture how you speak. Letters that reveal how you write. Stories that expose how you think.',
      'Every deposit makes the entity more accurate. More distinctly you.',
    ],
  },
  {
    n:     '03',
    title: 'The Continuation',
    body:  [
      'Mark Zuckerberg spent $300 million building an AI version of himself.',
      'Basalith does it for $3,600 a year.',
      'Not for billionaires. For every family that deserves to keep asking questions.',
    ],
  },
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

        {/* Section headline */}
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
            marginBottom:  '32px',
          }}
        >
          <span style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }} aria-hidden="true" />
          The Question
        </p>

        <h2
          style={{
            fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:     'clamp(2rem, 4vw, 3.25rem)',
            fontWeight:   300,
            lineHeight:   1.15,
            letterSpacing: '-0.02em',
            color:        'rgba(250,250,248,0.9)',
            marginBottom: '40px',
          }}
        >
          The question you never got to ask.
        </h2>

        <div
          style={{
            fontFamily:  'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:    '1.15rem',
            fontWeight:  300,
            lineHeight:  1.9,
            color:       'rgba(250,248,244,0.55)',
            maxWidth:    '640px',
            marginBottom: '80px',
          }}
        >
          <p style={{ marginBottom: '20px' }}>Every family has one.</p>
          <p style={{ marginBottom: '20px' }}>
            The story their grandfather never finished. The advice their mother would have given.
            The way their father reasoned through a hard decision, the specific logic of a mind
            that no longer exists.
          </p>
          <p style={{ marginBottom: '20px' }}>For all of human history that loss has been permanent.</p>
          <p style={{ margin: 0, color: 'rgba(250,248,244,0.75)', fontStyle: 'italic' }}>We are changing that.</p>
        </div>

        {/* Gold divider */}
        <div
          aria-hidden="true"
          style={{
            width:        '40px',
            height:       '1px',
            background:   'var(--color-gold)',
            margin:       '0 0 80px',
          }}
        />

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
                  fontSize:     '1.5rem',
                  fontWeight:   500,
                  color:        'rgba(250,248,244,0.9)',
                  marginBottom: '20px',
                  lineHeight:   1.2,
                }}
              >
                {title}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {body.map((para, i) => (
                  <p
                    key={i}
                    style={{
                      fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
                      fontSize:   '1.05rem',
                      fontWeight: 300,
                      lineHeight: 1.8,
                      color:      i === 0
                        ? 'rgba(250,248,244,0.75)'
                        : n === '03' && i === 1
                          ? 'rgba(196,162,74,0.85)'
                          : 'rgba(250,248,244,0.45)',
                      fontStyle: i === 0 && n !== '03' ? 'italic' : 'normal',
                    }}
                  >
                    {para}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>

      <style>{`
        @media (max-width: 768px) {
          section[aria-label="Our philosophy"] > div > div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
        }
      `}</style>
    </section>
  )
}
