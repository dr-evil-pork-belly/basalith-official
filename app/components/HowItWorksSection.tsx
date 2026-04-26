import Link from 'next/link'

const STEPS = [
  {
    n:       '01',
    title:   'The Founding Session',
    body:    'Ninety minutes. Your family. A Senior Legacy Guide. Your first photographs. By the end of this session your archive exists, not as a promise, but as a fact.',
    href:    '/founding-session',
    visual:  'linear-gradient(135deg, #F5EAD5 0%, #E8D0A0 40%, #C8A06A 100%)',
  },
  {
    n:       '02',
    title:   'The Archive Builds',
    body:    'Every evening one photograph goes to every family member by email. No login. No app. They reply with what they remember. Their words go directly into the archive.',
    href:    '/method',
    visual:  'linear-gradient(135deg, #EAE2D5 0%, #D5C8A8 40%, #B0A080 100%)',
  },
  {
    n:       '03',
    title:   'Your Family Contributes',
    body:    'Contributors label photographs, record voice stories, and answer witness questions. Each perspective adds something no other perspective can. The archive deepens.',
    href:    '/method',
    visual:  'linear-gradient(135deg, #E8DDD0 0%, #D0C0A0 40%, #A89070 100%)',
  },
  {
    n:       '04',
    title:   'The Entity Speaks',
    body:    'Your AI entity is trained on everything deposited. Your grandchildren will be able to ask it how you thought about a hard decision. It answers from your archive.',
    href:    '/asset',
    visual:  'linear-gradient(135deg, #EDE5D8 0%, #D8C8A5 40%, #B8A078 100%)',
  },
]

export default function HowItWorksSection() {
  return (
    <section
      aria-label="How Basalith works"
      style={{
        background: 'var(--color-surface-alt)',
        padding:    'clamp(80px,12vw,160px) 0',
        overflow:   'hidden',
      }}
    >
      {/* Header */}
      <div
        data-reveal
        style={{
          padding:      '0 clamp(24px,6vw,80px)',
          marginBottom: '80px',
        }}
      >
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
            marginBottom:  '20px',
          }}
        >
          <span style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }} aria-hidden="true" />
          The Process
        </p>
        <h2
          style={{
            fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:     'var(--text-h1)',
            fontWeight:   300,
            lineHeight:   1.15,
            color:        'var(--color-text-primary)',
            maxWidth:     '560px',
            margin:       '0 0 16px',
          }}
        >
          A living model.
          <br />
          Built over a lifetime.
        </h2>
        <p
          style={{
            fontFamily:  'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:    '1.1rem',
            fontStyle:   'italic',
            fontWeight:  300,
            lineHeight:  1.8,
            color:       'var(--color-text-muted)',
            maxWidth:    '440px',
            margin:      0,
          }}
        >
          The longer the entity learns the more accurately it thinks.
          Start now. Give it time.
        </p>
      </div>

      {/* Steps — alternating layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {STEPS.map(({ n, title, body, href, visual }, i) => {
          const even = i % 2 === 0
          return (
            <div
              key={n}
              data-reveal
              style={{
                display:             'grid',
                gridTemplateColumns: '1fr 1fr',
                minHeight:           '400px',
              }}
            >
              {/* Visual */}
              <div
                aria-hidden="true"
                style={{
                  order:      even ? 1 : 2,
                  background: visual,
                  position:   'relative',
                  overflow:   'hidden',
                }}
              >
                <div
                  style={{
                    position:   'absolute',
                    inset:      '20px',
                    border:     '1px solid rgba(184,150,62,0.2)',
                    pointerEvents: 'none',
                  }}
                />
              </div>

              {/* Text */}
              <div
                style={{
                  order:          even ? 2 : 1,
                  display:        'flex',
                  flexDirection:  'column',
                  justifyContent: 'center',
                  padding:        'clamp(40px,6vw,80px) clamp(24px,6vw,80px)',
                  background:     even ? 'var(--color-surface-alt)' : 'var(--color-surface)',
                }}
              >
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
                    fontSize:     'var(--text-h3)',
                    fontWeight:   500,
                    lineHeight:   1.2,
                    color:        'var(--color-text-primary)',
                    marginBottom: '16px',
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    fontFamily:  'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
                    fontSize:    'var(--text-body)',
                    fontWeight:  300,
                    lineHeight:  1.85,
                    color:       'var(--color-text-secondary)',
                    marginBottom: '24px',
                    maxWidth:    '400px',
                  }}
                >
                  {body}
                </p>
                <Link
                  href={href}
                  style={{
                    fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
                    fontSize:      '0.52rem',
                    letterSpacing: '0.25em',
                    textTransform: 'uppercase' as const,
                    color:         'var(--color-gold)',
                    textDecoration: 'none',
                    display:       'inline-flex',
                    alignItems:    'center',
                    gap:           '8px',
                  }}
                >
                  Learn more <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      <style>{`
        @media (max-width: 768px) {
          /* Collapse 2-col to 1-col */
          section[aria-label="How Basalith works"] div[style*="grid-template-columns: 1fr 1fr"],
          section[aria-label="How Basalith works"] > div[style*="minHeight: '400px'"],
          section[aria-label="How Basalith works"] div[style*="minHeight"] {
            grid-template-columns: 1fr !important;
            min-height: unset !important;
          }
          /* Visual block always on top */
          section[aria-label="How Basalith works"] div[aria-hidden="true"] {
            order: 1 !important;
            min-height: 200px !important;
          }
          /* Text block always below */
          section[aria-label="How Basalith works"] div[aria-hidden="true"] ~ div {
            order: 2 !important;
          }
          /* Also for odd rows where text comes first in DOM */
          section[aria-label="How Basalith works"] div:not([aria-hidden="true"]):has(~ div[aria-hidden="true"]) {
            order: 2 !important;
          }
          /* Ensure inner padding on mobile */
          section[aria-label="How Basalith works"] div[style*="justifyContent: 'center'"] {
            padding: 32px 24px !important;
          }
          /* Header section */
          section[aria-label="How Basalith works"] > div:first-child {
            padding: 0 24px 48px !important;
          }
        }
      `}</style>
    </section>
  )
}
