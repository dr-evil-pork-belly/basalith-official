'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'

const MONO: React.CSSProperties = { fontFamily: 'var(--portal-mono)' }
const SERIF: React.CSSProperties = { fontFamily: 'var(--portal-serif)' }

export default function SuccessorLoginPage() {
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

  const inputStyle: React.CSSProperties = {
    ...SERIF,
    width:        '100%',
    background:   'transparent',
    color:        'var(--invert-fg)',
    fontSize:     '1rem',
    fontWeight:   300,
    border:       'none',
    borderBottom: '1px solid var(--invert-rule)',
    outline:      'none',
    paddingBottom: '10px',
  }

  return (
    <main
      className="portal-threshold"
      style={{
        minHeight:      '100vh',
        background:     'var(--invert-bg)',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '40px 24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '360px' }}>

        {/* Sigil */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <svg width="32" height="32" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <rect x="18" y="2"  width="11.31" height="11.31" transform="rotate(45 18 2)"  fill="none" stroke="var(--invert-gold)" strokeWidth="1"/>
            <rect x="18" y="9"  width="7.07"  height="7.07"  transform="rotate(45 18 9)"  fill="none" stroke="var(--invert-gold)" strokeWidth="1"/>
            <rect x="18" y="14" width="4"     height="4"     transform="rotate(45 18 14)" fill="var(--invert-gold)"/>
          </svg>
        </div>

        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          <Link
            href="/"
            style={{
              ...MONO,
              fontSize:      '0.7rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color:         'var(--invert-fg)',
              textDecoration: 'none',
            }}
          >
            Basalith
            <span style={{ color: 'var(--invert-gold)', margin: '0 0.3em' }}>·</span>
            <span style={{ fontFamily: 'var(--portal-serif)', fontStyle: 'italic', fontWeight: 300, color: 'var(--invert-dim)', fontSize: '0.85em' }}>ai</span>
          </Link>
        </div>

        {/* Header */}
        <p
          style={{
            ...MONO,
            fontSize: '11px',
            letterSpacing: '3px',
            color:         'var(--invert-gold)',
            textTransform: 'uppercase',
            textAlign:     'center',
            margin:        '0 0 10px',
          }}
        >
          Successor Portal
        </p>

        {/* Subhead */}
        <p
          style={{
            ...SERIF,
            fontSize:   '0.9rem',
            fontWeight: 300,
            fontStyle:  'italic',
            color:      'var(--invert-dim)',
            textAlign:  'center',
            margin:     '0 0 44px',
            lineHeight: 1.6,
          }}
        >
          {sent ? 'A sign-in link is on its way to you.' : 'Enter your email to sign in to the founder\'s Basalith.'}
        </p>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ ...SERIF, fontSize: '0.95rem', fontWeight: 300, color: 'var(--invert-fg)', margin: '0 0 8px' }}>
              Check your email
            </p>
            <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.06em', color: 'var(--invert-dim)', lineHeight: 1.7 }}>
              We sent a sign-in link to {email}. Open it on this device to enter the founder&rsquo;s Basalith.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

            {/* Email */}
            <div>
              <label
                style={{
                  ...MONO,
                  fontSize: '11px',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color:         'var(--invert-dim)',
                  display:       'block',
                  marginBottom:  '10px',
                }}
              >
                Email
              </label>
              <input
                type="email"
                required
                autoFocus
                autoComplete="email"
                placeholder="you@organization.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ ...inputStyle, caretColor: 'var(--invert-gold)' }}
              />
            </div>

            {/* Error */}
            {error && (
              <p
                style={{
                  ...MONO,
                  fontSize: '11px',
                  letterSpacing: '0.06em',
                  color:         'var(--invert-gold)',
                  textAlign:     'center',
                  margin:        0,
                }}
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                ...MONO,
                fontSize: '11px',
                letterSpacing:   '3px',
                textTransform:   'uppercase',
                background:      loading ? 'var(--invert-gold-wash)' : 'var(--portal-btn)',
                color:           loading ? 'var(--invert-gold)' : 'var(--portal-btn-label)',
                border:          '1px solid var(--invert-gold-line)',
                padding:         '14px 24px',
                width:           '100%',
                cursor:          loading ? 'not-allowed' : 'pointer',
                marginTop:       '4px',
                transition:      'background 0.2s, color 0.2s',
              }}
            >
              {loading ? 'Sending…' : 'Send Sign-In Link'}
            </button>
          </form>
        )}

        {/* Footer note */}
        <p
          style={{
            ...MONO,
            fontSize: '11px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color:         'var(--invert-dim)',
            textAlign:     'center',
            marginTop:     '36px',
          }}
        >
          Authorized successors only
        </p>
      </div>
    </main>
  )
}
