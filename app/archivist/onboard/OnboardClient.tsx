'use client'

import { useState } from 'react'

type Result = {
  archiveId:   string
  archiveName: string
  clientEmail: string
  password:    string
  magicLink?:  string
}

const LABEL: React.CSSProperties = {
  display:       'block',
  fontFamily:    "'Space Mono', 'DM Mono', monospace",
  fontSize:      '0.42rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase' as const,
  color:         '#5C6166',
  marginBottom:  '0.5rem',
}

const HELPER: React.CSSProperties = {
  fontFamily:  "'Cormorant Garamond', Georgia, serif",
  fontSize:    '0.8rem',
  fontStyle:   'italic',
  color:       '#3A3F44',
  marginTop:   '0.4rem',
}

const INPUT: React.CSSProperties = {
  width:        '100%',
  background:   'rgba(255,255,255,0.02)',
  border:       '1px solid rgba(255,255,255,0.07)',
  borderRadius: '2px',
  outline:      'none',
  fontFamily:   "'Cormorant Garamond', Georgia, serif",
  fontSize:     '0.95rem',
  color:        '#F0EDE6',
  padding:      '0.55rem 0.75rem',
  lineHeight:   1.4,
}

function Sigil() {
  return (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="20" y="3"  width="12" height="12" transform="rotate(45 20 3)"  fill="none" stroke="rgba(196,162,74,0.45)" strokeWidth="1"/>
      <rect x="20" y="10" width="8"  height="8"  transform="rotate(45 20 10)" fill="none" stroke="rgba(196,162,74,0.75)" strokeWidth="1"/>
      <rect x="20" y="16" width="4"  height="4"  transform="rotate(45 20 16)" fill="rgba(196,162,74,0.95)"/>
    </svg>
  )
}

