'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const mono: React.CSSProperties = { fontFamily: "'Courier New', monospace" }

export default function GodLoginPage() {
  const router                = useRouter()
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/god/auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password }),
      })

      if (res.ok) {
        router.push('/god')
      } else {
        setError('Invalid password.')
      }
    } catch {
      setError('Request failed.')
    }

    setLoading(false)
  }

  return (
    <div style={{ background: '#060605', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '320px', padding: '0 1.5rem' }}>
        <p style={{ ...mono, fontSize: '0.5rem', letterSpacing: '0.4em', color: '#C4A24A', marginBottom: '2rem', textAlign: 'center' }}>
          BASALITH · GOD MODE
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            style={{
              width:        '100%',
              background:   'transparent',
              border:       'none',
              borderBottom: '1px solid rgba(196,162,74,0.3)',
              color:        '#F0EDE6',
              ...mono,
              fontSize:     '0.9rem',
              padding:      '0.5rem 0',
              outline:      'none',
              marginBottom: '1.5rem',
              boxSizing:    'border-box',
            }}
          />

          {error && (
            <p style={{ ...mono, fontSize: '0.38rem', color: '#8B5555', marginBottom: '1rem', letterSpacing: '0.1em' }}>
              {error.toUpperCase()}
            </p>
          )}

          <button
            type="submit"
            disabled={!password || loading}
            style={{
              width:         '100%',
              background:    loading ? 'rgba(196,162,74,0.4)' : '#C4A24A',
              border:        'none',
              padding:       '0.7rem',
              ...mono,
              fontSize:      '0.42rem',
              letterSpacing: '0.3em',
              color:         '#0A0908',
              cursor:        loading ? 'not-allowed' : 'pointer',
              opacity:       !password ? 0.5 : 1,
            }}
          >
            {loading ? 'VERIFYING...' : 'ENTER'}
          </button>
        </form>
      </div>
    </div>
  )
}
