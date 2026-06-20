'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import ArchiveSwitcher from './components/ArchiveSwitcher'

const P = '#0C0B09'   // portal bg
const S = '#141210'   // sidebar
const G = '#C4A24A'   // gold
const T = '#F0EDE6'   // text
const M = '#706C65'   // muted

const MONO: React.CSSProperties = {
  fontFamily:    '"Space Mono", "Courier New", monospace',
  fontSize:      '0.52rem',
  letterSpacing: '0.2em',
  textTransform: 'uppercase' as const,
}

type NavItem = { href: string; label: string; hideForSuccession?: boolean }

const PRIMARY_NAV: NavItem[] = [
  { href: '/archive/dashboard',         label: 'Dashboard'        },
  { href: '/archive/label',             label: 'Upload Photos',   hideForSuccession: true },
  { href: '/archive/gallery',           label: 'Gallery',         hideForSuccession: true },
  { href: '/archive/timeline',          label: 'Life Timeline',   hideForSuccession: true },
  { href: '/archive/memory-map',        label: 'Memory Map',      hideForSuccession: true },
  { href: '/archive/entity',            label: 'My Entity'        },
  { href: '/archive/wisdom-exchange',   label: 'Wisdom Exchange'  },
  { href: '/archive/contributors',      label: 'Contributors'     },
]

const CONTRIBUTE_NAV: NavItem[] = [
  { href: '/archive/voice',        label: 'Voice'            },
  { href: '/archive/writing',      label: 'Writing'          },
  { href: '/archive/videos',       label: 'Videos',          hideForSuccession: true },
  { href: '/archive/upload',       label: 'Docs & Videos'    },
  { href: '/archive/wisdom',       label: 'Wisdom Session',  hideForSuccession: true },
]

const MANAGE_NAV: NavItem[] = [
  { href: '/archive/dates',        label: 'Important Dates', hideForSuccession: true },
  { href: '/archive/preferences',  label: 'Email Delivery'   },
  { href: '/archive/scenarios',    label: 'Scenarios'        },
  { href: '/archive/succession',   label: 'Succession'       },
]

function NavGroup({ label, items, pathname }: { label: string; items: NavItem[]; pathname: string }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <p style={{ ...MONO, fontSize: '0.42rem', color: 'rgba(196,162,74,0.3)', padding: '8px 24px 6px', letterSpacing: '0.25em' }}>
        {label}
      </p>
      {items.map(({ href, label: itemLabel }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            style={{
              ...MONO,
              display:         'block',
              padding:         '10px 24px',
              color:           active ? G : 'rgba(240,237,230,0.45)',
              textDecoration:  'none',
              background:      active ? 'rgba(196,162,74,0.06)' : 'transparent',
              borderLeft:      active ? `2px solid ${G}` : '2px solid transparent',
              transition:      'all 200ms ease',
              position:        'relative',
            }}
            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(240,237,230,0.85)' }}
            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(240,237,230,0.45)' }}
          >
            {itemLabel}
          </Link>
        )
      })}
    </div>
  )
}

