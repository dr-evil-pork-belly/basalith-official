'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'

// /assessment/begin. Styling reuses /begin and /archive-login: same page
// shell, sigil, classes, and colors. No new tokens.
//
// Two screens: the email form, then "Check your mail." The route creates the
// founder's record; this page then requests the same sign in link
// /archive-login sends, so the link only ever reaches the founder's mailbox.

type Screen = 'form' | 'sent'

const RESEND_AFTER_SECONDS = 30

function Sigil() {
  return (
    <div className="flex justify-center mb-10">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <rect x="18" y="2"  width="11.31" height="11.31" transform="rotate(45 18 2)"  fill="none" stroke="var(--invert-gold)" strokeWidth="1"/>
        <rect x="18" y="9"  width="7.07"  height="7.07"  transform="rotate(45 18 9)"  fill="none" stroke="var(--invert-gold)" strokeWidth="1"/>
        <rect x="18" y="14" width="4"     height="4"     transform="rotate(45 18 14)" fill="var(--invert-gold)"/>
      </svg>
    </div>
  )
}

const labelClass = 'font-sans text-[11.5px] font-bold tracking-[0.14em] uppercase block mb-3'
const inputClass = 'w-full bg-transparent font-serif text-[1.1rem] font-light placeholder:text-[var(--invert-dim)] focus:outline-none pb-3 transition-colors duration-200'
const inputStyle = { color: 'var(--invert-fg)', borderBottom: '1px solid var(--invert-dim)' } as const

export default function AssessmentBeginClient({ order }: { order: string | null }) {
  const [screen, setScreen]     = useState<Screen>('form')
  const [email, setEmail]       = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [resendIn, setResendIn] = useState(RESEND_AFTER_SECONDS)
  const [resent, setResent]     = useState(false)

  useEffect(() => {
    if (screen !== 'sent' || resendIn <= 0) return
    const t = setTimeout(() => setResendIn(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [screen, resendIn])

  async function sendLink(address: string): Promise<boolean> {
    // The auth user exists by now, so shouldCreateUser stays false.
    const supabase = createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: address,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return !otpError
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const address = email.trim().toLowerCase()

    try {
      const res = await fetch('/api/assessment/start', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ order, email: address }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Could not start right now. Please try again in a moment.')
        setLoading(false)
        return
      }

      const sent = await sendLink(address)
      if (!sent) {
        setError('We could not send a sign in link. Please try again in a moment.')
        setLoading(false)
        return
      }
      setResendIn(RESEND_AFTER_SECONDS)
      setResent(false)
      setScreen('sent')
      setLoading(false)
    } catch {
      setError('Could not start right now. Please try again in a moment.')
      setLoading(false)
    }
  }

  async function handleResend() {
    setLoading(true)
    const sent = await sendLink(email.trim().toLowerCase())
    setLoading(false)
    if (sent) {
      setResent(true)
      setResendIn(RESEND_AFTER_SECONDS)
    } else {
      setError('We could not send a sign in link. Please try again in a moment.')
    }
  }

  return (
    <main
      className="portal-threshold min-h-screen flex flex-col items-center justify-center px-8 py-16"
      style={{ background: 'var(--invert-bg)' }}
    >
      <div className="w-full max-w-sm">
        <Sigil />

        <div className="text-center mb-2">
          <Link href="/" className="font-sans text-[15px] font-bold tracking-[0.24em] uppercase no-underline" style={{ color: 'var(--invert-fg)' }}>
            Basalith
            <span style={{ color: 'var(--invert-gold)', margin: '0 0.3em' }} aria-hidden="true">·</span>
            <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--invert-dim)', fontSize: '0.85em', textTransform: 'lowercase', letterSpacing: '0.08em' }}>ai</span>
          </Link>
        </div>

        <p className="eyebrow text-center mb-10" style={{ letterSpacing: '0.2em' }}>Your assessment.</p>

        {!order ? (
          <p className="font-serif text-[1.1rem] font-light text-center leading-snug" style={{ color: 'var(--invert-fg)' }}>
            This page opens from the link in your invitation.
          </p>
        ) : screen === 'sent' ? (
          <div className="flex flex-col items-center gap-4 text-center" aria-live="polite">
            <p className="font-serif text-[1.1rem] font-light" style={{ color: 'var(--invert-fg)' }}>
              Check your mail.
            </p>
            <p className="font-sans text-[15px] leading-relaxed" style={{ color: 'var(--invert-dim)' }}>
              The link signs you in and opens your assessment.
            </p>
            {resendIn > 0 ? (
              <p className="font-sans text-[11.5px] tracking-[0.1em] uppercase mt-6" style={{ color: 'var(--invert-dim)' }}>
                Send it again in {resendIn}s
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="font-sans text-[11.5px] tracking-[0.1em] uppercase mt-6 bg-transparent border-0 cursor-pointer disabled:opacity-50"
                style={{ color: 'var(--invert-gold)' }}
              >
                {loading ? 'Sending…' : resent ? 'Sent again. Send once more' : 'Send the link again'}
              </button>
            )}
            {error && (
              <p className="font-sans text-[15px] tracking-[0.06em] text-center" style={{ color: 'var(--invert-gold)' }}>
                {error}
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-7">
            <h1 className="font-serif text-[1.45rem] font-light leading-snug" style={{ color: 'var(--invert-fg)' }}>
              Eight short calls on how you run the business.
            </h1>
            <p className="font-sans text-[15.5px] leading-relaxed" style={{ color: 'var(--invert-dim)' }}>
              Someone considering this business has asked for a report on how it runs through you. This is where you give your side of it, by voice or typed, on your own time.
            </p>

            <div>
              <label htmlFor="assessment-email" className={labelClass} style={{ color: 'var(--invert-dim)' }}>Your email</label>
              <input
                id="assessment-email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                placeholder="you@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
              <p className="font-sans text-[13.5px] leading-relaxed mt-3" style={{ color: 'var(--invert-dim)' }}>
                Use the address your invitation was sent to.
              </p>
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
              {loading ? 'One moment…' : 'Send my sign in link'}
            </button>
          </form>
        )}

        <p className="font-sans text-[11.5px] tracking-[0.1em] uppercase text-center mt-10" style={{ color: 'var(--invert-dim)' }}>
          <Link href="/archive-login" className="no-underline" style={{ color: 'var(--invert-dim)' }}>Already started? Sign in</Link>
        </p>
      </div>
    </main>
  )
}
