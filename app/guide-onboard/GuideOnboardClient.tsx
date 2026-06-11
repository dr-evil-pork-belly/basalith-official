'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

const C = {
  void:    '#0A0908',
  surface: '#111009',
  gold:    '#C4A24A',
  goldDim: '#8A6E30',
  bone:    '#F0EDE6',
  muted:   '#B8B4AB',
  dim:     '#706C65',
}
const SERIF = "'Cormorant Garamond', Georgia, serif"
const BODY  = 'Georgia, serif'
const MONO  = "'Courier New', 'Space Mono', monospace"

export default function GuideOnboardClient() {
  const [code,  setCode]  = useState('')
  const [name,  setName]  = useState('')
  const [email, setEmail] = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)

  const firstName = name.trim().split(/\s+/)[0] || 'there'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim() || !name.trim() || !email.trim()) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/guide-onboard', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code: code.trim(), name: name.trim(), email: email.trim() }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError((data && data.error) || 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      const supabase = createClient()
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (otpError) {
        setError('Your portal was created, but we could not send a sign-in link. Visit the Guide sign-in page to request one.')
        setLoading(false)
        return
      }

      setDone(true)
      setLoading(false)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-8"
      style={{ background: C.void }}
    >
      <div className="w-full max-w-sm" style={{ textAlign: 'center' }}>

        {/* Logo */}
        <div style={{ marginBottom: '2.5rem' }}>
          <p style={{ fontFamily: MONO, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', color: C.bone }}>
            Basalith
            <span style={{ color: 'rgba(196,162,74,0.5)', margin: '0 0.3em' }} aria-hidden="true">&middot;</span>
            <span style={{ fontStyle: 'italic', fontWeight: 300, color: C.muted, fontSize: '0.85em', textTransform: 'lowercase', letterSpacing: '0.08em' }}>xyz</span>
          </p>
          <p style={{ fontFamily: MONO, fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.gold, marginTop: '0.75rem' }}>
            Legacy Guide Onboarding
          </p>
        </div>

        {!done ? (
          <>
            <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1.05rem', color: C.muted, lineHeight: 1.7, marginBottom: '2.25rem' }}>
              Enter your invite code to set up your portal access.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
              <Field label="Invite Code" value={code} onChange={setCode} placeholder="BSL-GUIDE-XXXX" />
              <Field label="Your Name"   value={name} onChange={setName} placeholder="Jordan Hale" />
              <Field label="Email"       value={email} onChange={setEmail} placeholder="jordan@email.com" type="email" />

              {error && (
                <p style={{ fontFamily: BODY, fontSize: '0.8rem', color: '#C47D1A' }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  fontFamily:    MONO,
                  fontSize:      '0.7rem',
                  fontWeight:    700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  background:    C.gold,
                  color:         C.void,
                  border:        'none',
                  borderRadius:  '2px',
                  padding:       '0.9rem 1.5rem',
                  cursor:        loading ? 'default' : 'pointer',
                  opacity:       loading ? 0.6 : 1,
                  transition:    'opacity 0.2s',
                }}
              >
                {loading ? 'Setting up your portal…' : 'Create My Portal'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <div>
              <p style={{ fontFamily: SERIF, fontWeight: 300, fontSize: '1.6rem', color: C.bone, marginBottom: '0.6rem' }}>
                You are in, {firstName}.
              </p>
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1rem', color: C.muted, lineHeight: 1.7 }}>
                This is your Legacy Guide portal. From here you bring families into
                Basalith and walk them through what their archive becomes.
              </p>
            </div>

            <div style={{ background: C.surface, border: `1px solid rgba(196,162,74,0.15)`, borderRadius: '2px', padding: '1.25rem 1.5rem' }}>
              <p style={{ fontFamily: MONO, fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: C.gold, marginBottom: '0.75rem' }}>
                Check Your Email
              </p>
              <p style={{ fontFamily: BODY, fontSize: '0.92rem', color: C.bone, lineHeight: 1.7 }}>
                We sent a sign-in link to {email}. Open it on this device to enter your
                portal. From there you can run the live demo and bring families into
                Basalith.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label:        string
  value:        string
  onChange:     (v: string) => void
  placeholder?: string
  type?:        string
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontFamily: MONO, fontSize: '0.55rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: C.dim, marginBottom: '0.5rem' }}>
        {label}
      </span>
      <input
        type={type}
        required
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width:        '100%',
          background:   'transparent',
          border:       'none',
          borderBottom: '1px solid rgba(196,162,74,0.3)',
          color:        C.bone,
          fontFamily:   SERIF,
          fontSize:     '1.1rem',
          fontWeight:   300,
          padding:      '0.4rem 0',
          outline:      'none',
        }}
      />
    </label>
  )
}
