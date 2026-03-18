'use client'

import { useState, Suspense } from 'react'
import Nav    from '../../components/Nav'
import Footer from '../../components/Footer'
import { createClient } from '@/lib/supabase-browser'

type Status = 'idle' | 'loading' | 'success' | 'error'

function RegisterForm() {
  const [name, setName]               = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [status, setStatus]           = useState<Status>('idle')
  const [error, setError]             = useState('')

  const inputClass =
    'w-full border border-border-subtle rounded-sm px-4 py-3 font-sans text-[0.95rem] text-text-primary bg-obsidian focus:outline-none focus:border-border-amber transition-colors duration-200 placeholder:text-text-muted'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Please enter your full name.')
      setStatus('error')
      return
    }
    if (!email.trim()) {
      setError('Please enter your email address.')
      setStatus('error')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      setStatus('error')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      setStatus('error')
      return
    }

    setStatus('loading')

    const supabase = createClient()
    const { error: signUpError } = await supabase.auth.signUp({
      email:    email.trim().toLowerCase(),
      password,
      options: {
        data:              { full_name: name.trim() },
        emailRedirectTo:   `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    })

    if (signUpError) {
      const msg = signUpError.message.toLowerCase()
      if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('user already exists')) {
        setError('An account with this email already exists. Try signing in instead.')
      } else if (msg.includes('weak') || msg.includes('password')) {
        setError('Password is too weak. Use a mix of letters, numbers, and symbols.')
      } else {
        setError(signUpError.message)
      }
      setStatus('error')
      return
    }

    setStatus('success')
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
        {/* Amber radiance */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 55% 45% at 50% 55%,rgba(255,179,71,0.06) 0%,transparent 65%)' }}
          aria-hidden="true"
        />

        <div className="relative z-10 w-full max-w-md py-24">

          {/* Header */}
          <div className="text-center mb-10">
            <p className="eyebrow mb-4">Curator Access</p>
            <h1
              className="font-serif font-semibold text-text-primary leading-[0.95] tracking-[-0.035em] mb-4"
              style={{ fontSize: 'clamp(2.25rem,5vw,3.5rem)' }}
            >
              Create Your{' '}
              <em className="italic font-medium text-amber" style={{ fontStyle: 'italic' }}>
                Account.
              </em>
            </h1>
            <p className="font-sans font-light text-body-sm text-text-secondary leading-[1.8]">
              You&apos;ve been invited to curate a Basalith archive. Create your account below.
            </p>
          </div>

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
                <p className="eyebrow mb-3">Confirm Your Email</p>
                <h2 className="font-serif text-[1.5rem] font-semibold text-text-primary leading-tight tracking-[-0.02em] mb-3">
                  Check Your Inbox.
                </h2>
                <p className="font-sans font-light text-body-sm text-text-secondary leading-[1.8]">
                  Check your email to confirm your account.
                  Once confirmed, return here to sign in.
                </p>
                <a
                  href="/login"
                  className="inline-block mt-6 font-sans text-[0.82rem] text-amber-dim hover:text-amber transition-colors duration-200"
                >
                  Go to sign in →
                </a>
              </div>
            ) : (
              /* ── Form ── */
              <form onSubmit={handleSubmit} noValidate>
                <div className="flex flex-col gap-4 mb-6">
                  <div>
                    <label htmlFor="name" className="block font-sans text-[0.72rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">
                      Full Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Margaret Whitfield"
                      autoComplete="name"
                      autoFocus
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block font-sans text-[0.72rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="margaret@whitfield.com"
                      autoComplete="email"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block font-sans text-[0.72rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">
                      Password <span className="font-normal normal-case tracking-normal text-text-muted/60">— min 8 characters</span>
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete="new-password"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="confirm" className="block font-sans text-[0.72rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">
                      Confirm Password
                    </label>
                    <input
                      id="confirm"
                      type="password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete="new-password"
                      className={inputClass}
                    />
                  </div>
                </div>

                {status === 'error' && error && (
                  <p className="font-sans text-[0.82rem] text-red-400 mb-5" role="alert">{error}</p>
                )}

                <button type="submit" disabled={status === 'loading'} className="btn-monolith-amber w-full justify-center">
                  {status === 'loading' ? (
                    <>
                      <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-obsidian/40 border-t-obsidian animate-spin" aria-hidden="true" />
                      Creating Account…
                    </>
                  ) : (
                    'Create Account →'
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Footer note */}
          <p className="text-center font-sans text-[0.75rem] text-text-muted mt-8">
            Already have an account?{' '}
            <a href="/login" className="text-amber-dim hover:text-amber transition-colors duration-200">
              Sign in →
            </a>
          </p>
        </div>

      </main>
      <Footer />
    </>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
