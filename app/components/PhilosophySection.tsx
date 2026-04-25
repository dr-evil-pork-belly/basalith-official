const PILLARS = [
  {
    n:     '01',
    title: 'The Entity',
    body:  'Not a biography. Not a chatbot. A living model of how a specific person thinks, trained on their actual words, memories, and wisdom.',
  },
  {
    n:     '02',
    title: 'The Archive',
    body:  'Every photograph, letter, voice recording, and story. Preserved with the same seriousness as an estate. Governed for generations.',
  },
  {
    n:     '03',
    title: 'The Inheritance',
    body:  'When the time comes, your family receives not just your possessions but your presence. Your voice. Your way of seeing the world.',
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
        textAlign:  'center',
      }}
    >
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>

        {/* Main quote */}
        <p
          style={{
            fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:     'clamp(1.5rem, 3.5vw, 2.5rem)',
            fontStyle:    'italic',
            fontWeight:   300,
            lineHeight:   1.6,
            color:        'rgba(250,250,248,0.88)',
            marginBottom: '20px',
          }}
        >
          &ldquo;You never actually own a photograph.
          You merely look after it for the next generation.&rdquo;
        </p>

        <p
          style={{
            fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
            fontSize:      '0.52rem',
            letterSpacing: '0.3em',
            textTransform: 'uppercase' as const,
            color:         'var(--color-gold)',
            marginBottom:  '80px',
          }}
        >
          Adapted from Patek Philippe
        </p>

        {/* Gold divider */}
        <div
          aria-hidden="true"
          style={{
            width:        '40px',
            height:       '1px',
            background:   'var(--color-gold)',
            margin:       '0 auto 80px',
          }}
        />

        {/* Three pillars */}
        <div
          style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap:                 '48px',
            textAlign:           'left',
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
                  marginBottom: '12px',
                  lineHeight:   1.2,
                }}
              >
                {title}
              </h3>
              <p
                style={{
                  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
                  fontSize:   '1.05rem',
                  fontWeight: 300,
                  lineHeight: 1.85,
                  color:      'rgba(250,248,244,0.5)',
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
          section[aria-label="Our philosophy"] > div > div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
        }
      `}</style>
    </section>
  )
}
