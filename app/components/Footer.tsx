'use client'

import { useTranslation } from '@/app/hooks/useTranslation'

const COLS: { heading: string; links: { label: string; href?: string }[] }[] = [
  {
    heading: 'Archives',
    links: [
      { label: 'The Estate',       href: '/pricing'          },
      { label: 'The Dynasty',      href: '/pricing'          },
      { label: 'The Archive',      href: '/pricing'          },
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
      { label: 'Glendora, California'                                   },
      { label: 'Est. 2026'                                              },
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
  const { t } = useTranslation()
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
              fontSize:     '0.62rem',
              letterSpacing: '0.3em',
              color:         'rgba(250,250,248,0.9)',
              marginBottom:  '14px',
              fontWeight:    700,
            }}
          >
            Basalith
          </p>
          <p
            style={{
              fontFamily:  'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
              fontSize:    '0.95rem',
              fontStyle:   'italic',
              fontWeight:  300,
              lineHeight:  1.9,
              color:       'rgba(250,250,248,0.4)',
              maxWidth:    '240px',
              marginBottom: '28px',
              whiteSpace:  'pre-line',
            }}
          >
            {t('footer.tagline')}
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
                  fontFamily:  'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
                  fontSize:    '0.95rem',
                  fontWeight:  300,
                  color:       'rgba(250,250,248,0.4)',
                  display:     'block',
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

      {/* Bottom bar */}
      <div
        style={{
          display:         'flex',
          justifyContent:  'space-between',
          alignItems:      'center',
          padding:         '20px clamp(24px,6vw,80px)',
          borderTop:       '1px solid rgba(250,250,248,0.04)',
          flexWrap:        'wrap',
          gap:             '12px',
        }}
      >
        <p style={{ ...MONO, fontSize: '0.46rem', color: 'rgba(250,250,248,0.2)' }}>
          &copy; {new Date().getFullYear()} Heritage Nexus Inc. All rights reserved.
        </p>
        <p
          style={{
            fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:   '0.9rem',
            fontStyle:  'italic',
            fontWeight: 300,
            color:      'rgba(184,150,62,0.4)',
          }}
        >
          {t('footer.bottom_note')}
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
          footer > div:last-of-type {
            flex-direction: column !important;
            align-items: flex-start !important;
            padding: 20px 24px !important;
            padding-bottom: max(20px, env(safe-area-inset-bottom, 0px)) !important;
          }
        }
      `}</style>
    </footer>
  )
}
