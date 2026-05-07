'use client'

import { useState, useEffect } from 'react'

const C = {
  surface: '#111110', border: 'rgba(255,255,255,0.06)',
  gold: '#C4A24A', text: '#F0EDE6', muted: '#9DA3A8', dim: '#5C6166', ghost: '#3A3F44',
  green: '#4CAF50', red: '#E57373',
}

type Archivist = {
  id: string; name: string; email: string; phone: string | null
  stripe_account_id: string | null; stripe_account_status: string
  certification_status: string; certification_level: string
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '36px' }}>
      <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.6rem', letterSpacing: '0.26em', textTransform: 'uppercase', color: C.dim, marginBottom: '12px', paddingBottom: '10px', borderBottom: `1px solid ${C.border}` }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: C.ghost, marginBottom: '6px' }}>{label}</p>
      <p style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', color: C.muted }}>{value || '—'}</p>
      {hint && <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.58rem', color: C.ghost, marginTop: '4px' }}>{hint}</p>}
    </div>
  )
}

export default function SettingsClient({ archivistId }: { archivistId: string }) {
  const [archivist,    setArchivist]    = useState<Archivist | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [connecting,   setConnecting]   = useState(false)

  useEffect(() => {
    fetch(`/api/archivist/dashboard?id=${archivistId}`)
      .then(r => r.json())
      .then(d => setArchivist(d.archivist ?? null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [archivistId])

  async function handleConnectStripe() {
    setConnecting(true)
    try {
      const res  = await fetch('/api/archivist/connect-stripe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ archivistId }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      setConnecting(false)
    }
  }

  if (loading) return <div style={{ padding: '48px' }}><p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.65rem', color: C.dim }}>Loading…</p></div>

  const stripeConnected = archivist?.stripe_account_status === 'active' || !!archivist?.stripe_account_id

  return (
    <div style={{ padding: 'clamp(24px,5vw,48px)', maxWidth: '680px' }}>

      <div style={{ marginBottom: '40px' }}>
        <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.58rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: C.dim, marginBottom: '6px' }}>Settings</p>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.4rem,2.5vw,1.9rem)', fontWeight: 300, color: C.text }}>Your Account</h1>
      </div>

      {/* Profile */}
      <Section title="Profile">
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: '20px 24px' }}>
          <Field label="Name"  value={archivist?.name  ?? ''} />
          <Field label="Email" value={archivist?.email ?? ''} />
          <Field label="Phone" value={archivist?.phone ?? ''} />
          <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.58rem', color: C.ghost, marginTop: '8px' }}>
            To update your profile contact <a href="mailto:guide@basalith.xyz" style={{ color: C.gold }}>guide@basalith.xyz</a>
          </p>
        </div>
      </Section>

      {/* Certification */}
      <Section title="Certification">
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.6rem', letterSpacing: '0.14em', color: archivist?.certification_status === 'certified' ? C.green : C.dim }}>
              {archivist?.certification_status === 'certified' ? '✓ Certified Legacy Guide' : 'Not yet certified'}
            </p>
            {archivist?.certification_status !== 'certified' && (
              <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.9rem', color: C.muted, marginTop: '4px' }}>
                Complete your certification to unlock full access.
              </p>
            )}
          </div>
          {archivist?.certification_status !== 'certified' && (
            <a href="/archivist/certification" style={{ fontFamily: 'Courier New, monospace', fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0A0908', background: C.gold, padding: '8px 16px', textDecoration: 'none' }}>
              View Certification →
            </a>
          )}
        </div>
      </Section>

      {/* Payment Settings */}
      <Section title="Payment Settings">
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: '24px' }}>
          {stripeConnected ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontFamily: 'Courier New, monospace', fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: C.green, background: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.2)', padding: '4px 10px' }}>✓ Connected</span>
              </div>
              <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.9rem', color: C.muted, lineHeight: 1.6 }}>
                Your bank account is connected. Commission payments are sent automatically on the 1st of each month.
              </p>
              {archivist?.stripe_account_id && (
                <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.58rem', color: C.ghost, marginTop: '8px' }}>
                  Account: {archivist.stripe_account_id}
                </p>
              )}
            </div>
          ) : (
            <div>
              <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.text, marginBottom: '10px' }}>Payment Settings</p>
              <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.9rem', color: C.muted, lineHeight: 1.7, marginBottom: '20px' }}>
                Connect your bank account to receive commission payments automatically.
                Powered by Stripe Connect. Your banking details are never stored on Basalith servers.
              </p>
              <button
                onClick={handleConnectStripe}
                disabled={connecting}
                style={{ fontFamily: 'Courier New, monospace', fontSize: '0.65rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#0A0908', background: connecting ? 'rgba(196,162,74,0.5)' : C.gold, border: 'none', padding: '12px 24px', cursor: connecting ? 'not-allowed' : 'pointer' }}
              >
                {connecting ? 'Redirecting…' : 'Connect Bank Account →'}
              </button>
              <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.55rem', color: C.ghost, marginTop: '12px' }}>
                Powered by Stripe Connect · Bank-level security
              </p>
            </div>
          )}
        </div>
      </Section>

      {/* Danger zone */}
      <Section title="Sign Out">
        <a
          href="/api/archivist-signout"
          style={{ display: 'inline-block', fontFamily: 'Courier New, monospace', fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: C.dim, border: `1px solid ${C.border}`, padding: '10px 20px', textDecoration: 'none' }}
        >
          Sign Out of Guide Portal
        </a>
      </Section>
    </div>
  )
}
