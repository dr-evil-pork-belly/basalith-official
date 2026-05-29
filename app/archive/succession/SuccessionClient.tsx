'use client'

import { useState } from 'react'

const MONO: React.CSSProperties  = { fontFamily: '"Space Mono", "Courier New", monospace' }
const SERIF: React.CSSProperties = { fontFamily: '"Cormorant Garamond", Georgia, serif' }

interface Successor {
  id:            string
  name:          string
  email:         string
  organization:  string | null
  title:         string | null
  created_at:    string
  last_login_at: string | null
}

interface Props {
  archiveId:         string
  initialSuccessors: Successor[]
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function SuccessionClient({ archiveId: _archiveId, initialSuccessors }: Props) {
  const [successors, setSuccessors] = useState<Successor[]>(initialSuccessors)
  const [showForm,   setShowForm]   = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [removing,   setRemoving]   = useState<string | null>(null)
  const [error,      setError]      = useState('')
  const [added,      setAdded]      = useState<{ name: string; email: string; password: string } | null>(null)

  const [name,         setName]         = useState('')
  const [email,        setEmail]        = useState('')
  const [organization, setOrganization] = useState('')
  const [title,        setTitle]        = useState('')
  const [password,     setPassword]     = useState('')

  function resetForm() {
    setName(''); setEmail(''); setOrganization(''); setTitle(''); setPassword(''); setError('')
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/archive/succession/add', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, organization, title, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to add successor.'); return }