export default function ArchiveLayoutClient({ children, tier }: { children: React.ReactNode; tier: string | null }) {
  const pathname            = usePathname()
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [mobileOpen,    setMobileOpen]     = useState(false)

  // Succession archives hide the photo/timeline/media-heavy items. For every
  // other tier the nav is unchanged. One source of truth: the per-item
  // hideForSuccession flag above, filtered here.
  const isSuccession = tier === 'succession'
  const visible      = (items: NavItem[]) => items.filter(i => !(isSuccession && i.hideForSuccession))

  const primaryNav    = visible(PRIMARY_NAV)
  const contributeNav = visible(CONTRIBUTE_NAV)
  const manageNav     = visible(MANAGE_NAV)
  const allNav        = [...primaryNav, ...contributeNav, ...manageNav]

  const divider = <div style={{ height: '1px', background: 'rgba(196,162,74,0.04)', margin: '8px 24px' }} />

  return (
    <div style={{ minHeight: '100svh', display: 'flex', background: P }}>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex"
        style={{
          flexDirection:  'column',
          width:          '260px',
          flexShrink:     0,
          background:     S,
          borderRight:    '1px solid rgba(196,162,74,0.08)',
        }}
      >
        {/* Archive name */}
        <div style={{ padding: '32px 24px 24px', borderBottom: '1px solid rgba(196,162,74,0.06)' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <p style={{ ...MONO, fontSize: '0.48rem', color: G, marginBottom: '4px' }}>
              Basalith
            </p>
          </Link>
          <p style={{ ...MONO, fontSize: '0.42rem', color: 'rgba(112,108,101,0.7)', letterSpacing: '0.18em' }}>
            Archive Portal
          </p>
          <ArchiveSwitcher />
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, paddingTop: '16px', paddingBottom: '16px' }} aria-label="Archive navigation">
          {primaryNav.length > 0 && (
            <NavGroup label="Primary" items={primaryNav} pathname={pathname} />
          )}
          {contributeNav.length > 0 && (
            <>
              {primaryNav.length > 0 && divider}
              <NavGroup label="Contribute" items={contributeNav} pathname={pathname} />
            </>
          )}
          {manageNav.length > 0 && (
            <>
              {(primaryNav.length > 0 || contributeNav.length > 0) && divider}
              <NavGroup label="Manage" items={manageNav} pathname={pathname} />
            </>
          )}
        </nav>

        {/* Sign out */}
        <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(196,162,74,0.06)' }}>
          {confirmSignOut ? (
            <div>
              <p style={{ ...MONO, fontSize: '0.44rem', color: M, marginBottom: '8px' }}>Confirm sign out?</p>
              <div style={{ display: 'flex', gap: '16px' }}>
                <a href="/api/auth/logout" style={{ ...MONO, fontSize: '0.44rem', color: G, textDecoration: 'none' }}>Yes</a>
                <button onClick={() => setConfirmSignOut(false)} style={{ ...MONO, fontSize: '0.44rem', color: M, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmSignOut(true)}
              style={{ ...MONO, fontSize: '0.44rem', color: 'rgba(112,108,101,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 200ms ease' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = M}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(112,108,101,0.4)'}
            >
              Sign Out
            </button>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden" style={{ position: 'fixed', inset: '0 0 auto 0', zIndex: 50, background: S, borderBottom: '1px solid rgba(196,162,74,0.08)', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: '56px' }}>
          <Link href="/" style={{ ...MONO, fontSize: '0.52rem', color: T, textDecoration: 'none', minHeight: '44px', display: 'flex', alignItems: 'center' }}>Basalith</Link>
          {/* Hamburger — 44px touch target */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            style={{ width: '44px', height: '44px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '5px', flexShrink: 0 }}
          >
            <span style={{ display: 'block', height: '1px', width: '22px', background: T, transition: 'all 250ms ease', transform: mobileOpen ? 'rotate(45deg) translate(4px, 4px)' : 'none' }} />
            <span style={{ display: 'block', height: '1px', width: '22px', background: T, transition: 'all 250ms ease', opacity: mobileOpen ? 0 : 1 }} />
            <span style={{ display: 'block', height: '1px', width: '22px', background: T, transition: 'all 250ms ease', transform: mobileOpen ? 'rotate(-45deg) translate(4px, -4px)' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Mobile full-screen menu overlay */}
      {mobileOpen && (
        <div
          className="md:hidden"
          style={{ position: 'fixed', inset: 0, zIndex: 49, background: '#0C0B09', display: 'flex', flexDirection: 'column', paddingTop: 'calc(56px + env(safe-area-inset-top, 0px))', paddingBottom: 'env(safe-area-inset-bottom, 0px)', overflow: 'auto' }}
          onClick={e => { if (e.target === e.currentTarget) setMobileOpen(false) }}
        >
          <nav style={{ display: 'flex', flexDirection: 'column', padding: '16px 0' }} aria-label="Archive mobile navigation">
            {allNav.map(({ href, label: lbl }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              const isPrimary = PRIMARY_NAV.some(n => n.href === href)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    ...MONO,
                    fontSize:        isPrimary ? '0.62rem' : '0.54rem',
                    color:           active ? G : isPrimary ? T : 'rgba(196,162,74,0.5)',
                    textDecoration:  'none',
                    padding:         '0 24px',
                    minHeight:       '56px',
                    display:         'flex',
                    alignItems:      'center',
                    borderLeft:      active ? `2px solid ${G}` : '2px solid transparent',
                    background:      active ? 'rgba(196,162,74,0.06)' : 'transparent',
                  }}
                >
                  {lbl}
                </Link>
              )
            })}
            <div style={{ height: '1px', background: 'rgba(196,162,74,0.06)', margin: '16px 24px' }} />
            {confirmSignOut ? (
              <div style={{ padding: '0 24px', display: 'flex', gap: '24px', alignItems: 'center', minHeight: '56px' }}>
                <a href="/api/auth/logout" style={{ ...MONO, fontSize: '0.54rem', color: G, textDecoration: 'none' }}>Yes, sign out</a>
                <button onClick={() => setConfirmSignOut(false)} style={{ ...MONO, fontSize: '0.54rem', color: M, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmSignOut(true)} style={{ ...MONO, fontSize: '0.54rem', color: M, background: 'none', border: 'none', cursor: 'pointer', padding: '0 24px', minHeight: '56px', textAlign: 'left' }}>
                Sign Out
              </button>
            )}
          </nav>
        </div>
      )}

      {/* Page content */}
      <main className="flex-1 md:px-10 px-5 pb-16 md:mt-0 mt-[56px]" style={{ paddingTop: '40px' }}>
        {children}
      </main>

    </div>
  )
}
