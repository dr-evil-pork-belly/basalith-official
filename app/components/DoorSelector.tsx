'use client'

const DOORS = [
  { href: '#loss',       label: 'For families facing loss'  },
  { href: '#legacy',     label: 'For intentional builders'  },
  { href: '#technology', label: 'For the forward-thinking'  },
]

export default function DoorSelector() {
  return (
    <div
      style={{
        background:   'var(--color-bg)',
        borderTop:    '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        padding:      '14px clamp(24px,6vw,80px)',
      }}
    >
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            'clamp(16px,3vw,32px)',
          flexWrap:       'wrap',
        }}
      >
        {DOORS.map(({ href, label }, i) => (
          <span key={href} style={{ display: 'flex', alignItems: 'center', gap: 'clamp(16px,3vw,32px)' }}>
            {i > 0 && (
              <span
                aria-hidden="true"
                style={{
                  color:      'rgba(184,150,62,0.3)',
                  fontSize:   '0.6rem',
                  flexShrink: 0,
                }}
              >
                ·
              </span>
            )}
            <a
              href={href}
              style={{
                fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
                fontSize:      '0.48rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase' as const,
                color:         'var(--color-text-muted)',
                textDecoration: 'none',
                transition:    'color 200ms ease',
                whiteSpace:    'nowrap',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-gold)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'}
            >
              {label}
            </a>
          </span>
        ))}
      </div>
    </div>
  )
}
