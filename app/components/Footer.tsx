'use client'

const COLS = [
  {
    heading: 'Archives',
    links: [
      { label: 'The Founding Session', href: '/founding-session' },
      { label: 'The Method',           href: '/method'           },
      { label: 'The Asset',            href: '/asset'            },
      { label: 'Pricing',              href: '/pricing'          },
      { label: 'Witness Archive',      href: '/posthumous-archive' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About',            href: '/about'           },
      { label: 'Become a Guide',   href: '/join-archivists' },
      { label: 'Contact',          href: '/contact'         },
      { label: 'basalith.ai',      href: 'https://basalith.ai' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy',  href: '/privacy'         },
      { label: 'Terms of Service',href: '/terms'           },
      { label: 'Data Ownership',  href: '/data-ownership'  },
      { label: 'Continuity',      href: '/continuity'      },
      { label: 'Custodianship',   href: '/custodianship'   },
    ],
  },
  {
    heading: 'Contact',
    links: [
      { label: 'legacy@basalith.xyz',  href: 'mailto:legacy@basalith.xyz'  },
      { label: 'My Archive',           href: '/archive-login'              },
      { label: 'FAQ',                  href: '/faq'                        },
      { label: 'Apply',                href: '/apply'                      },
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
              fontSize:    '1rem',
              fontStyle:   'italic',
              fontWeight:  300,
              lineHeight:  1.75,
              color:       'rgba(250,250,248,0.4)',
              maxWidth:    '220px',
              marginBottom: '28px',
            }}
          >
            The archive of a life, governed with the same seriousness as an estate.
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
                const external = href.startsWith('http') || href.startsWith('mailto')
                const Tag      = 'a' as const
                return (
                  <li key={label}>
                    <Tag
                      href={href}
                      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      style={{
                        fontFamily:     'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
                        fontSize:       '0.95rem',
                        fontWeight:     300,
                        color:          'rgba(250,250,248,0.4)',
                        textDecoration: 'none',
                        transition:     'color 200ms ease',
                        display:        'block',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(250,250,248,0.85)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(250,250,248,0.4)'}
                    >
                      {label}
                    </Tag>
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
            fontFamily:    'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:      '0.9rem',
            fontStyle:     'italic',
            fontWeight:    300,
            color:         'rgba(184,150,62,0.4)',
          }}
        >
          The asset that never leaves.
        </p>
      </div>

      <style>{`
        @media (max-width: 900px) {
          footer > div:first-of-type {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 600px) {
          footer > div:first-of-type {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  )
}
