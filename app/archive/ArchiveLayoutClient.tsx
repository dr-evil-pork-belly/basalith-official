'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import ArchiveSwitcher from './components/ArchiveSwitcher'

// Stone register. Every color is a var(--portal-*) read; the tokens live in
// the .portal-stone block in globals.css. No hex literal belongs in this file.
// Decision and measurements: docs/BASALITH_PORTAL_PALETTE_DECISION_2026-09-18.md.

const SERIF = 'var(--portal-serif)'
const MONO  = 'var(--portal-mono)'

// Mono is for eyebrows and group labels only, never below 11px. Depositors
// are often older and often on tablets.
const LABEL: React.CSSProperties = {
  fontFamily:    MONO,
  fontSize:      '11px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
}

type NavItem = { href: string; label: string; hideForSuccession?: boolean }

// TEMPORARY BRIDGE, slice 1 only. Routes not yet moved to stone still carry
// bone text literals and rely on this layout for their dark ground. Until
// their slice lands, the content area under those routes keeps the old void
// so nothing renders bone on stone in production. These are the only hex
// literals in the file; delete VOID_GROUND, VOID_TEXT and the branch in
// <main> when slice 3 lands. Slice plan: docs/PORTAL_STONE_SLICE_1_2026-09-18.md.
const STONE_ROUTES = ['/archive/dashboard', '/archive/founding']
const VOID_GROUND  = '#0C0B09'
const VOID_TEXT    = '#F0EDE6'

const PRIMARY_NAV: NavItem[] = [
  { href: '/archive/dashboard',         label: 'Dashboard'         },
  { href: '/archive/founding',          label: 'Founding Sequence' },
  { href: '/archive/label',             label: 'Upload photos',    hideForSuccession: true },
  { href: '/archive/gallery',           label: 'Gallery',          hideForSuccession: true },
  { href: '/archive/timeline',          label: 'Life timeline',    hideForSuccession: true },
  { href: '/archive/memory-map',        label: 'Memory map',       hideForSuccession: true },
  { href: '/archive/entity',            label: 'My entity'         },
  { href: '/archive/contributors',      label: 'Contributors'      },
]

const CONTRIBUTE_NAV: NavItem[] = [
  { href: '/archive/voice',        label: 'Voice'           },
  { href: '/archive/writing',      label: 'Writing'         },
  { href: '/archive/videos',       label: 'Videos',         hideForSuccession: true },
  { href: '/archive/upload',       label: 'Docs and videos' },
]

const MANAGE_NAV: NavItem[] = [
  { href: '/archive/dates',        label: 'Important dates', hideForSuccession: true },
  { href: '/archive/preferences',  label: 'Email delivery'  },
  { href: '/archive/succession',   label: 'Succession'      },
]

