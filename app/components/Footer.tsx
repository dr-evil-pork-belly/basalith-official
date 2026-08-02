// No 'use client'. Hover and focus are CSS, so this renders as a server
// component in the 20 routes that import it from a server page, and carries no
// client JS there. The 9 client-component consumers still bundle it, which is
// why the copyright year comes from a build-time constant rather than
// new Date() (see COPYRIGHT_YEAR below).

const COLS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: 'Solutions',
    links: [
      { label: 'Acquisition',      href: '/apply?type=acquisition' },
      { label: 'Succession',       href: '/succession'             },
      { label: 'Founding Session', href: '/founding-session'       },
      { label: 'Pricing',          href: '/pricing'                },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About',      href: '/about'   },
      { label: 'The Method', href: '/method'  },
      { label: 'Contact',    href: '/contact' },
      { label: 'FAQ',        href: '/faq'     },
    ],
  },
  {
    heading: 'Trust',
    links: [
      { label: 'The Integrity Promise', href: '/integrity'      },
      { label: 'Security',              href: '/security'       },
      { label: 'Data Ownership',        href: '/data-ownership' },
      { label: 'Privacy Policy',        href: '/privacy'        },
      { label: 'Terms of Service',      href: '/terms'          },
    ],
  },
]

// Injected by next.config.ts at build time. new Date().getFullYear() read the
// visitor's system clock in every client-rendered tree, so a machine with a
// wrong date showed a wrong year. The literal is a floor, not the source.
const COPYRIGHT_YEAR = process.env.NEXT_PUBLIC_COPYRIGHT_YEAR ?? '2026'

const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  letterSpacing: '0.2em',
  textTransform: 'uppercase' as const,
}

const SERIF = 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)'

// Every value below is measured against --void #0A0908. Contrast ratios are in
// the table in globals.css. Nothing here drops under 4.5:1.
const C = {
  wordmark: 'rgba(250,250,248,0.9)',  // 15.34:1
  brandLine:'rgba(250,250,248,0.6)',  //  7.06:1
  heading:  'rgba(250,250,248,0.55)', //  6.06:1
  link:     'rgba(250,250,248,0.65)', //  8.16:1
  reg:      'rgba(250,250,248,0.6)',  //  7.06:1
  regLink:  'rgba(250,250,248,0.75)', // 10.69:1
  copy:     'rgba(250,250,248,0.55)', //  6.06:1
}

export default function Footer() {
  return (
    <footer style={{ background: 'var(--color-void)' }}>

      {/* Main footer grid. Four children in four tracks. */}
      <div
        className="bsl-ft-grid"
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
              fontSize:      '0.72rem',
              letterSpacing: '0.3em',
              color:         C.wordmark,
              marginBottom:  '28px',
              fontWeight:    700,
            }}
          >
            Basalith
          </p>
          <p
            style={{
              fontFamily: SERIF,
              fontSize:   '0.9rem',
              fontStyle:  'italic',
              fontWeight: 300,
              lineHeight: 1.7,
              color:      C.brandLine,
              maxWidth:   '220px',
            }}
          >
            The infrastructure of human continuation.
          </p>
        </div>

        {/* Link columns */}
        {COLS.map(({ heading, links }) => (
          <div key={heading}>
            <p style={{ ...MONO, fontSize: '0.7rem', color: C.heading, marginBottom: '20px' }}>
              {heading}
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {links.map(({ label, href }) => (
                <li key={label}>
                  <a
                    className="bsl-ft-link"
                    href={href}
                    style={{
                      fontFamily:     SERIF,
                      fontSize:       '0.95rem',
                      fontWeight:     300,
                      color:          C.link,
                      display:        'block',
                      textDecoration: 'none',
                    }}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Company registration */}
      <div
        style={{
          borderTop: '1px solid rgba(250,250,248,0.04)',
          padding:   '32px clamp(24px,6vw,80px) 0',
          textAlign: 'center',
        }}
      >
        <p style={{ ...MONO, fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'none', color: C.reg, lineHeight: 2 }}>
          Heritage Nexus Inc.<br />
          Registered in Delaware, United States.<br />
          <a className="bsl-ft-link" href="mailto:hello@basalith.xyz" style={{ color: C.regLink, textDecoration: 'none' }}>
            hello@basalith.xyz
          </a>
        </p>
      </div>

      {/* Copyright */}
      <div style={{ padding: '20px clamp(24px,6vw,80px)', textAlign: 'center' }}>
        <p style={{ ...MONO, fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'none', color: C.copy }}>
          &copy; {COPYRIGHT_YEAR} Heritage Nexus Inc. All rights reserved. Wilmington, Delaware.
        </p>
      </div>

      <style>{`
        .bsl-ft-link { transition: color 200ms ease; }
        .bsl-ft-link:hover { color: rgba(250,250,248,0.95) !important; }
        .bsl-ft-link:focus-visible {
          color: rgba(250,250,248,0.95) !important;
          outline: 2px solid var(--color-gold);
          outline-offset: 3px;
        }
        @media (prefers-reduced-motion: reduce) {
          .bsl-ft-link { transition: none; }
        }
        @media (max-width: 900px) {
          .bsl-ft-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 32px !important;
            padding: 48px 24px !important;
          }
        }
        @media (max-width: 600px) {
          .bsl-ft-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
            padding: 48px 24px !important;
          }
        }
      `}</style>
    </footer>
  )
}
