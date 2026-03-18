'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Nav    from '../../components/Nav'
import Footer from '../../components/Footer'
import { createClient } from '@/lib/supabase-browser'

type VaultInfo = {
  display_name: string
  archivist_email: string
}

type PageState = 'loading' | 'no-token' | 'ready' | 'accepting' | 'success' | 'error'

function JoinForm() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const token        = searchParams.get('token')

  const [pageState, setPageState] = useState<PageState>(token ? 'loading' : 'no-token')
  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(null)
  const [errorMsg, setErrorMsg]   = useState('')

  useEffect(() => {
    if (!token) return

    async function fetchVaultInfo() {
      const supabase = createClient()

      // Fetch curator record with vault info
      const { data, error } = await supabase
        .from('curators')
        .select('display_name, vault_id, invite_accepted, vaults(display_name, archivist_id)')
        .eq('invite_token', token!)
        .single()

      if (error || !data) {
        setErrorMsg('This invitation link is invalid or has already been used.')
        setPageState('error')
        return
      }

      if (data.invite_accepted) {
        setErrorMsg('This invitation has already been accepted.')
        setPageState('error')
        return
      }

      const vault = data.vaults as unknown as { display_name: string; archivist_id: string } | null

      setVaultInfo({
        display_name:    vault?.display_name ?? 'Your Vault',
        archivist_email: '',
      })
      setPageState('ready')
    }

    fetchVaultInfo()
  }, [token])

  async function handleAccept() {
    setPageState('accepting')
    setErrorMsg('')

    const res  = await fetch('/api/curator/accept-invite', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    })
    const data = await res.json()

    if (!data.ok) {
      setErrorMsg(data.error ?? 'This invitation has already been used or has expired.')
      setPageState('error')
      return
    }

    setPageState('success')
    setTimeout(() => router.push('/curator'), 1500)
  }

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-obsidian-void flex items-center justify-center px-8 md:px-16 overflow-hidden relative">

        {/* Grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),' +
              'linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)',
            backgroundSize: '80px 80px',
            maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%,black 20%,transparent 100%)',
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 55% 45% at 50% 55%,rgba(255,179,71,0.06) 0%,transparent 65%)' }}
          aria-hidden="true"
        />

        <div className="relative z-10 w-full max-w-md">

          {pageState === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-16">
              <span className="ai-dot" />
              <p className="font-sans text-[0.82rem] text-text-muted">Verifying invitation…</p>
            </div>
          )}

          {pageState === 'no-token' && (
            <div className="text-center">
              <p className="eyebrow mb-4">Curator Invite</p>
              <h1 className="font-serif text-[2rem] font-semibold text-text-primary tracking-[-0.02em] mb-4">
                No Invitation Found.
              </h1>
              <p className="font-sans font-light text-body-sm text-text-secondary leading-[1.8] mb-8">
                You need an invitation link to join a vault. Contact your vault&apos;s archivist.
              </p>
              <a href="/login" className="btn-monolith-ghost inline-flex">Return to Sign In</a>
            </div>
          )}

          {(pageState === 'ready' || pageState === 'accepting') && vaultInfo && (
            <>
              {/* Header */}
              <div className="text-center mb-10">
                <p className="eyebrow mb-4">Vault Invitation</p>
                <h1
                  className="font-serif font-semibold text-text-primary leading-[0.95] tracking-[-0.035em] mb-4"
                  style={{ fontSize: 'clamp(2rem,5vw,3rem)' }}
                >
                  You&apos;ve Been{' '}
                  <em className="italic font-medium text-amber">Invited.</em>
                </h1>
                <p className="font-sans font-light text-body-sm text-text-secondary leading-[1.8]">
                  You have been invited to curate an archive. Accept below to link your account.
                </p>
              </div>

              {/* Card */}
              <div
                className="glass-obsidian rounded-sm p-8 md:p-10"
                style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.7)' }}
              >
                {/* Vault info */}
                <div className="mb-8 px-4 py-4 rounded-sm border border-border-subtle bg-white/[0.02]">
                  <p className="font-sans text-[0.68rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-1">Archive</p>
                  <p className="font-serif text-[1.2rem] font-semibold text-text-primary tracking-[-0.01em]">
                    {vaultInfo.display_name}
                  </p>
                </div>

                <button
                  onClick={handleAccept}
                  disabled={pageState === 'accepting'}
                  className="btn-monolith-amber w-full justify-center"
                >
                  {pageState === 'accepting' ? (
                    <>
                      <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-obsidian/40 border-t-obsidian animate-spin" aria-hidden="true" />
                      Linking Account…
                    </>
                  ) : (
                    'Accept Invitation & Join Vault →'
                  )}
                </button>

                <p className="font-sans text-[0.72rem] text-text-muted mt-4 text-center leading-[1.7]">
                  By accepting, your account will be linked to this archive as a Curator.
                </p>
              </div>
            </>
          )}

          {pageState === 'success' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-amber/10 border border-border-amber flex items-center justify-center mx-auto mb-6 animate-spark">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12l5 5L20 7" stroke="#FFB347" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="eyebrow mb-3">Invitation Accepted</p>
              <h2 className="font-serif text-[1.5rem] font-semibold text-text-primary tracking-[-0.02em] mb-3">
                Welcome to the Archive.
              </h2>
              <p className="font-sans font-light text-body-sm text-text-secondary leading-[1.8]">
                Redirecting you to your curator portal…
              </p>
            </div>
          )}

          {pageState === 'error' && (
            <div className="text-center">
              <p className="eyebrow mb-4">Invitation Error</p>
              <h1 className="font-serif text-[2rem] font-semibold text-text-primary tracking-[-0.02em] mb-4">
                Link Unavailable.
              </h1>
              <p className="font-sans font-light text-body-sm text-text-secondary leading-[1.8] mb-8">
                {errorMsg || 'This invitation has already been used or has expired.'}
              </p>
              <a href="/login" className="btn-monolith-ghost inline-flex">Return to Sign In</a>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  )
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinForm />
    </Suspense>
  )
}
