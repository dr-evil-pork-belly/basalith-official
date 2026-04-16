'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    label: 'Overview',
    href:  '/dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: 'Vault Health',
    href:  '/dashboard/vault',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v6c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
        <path d="M3 11v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6" />
      </svg>
    ),
  },
  {
    label: 'Curators',
    href:  '/dashboard/curators',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    label: 'Milestones',
    href:  '/dashboard/milestones',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    label: 'Files',
    href:  '/dashboard/files',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      </svg>
    ),
  },
]

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({ user, onClose }: { user: User | null; onClose?: () => void }) {
  const router   = useRouter()
  const pathname = usePathname()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const email     = user?.email ?? ''
  const shortEmail = email.length > 26 ? email.slice(0, 24) + '…' : email

  return (
    <aside
      className="flex flex-col h-full w-[220px] flex-shrink-0"
      style={{
        background:  '#1A1A1B',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Wordmark */}
      <div className="px-6 pt-8 pb-7 border-b border-border-subtle">
        <a href="/" className="block font-serif text-[1.1rem] font-semibold text-text-primary tracking-[-0.01em] no-underline mb-0.5">
          Basalith
        </a>
        <p className="font-sans text-[0.6rem] font-bold tracking-[0.18em] uppercase text-amber-dim">
          Legacy Guide Portal
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 flex flex-col gap-1" aria-label="Dashboard">
        {NAV_ITEMS.map(({ label, href, icon }) => {
          const active = pathname === href
          return (
            <a
              key={href}
              href={href}
              onClick={onClose}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-sm font-sans text-[0.78rem] font-medium no-underline transition-all duration-150',
                active
                  ? 'bg-amber/[0.09] text-amber border border-amber/[0.15]'
                  : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.03]',
              ].join(' ')}
            >
              <span className={active ? 'text-amber' : 'text-text-muted'}>{icon}</span>
              {label}
            </a>
          )
        })}
      </nav>

      {/* User + Sign out */}
      <div className="px-6 py-6 border-t border-border-subtle">
        <p className="font-sans text-[0.68rem] text-text-muted mb-3 truncate" title={email}>
          {shortEmail}
        </p>
        <button
          onClick={handleSignOut}
          className="font-sans text-[0.72rem] font-semibold tracking-[0.08em] uppercase text-text-muted hover:text-red-400 transition-colors duration-200"
        >
          Sign Out →
        </button>
      </div>
    </aside>
  )
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser]       = useState<User | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [ready, setReady]     = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/login')
        return
      }
      setUser(data.user)
      setReady(true)
    })
  }, [router])

  if (!ready) {
    // Minimal loading screen while we verify auth client-side
    return (
      <div className="min-h-screen bg-obsidian-void flex items-center justify-center">
        <span className="ai-dot" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-obsidian-void flex">

      {/* Desktop sidebar */}
      <div className="hidden md:flex h-screen sticky top-0 flex-shrink-0">
        <Sidebar user={user} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[200] md:hidden flex">
          <div className="flex h-full">
            <Sidebar user={user} onClose={() => setMobileOpen(false)} />
          </div>
          <div
            className="flex-1 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-obsidian sticky top-0 z-[100]">
          <span className="font-serif text-[1rem] font-semibold text-text-primary">Basalith</span>
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="flex flex-col gap-[5px] justify-center items-center w-8 h-8"
          >
            <span className="block h-px w-5 bg-text-primary" />
            <span className="block h-px w-5 bg-text-primary" />
            <span className="block h-px w-3.5 bg-text-primary self-start" />
          </button>
        </div>

        <main className="flex-1 px-6 md:px-10 py-10">
          {children}
        </main>
      </div>
    </div>
  )
}
