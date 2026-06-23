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

// The second door. B2C is deliberately secondary to the business spine, so this
// reads quieter than the sections above. Carries the #audience anchor that the
// shared scroll helper targets.
export default function SecondDoorSection() {
  return (
    <section
      id="audience"
      aria-label="The second door"
      style={{
        background: 'var(--color-bg)',
        padding:    'clamp(64px,9vw,110px) clamp(24px,6vw,80px)',
        borderTop:  '1px solid var(--color-border)',
      }}
    >
      <div style={{ maxWidth: '620px', margin: '0 auto' }}>
        <p style={{ ...MONO, color: 'var(--color-text-muted)', marginBottom: '20px' }}>
          The second door
        </p>
        <h2
          style={{
            ...SERIF,
            fontSize:   'clamp(1.6rem,2.8vw,2.2rem)',
            fontWeight: 300,
            lineHeight: 1.2,
            color:      'var(--color-text-primary)',
            margin:     '0 0 20px',
          }}
        >
          Basalith began with families.
        </h2>
        <p style={{ ...SERIF, fontSize: '1.05rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.8, color: 'var(--color-text-secondary)', margin: '0 0 28px' }}>
          Before it was a way to hand forward how a business is run, it was a way to preserve how a person thinks while they are still here to get it right. That path is still open. The method is the same.
        </p>
        <Link
          href="/apply"
          style={{
            ...MONO,
            display:        'inline-flex',
            alignItems:     'center',
            gap:            '8px',
            color:          'var(--color-gold-on-light)',
            textDecoration: 'none',
            border:         '1px solid var(--color-border-medium)',
            padding:        '12px 24px',
          }}
        >
          For individuals and families <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </section>
  )
}
