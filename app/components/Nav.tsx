'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const LINKS = [
  { href: '/method',     label: 'The Method'  },
  { href: '/asset',      label: 'The Asset'   },
  { href: '/pricing',    label: 'Pricing'     },
  { href: '/about',      label: 'About'       },
]

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open,     setOpen]     = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
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

  return (
    <>
      <nav
        aria-label="Primary navigation"
        style={{
          position:        'fixed',
          inset:           '0 0 auto 0',
          zIndex:          100,
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'space-between',
          paddingTop:      `max(${scrolled ? '18px' : '28px'}, calc(${scrolled ? '18px' : '28px'} + env(safe-area-inset-top, 0px)))`,
          paddingBottom:   scrolled ? '18px' : '28px',
          paddingLeft:     'clamp(24px,6vw,80px)',
          paddingRight:    'clamp(24px,6vw,80px)',
          background:      scrolled ? 'rgba(250,250,248,0.96)' : 'transparent',
          backdropFilter:  scrolled ? 'blur(12px)' : 'none',
          boxShadow:       scrolled ? '0 1px 0 rgba(26,24,20,0.06)' : 'none',
          transition:      'all 400ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Wordmark */}
        <Link
          href="/"
          style={{
            ...MONO,
            fontSize:      '0.62rem',
            letterSpacing: '0.32em',
            color:         'var(--color-text-primary)',
            textDecoration: 'none',
            fontWeight:    700,
          }}
        >
          Basalith
        </Link>

        {/* Desktop links */}
        <ul style={{ display: 'flex', alignItems: 'center', gap: '40px', listStyle: 'none', margin: 0, padding: 0 }} className="hidden md:flex">
          {LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                style={{
                  ...MONO,
                  color:          'var(--color-text-muted)',
                  textDecoration: 'none',
                  transition:     'color 200ms ease',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Archive sign in */}
          <Link
            href="/archive-login"
            className="hidden md:block"
            style={{
              ...MONO,
              color:          'var(--color-text-muted)',
              textDecoration: 'none',
              transition:     'color 200ms ease',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'}
          >
            My Archive
          </Link>

          {/* Primary CTA */}
          <Link
            href="/apply"
            className="hidden md:block"
            style={{
              ...MONO,
              color:          'var(--color-surface)',
              textDecoration: 'none',
              background:     'var(--color-void)',
              padding:        '11px 24px',
              borderRadius:   'var(--radius-sm)',
              transition:     'background 250ms ease',
              whiteSpace:     'nowrap',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(26,24,20,0.8)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-void)'}
          >
            Request Founding
          </Link>

          {/* Hamburger */}
          <button
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="md:hidden"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', flexDirection: 'column', gap: '5px', width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}
          >
            <span style={{ display: 'block', height: '1px', width: '100%', background: 'var(--color-text-primary)', transition: 'all 300ms ease', transform: open ? 'rotate(45deg) translate(4px, 4px)' : 'none' }} />
            <span style={{ display: 'block', height: '1px', width: '100%', background: 'var(--color-text-primary)', transition: 'all 300ms ease', opacity: open ? 0 : 1 }} />
            <span style={{ display: 'block', height: '1px', width: '100%', background: 'var(--color-text-primary)', transition: 'all 300ms ease', transform: open ? 'rotate(-45deg) translate(4px, -4px)' : 'none' }} />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div
          style={{
            position:       'fixed',
            inset:          0,
            zIndex:         99,
            background:     'var(--color-bg)',
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            '40px',
          }}
        >
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              style={{
                fontFamily:     'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
                fontSize:       '2rem',
                fontWeight:     300,
                color:          'var(--color-text-primary)',
                textDecoration: 'none',
                letterSpacing:  '-0.01em',
              }}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/archive-login"
            onClick={() => setOpen(false)}
            style={{
              fontFamily:     'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
              fontSize:       '2rem',
              fontWeight:     300,
              color:          'var(--color-text-muted)',
              textDecoration: 'none',
            }}
          >
            My Archive
          </Link>
          <Link
            href="/apply"
            onClick={() => setOpen(false)}
            style={{
              fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
              fontSize:      '0.6rem',
              letterSpacing: '0.28em',
              textTransform: 'uppercase' as const,
              color:         'var(--color-surface)',
              textDecoration: 'none',
              background:    'var(--color-void)',
              padding:       '14px 32px',
              borderRadius:  'var(--radius-sm)',
              marginTop:     '8px',
            }}
          >
            Request Your Founding
          </Link>
        </div>
      )}
    </>
  )
}