function NavGroup({ label, items, pathname }: { label: string; items: NavItem[]; pathname: string }) {
  return (
    <div style={{ padding: '10px 0 4px' }}>
      <p style={{ ...LABEL, color: 'var(--portal-label)', padding: '6px 26px 6px' }}>
        {label}
      </p>
      {items.map(({ href, label: itemLabel }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            style={{
              fontFamily:      SERIF,
              fontSize:        '16.5px',
              lineHeight:      1.2,
              fontWeight:      active ? 500 : 400,
              display:         'block',
              padding:         '9px 26px 9px 24px',
              color:           active ? 'var(--portal-ink)' : 'var(--portal-body)',
              textDecoration:  'none',
              background:      active ? 'var(--portal-gold-wash)' : 'transparent',
              borderLeft:      active ? '2px solid var(--portal-gold-ink)' : '2px solid transparent',
              transition:      'color 150ms ease, background 150ms ease',
            }}
            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--portal-ink)' }}
            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--portal-body)' }}
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

  const onStone = STONE_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))

  const primaryNav    = visible(PRIMARY_NAV)
  const contributeNav = visible(CONTRIBUTE_NAV)
  const manageNav     = visible(MANAGE_NAV)
  const allNav        = [...primaryNav, ...contributeNav, ...manageNav]

  const signOutLink: React.CSSProperties = {
    ...LABEL,
    letterSpacing:  '0.14em',
    color:          'var(--portal-label)',
    background:     'none',
    border:         'none',
    cursor:         'pointer',
    padding:        0,
    textDecoration: 'none',
    transition:     'color 150ms ease',
  }

  return (
    <div className="portal-stone" style={{ minHeight: '100svh', display: 'flex', background: 'var(--portal-bg)' }}>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex"
        style={{
          flexDirection:  'column',
          width:          '256px',
          flexShrink:     0,
          background:     'var(--portal-inset)',
          borderRight:    '1px solid var(--portal-rule)',
        }}
      >
        {/* Archive name */}
        <div style={{ padding: '30px 26px 22px', borderBottom: '1px solid var(--portal-rule)' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <p style={{ fontFamily: SERIF, fontSize: '19px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--portal-ink)', lineHeight: 1.2 }}>
              Basalith
            </p>
          </Link>
          <p style={{ ...LABEL, color: 'var(--portal-label)', marginTop: '6px' }}>
            Archive
          </p>
          <ArchiveSwitcher />
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, paddingTop: '8px', paddingBottom: '16px' }} aria-label="Archive navigation">
          {primaryNav.length > 0 && (
            <NavGroup label="Archive" items={primaryNav} pathname={pathname} />
          )}
          {contributeNav.length > 0 && (
            <NavGroup label="Contribute" items={contributeNav} pathname={pathname} />
          )}
          {manageNav.length > 0 && (
            <NavGroup label="Manage" items={manageNav} pathname={pathname} />
          )}
        </nav>

        {/* Sign out */}
        <div style={{ padding: '18px 26px', borderTop: '1px solid var(--portal-rule)' }}>
          {confirmSignOut ? (
            <div>
              <p style={{ fontFamily: SERIF, fontSize: '14.5px', color: 'var(--portal-secondary)', marginBottom: '8px' }}>Sign out of your archive?</p>
              <div style={{ display: 'flex', gap: '18px' }}>
                <a href="/api/auth/logout" style={{ ...signOutLink, color: 'var(--portal-gold-ink)' }}>Yes, sign out</a>
                <button onClick={() => setConfirmSignOut(false)} style={signOutLink}>Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmSignOut(true)}
              style={signOutLink}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--portal-ink)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--portal-label)'}
            >
              Sign out
            </button>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden" style={{ position: 'fixed', inset: '0 0 auto 0', zIndex: 50, background: 'var(--portal-inset)', borderBottom: '1px solid var(--portal-rule)', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: '56px' }}>
          <Link href="/" style={{ fontFamily: SERIF, fontSize: '17px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--portal-ink)', textDecoration: 'none', minHeight: '44px', display: 'flex', alignItems: 'center' }}>Basalith</Link>
          {/* Hamburger, 44px touch target */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            style={{ width: '44px', height: '44px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '5px', flexShrink: 0 }}
          >
            <span style={{ display: 'block', height: '1.5px', width: '22px', background: 'var(--portal-ink)', transition: 'all 250ms ease', transform: mobileOpen ? 'rotate(45deg) translate(4px, 4px)' : 'none' }} />
            <span style={{ display: 'block', height: '1.5px', width: '22px', background: 'var(--portal-ink)', transition: 'all 250ms ease', opacity: mobileOpen ? 0 : 1 }} />
            <span style={{ display: 'block', height: '1.5px', width: '22px', background: 'var(--portal-ink)', transition: 'all 250ms ease', transform: mobileOpen ? 'rotate(-45deg) translate(4px, -4px)' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Mobile full-screen menu overlay */}
      {mobileOpen && (
        <div
          className="md:hidden"
          style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'var(--portal-bg)', display: 'flex', flexDirection: 'column', paddingTop: 'calc(56px + env(safe-area-inset-top, 0px))', paddingBottom: 'env(safe-area-inset-bottom, 0px)', overflow: 'auto' }}
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
                  aria-current={active ? 'page' : undefined}
                  style={{
                    fontFamily:      SERIF,
                    fontSize:        isPrimary ? '19px' : '17px',
                    fontWeight:      active ? 500 : 400,
                    color:           active ? 'var(--portal-ink)' : isPrimary ? 'var(--portal-ink)' : 'var(--portal-secondary)',
                    textDecoration:  'none',
                    padding:         '0 24px',
                    minHeight:       '56px',
                    display:         'flex',
                    alignItems:      'center',
                    borderLeft:      active ? '2px solid var(--portal-gold-ink)' : '2px solid transparent',
                    background:      active ? 'var(--portal-gold-wash)' : 'transparent',
                  }}
                >
                  {lbl}
                </Link>
              )
            })}
            <div style={{ height: '1px', background: 'var(--portal-rule)', margin: '16px 24px' }} />
            {confirmSignOut ? (
              <div style={{ padding: '0 24px', display: 'flex', gap: '24px', alignItems: 'center', minHeight: '56px' }}>
                <a href="/api/auth/logout" style={{ ...signOutLink, fontSize: '12px', color: 'var(--portal-gold-ink)' }}>Yes, sign out</a>
                <button onClick={() => setConfirmSignOut(false)} style={{ ...signOutLink, fontSize: '12px' }}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmSignOut(true)} style={{ ...signOutLink, fontSize: '12px', padding: '0 24px', minHeight: '56px', textAlign: 'left' }}>
                Sign out
              </button>
            )}
          </nav>
        </div>
      )}

      {/* Page content */}
      <main
        className="portal-main flex-1 md:px-10 px-5 pb-16 md:mt-0 mt-[56px]"
        style={onStone
          ? { paddingTop: '40px', minWidth: 0 }
          : { paddingTop: '40px', minWidth: 0, background: VOID_GROUND, color: VOID_TEXT }}
      >
        {children}
      </main>

    </div>
  )
}
