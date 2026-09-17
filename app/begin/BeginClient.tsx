'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'

// /begin. Copy is docs/SELF_SERVE_SKELETON_2026-09-17.md section 6, verbatim.
// Styling reuses /archive-login: same page shell, sigil, classes, and colors.
// No new tokens.
//
// Three states. Public: the form, then "Check your mail." Signed in with no
// archive: the same form minus email, POSTing with the session's address and
// skipping the OTP, then straight to the dashboard. The server page decides
// which state renders; this component only receives the email when one is
// signed in.

type Screen = 'form' | 'sent'
type ForWhom = 'me' | 'someone'

const RESEND_AFTER_SECONDS = 30

function Sigil() {
  return (
    <div className="flex justify-center mb-10">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <rect x="18" y="2"  width="11.31" height="11.31" transform="rotate(45 18 2)"  fill="none" stroke="rgba(196,162,74,0.5)" strokeWidth="1"/>
        <rect x="18" y="9"  width="7.07"  height="7.07"  transform="rotate(45 18 9)"  fill="none" stroke="rgba(196,162,74,0.8)" strokeWidth="1"/>
        <rect x="18" y="14" width="4"     height="4"     transform="rotate(45 18 14)" fill="rgba(196,162,74,0.9)"/>
      </svg>
    </div>
  )
}

const labelClass = 'font-sans text-[0.62rem] font-bold tracking-[0.14em] uppercase block mb-3'
const inputClass = 'w-full bg-transparent font-serif text-[1.1rem] font-light placeholder:text-[#3A3F44] focus:outline-none pb-3 transition-colors duration-200'
const inputStyle = { color: '#F0F0EE', borderBottom: '1px solid rgba(255,255,255,0.12)' } as const

