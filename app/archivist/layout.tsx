'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const NAV = [
  { label: 'Dashboard',   href: '/archivist/dashboard'   },
  { label: 'My Pipeline', href: '/archivist/pipeline'    },
  { label: 'Earnings',    href: '/archivist/earnings'    },
  { label: 'Leaderboard', href: '/archivist/leaderboard' },
  { label: 'Training',    href: '/archivist/training'    },
  { label: 'Resources',   href: '/archivist/resources'   },
]

export default function ArchivistLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0C0C0D' }}>

      {/* Top header */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-border-subtle"
        style={{ background: '#111112' }}
      >
        <Link
          href="/"
          className="font-sans text-[0.75rem] font-bold tracking-[0.24em] uppercase text-text-primary no-underline inline-flex items-baseline gap-0"
        >
          Basalith
          <span style={{ color: 'rgba(196,162,74,0.5)', margin: '0 0.3em' }} aria-hidden="true">&middot;</span>
          <span style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--text-muted)', fontSize: '0.85em', textTransform: 'lowercase', letterSpacing: '0.08em' }}>xyz</span>
        </Link>
        <span
          className="font-sans font-bold tracking-[0.22em] uppercase"
          style={{ fontSize: '0.55rem', color: '#C4A24A' }}
        >
          Legacy Guide Portal
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar — desktop */}
        <aside
          className="hidden md:flex flex-shrink-0 flex-col w-52 border-r border-border-subtle"
          style={{ background: '#111112' }}
        >
          <nav className="flex-1 py-6 px-3 flex flex-col gap-0.5">
            <a
              href="/archivist/onboard"
              className="flex items-center justify-center font-sans text-[0.72rem] font-bold tracking-[0.12em] uppercase no-underline mb-4 py-2.5 px-3 rounded-sm transition-all duration-150"
              style={{ background: '#C4A24A', color: '#0A0908' }}
            >
              + New Client
            </a>
            {NAV.map(({ label, href }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center font-sans text-[0.75rem] font-medium tracking-[0.04em] px-3 py-2.5 rounded-sm no-underline transition-all duration-150"
                  style={{
                    color:       active ? '#F0F0EE' : '#5C6166',
                    background:  active ? 'rgba(255,255,255,0.05)' : 'transparent',
                    borderLeft:  `2px solid ${active ? '#C4A24A' : 'transparent'}`,
                    paddingLeft: '10px',
                  }}
                >
                  {label}
                </Link>
              )
            })}
          </nav>
          <div className="px-3 py-5 border-t border-border-subtle">
            <a
              href="/api/archivist-signout"
              className="flex items-center font-sans text-[0.72rem] text-text-muted hover:text-text-secondary tracking-[0.04em] no-underline transition-colors duration-200 px-3 py-2"
            >
              Sign Out
            </a>
          </div>
        </aside>

        {/* Mobile nav strip */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <nav
            className="md:hidden flex-shrink-0 overflow-x-auto border-b border-border-subtle"
            style={{ background: '#111112' }}
          >
            <div className="flex gap-0 min-w-max">
              <a
                href="/archivist/onboard"
                className="font-sans text-[0.68rem] font-bold tracking-[0.06em] px-4 py-3 no-underline flex-shrink-0"
                style={{ color: '#C4A24A', borderBottom: '2px solid rgba(196,162,74,0.5)' }}
              >
                + New Client
              </a>
              {NAV.map(({ label, href }) => {
                const active = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    className="font-sans text-[0.68rem] font-medium tracking-[0.06em] px-4 py-3 no-underline flex-shrink-0 transition-colors duration-150"
                    style={{
                      color:        active ? '#F0F0EE' : '#5C6166',
                      borderBottom: `2px solid ${active ? '#C4A24A' : 'transparent'}`,
                    }}
                  >
                    {label}
                  </Link>
                )
              })}
              <a
                href="/api/archivist-signout"
                className="font-sans text-[0.68rem] tracking-[0.06em] px-4 py-3 no-underline flex-shrink-0 transition-colors duration-150"
                style={{ color: '#5C6166', borderBottom: '2px solid transparent' }}
              >
                Sign Out
              </a>
            </div>
          </nav>

          <main className="flex-1 overflow-auto p-6 md:p-10">
            {children}
          </main>
        </div>

      </div>
    </div>
  )
}
