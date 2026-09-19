'use client'

import { useState } from 'react'
import Link from 'next/link'

const MONO: React.CSSProperties  = { fontFamily: 'var(--portal-mono)' }
const SERIF: React.CSSProperties = { fontFamily: 'var(--portal-serif)' }

const CONTEXT_TYPES = [
  { value: 'business_update',       label: 'Business Update' },
  { value: 'market_condition',      label: 'Market Condition' },
  { value: 'organizational_change', label: 'Organizational Change' },
  { value: 'strategic_decision',    label: 'Strategic Decision' },
  { value: 'other',                 label: 'Other' },
]

interface Context {
  id:           string
  content:      string
  context_type: string
  created_at:   string
}

interface Props {
  session:          { successorId: string; archiveId: string; name: string; organization: string | null }
  archiveName:      string
  existingContexts: Context[]
}

function contextTypeLabel(raw: string): string {
  return CONTEXT_TYPES.find(t => t.value === raw)?.label ?? raw
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function SuccessorContextClient({ session, archiveName, existingContexts }: Props) {
  const [contextType, setContextType] = useState('business_update')
  const [content,     setContent]     = useState('')
  const [loading,     setLoading]     = useState(false)
  const [confirmed,   setConfirmed]   = useState(false)
  const [error,       setError]       = useState('')
  const [contexts,    setContexts]    = useState<Context[]>(existingContexts)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (content.trim().length < 50) {
      setError('Please provide at least 50 characters of context.')
      return
    }
    setLoading(true)
    setError('')

    const res = await fetch('/api/succession/context/add', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content: content.trim(), contextType }),
    })

    if (res.ok) {
      const { id } = await res.json()
      const newCtx: Context = {
        id,
        content:      content.trim(),
        context_type: contextType,
        created_at:   new Date().toISOString(),
      }
      setContexts(prev => [newCtx, ...prev])
      setContent('')
      setContextType('business_update')
      setConfirmed(true)
      setTimeout(() => setConfirmed(false), 5000)
    } else {
      setError('Failed to save context. Please try again.')
    }
    setLoading(false)
  }

  const inputBase: React.CSSProperties = {
    width:        '100%',
    background:   'var(--portal-inset)',
    border:       '1px solid var(--portal-gold-line)',
    color:        'var(--portal-ink)',
    outline:      'none',
    padding:      '12px 16px',
    ...SERIF,
    fontSize:     '0.95rem',
    fontWeight:   300,
  }

  return (
    <main className="portal-stone" style={{ minHeight: '100vh', background: 'var(--portal-bg)' }}>

      {/* Top bar. The spine: this portal has no sidebar, so the ink bar is the
          dark anchor. Colors inside it are --spine-* values. */}
      <div style={{ background: 'var(--portal-spine)', color: 'var(--spine-fg)', padding: '18px 40px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/succession/portal" style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--spine-body)', textDecoration: 'none' }}>
          ← Portal
        </Link>
        <span style={{ ...MONO, fontSize: '11px', color: 'var(--spine-dim)' }}>|</span>
        <span style={{ ...MONO, fontSize: '11px', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--spine-gold)' }}>
          Inject Context · {archiveName}
        </span>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '56px 40px' }}>

        {/* Explainer */}
        <div style={{ marginBottom: '44px' }}>
          <h1 style={{ ...SERIF, fontSize: '1.8rem', fontWeight: 300, color: 'var(--portal-ink)', margin: '0 0 12px', lineHeight: 1.3 }}>
            Context Injection
          </h1>
          <p style={{ ...SERIF, fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 300, color: 'var(--portal-secondary)', margin: 0, lineHeight: 1.7 }}>
            Describe the current business situation you want the entity to reason about.
            This context sits above the frozen cognitive fingerprint and shapes how the founder's
            judgment is applied to your questions.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '56px' }}>

          {/* Context type */}
          <div>
            <label style={{ ...MONO, fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--portal-secondary)', display: 'block', marginBottom: '10px' }}>
              Context Type
            </label>
            <select
              value={contextType}
              onChange={e => setContextType(e.target.value)}
              style={{ ...inputBase, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}
            >
              {CONTEXT_TYPES.map(t => (
                <option key={t.value} value={t.value} style={{ background: 'var(--portal-card)' }}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Content */}
          <div>
            <label style={{ ...MONO, fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--portal-secondary)', display: 'block', marginBottom: '10px' }}>
              Context
            </label>
            <textarea
              rows={7}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Describe the current business situation the founder's judgment should be applied to…"
              required
              minLength={50}
              style={{ ...inputBase, resize: 'vertical', lineHeight: 1.7 }}
            />
            <p style={{ ...MONO, fontSize: '11px', color: content.length < 50 ? 'var(--portal-secondary)' : 'var(--portal-gold-ink)', marginTop: '6px', textAlign: 'right' }}>
              {content.length} / 50 min
            </p>
          </div>

          {error && (
            <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.06em', color: 'var(--portal-gold-ink)', margin: 0 }}>
              {error}
            </p>
          )}

          {confirmed && (
            <div style={{ background: 'var(--portal-gold-wash)', border: '1px solid var(--portal-tint)', padding: '14px 18px' }}>
              <p style={{ ...SERIF, fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--portal-gold-ink)', margin: 0 }}>
                Context added. It is now active in your conversations.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || content.trim().length < 50}
            style={{
              ...MONO,
              background:    loading || content.trim().length < 50 ? 'var(--portal-tint)' : 'var(--portal-btn)',
              color:         loading || content.trim().length < 50 ? 'var(--portal-gold-ink)' : 'var(--portal-btn-label)',
              border:        '1px solid var(--portal-gold-line)',
              padding:       '14px 28px',
              fontSize: '11px',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              cursor:        loading || content.trim().length < 50 ? 'not-allowed' : 'pointer',
              alignSelf:     'flex-start',
              transition:    'background 0.2s, color 0.2s',
            }}
          >
            {loading ? 'Injecting…' : 'Inject Context'}
          </button>
        </form>

        {/* Existing contexts */}
        {contexts.length > 0 && (
          <div>
            <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--portal-secondary)', margin: '0 0 20px' }}>
              All Active Context ({contexts.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--portal-gold-wash)' }}>
              {contexts.map(ctx => (
                <div key={ctx.id} style={{ background: 'var(--portal-card)', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <span style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--portal-gold-ink)' }}>
                      {contextTypeLabel(ctx.context_type)}
                    </span>
                    <span style={{ ...MONO, fontSize: '14.5px', color: 'var(--portal-label)' }}>
                      {formatDate(ctx.created_at)}
                    </span>
                  </div>
                  <p style={{ ...SERIF, fontSize: '0.9rem', fontWeight: 300, color: 'var(--portal-body)', margin: 0, lineHeight: 1.7 }}>
                    {ctx.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