      const newSuccessor: Successor = {
        id:            data.successorId,
        name:          name.trim(),
        email:         email.trim().toLowerCase(),
        organization:  organization.trim() || null,
        title:         title.trim() || null,
        created_at:    new Date().toISOString(),
        last_login_at: null,
      }
      setSuccessors(prev => [newSuccessor, ...prev])
      setAdded({ name: name.trim(), email: email.trim().toLowerCase(), password })
      resetForm()
      setShowForm(false)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(successorId: string) {
    setRemoving(successorId)
    try {
      const res = await fetch('/api/archive/succession/remove', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ successorId }),
      })
      if (res.ok) setSuccessors(prev => prev.filter(s => s.id !== successorId))
    } catch {}
    setRemoving(null)
  }

  const inputBase: React.CSSProperties = {
    width:      '100%',
    background: 'rgba(240,237,230,0.03)',
    border:     '1px solid rgba(196,162,74,0.18)',
    color:      '#F0EDE6',
    outline:    'none',
    padding:    '10px 14px',
    ...SERIF,
    fontSize:   '0.95rem',
    fontWeight: 300,
    boxSizing:  'border-box',
  }

  const canSubmit = !saving && name.trim() && email.trim() && password.trim()

  return (
    <div style={{ maxWidth: '800px' }}>

      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <p style={{ ...MONO, fontSize: '0.44rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.5)', marginBottom: '8px' }}>
          Succession Management
        </p>
        <h1 style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 300, color: '#F0EDE6', margin: '0 0 10px', lineHeight: 1.2 }}>
          Successors
        </h1>
        <p style={{ ...SERIF, fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 300, color: '#706C65', margin: 0, lineHeight: 1.7 }}>
          Successors can query your entity using the Successor Portal. Grant access to
          trusted individuals who may need to apply your judgment after you are gone.
        </p>
      </div>

      {/* Credentials just added — show once, then dismiss */}
      {added && (
        <div style={{ background: 'rgba(196,162,74,0.06)', border: '1px solid rgba(196,162,74,0.3)', padding: '20px 24px', marginBottom: '32px' }}>
          <p style={{ ...MONO, fontSize: '0.52rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C4A24A', marginBottom: '12px' }}>
            Successor Added
          </p>
          <p style={{ ...SERIF, fontSize: '0.9rem', fontStyle: 'italic', color: '#B8B4AB', lineHeight: 1.7, marginBottom: '14px' }}>
            Share these credentials with {added.name}. They cannot be retrieved after you leave this page.
          </p>
          <div style={{ ...MONO, fontSize: '0.56rem', letterSpacing: '0.08em', color: '#F0EDE6', lineHeight: 2.2 }}>
            <div>Login URL: <span style={{ color: '#C4A24A' }}>/succession/login</span></div>
            <div>Email: <span style={{ color: '#C4A24A' }}>{added.email}</span></div>
            <div>Password: <span style={{ color: '#C4A24A' }}>{added.password}</span></div>
          </div>
          <button
            onClick={() => setAdded(null)}
            style={{ ...MONO, fontSize: '0.46rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5C6166', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0 0', textDecoration: 'underline' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Add button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          style={{
            ...MONO,
            fontSize:      '0.54rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color:         '#C4A24A',
            background:    'transparent',
            border:        '1px solid rgba(196,162,74,0.3)',
            padding:       '12px 24px',
            cursor:        'pointer',
            marginBottom:  '32px',
          }}
        >
          + Add Successor
        </button>
      )}

      {/* Inline add form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          style={{ background: 'rgba(196,162,74,0.03)', border: '1px solid rgba(196,162,74,0.18)', padding: '28px', marginBottom: '32px' }}
        >
          <p style={{ ...MONO, fontSize: '0.52rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C4A24A', marginBottom: '20px' }}>
            New Successor
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ ...MONO, fontSize: '0.46rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#5C6166', display: 'block', marginBottom: '8px' }}>Name *</label>
              <input required value={name} onChange={e => setName(e.target.value)} style={inputBase} />
            </div>
            <div>
              <label style={{ ...MONO, fontSize: '0.46rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#5C6166', display: 'block', marginBottom: '8px' }}>Email *</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputBase} />
            </div>
            <div>
              <label style={{ ...MONO, fontSize: '0.46rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#5C6166', display: 'block', marginBottom: '8px' }}>Organization</label>
              <input value={organization} onChange={e => setOrganization(e.target.value)} placeholder="Company or family" style={inputBase} />
            </div>
            <div>
              <label style={{ ...MONO, fontSize: '0.46rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#5C6166', display: 'block', marginBottom: '8px' }}>Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="CEO, Trustee, etc." style={inputBase} />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ ...MONO, fontSize: '0.46rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#5C6166', display: 'block', marginBottom: '8px' }}>Password *</label>
            <input
              required
              type="text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Set a strong password for the successor"
              style={{ ...inputBase, fontFamily: '"Courier New", monospace' }}
            />
            <p style={{ ...MONO, fontSize: '0.42rem', color: '#3A3F44', marginTop: '6px' }}>
              This password will only be shown once. Copy it before dismissing.
            </p>
          </div>

          {error && (
            <p style={{ ...MONO, fontSize: '0.5rem', letterSpacing: '0.06em', color: 'rgba(196,162,74,0.7)', marginBottom: '16px' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                ...MONO,
                fontSize:      '0.54rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                background:    canSubmit ? '#C4A24A' : 'rgba(196,162,74,0.15)',
                color:         canSubmit ? '#0A0908' : '#C4A24A',
                border:        '1px solid rgba(196,162,74,0.3)',
                padding:       '12px 24px',
                cursor:        canSubmit ? 'pointer' : 'not-allowed',
                transition:    'background 0.2s, color 0.2s',
              }}
            >
              {saving ? 'Adding...' : 'Add Successor'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm() }}
              style={{ ...MONO, fontSize: '0.52rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5C6166', background: 'none', border: '1px solid rgba(255,255,255,0.06)', padding: '12px 24px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Successors list */}
      {successors.length === 0 ? (
        <p style={{ ...SERIF, fontSize: '0.95rem', fontStyle: 'italic', color: '#3A3F44' }}>
          No successors added yet. Add one above.
        </p>
      ) : (
        <div>
          <p style={{ ...MONO, fontSize: '0.48rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#5C6166', marginBottom: '16px' }}>
            Active Successors ({successors.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(196,162,74,0.08)' }}>
            {successors.map(s => (
              <div
                key={s.id}
                style={{ background: '#0C0B09', padding: '20px 24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <span style={{ ...SERIF, fontSize: '1rem', fontWeight: 400, color: '#F0EDE6' }}>{s.name}</span>
                    {s.title && (
                      <span style={{ ...MONO, fontSize: '0.44rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5C6166' }}>
                        {s.title}
                      </span>
                    )}
                  </div>
                  <p style={{ ...MONO, fontSize: '0.48rem', letterSpacing: '0.06em', color: '#706C65', margin: '0 0 3px' }}>{s.email}</p>
                  {s.organization && (
                    <p style={{ ...MONO, fontSize: '0.46rem', letterSpacing: '0.06em', color: '#5C6166', margin: '0 0 3px' }}>{s.organization}</p>
                  )}
                  <p style={{ ...MONO, fontSize: '0.44rem', letterSpacing: '0.06em', color: '#3A3F44', margin: 0 }}>
                    Last login: {formatDate(s.last_login_at)}
                    <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
                    Added {formatDate(s.created_at)}
                  </p>
                </div>

                <button
                  onClick={() => handleRemove(s.id)}
                  disabled={removing === s.id}
                  style={{
                    ...MONO,
                    fontSize:      '0.44rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color:         removing === s.id ? '#3A3F44' : '#5C6166',
                    background:    'none',
                    border:        '1px solid rgba(255,255,255,0.06)',
                    padding:       '6px 14px',
                    cursor:        removing === s.id ? 'not-allowed' : 'pointer',
                    flexShrink:    0,
                    transition:    'color 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => { if (removing !== s.id) { (e.currentTarget as HTMLElement).style.color = 'rgba(196,162,74,0.7)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(196,162,74,0.2)' } }}
                  onMouseLeave={e => { if (removing !== s.id) { (e.currentTarget as HTMLElement).style.color = '#5C6166'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)' } }}
                >
                  {removing === s.id ? 'Removing...' : 'Remove'}
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid rgba(196,162,74,0.06)' }}>
            <p style={{ ...MONO, fontSize: '0.44rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3A3F44', margin: 0 }}>
              Successor Portal: /succession/login
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
