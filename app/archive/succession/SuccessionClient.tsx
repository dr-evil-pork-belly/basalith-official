'use client'

import { useState } from 'react'

const MONO: React.CSSProperties  = { fontFamily: 'var(--portal-mono)' }
const SERIF: React.CSSProperties = { fontFamily: 'var(--portal-serif)' }

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
    background: 'var(--portal-inset)',
    border:     '1px solid var(--portal-gold-line)',
    color:      'var(--portal-ink)',
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
        <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--portal-gold-ink)', marginBottom: '8px' }}>
          Succession Management
        </p>
        <h1 style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 300, color: 'var(--portal-ink)', margin: '0 0 10px', lineHeight: 1.2 }}>
          Successors
        </h1>
        <p style={{ ...SERIF, fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 300, color: 'var(--portal-secondary)', margin: 0, lineHeight: 1.7 }}>
          Successors can query your entity using the Successor Portal. Grant access to
          trusted individuals who may need to apply your judgment after you are gone.
        </p>
      </div>

      {/* Credentials just added: show once, then dismiss */}
      {added && (
        <div style={{ background: 'var(--portal-gold-wash)', border: '1px solid var(--portal-gold-line)', padding: '20px 24px', marginBottom: '32px' }}>
          <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--portal-gold-ink)', marginBottom: '12px' }}>
            Successor Added
          </p>
          <p style={{ ...SERIF, fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--portal-body)', lineHeight: 1.7, marginBottom: '14px' }}>
            Share these credentials with {added.name}. They cannot be retrieved after you leave this page.
          </p>
          <div style={{ ...MONO, fontSize: '11px', letterSpacing: '0.08em', color: 'var(--portal-ink)', lineHeight: 2.2 }}>
            <div>Login URL: <span style={{ color: 'var(--portal-gold-ink)' }}>/succession/login</span></div>
            <div>Email: <span style={{ color: 'var(--portal-gold-ink)' }}>{added.email}</span></div>
            <div>Password: <span style={{ color: 'var(--portal-gold-ink)' }}>{added.password}</span></div>
          </div>
          <button
            onClick={() => setAdded(null)}
            style={{ ...MONO, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--portal-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0 0', textDecoration: 'underline' }}
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
            fontSize: '11px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color:         'var(--portal-gold-ink)',
            background:    'transparent',
            border:        '1px solid var(--portal-gold-line)',
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
          style={{ background: 'var(--portal-gold-wash)', border: '1px solid var(--portal-gold-line)', padding: '28px', marginBottom: '32px' }}
        >
          <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--portal-gold-ink)', marginBottom: '20px' }}>
            New Successor
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ ...MONO, fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--portal-secondary)', display: 'block', marginBottom: '8px' }}>Name *</label>
              <input required value={name} onChange={e => setName(e.target.value)} style={inputBase} />
            </div>
            <div>
              <label style={{ ...MONO, fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--portal-secondary)', display: 'block', marginBottom: '8px' }}>Email *</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputBase} />
            </div>
            <div>
              <label style={{ ...MONO, fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--portal-secondary)', display: 'block', marginBottom: '8px' }}>Organization</label>
              <input value={organization} onChange={e => setOrganization(e.target.value)} placeholder="Company or family" style={inputBase} />
            </div>
            <div>
              <label style={{ ...MONO, fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--portal-secondary)', display: 'block', marginBottom: '8px' }}>Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="CEO, Trustee, etc." style={inputBase} />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ ...MONO, fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--portal-secondary)', display: 'block', marginBottom: '8px' }}>Password *</label>
            <input
              required
              type="text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Set a strong password for the successor"
              style={{ ...inputBase, fontFamily: 'var(--portal-mono)' }}
            />
            <p style={{ ...MONO, fontSize: '11px', color: 'var(--portal-label)', marginTop: '6px' }}>
              This password will only be shown once. Copy it before dismissing.
            </p>
          </div>

          {error && (
            <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.06em', color: 'var(--portal-gold-ink)', marginBottom: '16px' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                ...MONO,
                fontSize: '11px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                background:    canSubmit ? 'var(--portal-btn)' : 'var(--portal-tint)',
                color:         canSubmit ? 'var(--portal-btn-label)' : 'var(--portal-gold-ink)',
                border:        '1px solid var(--portal-gold-line)',
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
              style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--portal-secondary)', background: 'none', border: '1px solid var(--portal-rule)', padding: '12px 24px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Successors list */}
      {successors.length === 0 ? (
        <p style={{ ...SERIF, fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--portal-label)' }}>
          No successors added yet. Add one above.
        </p>
      ) : (
        <div>
          <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--portal-secondary)', marginBottom: '16px' }}>
            Active Successors ({successors.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--portal-gold-wash)' }}>
            {successors.map(s => (
              <div
                key={s.id}
                style={{ background: 'var(--portal-card)', padding: '20px 24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <span style={{ ...SERIF, fontSize: '1rem', fontWeight: 400, color: 'var(--portal-ink)' }}>{s.name}</span>
                    {s.title && (
                      <span style={{ ...MONO, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--portal-secondary)' }}>
                        {s.title}
                      </span>
                    )}
                  </div>
                  <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.06em', color: 'var(--portal-secondary)', margin: '0 0 3px' }}>{s.email}</p>
                  {s.organization && (
                    <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.06em', color: 'var(--portal-secondary)', margin: '0 0 3px' }}>{s.organization}</p>
                  )}
                  <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.06em', color: 'var(--portal-label)', margin: 0 }}>
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
                    fontSize: '11px',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color:         removing === s.id ? 'var(--portal-label)' : 'var(--portal-secondary)',
                    background:    'none',
                    border:        '1px solid var(--portal-rule)',
                    padding:       '6px 14px',
                    cursor:        removing === s.id ? 'not-allowed' : 'pointer',
                    flexShrink:    0,
                    transition:    'color 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => { if (removing !== s.id) { (e.currentTarget as HTMLElement).style.color = 'var(--portal-gold-ink)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--portal-gold-line)' } }}
                  onMouseLeave={e => { if (removing !== s.id) { (e.currentTarget as HTMLElement).style.color = 'var(--portal-secondary)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--portal-rule)' } }}
                >
                  {removing === s.id ? 'Removing...' : 'Remove'}
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--portal-gold-line)' }}>
            <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--portal-label)', margin: 0 }}>
              Successor Portal: /succession/login
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