export default function BeginClient({ signedInEmail }: { signedInEmail: string | null }) {
  const router = useRouter()
  const signedIn = !!signedInEmail

  const [screen, setScreen]     = useState<Screen>('form')
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState(signedInEmail ?? '')
  const [forWhom, setForWhom]   = useState<ForWhom>('me')
  const [prompt, setPrompt]     = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [resendIn, setResendIn] = useState(RESEND_AFTER_SECONDS)
  const [resent, setResent]     = useState(false)

  // The resend countdown runs only on screen 2.
  useEffect(() => {
    if (screen !== 'sent' || resendIn <= 0) return
    const t = setTimeout(() => setResendIn(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [screen, resendIn])

  async function sendLink(address: string): Promise<boolean> {
    // Exactly as /archive-login: the auth user exists by now, so
    // shouldCreateUser stays false everywhere.
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
      const res = await fetch('/api/trial/start', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: address, name: name.trim(), forWhom, prompt: prompt.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Could not start your archive right now. Please try again in a moment.')
        setLoading(false)
        return
      }

      if (signedIn) {
        // Already signed in: the archive now exists for this session, so the
        // dashboard resolves it. No link to send.
        router.push('/archive/dashboard')
        return
      }

      const sent = await sendLink(address)
      if (!sent) {
        setError('We could not send a sign-in link. Please check the email address and try again.')
        setLoading(false)
        return
      }
      setResendIn(RESEND_AFTER_SECONDS)
      setResent(false)
      setScreen('sent')
      setLoading(false)
    } catch {
      setError('Could not start your archive right now. Please try again in a moment.')
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
      setError('We could not send a sign-in link. Please try again in a moment.')
    }
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-8 py-16"
      style={{ background: '#0C0C0D' }}
    >
      <div className="w-full max-w-sm">
        <Sigil />

        <div className="text-center mb-2">
          <Link href="/" className="font-sans text-[0.75rem] font-bold tracking-[0.24em] uppercase no-underline" style={{ color: '#F0F0EE' }}>
            Basalith
            <span style={{ color: 'rgba(196,162,74,0.5)', margin: '0 0.3em' }} aria-hidden="true">·</span>
            <span style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--text-muted)', fontSize: '0.85em', textTransform: 'lowercase', letterSpacing: '0.08em' }}>ai</span>
          </Link>
        </div>

        <p className="eyebrow text-center mb-10" style={{ letterSpacing: '0.2em' }}>The first call.</p>

        {screen === 'sent' ? (
          <div className="flex flex-col items-center gap-4 text-center" aria-live="polite">
            <p className="font-serif text-[1.1rem] font-light" style={{ color: '#F0F0EE' }}>
              Check your mail.
            </p>
            <p className="font-sans text-[0.78rem] leading-relaxed" style={{ color: '#5C6166' }}>
              The link signs you in and opens your first call.
            </p>
            {resendIn > 0 ? (
              <p className="font-sans text-[0.62rem] tracking-[0.1em] uppercase mt-6" style={{ color: '#3A3F44' }}>
                Send it again in {resendIn}s
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="font-sans text-[0.62rem] tracking-[0.1em] uppercase mt-6 bg-transparent border-0 cursor-pointer disabled:opacity-50"
                style={{ color: 'rgba(196,162,74,0.8)' }}
              >
                {loading ? 'Sending…' : resent ? 'Sent again. Send once more' : 'Send the link again'}
              </button>
            )}
            {error && (
              <p className="font-sans text-[0.72rem] tracking-[0.06em] text-center" style={{ color: 'rgba(196,162,74,0.7)' }}>
                {error}
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-7">
            {signedIn ? (
              <p className="font-serif text-[1.25rem] font-light leading-snug" style={{ color: '#F0F0EE' }}>
                You are signed in as {signedInEmail}. Begin your archive.
              </p>
            ) : (
              <>
                <h1 className="font-serif text-[1.45rem] font-light leading-snug" style={{ color: '#F0F0EE' }}>
                  Tell us about the hardest call you ever made.
                </h1>
                <p className="font-sans text-[0.82rem] leading-relaxed" style={{ color: '#5C6166' }}>
                  Fifteen to thirty minutes, by voice or typed, on your own time. Nothing you say has to be important. When you are done, your archive answers one question in your own words and declines one it has no grounds for. That is how you know it is you.
                </p>
              </>
            )}

            <div>
              <label htmlFor="begin-name" className={labelClass} style={{ color: '#5C6166' }}>Your name</label>
              <input
                id="begin-name"
                type="text"
                required
                autoFocus
                autoComplete="name"
                maxLength={120}
                value={name}
                onChange={e => setName(e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>

            {!signedIn && (
              <div>
                <label htmlFor="begin-email" className={labelClass} style={{ color: '#5C6166' }}>Your email</label>
                <input
                  id="begin-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
            )}

            <fieldset className="border-0 p-0 m-0">
              <legend className={labelClass} style={{ color: '#5C6166' }}>This archive is for</legend>
              <div className="flex gap-6">
                {([['me', 'me'], ['someone', 'someone I am helping']] as [ForWhom, string][]).map(([value, text]) => (
                  <label key={value} className="flex items-center gap-2 font-serif text-[1rem] font-light cursor-pointer" style={{ color: forWhom === value ? '#F0F0EE' : '#5C6166' }}>
                    <input
                      type="radio"
                      name="forWhom"
                      value={value}
                      checked={forWhom === value}
                      onChange={() => setForWhom(value)}
                      className="accent-[#C4A24A]"
                    />
                    {text}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="begin-prompt" className={labelClass} style={{ color: '#5C6166' }}>What brought you here (optional, one line)</label>
              <input
                id="begin-prompt"
                type="text"
                maxLength={500}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>

            {error && (
              <p className="font-sans text-[0.72rem] tracking-[0.06em] text-center" style={{ color: 'rgba(196,162,74,0.7)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-monolith-amber w-full text-center mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'One moment…' : 'Begin.'}
            </button>

            <p className="font-sans text-[0.72rem] leading-relaxed text-center" style={{ color: '#5C6166' }}>
              Your first call is yours. Found the archive to keep it.
            </p>
          </form>
        )}

        <p className="font-sans text-[0.62rem] tracking-[0.1em] uppercase text-center mt-10" style={{ color: '#3A3F44' }}>
          {signedIn ? (
            <a href="/api/auth/logout" className="no-underline" style={{ color: '#3A3F44' }}>Not you? Sign out</a>
          ) : (
            <Link href="/archive-login" className="no-underline" style={{ color: '#3A3F44' }}>Already have an archive? Sign in</Link>
          )}
        </p>
      </div>
    </main>
  )
}
