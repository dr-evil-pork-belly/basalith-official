'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'

export default function ArchiveLoginPage() {
  const [email, setEmail]     = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

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
    <main
      className="portal-threshold min-h-screen flex flex-col items-center justify-center px-8"
      style={{ background: 'var(--invert-bg)' }}
    >
      <div className="w-full max-w-sm">
        {/* Sigil */}
        <div className="flex justify-center mb-10">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <rect x="18" y="2"  width="11.31" height="11.31" transform="rotate(45 18 2)"  fill="none" stroke="var(--invert-gold-wash)" strokeWidth="1"/>
            <rect x="18" y="9"  width="7.07"  height="7.07"  transform="rotate(45 18 9)"  fill="none" stroke="var(--portal-btn)" strokeWidth="1"/>
            <rect x="18" y="14" width="4"     height="4"     transform="rotate(45 18 14)" fill="var(--portal-btn)"/>
          </svg>
        </div>

        {/* Logo */}
        <div className="text-center mb-2">
          <Link href="/" className="font-sans text-[15px] font-bold tracking-[0.24em] uppercase no-underline" style={{ color: 'var(--invert-fg)' }}>
            Basalith
            <span style={{ color: 'var(--invert-gold)', margin: '0 0.3em' }} aria-hidden="true">·</span>
            <span style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--invert-dim)', fontSize: '0.85em', textTransform: 'lowercase', letterSpacing: '0.08em' }}>ai</span>
          </Link>
        </div>

        {/* Eyebrow */}
        <p className="eyebrow text-center mb-12" style={{ letterSpacing: '0.2em' }}>Your Basalith</p>

        {sent ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="font-serif text-[1.1rem] font-light" style={{ color: 'var(--invert-fg)' }}>
              Check your email
            </p>
            <p className="font-sans text-[15px] leading-relaxed" style={{ color: 'var(--invert-dim)' }}>
              We sent a sign-in link to {email}. Open it on this device to enter your Basalith.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div>
              <label className="font-sans text-[11.5px] font-bold tracking-[0.14em] uppercase block mb-3" style={{ color: 'var(--invert-dim)' }}>
                Email
              </label>
              <input
                type="email"
                required
                autoFocus
                autoComplete="email"
                placeholder="you@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-transparent font-serif text-[1.1rem] font-light placeholder:text-[var(--invert-dim)] focus:outline-none pb-3 transition-colors duration-200"
                style={{
                  color:        'var(--invert-fg)',
                  borderBottom: '1px solid var(--invert-rule)',
                }}
              />
            </div>

            {error && (
              <p className="font-sans text-[15px] tracking-[0.06em] text-center" style={{ color: 'var(--invert-gold)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-monolith-amber w-full text-center mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending…' : 'Send Sign-In Link'}
            </button>
          </form>
        )}

        <p className="font-sans text-[11.5px] tracking-[0.1em] uppercase text-center mt-10" style={{ color: 'var(--invert-dim)' }}>
          Authorized owners only
        </p>
      </div>
    </main>
  )
}
