'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const links = [
  { href: '#comparison', label: 'The Method' },
  { href: '#asset',      label: 'The Asset'  },
  { href: '#continuity', label: 'Continuity' },
  { href: '/about',      label: 'About'      },
  { href: '/pricing',    label: 'Pricing'    },
  { href: '/partner',    label: 'Partners'   },
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
          <a href="/login" className="font-sans text-[0.72rem] font-medium tracking-[0.1em] uppercase text-text-muted no-underline transition-colors duration-200 hover:text-text-primary">Sign In</a>
          <a href="/begin/tier" className="btn-monolith-amber !py-2.5 !px-5 !text-[0.72rem]">Begin Archive</a>
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
          <a href="/begin/tier" onClick={() => setOpen(false)} className="btn-monolith-amber mt-4">Begin Archive</a>
        </div>
      )}
    </>
  )
}