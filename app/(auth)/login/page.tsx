'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Nav    from '../../components/Nav'
import Footer from '../../components/Footer'
import { createClient } from '@/lib/supabase-browser'

type Status = 'idle' | 'loading' | 'success' | 'error'

function LoginForm() {
  const searchParams = useSearchParams()
  const authError    = searchParams.get('error')

  const [email, setEmail]   = useState('')
  const [status, setStatus] = useState<Status>(authError && authError !== 'link_expired' ? 'error' : 'idle')
  const [error, setError]   = useState(authError === 'auth_failed' ? 'The login link was invalid or has expired. Please try again.' : '')
  const [sentTo, setSentTo] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('Please enter your email address.'); setStatus('error'); return }

    setStatus('loading')
    setError('')

    const origin = process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== 'undefined' ? window.location.origin : 'https://www.basalith.xyz')

    const supabase = createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    })

    if (otpError) {
      setError(otpError.message)
      setStatus('error')
      return
    }

    setSentTo(email.trim().toLowerCase())
    setStatus('success')
  }

  const inputClass =
    'w-full border border-border-subtle rounded-sm px-4 py-3 font-sans text-[0.95rem] text-text-primary bg-obsidian focus:outline-none focus:border-border-amber transition-colors duration-200 placeholder:text-text-muted'

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
        {/* Amber radiance */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 55% 45% at 50% 55%,rgba(255,179,71,0.06) 0%,transparent 65%)' }}
          aria-hidden="true"
        />

        <div className="relative z-10 w-full max-w-md">

          {/* Header */}
          <div className="text-center mb-10">
            <p className="eyebrow mb-4">Archivist Access</p>
            <h1
              className="font-serif font-semibold text-text-primary leading-[0.95] tracking-[-0.035em] mb-4"
              style={{ fontSize: 'clamp(2.25rem,5vw,3.5rem)' }}
            >
              Sign In to{' '}
              <em className="italic font-medium text-amber" style={{ fontStyle: 'italic' }}>
                Your Archive.
              </em>
            </h1>
            <p className="font-sans font-light text-body-sm text-text-secondary leading-[1.8]">
              We send a secure, one-time login link to your email. No password required.
            </p>
          </div>

          {/* Expired link notice */}
          {authError === 'link_expired' && (
            <div className="mb-6 px-4 py-3 rounded-sm border border-amber/25 bg-amber/[0.06] flex items-start gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-amber flex-shrink-0 mt-0.5" aria-hidden="true">
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="font-sans text-[0.82rem] text-amber/90 leading-[1.6]">
                Your login link has expired. Enter your email to receive a new one.
              </p>
            </div>
          )}

          {/* Card */}
          <div
            className="glass-obsidian rounded-sm p-8 md:p-10"
            style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.7)' }}
          >
            {status === 'success' ? (
              /* ── Success ── */
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-amber/10 border border-border-amber flex items-center justify-center mx-auto mb-6 animate-spark">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="#FFB347" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="eyebrow mb-3">Link Sent</p>
                <h2 className="font-serif text-[1.5rem] font-semibold text-text-primary leading-tight tracking-[-0.02em] mb-3">
                  Check Your Email.
                </h2>
                <p className="font-sans font-light text-body-sm text-text-secondary leading-[1.8]">
                  We&apos;ve sent a secure login link to{' '}
                  <span className="text-text-primary font-medium">{sentTo}</span>.
                  The link expires in 1 hour.
                </p>
              </div>
            ) : (
              /* ── Form ── */
              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-6">
                  <label htmlFor="email" className="block font-sans text-[0.72rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="robert@whitfield.com"
                    required
                    autoComplete="email"
                    autoFocus
                    className={inputClass}
                  />
                </div>

                {status === 'error' && error && (
                  <p className="font-sans text-[0.82rem] text-red-400 mb-5" role="alert">{error}</p>
                )}

                <button type="submit" disabled={status === 'loading'} className="btn-monolith-amber w-full justify-center">
                  {status === 'loading' ? (
                    <>
                      <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-obsidian/40 border-t-obsidian animate-spin" aria-hidden="true" />
                      Sending…
                    </>
                  ) : (
                    'Send Login Link →'
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Footer note */}
          <p className="text-center font-sans text-[0.75rem] text-text-muted mt-8">
            Don&apos;t have an account yet?{' '}
            <a href="/begin/tier" className="text-amber-dim hover:text-amber transition-colors duration-200">
              Apply for access →
            </a>
          </p>
        </div>

      </main>
      <Footer />
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
