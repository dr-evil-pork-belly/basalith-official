'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const links = [
  { href: '/method',            label: 'The Method' },
  { href: '/asset',             label: 'The Asset'  },
  { href: '/continuity',        label: 'Continuity' },
  { href: '/pricing',           label: 'Pricing'    },
  { href: '/about',             label: 'About'      },
  { href: '/archive-login',     label: 'My Archive' },
  { href: '/join-archivists',   label: 'Partners'   },
]

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 48)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <nav
        aria-label="Primary"
        className={[
          'fixed inset-x-0 top-0 z-[100] flex items-center justify-between',
          'px-8 md:px-16 transition-all duration-300',
          scrolled
            ? 'py-4 bg-obsidian-void/95 backdrop-blur-lg border-b border-border-subtle'
            : 'py-6 bg-gradient-to-b from-obsidian-void/90 to-transparent',
        ].join(' ')}
      >
        <Link href="/" className="font-sans text-[0.8rem] font-bold tracking-[0.24em] uppercase text-text-primary no-underline flex items-baseline gap-0">
          Basalith
          <span style={{ color: 'rgba(196,162,74,0.5)', margin: '0 0.3em' }} aria-hidden="true">·</span>
          <span style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--text-muted)', fontSize: '0.85em', textTransform: 'lowercase', letterSpacing: '0.08em' }}>xyz</span>
        </Link>

        <ul className="hidden md:flex items-center gap-10 list-none m-0 p-0">
          {links.map(({ href, label }) => (
            <li key={label}>
              <a href={href} className="font-sans text-[0.72rem] font-medium tracking-[0.1em] uppercase text-text-muted no-underline transition-colors duration-200 hover:text-text-primary">
                {label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4">
          <a
            href="/archive-login"
            style={{
              fontFamily:    "'Space Mono', 'DM Mono', monospace",
              fontSize:      '0.42rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase' as const,
              color:         '#B8B4AB',
              textDecoration: 'none',
              border:        '1px solid rgba(196,162,74,0.4)',
              padding:       '0.4rem 1.2rem',
              background:    'transparent',
              transition:    'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(196,162,74,0.9)'
              ;(e.currentTarget as HTMLElement).style.color = '#C4A24A'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(196,162,74,0.4)'
              ;(e.currentTarget as HTMLElement).style.color = '#B8B4AB'
            }}
          >
            Sign In
          </a>
          <button
            className="md:hidden flex flex-col justify-center items-center gap-[5px] w-8 h-8"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            <span className={['block h-px w-5 bg-text-primary transition-all duration-300', open ? 'rotate-45 translate-y-[6px]' : ''].join(' ')} />
            <span className={['block h-px w-5 bg-text-primary transition-all duration-300', open ? 'opacity-0' : ''].join(' ')} />
            <span className={['block h-px w-5 bg-text-primary transition-all duration-300', open ? '-rotate-45 -translate-y-[6px]' : ''].join(' ')} />
          </button>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-[99] bg-obsidian-void flex flex-col items-center justify-center gap-10 md:hidden">
          {links.map(({ href, label }) => (
            <a key={label} href={href} onClick={() => setOpen(false)} className="font-serif text-[2rem] font-medium text-text-primary no-underline tracking-[-0.02em] hover:text-amber transition-colors duration-200">
              {label}
            </a>
          ))}
          <a
            href="/apply"
            onClick={() => setOpen(false)}
            style={{
              fontFamily:    "'Space Mono', 'DM Mono', monospace",
              fontSize:      '0.44rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase' as const,
              color:         '#C4A24A',
              textDecoration: 'none',
              borderTop:     '1px solid rgba(196,162,74,0.15)',
              paddingTop:    '1rem',
              marginTop:     '1rem',
            }}
          >
            Request Your Founding →
          </a>
        </div>
      )}
    </>
  )
}
