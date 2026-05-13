'use client'

import { useLanguage } from '@/app/context/LanguageContext'

const COLS: { heading: string; links: { label: string; href?: string }[] }[] = [
  {
    heading: 'Archives',
    links: [
      { label: 'Active',           href: '/pricing'          },
      { label: 'Resting',          href: '/pricing'          },
      { label: 'Legacy',           href: '/pricing'          },
      { label: 'Founding Session', href: '/founding-session' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About',                  href: '/about'           },
      { label: 'The Method',             href: '/method'          },
      { label: 'Become a Legacy Guide',  href: '/join-archivists' },
      { label: 'Apply',                  href: '/apply'           },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy',   href: '/privacy'        },
      { label: 'Terms of Service', href: '/terms'          },
      { label: 'Data Ownership',   href: '/data-ownership' },
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
              ...MONO,
              fontSize:     '0.46rem',
              color:        'rgba(250,250,248,0.2)',
              marginBottom: '10px',
            }}
          >
            The Basalith Ecosystem
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {['basalith.life', 'basalith.ai'].map(domain => (
              <a
                key={domain}
                href={`https://${domain}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...MONO,
                  fontSize:       '0.48rem',
                  color:          'rgba(184,150,62,0.5)',
                  textDecoration: 'none',
                  transition:     'color 200ms ease',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-gold)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(184,150,62,0.5)'}
              >
                {domain} →
              </a>
            ))}
          </div>
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

      {/* Divider + centered tagline */}
      <div
        style={{
          borderTop:  '1px solid rgba(250,250,248,0.04)',
          padding:    '32px 24px 0',
          textAlign:  'center',
        }}
      >
        <p
          style={{
            fontFamily:  'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:    'clamp(0.9rem, 2vw, 1.1rem)',
            fontStyle:   'italic',
            fontWeight:  300,
            lineHeight:  1.7,
            color:       'var(--color-text-muted)',
            maxWidth:    '480px',
            margin:      '0 auto',
            whiteSpace:  'pre-line',
          }}
        >
          {t('footer.tagline')}
        </p>
      </div>

      {/* Copyright */}
      <div
        style={{
          padding:    '20px clamp(24px,6vw,80px)',
          textAlign:  'center',
        }}
      >
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
