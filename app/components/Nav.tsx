'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LanguageSelector from './LanguageSelector'

const DESKTOP_LINKS = [
  { href: '/method',     label: 'The Method' },
  { href: '/asset',      label: 'The Asset'  },
  { href: '/pricing',    label: 'Pricing'    },
  { href: '/about',      label: 'About'      },
]

const MOBILE_LINKS = [
  { href: '/pricing',         label: 'Pricing'               },
  { href: '/about',           label: 'About'                 },
  { href: '/method',          label: 'The Method'            },
  { href: '/founding-session',label: 'Founding Session'      },
  { href: '/join-archivists', label: 'Become a Legacy Guide' },
  { href: '/apply',           label: 'Apply'                 },
  { href: '/archive-login',   label: 'Client Login'          },
]

export default function Nav() {
  const pathname  = usePathname()
  const isHome    = pathname === '/'

  const [scrolled,  setScrolled]  = useState(false)
  const [pastHero,  setPastHero]  = useState(false)
  const [open,      setOpen]      = useState(false)

  useEffect(() => {
    const fn = () => {
      setScrolled(window.scrollY > 40)
      setPastHero(window.scrollY > window.innerHeight * 0.8)
    }
    fn() // run once on mount so SSR matches client
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const MONO: React.CSSProperties = {
    fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
    fontSize:      '0.56rem',
    letterSpacing: '0.22em',
    textTransform: 'uppercase' as const,
  }

  // On homepage: use light text over the dark opening section, switch to dark after pastHero.
  // On all other pages: always dark text regardless of scroll position.
  const useLightText  = isHome && !pastHero

  const wordmarkColor = useLightText ? 'rgba(250,250,248,0.9)'  : 'var(--color-text-primary)'
  const linkColor     = useLightText ? 'rgba(250,250,248,0.65)' : 'var(--color-text-muted)'
  const linkHover     = useLightText ? 'rgba(250,250,248,0.95)' : 'var(--color-text-primary)'

  // On homepage: transparent dark bg → light frosted after pastHero.
  // On other pages: always light frosted (opaque enough to be readable).
  const navBg = isHome
    ? (pastHero
        ? (scrolled ? 'rgba(250,250,248,0.96)' : 'transparent')
        : (scrolled ? 'rgba(10,9,8,0.65)'      : 'transparent'))
    : (scrolled ? 'rgba(250,250,248,0.97)' : 'rgba(250,250,248,0.94)')

  const navShadow = (!isHome || (scrolled && pastHero)) ? '0 1px 0 rgba(26,24,20,0.06)' : 'none'

  return (
    <>
      <nav
        aria-label="Primary navigation"
        style={{
          position:       'fixed',
          inset:          '0 0 auto 0',
          zIndex:         100,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          paddingTop:     `max(${scrolled ? '18px' : '28px'}, calc(${scrolled ? '18px' : '28px'} + env(safe-area-inset-top, 0px)))`,
          paddingBottom:  scrolled ? '18px' : '28px',
          paddingLeft:    'clamp(24px,6vw,80px)',
          paddingRight:   'clamp(24px,6vw,80px)',
          background:     navBg,
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          boxShadow:      navShadow,
          transition:     'all 400ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Wordmark */}
        <Link
          href="/"
          style={{
            ...MONO,
            fontSize:       '0.62rem',
            letterSpacing:  '0.32em',
            color:          wordmarkColor,
            textDecoration: 'none',
            fontWeight:     700,
            transition:     'color 400ms ease',
          }}
        >
          Basalith
        </Link>

        {/* Desktop links — hidden on mobile */}
        <ul
          className="hidden md:flex"
          style={{ alignItems: 'center', gap: '40px', listStyle: 'none', margin: 0, padding: 0 }}
        >
          {DESKTOP_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                style={{
                  ...MONO,
                  color:          linkColor,
                  textDecoration: 'none',
                  transition:     'color 200ms ease',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = linkHover}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = linkColor}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Language selector — desktop only */}
          <div className="hidden md:block">
            <LanguageSelector variant={useLightText ? 'dark' : 'light'} />
          </div>

          {/* Client login — desktop only */}
          <Link
            href="/archive-login"
            className="hidden md:block"
            style={{
              ...MONO,
              color:          linkColor,
              textDecoration: 'none',
              transition:     'color 200ms ease',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = linkHover}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = linkColor}
          >
            Client Login
          </Link>

          {/* Begin CTA — desktop only */}
          <Link
            href="/apply"
            className="hidden md:block"
            style={{
              ...MONO,
              color:          'var(--color-surface)',
              textDecoration: 'none',
              background:     'var(--color-gold)',
              padding:        '11px 24px',
              borderRadius:   'var(--radius-sm)',
              transition:     'background 250ms ease',
              whiteSpace:     'nowrap',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-gold-light)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-gold)'}
          >
            Begin
          </Link>

          {/* Hamburger — mobile only */}
          <button
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="md:hidden"
            style={{
              background:     'none',
              border:         'none',
              cursor:         'pointer',
              padding:        '10px',
              width:          44,
              height:         44,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              flexShrink:     0,
            }}
          >
            <svg width="24" height="18" viewBox="0 0 24 18" fill="none" aria-hidden="true">
              <line x1="0" y1="1"  x2="24" y2="1"  stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="0" y1="9"  x2="24" y2="9"  stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="0" y1="17" x2="24" y2="17" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile full-screen overlay */}
      {open && (
        <div
          style={{
            position:      'fixed',
            inset:         0,
            zIndex:        999,
            background:    'var(--color-void)',
            display:       'flex',
            flexDirection: 'column',
            paddingTop:    'max(24px, env(safe-area-inset-top, 24px))',
            paddingBottom: 'max(32px, env(safe-area-inset-bottom, 32px))',
            paddingLeft:   '0',
            paddingRight:  '0',
            animation:     'mobileMenuIn 280ms cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          {/* Top row: wordmark + close */}
          <div
            style={{
              display:        'flex',
              justifyContent: 'space-between',
              alignItems:     'center',
              padding:        '0 24px 32px',
            }}
          >
            <span
              style={{
                fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
                fontSize:      '0.62rem',
                letterSpacing: '0.32em',
                textTransform: 'uppercase' as const,
                fontWeight:    700,
                color:         'rgba(250,250,248,0.3)',
              }}
            >
              Basalith
            </span>
            <button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              style={{
                background:     'none',
                border:         'none',
                cursor:         'pointer',
                width:          44,
                height:         44,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                color:          'var(--color-gold)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <line x1="1" y1="1" x2="17" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="17" y1="1" x2="1"  y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Nav links */}
          <nav aria-label="Mobile navigation" style={{ flex: 1, overflowY: 'auto' }}>
            {MOBILE_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                style={{
                  fontFamily:     'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
                  fontSize:       '2rem',
                  fontWeight:     300,
                  color:          'rgba(250,250,248,0.85)',
                  textDecoration: 'none',
                  display:        'block',
                  padding:        '18px 24px',
                  borderBottom:   '1px solid rgba(250,250,248,0.06)',
                  lineHeight:     1.2,
                  transition:     'color 200ms ease',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-gold)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(250,250,248,0.85)'}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Language selector */}
          <div style={{ padding: '24px 24px 20px' }}>
            <LanguageSelector variant="dark" />
          </div>

          {/* Begin CTA */}
          <div style={{ padding: '0 24px' }}>
            <Link
              href="/apply"
              onClick={() => setOpen(false)}
              style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                fontFamily:     'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
                fontSize:       '0.6rem',
                letterSpacing:  '0.3em',
                textTransform:  'uppercase' as const,
                color:          'var(--color-void)',
                textDecoration: 'none',
                background:     'var(--color-gold)',
                padding:        '0 32px',
                height:         '56px',
                borderRadius:   'var(--radius-sm)',
              }}
            >
              Begin
            </Link>
          </div>
        </div>
      )}

      <style>{`
        @keyframes mobileMenuIn {
          from { opacity: 0; transform: translateX(100%); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
