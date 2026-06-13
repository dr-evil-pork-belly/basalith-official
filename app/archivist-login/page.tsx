'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

export default function ArchivistLoginPage() {
  const [email, setEmail]     = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError('We could not send a sign-in link. Please check the email address and try again.')
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-8"
      style={{ background: '#0C0C0D' }}
    >
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <p className="font-sans text-[0.8rem] font-bold tracking-[0.24em] uppercase text-text-primary inline-flex items-baseline gap-0">
            Basalith
            <span style={{ color: 'rgba(196,162,74,0.5)', margin: '0 0.3em' }} aria-hidden="true">&middot;</span>
            <span style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--text-muted)', fontSize: '0.85em', textTransform: 'lowercase', letterSpacing: '0.08em' }}>ai</span>
          </p>
          <p
            className="font-sans font-bold tracking-[0.22em] uppercase mt-3"
            style={{ fontSize: '0.55rem', color: '#C4A24A' }}
          >
            Legacy Guide Portal
          </p>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="font-serif text-[1.1rem] text-text-primary">
              Check your email
            </p>
            <p className="font-sans text-[0.78rem] leading-relaxed text-text-muted">
              We sent a sign-in link to {email}. Open it on this device to access your portal.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <div>
              <input
                type="email"
                required
                placeholder="you@email.com"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-transparent font-serif text-[1.1rem] text-text-primary placeholder:text-text-muted pb-3 outline-none transition-colors duration-200 focus:placeholder:text-text-secondary"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', borderRadius: 0 }}
                autoFocus
              />
              {error && (
                <p className="font-sans text-[0.72rem] mt-2" style={{ color: '#C47D1A' }}>{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 font-sans text-[0.72rem] font-bold tracking-[0.18em] uppercase transition-opacity duration-200 disabled:opacity-50"
              style={{ background: '#C4A24A', color: '#0C0C0D', borderRadius: '2px' }}
            >
              {loading ? 'Sending…' : 'Send Sign-In Link'}
            </button>
          </form>
        )}

      </div>
    </div>
  )
}
