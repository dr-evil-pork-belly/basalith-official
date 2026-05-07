'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const NAV = [
  { label: 'Dashboard',     href: '/archivist/dashboard',      icon: '⬡' },
  { label: 'My Practice',   href: '/archivist/pipeline',       icon: '◈' },
  { label: 'Earnings',      href: '/archivist/earnings',       icon: '◇' },
  { label: 'Marketing',     href: '/archivist/marketing',      icon: '◻' },
  { label: 'Certification', href: '/archivist/certification',  icon: '◎' },
  { label: 'Settings',      href: '/archivist/settings',       icon: '⚙' },
]

export default function ArchivistLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0A0908' }}>

      {/* ── Left Sidebar ── */}
      <aside
        className="hidden md:flex"
        style={{
          width:       '220px',
          flexShrink:  0,
          background:  '#0F0E0D',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display:     'flex',
          flexDirection: 'column',
        }}
      >
        {/* Wordmark */}
        <div style={{ padding: '28px 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'block' }}>
            <p style={{
              fontFamily:    'Courier New, monospace',
              fontSize:      '0.65rem',
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color:         '#C4A24A',
              fontWeight:    700,
            }}>
              Basalith
            </p>
            <p style={{
              fontFamily:    'Courier New, monospace',
              fontSize:      '0.52rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color:         'rgba(255,255,255,0.18)',
              marginTop:     '3px',
            }}>
              Guide Portal
            </p>
          </Link>
        </div>

        {/* New Client CTA */}
        <div style={{ padding: '16px 16px 8px' }}>
          <Link
            href="/archivist/onboard"
            style={{
              display:       'block',
              textAlign:     'center',
              fontFamily:    'Courier New, monospace',
              fontSize:      '0.62rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color:         '#0A0908',
              background:    '#C4A24A',
              padding:       '10px 12px',
              textDecoration: 'none',
              fontWeight:    700,
            }}
          >
            + New Client
          </Link>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {NAV.map(({ label, href, icon }) => {
            const active = pathname?.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display:       'flex',
                  alignItems:    'center',
                  gap:           '10px',
                  fontFamily:    'Courier New, monospace',
                  fontSize:      '0.7rem',
                  letterSpacing: '0.06em',
                  color:         active ? '#F0EDE6' : '#5C6166',
                  background:    active ? 'rgba(196,162,74,0.08)' : 'transparent',
                  borderLeft:    `2px solid ${active ? '#C4A24A' : 'transparent'}`,
                  padding:       '9px 10px',
                  textDecoration: 'none',
                  transition:    'all 0.12s',
                }}
              >
                <span style={{ fontSize: '0.9rem', opacity: active ? 1 : 0.4 }}>{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Sign Out */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <a
            href="/api/archivist-signout"
            style={{
              display:       'block',
              fontFamily:    'Courier New, monospace',
              fontSize:      '0.62rem',
              letterSpacing: '0.08em',
              color:         '#3A3F44',
              textDecoration: 'none',
              padding:       '6px 10px',
            }}
          >
            Sign Out →
          </a>
        </div>
      </aside>

      {/* ── Mobile top nav ── */}
      <div className="md:hidden" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}>
        <div style={{ background: '#0F0E0D', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.65rem', letterSpacing: '0.28em', color: '#C4A24A', fontWeight: 700 }}>BASALITH</p>
          <Link href="/archivist/onboard" style={{ fontFamily: 'Courier New, monospace', fontSize: '0.6rem', letterSpacing: '0.12em', color: '#0A0908', background: '#C4A24A', padding: '6px 12px', textDecoration: 'none' }}>
            + New
          </Link>
        </div>
        <nav style={{ background: '#0F0E0D', borderBottom: '1px solid rgba(255,255,255,0.04)', overflowX: 'auto', display: 'flex', gap: 0 }}>
          {NAV.map(({ label, href }) => {
            const active = pathname?.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                style={{
                  fontFamily:    'Courier New, monospace',
                  fontSize:      '0.6rem',
                  letterSpacing: '0.06em',
                  color:         active ? '#F0EDE6' : '#5C6166',
                  borderBottom:  `2px solid ${active ? '#C4A24A' : 'transparent'}`,
                  padding:       '10px 14px',
                  textDecoration: 'none',
                  whiteSpace:    'nowrap',
                  flexShrink:    0,
                }}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* ── Main content ── */}
      <main
        className="flex-1 overflow-auto"
        style={{ paddingTop: 0 }}
      >
        <div className="md:hidden" style={{ height: '88px' }} />
        {children}
      </main>

    </div>
  )
}
