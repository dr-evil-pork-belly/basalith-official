'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

type VaultMeta = { display_name: string } | null

export default function CuratorLayout({ children }: { children: React.ReactNode }) {
  const router  = useRouter()
  const [vault, setVault]     = useState<VaultMeta>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    async function verify() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      // Fetch curator's vault name via their profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('vault_id')
        .eq('id', user.id)
        .single()

      if (profile?.vault_id) {
        const { data: vaultData } = await supabase
          .from('vaults')
          .select('display_name')
          .eq('id', profile.vault_id)
          .single()
        setVault(vaultData ?? null)
      }

      setChecked(true)
    }
    verify()
  }, [router])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!checked) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <span className="ai-dot" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-obsidian flex flex-col">

      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-obsidian border-b border-border-subtle">
        <div className="max-w-6xl mx-auto px-6 md:px-10 h-14 flex items-center justify-between gap-4">

          {/* Left — wordmark + portal label */}
          <div className="flex items-center gap-3">
            <a href="/curator" className="font-serif text-[1.1rem] font-semibold text-text-primary tracking-[-0.01em]">
              Basalith
            </a>
            <span className="hidden sm:block font-sans text-[0.6rem] font-bold tracking-[0.16em] uppercase text-amber-dim border border-amber/20 bg-amber/[0.05] px-2 py-0.5 rounded-sm">
              Curator Portal
            </span>
          </div>

          {/* Right — vault name + sign out */}
          <div className="flex items-center gap-4">
            {vault && (
              <p className="hidden sm:block font-sans text-[0.75rem] text-text-muted truncate max-w-[180px]">
                {vault.display_name}
              </p>
            )}
            <button
              onClick={handleSignOut}
              className="font-sans text-[0.75rem] text-text-muted hover:text-text-primary transition-colors duration-200"
            >
              Sign Out
            </button>
          </div>

        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 md:px-10 py-10">
        {children}
      </main>

    </div>
  )
}
