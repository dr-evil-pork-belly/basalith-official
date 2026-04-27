'use client'

import Link from 'next/link'

const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  fontSize:      'var(--text-caption)',
  letterSpacing: '0.35em',
  textTransform: 'uppercase' as const,
}

export default function TechnologySection() {
  return (
    <section
      id="technology"
      data-reveal
      aria-label="For the forward-thinking"
      style={{
        background: 'var(--color-void)',
        padding:    'clamp(80px,12vw,140px) clamp(24px,6vw,80px)',
        textAlign:  'center',
      }}
    >
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* Eyebrow */}
        <p
          style={{
            ...MONO,
            color:        'var(--color-gold)',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            gap:          '12px',
            marginBottom: '40px',
          }}
        >
          <span style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }} aria-hidden="true" />
          For Those Who See What Is Coming
          <span style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }} aria-hidden="true" />
        </p>

        {/* Headline */}
        <h2
          style={{
            fontFamily:    'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:      'clamp(1.75rem, 4vw, 3rem)',
            fontWeight:    300,
            lineHeight:    1.25,
            letterSpacing: '-0.02em',
            color:         'rgba(250,250,248,0.9)',
            marginBottom:  '48px',
          }}
        >
          The most sophisticated AI
          <br />
          in the world can learn
          <br />
          to think like you.
        </h2>

        {/* Body */}
        <div
          style={{
            fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:     '1.15rem',
            fontStyle:    'italic',
            fontWeight:   300,
            lineHeight:   1.9,
            marginBottom: '56px',
          }}
        >
          <p style={{ color: 'rgba(250,248,244,0.5)', marginBottom: '14px' }}>
            The question is not whether this technology exists.
          </p>
          <p style={{ color: 'rgba(250,248,244,0.8)', marginBottom: '28px', fontSize: '1.25rem' }}>
            It does.
          </p>
          <p style={{ color: 'rgba(250,248,244,0.5)', marginBottom: '28px' }}>
            The question is whether you give it enough to learn from
            <br />
            while you still can.
          </p>
          <p style={{ color: 'rgba(250,248,244,0.4)', marginBottom: '14px' }}>
            Every year you wait is a year the entity has less to work with.
          </p>
          <p style={{ color: 'rgba(250,248,244,0.6)', margin: 0 }}>
            Every year you begin is a year it has more.
          </p>
        </div>

        {/* Gold rule */}
        <div aria-hidden="true" style={{ width: '40px', height: '1px', background: 'var(--color-gold)', margin: '0 auto 48px' }} />

        {/* Stat block */}
        <div style={{ marginBottom: '56px' }}>
          <p
            style={{
              fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
              fontStyle:    'italic',
              fontWeight:   300,
              fontSize:     '1.05rem',
              lineHeight:   1.9,
              color:        'rgba(250,248,244,0.35)',
              marginBottom: '12px',
            }}
          >
            The average person waits until they are 71
            <br />
            to think about their legacy.
          </p>
          <p
            style={{
              fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
              fontStyle:  'italic',
              fontWeight: 300,
              fontSize:   '1.1rem',
              lineHeight: 1.9,
              color:      'rgba(196,162,74,0.7)',
              margin:     0,
            }}
          >
            The average Basalith client begins at 58.
          </p>
        </div>

        {/* CTA */}
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
          Begin While You Can
        </Link>

      </div>
    </section>
  )
}
