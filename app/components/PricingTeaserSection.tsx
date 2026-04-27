'use client'

import Link from 'next/link'

const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  fontSize:      'var(--text-caption)',
  letterSpacing: '0.3em',
  textTransform: 'uppercase' as const,
}

export default function PricingTeaserSection() {
  return (
    <section
      data-reveal
      aria-label="Pricing"
      style={{
        background: 'var(--color-void)',
        padding:    'clamp(80px,12vw,140px) clamp(24px,6vw,80px)',
        textAlign:  'center',
      }}
    >
      <h2
        style={{
          fontFamily:    'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
          fontSize:      'var(--text-h2)',
          fontWeight:    300,
          lineHeight:    1.3,
          color:         'rgba(250,250,248,0.9)',
          marginBottom:  '32px',
          letterSpacing: '-0.01em',
          maxWidth:      '560px',
          margin:        '0 auto 32px',
        }}
      >
        What is it worth
        <br />
        to never have to wonder?
      </h2>

      <div
        style={{
          fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
          fontSize:     'clamp(1.05rem, 2vw, 1.2rem)',
          fontStyle:    'italic',
          fontWeight:   300,
          lineHeight:   1.85,
          color:        'rgba(250,250,248,0.4)',
          maxWidth:     '400px',
          margin:       '0 auto 48px',
        }}
      >
        <p style={{ marginBottom: '8px' }}>We built this for families</p>
        <p style={{ marginBottom: '24px' }}>not billionaires.</p>
        <p style={{ margin: 0, color: 'rgba(250,250,248,0.6)' }}>The Estate is $3,600 a year.</p>
      </div>

      <Link
        href="/apply"
        style={{
          ...MONO,
          display:        'inline-block',
          color:          'var(--color-surface)',
          textDecoration: 'none',
          background:     'var(--color-gold)',
          padding:        '14px 32px',
          borderRadius:   'var(--radius-sm)',
          transition:     'background 250ms ease',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-gold-light)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-gold)'}
      >
        Begin Your Application
      </Link>
    </section>
  )
}
