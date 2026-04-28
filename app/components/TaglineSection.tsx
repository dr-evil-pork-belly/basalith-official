'use client'

import Link from 'next/link'

export default function TaglineSection({
  variant = 'light',
}: {
  variant?: 'light' | 'dark'
}) {
  const isLight = variant === 'light'

  return (
    <section
      data-reveal
      aria-label="Tagline"
      style={{
        background: isLight ? 'var(--color-bg)' : 'var(--color-void)',
        padding:    isLight ? 'clamp(56px,8vw,96px) 24px' : 'clamp(72px,10vw,120px) 24px',
        textAlign:  'center',
        borderBottom: isLight ? '1px solid var(--color-border)' : 'none',
      }}
    >
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* Gold rule above */}
        <div
          aria-hidden="true"
          style={{
            width:      '40px',
            height:     '1px',
            background: 'var(--color-gold)',
            margin:     `0 auto ${isLight ? '32px' : '40px'}`,
          }}
        />

        {/* Tagline */}
        <p
          style={{
            fontFamily:    'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:      isLight
              ? 'clamp(1.5rem, 4vw, 2.75rem)'
              : 'clamp(1.75rem, 5vw, 3.5rem)',
            fontWeight:    300,
            fontStyle:     'italic',
            color:         isLight
              ? 'var(--color-text-primary)'
              : 'rgba(250,250,248,0.95)',
            lineHeight:    1.45,
            margin:        `0 0 ${isLight ? '32px' : '40px'}`,
            letterSpacing: '-0.01em',
          }}
        >
          &ldquo;You never truly leave
          <br />
          if you leave enough
          <br />
          of yourself behind.&rdquo;
        </p>

        {/* Gold rule below */}
        <div
          aria-hidden="true"
          style={{
            width:      '40px',
            height:     '1px',
            background: 'var(--color-gold)',
            margin:     isLight ? '0 auto' : '0 auto 48px',
          }}
        />

        {/* Dark variant gets a CTA */}
        {!isLight && (
          <Link
            href="/apply"
            style={{
              display:       'inline-block',
              fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
              fontSize:      'var(--text-caption)',
              letterSpacing: '0.3em',
              textTransform: 'uppercase' as const,
              color:         'var(--color-void)',
              textDecoration: 'none',
              background:    'var(--color-gold)',
              padding:       '16px 40px',
              borderRadius:  'var(--radius-sm)',
              transition:    'background 250ms ease',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-gold-light)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-gold)'}
          >
            Begin
          </Link>
        )}

      </div>
    </section>
  )
}
