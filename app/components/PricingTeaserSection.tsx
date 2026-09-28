'use client'

import Link from 'next/link'

const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono)',
  fontSize:      'var(--text-caption)',
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
}

export default function PricingTeaserSection() {
  return (
    <section className="section-dark"
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
          fontFamily:    'var(--font-newsreader), Georgia, serif',
          fontSize:      'var(--text-h2)',
          fontWeight: 400,
          lineHeight:    1.3,
          color:         'var(--on-dark)',
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
          fontFamily:   'var(--font-newsreader), Georgia, serif',
          fontSize:     'clamp(1.05rem, 2vw, 1.2rem)',
          fontStyle:    'italic',
          fontWeight: 400,
          lineHeight:   1.85,
          color:        'var(--on-dark-3)',
          maxWidth:     '400px',
          margin:       '0 auto 48px',
        }}
      >
        <p style={{ marginBottom: '8px' }}>We built this for families</p>
        <p style={{ marginBottom: '24px' }}>not billionaires.</p>
        <p style={{ margin: 0, color: 'var(--on-dark-2)' }}>The Estate is $3,600 a year.</p>
      </div>

      <Link
        href="/apply"
        style={{
          ...MONO,
          display:        'inline-block',
          color:          'var(--btn-label)',
          textDecoration: 'none',
          background:     'var(--btn)',
          padding:        '14px 32px',
          borderRadius:   'var(--radius-sm)',
          transition:     'background 250ms ease',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--btn-hover)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--btn)'}
      >
        Begin Your Application
      </Link>
    </section>
  )
}