export default function OnboardClient({ archivistId }: { archivistId: string }) {
  const [linkCopied, setLinkCopied] = useState(false)

  const [form, setForm] = useState({
    familyName:  '',
    clientName:  '',
    clientEmail: '',
    phone:       '',
    tier:        'estate',
    notes:       '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [result,     setResult]     = useState<Result | null>(null)
  const [error,      setError]      = useState<string | null>(null)

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/archivist/onboard-client', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ archivistId, ...form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to initialize archive')
      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setForm({ familyName: '', clientName: '', clientEmail: '', phone: '', tier: 'estate', notes: '' })
    setResult(null)
    setError(null)
  }

  const TIER_LABELS: Record<string, string> = { archive: 'The Archive ($1,200/yr)', estate: 'The Estate ($3,600/yr)', dynasty: 'The Dynasty ($9,600/yr)' }
  const tierLabel = TIER_LABELS[form.tier] || ''

  return (
    <div style={{ maxWidth: '560px' }}>

      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.42rem', letterSpacing: '0.25em', textTransform: 'uppercase' as const, color: '#C4A24A', marginBottom: '0.5rem' }}>
          New Client
        </p>
        <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 700, fontSize: '1.6rem', color: '#F0EDE6', lineHeight: 1.15, margin: '0 0 0.5rem' }}>
          Initialize New Archive
        </h1>
        <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '0.95rem', fontStyle: 'italic', color: '#9DA3A8', lineHeight: 1.7, margin: 0 }}>
          Complete this form to create the client's archive and send their login credentials automatically.
        </p>
      </div>

      {result ? (
        <div style={{ background: 'rgba(196,162,74,0.05)', border: '1px solid rgba(196,162,74,0.2)', borderTop: '2px solid rgba(196,162,74,0.6)', borderRadius: '2px', padding: '2rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <Sigil />
          </div>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 700, fontSize: '1.3rem', color: '#F0EDE6', margin: '0 0 1.25rem' }}>
            {result.archiveName} is ready.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.5rem', textAlign: 'left', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '2px', padding: '1rem 1.25rem' }}>
            {[
              ['CLIENT',   result.clientEmail],
              ['TIER',     tierLabel],
              ['PASSWORD', result.password],
              ['STATUS',   'Login credentials sent'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline' }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.38rem', letterSpacing: '0.2em', color: '#5C6166', flexShrink: 0, width: '70px' }}>{k}</span>
                <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '0.9rem', color: k === 'PASSWORD' ? '#C4A24A' : '#B8B4AB' }}>{v}</span>
              </div>
            ))}
            {result.magicLink && (
              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.38rem', letterSpacing: '0.2em', color: '#5C6166', flexShrink: 0, width: '70px', paddingTop: '0.15rem' }}>LINK</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '0.78rem', color: '#C4A24A', wordBreak: 'break-all', margin: '0 0 0.4rem', lineHeight: 1.5 }}>
                      {result.magicLink}
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(result.magicLink!)
                        setLinkCopied(true)
                        setTimeout(() => setLinkCopied(false), 2000)
                      }}
                      style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.38rem', letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: linkCopied ? '#4AC47C' : '#C4A24A', background: 'transparent', border: `1px solid ${linkCopied ? 'rgba(74,196,124,0.3)' : 'rgba(196,162,74,0.3)'}`, padding: '0.25rem 0.6rem', cursor: 'pointer' }}
                    >
                      {linkCopied ? 'Copied' : 'Copy Link'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '0.88rem', fontStyle: 'italic', color: '#9DA3A8', lineHeight: 1.7, margin: '0 0 1.5rem' }}>
            {result.clientEmail.split('@')[0]} has been sent their login details. Schedule their Founding Session within 24 hours.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' as const }}>
            <a
              href="/archivist/pipeline"
              style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.42rem', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#C4A24A', textDecoration: 'none', border: '1px solid rgba(196,162,74,0.4)', padding: '0.5rem 1rem' }}
            >
              View in Pipeline →
            </a>
            <button
              onClick={reset}
              style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.42rem', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#5C6166', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', padding: '0.5rem 1rem', cursor: 'pointer' }}
            >
              Initialize Another →
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          <div>
            <label style={LABEL}>Family Name</label>
            <input type="text" required placeholder="Morrison" value={form.familyName} onChange={set('familyName')} style={INPUT} />
            <p style={HELPER}>Used for archive name: The {form.familyName || 'Morrison'} Archive</p>
          </div>

          <div>
            <label style={LABEL}>Client Name</label>
            <input type="text" required placeholder="Margaret Morrison" value={form.clientName} onChange={set('clientName')} style={INPUT} />
          </div>

          <div>
            <label style={LABEL}>Client Email</label>
            <input type="email" required placeholder="margaret@email.com" value={form.clientEmail} onChange={set('clientEmail')} style={INPUT} />
            <p style={HELPER}>Login credentials sent here automatically</p>
          </div>

          <div>
            <label style={LABEL}>Phone (optional)</label>
            <input type="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={set('phone')} style={INPUT} />
          </div>

          <div>
            <label style={LABEL}>Stewardship Tier</label>
            <select value={form.tier} onChange={set('tier')} style={{ ...INPUT, cursor: 'pointer' }}>
              <option value="archive">The Archive ($1,200/year)</option>
              <option value="estate">The Estate ($3,600/year, recommended)</option>
              <option value="dynasty">The Dynasty ($9,600/year)</option>
            </select>
          </div>

          <div>
            <label style={LABEL}>Notes (optional)</label>
            <textarea rows={2} placeholder="Founding session notes, special considerations..." value={form.notes} onChange={set('notes')} style={{ ...INPUT, resize: 'none' as const }} />
          </div>

          {error && (
            <div style={{ background: 'rgba(255,80,80,0.06)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '2px', padding: '0.75rem 1rem' }}>
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.52rem', color: '#9DA3A8', margin: 0 }}>
                Failed to initialize archive: {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              fontFamily:    "'Space Mono', 'DM Mono', monospace",
              fontSize:      '0.44rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase' as const,
              background:    submitting ? 'rgba(196,162,74,0.5)' : '#C4A24A',
              color:         '#0A0908',
              border:        'none',
              padding:       '0.9rem 1.5rem',
              cursor:        submitting ? 'not-allowed' : 'pointer',
              width:         '100%',
              transition:    'background 0.2s',
            }}
          >
            {submitting ? 'Creating archive…' : 'Initialize Archive'}
          </button>

        </form>
      )}
    </div>
  )
}
