'use client'

import Link from 'next/link'

export default function ClosingSection() {
  return (
    <section
      data-reveal
      aria-label="Begin"
      style={{
        background: 'var(--color-void)',
        padding:    'clamp(80px,12vw,140px) clamp(24px,6vw,80px)',
        textAlign:  'center',
      }}
    >
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>

        <div
          style={{
            fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontStyle:    'italic',
            fontWeight:   300,
            lineHeight:   2.0,
            marginBottom: '56px',
          }}
        >
          <p style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)', color: 'rgba(250,250,248,0.7)', marginBottom: '24px' }}>
            Your family will talk to you
            <br />
            long after you are gone.
          </p>
          <p style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)', color: 'rgba(250,250,248,0.5)', marginBottom: '32px' }}>
            Or they will wonder.
          </p>
          <p style={{ fontSize: 'clamp(1.1rem, 2vw, 1.3rem)', color: 'rgba(250,250,248,0.35)' }}>
            The difference
            <br />
            is whether you begin.
          </p>
        </div>

        <Link
          href="/apply"
          style={{
            display:       'inline-block',
            fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
            fontSize:      'var(--text-caption)',
            letterSpacing: '0.3em',
            textTransform: 'uppercase' as const,
            color:         'var(--color-surface)',
            textDecoration: 'none',
            background:    'var(--color-gold)',
            padding:       '14px 40px',
            borderRadius:  'var(--radius-sm)',
            transition:    'background 250ms ease',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-gold-light)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-gold)'}
        >
          Begin
        </Link>

      </div>
    </section>
  )
}
