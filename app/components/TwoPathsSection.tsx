'use client'

import Link from 'next/link'

const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  fontSize:      '0.52rem',
  letterSpacing: '0.3em',
  textTransform: 'uppercase' as const,
}
const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}

export default function TwoPathsSection() {
  return (
    <section
      aria-label="Who Basalith is for"
      style={{
        background: 'var(--color-bg)',
        padding:    'clamp(80px,12vw,140px) clamp(24px,6vw,80px)',
      }}
    >
      <div style={{ maxWidth: '1040px', margin: '0 auto' }}>

        {/* Eyebrow */}
        <p style={{ ...MONO, color: 'var(--color-gold)', marginBottom: '48px' }}>
          WHO BASALITH IS FOR
        </p>

        {/* Two cards */}
        <div className="two-paths-grid" style={{
          display:             'grid',
          gridTemplateColumns: '1fr 1fr',
          gap:                 '24px',
        }}>

          {/* Legacy card */}
          <div style={{
            border:        '1px solid var(--color-border-medium)',
            padding:       'clamp(32px,4vw,52px)',
            background:    'var(--color-surface)',
            display:       'flex',
            flexDirection: 'column',
          }}>
            <p style={{ ...MONO, color: 'var(--color-gold)', marginBottom: '20px' }}>
              LEGACY
            </p>
            <h2 style={{
              ...SERIF,
              fontSize:     'clamp(1.5rem,2.5vw,2.1rem)',
              fontWeight:   300,
              lineHeight:   1.15,
              color:        'var(--color-text-primary)',
              marginBottom: '20px',
            }}>
              Your parents know things they have never written down.
            </h2>
            <p style={{
              ...SERIF,
              fontSize:     '1.05rem',
              fontStyle:    'italic',
              fontWeight:   300,
              lineHeight:   1.85,
              color:        'var(--color-text-secondary)',
              marginBottom: '32px',
              flex:         1,
            }}>
              Your children will spend years trying to understand how they thought. Basalith gives them the answer while there is still time to get it right.
            </p>
            <Link
              href="/apply"
              style={{
                ...MONO,
                display:        'inline-block',
                color:          '#0A0908',
                textDecoration: 'none',
                background:     'var(--color-gold)',
                padding:        '14px 28px',
                alignSelf:      'flex-start',
                transition:     'background 250ms ease',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-gold-light)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-gold)'}
            >
              Begin Your Archive &rarr;
            </Link>
          </div>

          {/* Succession card */}
          <div style={{
            border:        '1px solid rgba(184,150,62,0.3)',
            padding:       'clamp(32px,4vw,52px)',
            background:    'rgba(184,150,62,0.04)',
            display:       'flex',
            flexDirection: 'column',
          }}>
            <p style={{ ...MONO, color: 'var(--color-gold)', marginBottom: '20px' }}>
              SUCCESSION
            </p>
            <h2 style={{
              ...SERIF,
              fontSize:     'clamp(1.5rem,2.5vw,2.1rem)',
              fontWeight:   300,
              lineHeight:   1.15,
              color:        'var(--color-text-primary)',
              marginBottom: '20px',
            }}>
              Your founder built this with a way of thinking that exists nowhere in your documentation.
            </h2>
            <p style={{
              ...SERIF,
              fontSize:     '1.05rem',
              fontStyle:    'italic',
              fontWeight:   300,
              lineHeight:   1.85,
              color:        'var(--color-text-secondary)',
              marginBottom: '32px',
              flex:         1,
            }}>
              When they step back that thinking goes with them. Unless you build a Basalith.
            </p>
            <Link
              href="/succession"
              style={{
                ...MONO,
                display:        'inline-block',
                color:          'var(--color-gold)',
                textDecoration: 'none',
                background:     'transparent',
                padding:        '13px 27px',
                border:         '1px solid var(--color-gold)',
                alignSelf:      'flex-start',
                transition:     'background 250ms ease, color 250ms ease',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'var(--color-gold)'
                el.style.color = '#0A0908'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'transparent'
                el.style.color = 'var(--color-gold)'
              }}
            >
              Learn About Succession &rarr;
            </Link>
          </div>

        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .two-paths-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}
