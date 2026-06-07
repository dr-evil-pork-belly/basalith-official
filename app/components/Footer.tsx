'use client'

import { useLanguage } from '@/app/context/LanguageContext'

const COLS: { heading: string; links: { label: string; href?: string }[] }[] = [
  {
    heading: 'Plans',
    links: [
      { label: 'Active',           href: '/pricing'          },
      { label: 'Resting',          href: '/pricing'          },
      { label: 'Legacy',           href: '/pricing'          },
      { label: 'Succession',       href: '/succession'       },
      { label: 'Founding Session', href: '/founding-session' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About',                 href: '/about'           },
      { label: 'The Method',            href: '/method'          },
      { label: 'For Business',          href: '/succession'      },
      { label: 'Become a Legacy Guide', href: '/join-archivists' },
      { label: 'Apply',                 href: '/apply'           },
      { label: 'Press',                 href: '/press'           },
    ],
  },
  {
    heading: 'Trust',
    links: [
      { label: 'The Integrity Promise', href: '/integrity'      },
      { label: 'The Immutability Vault',href: '/integrity'      },
      { label: 'Privacy Policy',        href: '/privacy'        },
      { label: 'Terms of Service',      href: '/terms'          },
      { label: 'Security',              href: '/security'       },
      { label: 'Data Ownership',        href: '/data-ownership' },
    ],
  },
  {
    heading: 'Contact',
    links: [
      { label: 'hello@basalith.xyz', href: 'mailto:hello@basalith.xyz' },
      { label: 'Heritage Nexus Inc.'                                    },
    ],
  },
]

const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  fontSize:      '0.52rem',
  letterSpacing: '0.2em',
  textTransform: 'uppercase' as const,
}

export default function Footer() {
  const { t } = useLanguage()
  return (
    <footer style={{ background: 'var(--color-void)' }}>

      {/* Main footer grid */}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: '1.6fr 1fr 1fr 1fr',
          gap:                 '48px',
          padding:             'clamp(60px,8vw,96px) clamp(24px,6vw,80px)',
          borderTop:           '1px solid rgba(250,250,248,0.06)',
        }}
      >
        {/* Brand column */}
        <div>
          <p
            style={{
              ...MONO,
              fontSize:      '0.62rem',
              letterSpacing: '0.3em',
              color:         'rgba(250,250,248,0.9)',
              marginBottom:  '28px',
              fontWeight:    700,
            }}
          >
            Basalith
          </p>
          <p
            style={{
              fontFamily:  'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
              fontSize:    '0.9rem',
              fontStyle:   'italic',
              fontWeight:  300,
              lineHeight:  1.7,
              color:       'rgba(250,250,248,0.3)',
              maxWidth:    '220px',
            }}
          >
            The infrastructure of human continuation.
          </p>
        </div>

        {/* Link columns */}
        {COLS.map(({ heading, links }) => (
          <div key={heading}>
            <p
              style={{
                ...MONO,
                fontSize:     '0.46rem',
                color:        'rgba(250,250,248,0.25)',
                marginBottom: '20px',
              }}
            >
              {heading}
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {links.map(({ label, href }) => {
                const baseStyle: React.CSSProperties = {
                  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
                  fontSize:   '0.95rem',
                  fontWeight: 300,
                  color:      'rgba(250,250,248,0.4)',
                  display:    'block',
                }
                return (
                  <li key={label}>
                    {href ? (
                      <a
                        href={href}
                        {...(href.startsWith('http') || href.startsWith('mailto')
                          ? { target: '_blank', rel: 'noopener noreferrer' }
                          : {})}
                        style={{ ...baseStyle, textDecoration: 'none', transition: 'color 200ms ease' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(250,250,248,0.85)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(250,250,248,0.4)'}
                      >
                        {label}
                      </a>
                    ) : (
                      <span style={baseStyle}>{label}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Tagline */}
      <div
        style={{
          borderTop: '1px solid rgba(250,250,248,0.04)',
          padding:   '32px 24px 0',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:   'clamp(0.9rem, 2vw, 1.1rem)',
            fontStyle:  'italic',
            fontWeight: 300,
            lineHeight: 1.7,
            color:      'var(--color-text-muted)',
            margin:     0,
          }}
        >
          You never truly leave
        </p>
        <p
          style={{
            fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:   'clamp(0.9rem, 2vw, 1.1rem)',
            fontStyle:  'italic',
            fontWeight: 300,
            lineHeight: 1.7,
            color:      'var(--color-text-muted)',
            margin:     0,
          }}
        >
          if you leave enough of yourself behind.
        </p>
      </div>

      {/* Company registration */}
      <div style={{ padding: '28px clamp(24px,6vw,80px) 0', textAlign: 'center' }}>
        <p style={{ ...MONO, fontSize: '0.46rem', letterSpacing: '0.14em', textTransform: 'none', color: 'rgba(250,250,248,0.42)', lineHeight: 2 }}>
          Heritage Nexus Inc.<br />
          Registered in Delaware, United States.<br />
          <a href="mailto:hello@basalith.xyz" style={{ color: 'rgba(250,250,248,0.55)', textDecoration: 'none' }}>hello@basalith.xyz</a>
        </p>
      </div>

      {/* Copyright */}
      <div style={{ padding: '20px clamp(24px,6vw,80px)', textAlign: 'center' }}>
        <p style={{ ...MONO, fontSize: '0.44rem', color: 'rgba(250,250,248,0.18)' }}>
          &copy; {new Date().getFullYear()} Heritage Nexus Inc. All rights reserved. Wilmington, Delaware.
        </p>
      </div>

      <style>{`
        @media (max-width: 900px) {
          footer > div:first-of-type {
            grid-template-columns: 1fr 1fr !important;
            gap: 32px !important;
            padding: 48px 24px !important;
          }
        }
        @media (max-width: 600px) {
          footer > div:first-of-type {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
            padding: 48px 24px !important;
          }
        }
      `}</style>
    </footer>
  )
}
