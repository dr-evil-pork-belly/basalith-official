'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ArchivistLoginPage() {
  const [password, setPassword]   = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res  = await fetch('/api/archivist-login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password }),
    })
    const data = await res.json()

    if (data.success) {
      router.push('/archivist/dashboard')
    } else {
      setError('Incorrect password.')
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
            <span style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--text-muted)', fontSize: '0.85em', textTransform: 'lowercase', letterSpacing: '0.08em' }}>xyz</span>
          </p>
          <p
            className="font-sans font-bold tracking-[0.22em] uppercase mt-3"
            style={{ fontSize: '0.55rem', color: '#C4A24A' }}
          >
            Legacy Guide Portal
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div>
            <input
              type="password"
              required
              placeholder="Enter access password"
              value={password}
              onChange={e => setPassword(e.target.value)}
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
            {loading ? 'Verifying\u2026' : 'Access Portal'}
          </button>
        </form>

      </div>
    </div>
  )
}
