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
      <p
        style={{
          ...MONO,
          fontSize:     '0.52rem',
          color:        'var(--color-gold)',
          marginBottom: '32px',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          gap:          '12px',
        }}
      >
        <span style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }} aria-hidden="true" />
        Stewardship Pricing
        <span style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }} aria-hidden="true" />
      </p>

      <h2
        style={{
          fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
          fontSize:     'var(--text-h2)',
          fontWeight:   300,
          lineHeight:   1.3,
          color:        'rgba(250,250,248,0.9)',
          marginBottom: '48px',
          letterSpacing: '-0.01em',
        }}
      >
        The Estate begins at $2,500.
      </h2>

      <p
        style={{
          fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
          fontSize:     '1.1rem',
          fontStyle:    'italic',
          fontWeight:   300,
          lineHeight:   1.8,
          color:        'rgba(250,250,248,0.45)',
          maxWidth:     '480px',
          margin:       '0 auto 48px',
        }}
      >
        Annual stewardship from $1,200. Generational preservation for families
        who understand that memory is an asset.
      </p>

      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
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
        <Link
          href="/pricing"
          style={{
            ...MONO,
            display:        'inline-block',
            color:          'rgba(250,250,248,0.7)',
            textDecoration: 'none',
            background:     'transparent',
            padding:        '13px 31px',
            border:         '1px solid rgba(250,250,248,0.15)',
            borderRadius:   'var(--radius-sm)',
            transition:     'border-color 250ms ease, color 250ms ease',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor = 'rgba(250,250,248,0.4)'
            el.style.color       = 'rgba(250,250,248,0.95)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor = 'rgba(250,250,248,0.15)'
            el.style.color       = 'rgba(250,250,248,0.7)'
          }}
        >
          View Full Pricing
        </Link>
      </div>
    </section>
  )
}
