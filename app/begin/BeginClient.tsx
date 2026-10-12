'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { HONEYPOT_FIELD } from '@/lib/botGuard'

// /begin. Copy is docs/SELF_SERVE_SKELETON_2026-09-17.md section 6, verbatim.
// Styling reuses /archive-login: same page shell, sigil, classes, and colors.
// No new tokens.
//
// Three states. Public: the form, then "Check your mail." Signed in with no
// archive: the same form minus email, POSTing with the session's address and
// skipping the OTP, then straight to the dashboard. The server page decides
// which state renders; this component only receives the email when one is
// signed in.

// Bot guard (October 10, 2026, lib/botGuard.ts). Two additions to the form,
// neither visible to a person in the normal case:
//   a text input held off screen that only a script fills, and
//   a Cloudflare Turnstile widget, rendered only when
//   NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, in "interaction-only" mode so it
//   takes no room unless Cloudflare decides to challenge.

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''
const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  reset: (id?: string) => void
  remove: (id: string) => void
}
declare global {
  interface Window { turnstile?: TurnstileApi }
}

type Screen = 'form' | 'sent'
type ForWhom = 'me' | 'someone'

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

export default function BeginClient({
  signedInEmail,
  referralCode = null,
}: {
  signedInEmail: string | null
  /** A referral code the server already resolved. Null for everyone else. */
  referralCode?: string | null
}) {
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
  const [trap, setTrap]         = useState('')
  const [token, setToken]       = useState('')
  const turnstileBox            = useRef<HTMLDivElement>(null)
  const turnstileId             = useRef<string | null>(null)

  // Turnstile, explicit render. Nothing loads when the site key is unset.
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || screen !== 'form') return
    let cancelled = false

    function render() {
      if (cancelled || turnstileId.current || !turnstileBox.current || !window.turnstile) return
      turnstileId.current = window.turnstile.render(turnstileBox.current, {
        sitekey:            TURNSTILE_SITE_KEY,
        appearance:         'interaction-only',
        theme:              'auto',
        callback:           (t: string) => setToken(t),
        'expired-callback': () => setToken(''),
        'error-callback':   () => setToken(''),
      })
    }

    if (window.turnstile) {
      render()
    } else {
      let script = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SRC}"]`)
      if (!script) {
        script = document.createElement('script')
        script.src = TURNSTILE_SRC
        script.async = true
        script.defer = true
        document.head.appendChild(script)
      }
      script.addEventListener('load', render)
    }

    return () => {
      cancelled = true
      if (turnstileId.current && window.turnstile) {
        try { window.turnstile.remove(turnstileId.current) } catch { /* already gone */ }
      }
      turnstileId.current = null
    }
  }, [screen])

  // A token is good for one check. After any refused submit, ask for another.
  function resetTurnstile() {
    setToken('')
    if (turnstileId.current && window.turnstile) {
      try { window.turnstile.reset(turnstileId.current) } catch { /* nothing to reset */ }
    }
  }

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
    setError('')

    if (TURNSTILE_SITE_KEY && !token) {
      setError('Still checking your browser. Please try again in a few seconds.')
      return
    }

    setLoading(true)

    const address = email.trim().toLowerCase()

    try {
      const res = await fetch('/api/trial/start', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email: address,
          name: name.trim(),
          forWhom,
          prompt: prompt.trim(),
          ref: referralCode,
          turnstileToken: token || undefined,
          [HONEYPOT_FIELD]: trap,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Could not start your Basalith right now. Please try again in a moment.')
        setLoading(false)
        resetTurnstile()
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
        setError('We could not send a sign in link. Please check the email address and try again.')
        setLoading(false)
        resetTurnstile()
        return
      }
      setResendIn(RESEND_AFTER_SECONDS)
      setResent(false)
      setScreen('sent')
      setLoading(false)
    } catch {
      setError('Could not start your Basalith right now. Please try again in a moment.')
      setLoading(false)
      resetTurnstile()
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

        <p className="eyebrow text-center mb-10" style={{ letterSpacing: '0.2em' }}>The first call.</p>

        {screen === 'sent' ? (
          <div className="flex flex-col items-center gap-4 text-center" aria-live="polite">
            <p className="font-serif text-[1.1rem] font-light" style={{ color: 'var(--invert-fg)' }}>
              Check your mail.
            </p>
            <p className="font-sans text-[15px] leading-relaxed" style={{ color: 'var(--invert-dim)' }}>
              The link signs you in and opens your first call.
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
            {signedIn ? (
              <p className="font-serif text-[1.25rem] font-light leading-snug" style={{ color: 'var(--invert-fg)' }}>
                You are signed in as {signedInEmail}. Begin your Basalith.
              </p>
            ) : (
              <>
                <h1 className="font-serif text-[1.45rem] font-light leading-snug" style={{ color: 'var(--invert-fg)' }}>
                  Tell us about the hardest call you ever made.
                </h1>
                <p className="font-sans text-[15.5px] leading-relaxed" style={{ color: 'var(--invert-dim)' }}>
                  Fifteen to thirty minutes, by voice or typed, on your own time. Nothing you say has to be important. When you are done, your Basalith answers one question in your own words and declines one it has no grounds for. That is how you know it is you.
                </p>
              </>
            )}

            <div>
              <label htmlFor="begin-name" className={labelClass} style={{ color: 'var(--invert-dim)' }}>Your name</label>
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
                <label htmlFor="begin-email" className={labelClass} style={{ color: 'var(--invert-dim)' }}>Your email</label>
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
              <legend className={labelClass} style={{ color: 'var(--invert-dim)' }}>This Basalith is for</legend>
              <div className="flex gap-6">
                {([['me', 'me'], ['someone', 'someone I am helping']] as [ForWhom, string][]).map(([value, text]) => (
                  <label key={value} className="flex items-center gap-2 font-serif text-[1rem] font-light cursor-pointer" style={{ color: forWhom === value ? 'var(--invert-fg)' : 'var(--invert-dim)' }}>
                    <input
                      type="radio"
                      name="forWhom"
                      value={value}
                      checked={forWhom === value}
                      onChange={() => setForWhom(value)}
                      className="accent-[var(--invert-gold)]"
                    />
                    {text}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="begin-prompt" className={labelClass} style={{ color: 'var(--invert-dim)' }}>What brought you here (optional, one line)</label>
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

            {/* Bot guard. Off screen, out of the tab order, hidden from screen
                readers. A person never fills it. */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }}>
              <label htmlFor="begin-subject-line">Leave this field empty</label>
              <input
                id="begin-subject-line"
                type="text"
                name={HONEYPOT_FIELD}
                tabIndex={-1}
                autoComplete="off"
                value={trap}
                onChange={e => setTrap(e.target.value)}
              />
            </div>

            {error && (
              <p className="font-sans text-[15px] tracking-[0.06em] text-center" style={{ color: 'var(--invert-gold)' }}>
                {error}
              </p>
            )}

            {/* One flex item, so the empty Turnstile box adds no gap. */}
            <div className="flex flex-col">
              {TURNSTILE_SITE_KEY && <div ref={turnstileBox} className="flex justify-center" />}
              <button
                type="submit"
                disabled={loading}
                className="btn-monolith-amber w-full text-center mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'One moment…' : 'Begin.'}
              </button>
            </div>

            <p className="font-sans text-[15px] leading-relaxed text-center" style={{ color: 'var(--invert-dim)' }}>
              Your first call is yours. Found your Basalith to keep it.
            </p>

            {referralCode && (
              <p className="font-sans text-[15px] leading-relaxed text-center" style={{ color: 'var(--invert-gold)' }}>
                You were referred by someone who has a Basalith. If you keep yours, the Founding fee is $1,250, half the usual $2,500.
              </p>
            )}
          </form>
        )}

        <p className="font-sans text-[11.5px] tracking-[0.1em] uppercase text-center mt-10" style={{ color: 'var(--invert-dim)' }}>
          {signedIn ? (
            <a href="/api/auth/logout" className="no-underline" style={{ color: 'var(--invert-dim)' }}>Not you? Sign out</a>
          ) : (
            <Link href="/archive-login" className="no-underline" style={{ color: 'var(--invert-dim)' }}>Already have a Basalith? Sign in</Link>
          )}
        </p>
      </div>
    </main>
  )
}
