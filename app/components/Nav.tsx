'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const links = [
  { href: '#comparison', label: 'The Method'  },
  { href: '#asset',      label: 'The Asset'   },
  { href: '#continuity', label: 'Continuity'  },
  { href: '/about',      label: 'About'       },
]

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 48)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
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
      {/* Logo */}
      <Link
        href="/"
        className="font-sans text-[0.8rem] font-bold tracking-[0.24em] uppercase text-text-primary no-underline"
      >
        Basalith
      </Link>

      {/* Links — hidden on mobile */}
      <ul className="hidden md:flex items-center gap-10 list-none m-0 p-0">
        {links.map(({ href, label }) => (
          <li key={label}>
            <a href={href} className="font-sans text-[0.72rem] font-medium tracking-[0.1em] uppercase text-text-muted no-underline transition-colors duration-200 hover:text-text-primary">
              {label}
            </a>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <a href="#cta" className="btn-monolith-amber !py-2.5 !px-5 !text-[0.72rem]">
        Begin Archive
      </a>
    </nav>
  )
}