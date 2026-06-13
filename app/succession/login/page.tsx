'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'

const MONO: React.CSSProperties = { fontFamily: "'Courier New', monospace" }
const SERIF: React.CSSProperties = { fontFamily: 'Georgia, serif' }

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
    color:        '#F0EDE6',
    fontSize:     '1rem',
    fontWeight:   300,
    border:       'none',
    borderBottom: '1px solid rgba(240,237,230,0.12)',
    outline:      'none',
    paddingBottom: '10px',
  }

  return (
    <main
      style={{
        minHeight:      '100vh',
        background:     '#0A0908',
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
            <rect x="18" y="2"  width="11.31" height="11.31" transform="rotate(45 18 2)"  fill="none" stroke="rgba(196,162,74,0.4)" strokeWidth="1"/>
            <rect x="18" y="9"  width="7.07"  height="7.07"  transform="rotate(45 18 9)"  fill="none" stroke="rgba(196,162,74,0.7)" strokeWidth="1"/>
            <rect x="18" y="14" width="4"     height="4"     transform="rotate(45 18 14)" fill="rgba(196,162,74,0.85)"/>
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
              color:         '#F0EDE6',
              textDecoration: 'none',
            }}
          >
            Basalith
            <span style={{ color: 'rgba(196,162,74,0.45)', margin: '0 0.3em' }}>·</span>
            <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 300, color: '#5C6166', fontSize: '0.85em' }}>ai</span>
          </Link>
        </div>

        {/* Header */}
        <p
          style={{
            ...MONO,
            fontSize:      '0.65rem',
            letterSpacing: '3px',
            color:         '#C4A24A',
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
            color:      '#706C65',
            textAlign:  'center',
            margin:     '0 0 44px',
            lineHeight: 1.6,
          }}
        >
          {sent ? 'A sign-in link is on its way to you.' : 'Enter your email to access the archive.'}
        </p>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ ...SERIF, fontSize: '0.95rem', fontWeight: 300, color: '#F0EDE6', margin: '0 0 8px' }}>
              Check your email
            </p>
            <p style={{ ...MONO, fontSize: '0.65rem', letterSpacing: '0.06em', color: '#5C6166', lineHeight: 1.7 }}>
              We sent a sign-in link to {email}. Open it on this device to access the archive.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

            {/* Email */}
            <div>
              <label
                style={{
                  ...MONO,
                  fontSize:      '0.6rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color:         '#5C6166',
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
                style={{ ...inputStyle, caretColor: '#C4A24A' }}
              />
            </div>

            {/* Error */}
            {error && (
              <p
                style={{
                  ...MONO,
                  fontSize:      '0.65rem',
                  letterSpacing: '0.06em',
                  color:         'rgba(196,162,74,0.7)',
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
                fontSize:        '0.65rem',
                letterSpacing:   '3px',
                textTransform:   'uppercase',
                background:      loading ? 'rgba(196,162,74,0.15)' : '#C4A24A',
                color:           loading ? '#C4A24A' : '#0A0908',
                border:          '1px solid rgba(196,162,74,0.4)',
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
            fontSize:      '0.58rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color:         '#3A3F44',
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
