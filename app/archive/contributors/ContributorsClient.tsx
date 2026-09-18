'use client'

import { useState, useEffect } from 'react'
import { WITNESS_SESSIONS, RELATIONSHIP_LABELS } from '@/lib/witnessSessions'

// ── Types ────────────────────────────────────────────────────────────────────
type Contributor = {
  id:              string
  name:            string
  email:           string
  role:            string
  relationship:    string
  access_token:    string | null
  created_at:      string
  photos_labelled: number
  phone:           string | null
}

type WitnessSessionRow = {
  id:                string
  created_at:        string
  contributor_name:  string | null
  contributor_email: string
  relationship:      string
  status:            string
  current_question:  number
  completed_at:      string | null
  answers:           any[]
}

const ROLES = ['Family Member', 'Close Friend', 'Legacy Guide', 'Curator', 'Researcher']
const LANGUAGES = [
  { value: 'en',  label: 'English (default)' },
  { value: 'zh',  label: '中文 (Chinese)' },
  { value: 'es',  label: 'Español (Spanish)' },
  { value: 'tl',  label: 'Tagalog' },
  { value: 'vi',  label: 'Vietnamese (Tiếng Việt)' },
  { value: 'ko',  label: 'Korean (한국어)' },
  { value: 'other', label: 'Other' },
]

const INITIAL_CONTRIB = { name: '', email: '', role: '', relationship: '', phone: '', preferred_language: 'en' }
const INITIAL_INVITE  = {
  contributorName:  '',
  contributorEmail: '',
  relationship:     '',
  subjectName:      '',
  ownerName:        '',
  personalNote:     '',
}

function humanizeError(raw: string | undefined): string {
  if (!raw) return 'Something went wrong. Please try again.'
  const m = raw.toLowerCase()
  if (m.includes('fetch') || m === 'networkerror' || m.includes('network request failed')) return 'Connection lost. Please try again.'
  if (/\b[45]\d{2}\b/.test(m)) return 'Something went wrong. Please try again.'
  if (m === 'null' || m === 'undefined' || m.includes(' is null') || m.includes(' is undefined')) return 'Something went wrong. Please try again.'
  if (m.includes('storage')) return 'This file could not be uploaded. Please try again.'
  return raw
}

const inputCls   = 'w-full bg-transparent font-sans text-[15.5px] placeholder:text-[var(--portal-label)] focus:outline-none pb-2 transition-colors duration-200'
const inputStyle = { color: 'var(--portal-ink)', borderBottom: '1px solid var(--portal-card-line)' }
const labelCls   = 'font-compute text-[11px] tracking-[0.16em] uppercase block mb-2'
const labelStyle = { color: 'var(--portal-label)' }

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const config =
    status === 'completed'   ? { color: 'var(--portal-ok)', bg: 'var(--portal-tint)', label: 'Completed' } :
    status === 'in_progress' ? { color: 'var(--portal-gold-ink)',    bg: 'var(--portal-gold-wash)',  label: 'In Progress' } :
                               { color: 'var(--portal-secondary)',               bg: 'var(--portal-inset)', label: 'Pending' }
  return (
    <span style={{
      fontFamily: 'var(--portal-mono)',
      fontSize: '11px',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color:         config.color,
      background:    config.bg,
      padding:       '2px 8px',
      borderRadius:  '2px',
    }}>
      {config.label}
    </span>
  )
}

// ── Answers modal ─────────────────────────────────────────────────────────────
function AnswersModal({ session, onClose }: { session: WitnessSessionRow; onClose: () => void }) {
  const answers: any[] = Array.isArray(session.answers) ? session.answers : []
  const name = session.contributor_name || session.contributor_email
  const relLabel = RELATIONSHIP_LABELS[session.relationship] ?? session.relationship

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--portal-scrim)' }}
      onClick={onClose}
    >
      <div
        style={{
          background:   'var(--portal-card)',
          border:       '1px solid var(--portal-gold-line)',
          borderTop:    '3px solid var(--portal-gold-line)',
          borderRadius: '2px',
          padding:      '2rem 2.5rem',
          maxWidth:     '640px',
          width:        '100%',
          maxHeight:    '80vh',
          overflowY:    'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--portal-gold-ink)', marginBottom: '0.3rem' }}>
              Witness Session
            </p>
            <h3 className="font-serif" style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--portal-ink)' }}>
              {name}
            </h3>
            <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', color: 'var(--portal-secondary)' }}>{relLabel}</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--portal-secondary)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0 0 1rem' }}
          >
            ×
          </button>
        </div>

        {answers.length === 0 ? (
          <p className="font-serif italic" style={{ color: 'var(--portal-secondary)', fontSize: '0.9rem' }}>No answers saved yet.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {answers.map((a: any, i: number) => (
              <div key={i} style={{ borderLeft: '2px solid var(--portal-gold-line)', paddingLeft: '1.25rem' }}>
                <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.1em', color: 'var(--portal-gold-ink)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Q{i + 1}
                </p>
                <p className="font-serif italic" style={{ fontSize: '0.85rem', color: 'var(--portal-body)', lineHeight: 1.6, marginBottom: '0.5rem' }}>
                  {a.question}
                </p>
                <p className="font-serif" style={{ fontSize: '0.95rem', color: 'var(--portal-ink)', lineHeight: 1.8 }}>
                  {a.answer || <span style={{ color: 'var(--portal-secondary)', fontStyle: 'italic' }}>No answer provided</span>}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ContributorsClient({ archiveId }: { archiveId: string }) {
  const [contributors,   setContributors]   = useState<Contributor[]>([])
  const [form,           setForm]           = useState(INITIAL_CONTRIB)
  const [adding,         setAdding]         = useState(false)
  const [addError,       setAddError]       = useState('')
  const [showForm,       setShowForm]       = useState(false)
  const [inviteForm,     setInviteForm]     = useState(INITIAL_INVITE)
  const [inviting,       setInviting]       = useState(false)
  const [inviteSent,     setInviteSent]     = useState(false)
  const [inviteError,    setInviteError]    = useState('')
  const [witnessSessions, setWitnessSessions] = useState<WitnessSessionRow[]>([])
  const [viewingSession, setViewingSession] = useState<WitnessSessionRow | null>(null)
  const [copiedId,       setCopiedId]       = useState<string | null>(null)
  const [sendingId,      setSendingId]      = useState<string | null>(null)
  const [sentId,         setSentId]         = useState<string | null>(null)

  useEffect(() => {
    fetchContributors()
    fetchWitnessSessions()
  }, [archiveId])

  async function fetchContributors() {
    try {
      const res = await fetch(`/api/archive/contributors?archiveId=${archiveId}`)
      if (res.ok) {
        const data = await res.json()
        setContributors(data.contributors ?? [])
      }
    } catch {}
  }

  async function fetchWitnessSessions() {
    try {
      const res  = await fetch(`/api/archive/witness-sessions?archiveId=${archiveId}`)
      if (res.ok) {
        const data = await res.json()
        setWitnessSessions(data.sessions ?? [])
      }
    } catch {}
  }

  function setContrib(key: keyof typeof INITIAL_CONTRIB) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  function setInvite(key: keyof typeof INITIAL_INVITE) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setInviteForm(f => ({ ...f, [key]: e.target.value }))
  }

  function portalUrl(token: string | null) {
    if (!token) return null
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.ai'
    return `${base}/contribute/${token}`
  }

  async function copyPortalLink(c: Contributor) {
    const url = portalUrl(c.access_token)
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(c.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {}
  }

  async function sendPortalLink(c: Contributor) {
    setSendingId(c.id)
    try {
      await fetch('/api/archive/contributors', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'resend-invite', archiveId, contributorId: c.id }),
      })
      setSentId(c.id)
      setTimeout(() => setSentId(null), 3000)
    } catch {} finally {
      setSendingId(null)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    setAddError('')
    try {
      const res = await fetch('/api/archive/contributors', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ archiveId, name: form.name, email: form.email, role: form.role, relationship: form.relationship || 'other', phone: form.phone || null, preferred_language: form.preferred_language || 'en' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setContributors(prev => [data.contributor, ...prev.filter(c => c.id !== data.contributor.id)])
      setForm(INITIAL_CONTRIB)
      setShowForm(false)
    } catch (err: any) {
      setAddError(humanizeError(err.message))
    } finally {
      setAdding(false)
    }
  }

  async function remove(id: string) {
    try {
      await fetch(`/api/archive/contributors?id=${id}&archiveId=${archiveId}`, {
        method: 'DELETE',
      })
      setContributors(prev => prev.filter(c => c.id !== id))
    } catch {}
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteError('')
    try {
      const res  = await fetch('/api/archive/invite-witness', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ archiveId, ...inviteForm }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setInviteSent(true)
      setInviteForm(INITIAL_INVITE)
      fetchWitnessSessions()
    } catch (err: any) {
      setInviteError(humanizeError(err.message))
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">

      {/* ── CONTRIBUTORS SECTION ── */}
      <div className="flex items-end justify-between mb-8 gap-4">
        <div>
          <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11.5px', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--portal-gold-ink)', marginBottom: '14px' }}>Contributors</p>
          <h1 className="font-serif" style={{ fontSize: 'clamp(34px,4.2vw,50px)', fontWeight: 400, lineHeight: 1.08, letterSpacing: '-0.015em', color: 'var(--portal-ink)' }}>
            The people who remember with you.
          </h1>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-monolith-amber shrink-0 !py-2.5 !px-5 !text-[0.7rem]" style={{ minHeight: '44px' }}>
          {showForm ? 'Cancel' : 'Add a contributor'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="rounded-sm border px-7 py-7 mb-8" style={{ background: 'var(--portal-card)', borderColor: 'var(--portal-gold-line)' }}>
          <p className="font-compute text-[11.5px] tracking-[0.24em] uppercase mb-6" style={{ color: 'var(--portal-gold-ink)' }}>New contributor</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
            <div>
              <label className={labelCls} style={labelStyle}>Full name</label>
              <input type="text" required placeholder="Jane Whitmore" value={form.name} onChange={setContrib('name')} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Email</label>
              <input type="email" required placeholder="jane@example.com" value={form.email} onChange={setContrib('email')} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Role</label>
              <select required value={form.role} onChange={setContrib('role')} className={inputCls} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="" disabled style={{ background: 'var(--portal-card)' }}>Select role</option>
                {ROLES.map(r => <option key={r} value={r} style={{ background: 'var(--portal-card)' }}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Relationship to you</label>
              <select value={form.relationship} onChange={setContrib('relationship')} className={inputCls} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="" style={{ background: 'var(--portal-card)' }}>Select (optional)</option>
                {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
                  <option key={value} value={value} style={{ background: 'var(--portal-card)' }}>{label as string}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-5">
            <label className={labelCls} style={labelStyle}>
              Phone number <span style={{ color: 'var(--portal-label)', fontWeight: 400 }}>(optional, for phone call recording)</span>
            </label>
            <input
              type="tel"
              placeholder="+1 555 000 0000"
              value={form.phone}
              onChange={setContrib('phone')}
              className={inputCls}
              style={inputStyle}
            />
            <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.08em', color: 'var(--portal-label)', marginTop: '0.4rem' }}>
              Include country code. They can call {process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER || 'your Basalith phone number'} to record stories by phone.
            </p>
          </div>
          <div className="mb-5">
            <label className={labelCls} style={labelStyle}>
              Preferred language <span style={{ color: 'var(--portal-label)', fontWeight: 400 }}>(optional, for emails and portal)</span>
            </label>
            <select value={form.preferred_language} onChange={setContrib('preferred_language')} className={inputCls} style={{ ...inputStyle, cursor: 'pointer' }}>
              {LANGUAGES.map(l => (
                <option key={l.value} value={l.value} style={{ background: 'var(--portal-card)' }}>{l.label}</option>
              ))}
            </select>
          </div>
          {addError && (
            <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', color: 'var(--portal-error)', marginBottom: '1rem' }}>{addError}</p>
          )}
          <button type="submit" disabled={adding} className="btn-monolith-amber disabled:opacity-50">
            {adding ? 'Adding…' : 'Add contributor'}
          </button>
        </form>
      )}

      {contributors.length === 0 && (
        <div style={{ padding: '1.5rem 0 0.5rem', borderTop: '1px solid var(--portal-rule)' }}>
          <p className="font-serif" style={{ color: 'var(--portal-ink)', fontSize: '19px', marginBottom: '0.5rem' }}>
            No contributors yet.
          </p>
          <p className="font-serif" style={{ color: 'var(--portal-body)', fontSize: '17px', lineHeight: 1.65, maxWidth: '58ch' }}>
            Invite family to contribute their memories. Each person receives photographs by email and can reply with what they remember.
          </p>
        </div>
      )}

      {contributors.length > 0 && (
        <div className="rounded-sm border overflow-hidden mb-8" style={{ borderColor: 'var(--portal-rule)', overflowX: 'auto' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: '520px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--portal-rule)', background: 'var(--portal-card)' }}>
                {['Name', 'Role', 'Labels', 'Added', ''].map(h => (
                  <th key={h} className="font-sans text-[11px] tracking-[0.12em] uppercase text-left px-5 py-3" style={{ color: 'var(--portal-label)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contributors.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i < contributors.length - 1 ? '1px solid var(--portal-rule)' : 'none', background: 'var(--portal-card)' }}>
                  <td className="px-5 py-4">
                    <p className="font-sans text-[15.5px]" style={{ color: 'var(--portal-ink)' }}>{c.name}</p>
                    <p className="font-sans text-[11.5px] mt-0.5" style={{ color: 'var(--portal-label)' }}>{c.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-sans text-[11px] tracking-[0.08em] uppercase px-2 py-1 rounded-sm" style={{ background: 'var(--portal-inset)', color: 'var(--portal-body)' }}>
                      {c.role}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-serif font-semibold" style={{ color: 'var(--portal-ink)', fontSize: '1.1rem' }}>{c.photos_labelled ?? 0}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-sans text-[14.5px]" style={{ color: 'var(--portal-secondary)' }}>
                      {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => remove(c.id)} className="font-sans text-[11px] tracking-[0.08em] uppercase transition-colors duration-200" style={{ color: 'var(--portal-label)' }}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── CONTRIBUTOR PORTALS SECTION ── */}
      {contributors.some(c => c.access_token) && (
        <div style={{ marginTop: '3rem', paddingTop: '3rem', borderTop: '1px solid var(--portal-rule)' }}>
          <div className="mb-6">
            <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--portal-gold-ink)', marginBottom: '0.5rem' }}>
              Contributor Portals
            </p>
            <h2 className="font-serif font-semibold" style={{ fontSize: 'clamp(1.5rem,2.5vw,2rem)', color: 'var(--portal-ink)', letterSpacing: '-0.02em' }}>
              Portal Access
            </h2>
          </div>

          <div className="flex flex-col gap-3">
            {contributors.filter(c => c.access_token).map(c => {
              const url = portalUrl(c.access_token)
              const relLabel = RELATIONSHIP_LABELS[c.relationship] ?? c.relationship ?? ''
              return (
                <div
                  key={c.id}
                  className="rounded-sm"
                  style={{ background: 'var(--portal-card)', border: '1px solid var(--portal-rule)', padding: '1rem 1.25rem' }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-sans text-[15.5px]" style={{ color: 'var(--portal-ink)' }}>{c.name || c.email}</p>
                        {relLabel && (
                          <span style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--portal-secondary)', background: 'var(--portal-inset)', padding: '2px 6px', borderRadius: '2px' }}>
                            {relLabel as string}
                          </span>
                        )}
                      </div>
                      <p className="font-sans text-[11.5px] truncate" style={{ color: 'var(--portal-label)' }}>
                        {url}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => copyPortalLink(c)}
                        style={{
                          background:    copiedId === c.id ? 'var(--portal-tint)' : 'var(--portal-inset)',
                          border:        `1px solid ${copiedId === c.id ? 'var(--portal-ok)' : 'var(--portal-card-line)'}`,
                          borderRadius:  '2px',
                          padding:       '0.45rem 0.9rem',
                          fontFamily: 'var(--portal-mono)',
                          fontSize: '11px',
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase' as const,
                          color:         copiedId === c.id ? 'var(--portal-ok)' : 'var(--portal-body)',
                          cursor:        'pointer',
                          minHeight:     '44px',
                          whiteSpace:    'nowrap' as const,
                        }}
                      >
                        {copiedId === c.id ? 'Copied ✓' : 'Copy Link'}
                      </button>
                      <button
                        onClick={() => sendPortalLink(c)}
                        disabled={sendingId === c.id}
                        style={{
                          background:    sentId === c.id ? 'var(--portal-tint)' : 'var(--portal-gold-wash)',
                          border:        `1px solid ${sentId === c.id ? 'var(--portal-ok)' : 'var(--portal-gold-line)'}`,
                          borderRadius:  '2px',
                          padding:       '0.45rem 0.9rem',
                          fontFamily: 'var(--portal-mono)',
                          fontSize: '11px',
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase' as const,
                          color:         sentId === c.id ? 'var(--portal-ok)' : 'var(--portal-gold-ink)',
                          cursor:        sendingId === c.id ? 'not-allowed' : 'pointer',
                          opacity:       sendingId === c.id ? 0.5 : 1,
                          minHeight:     '44px',
                          whiteSpace:    'nowrap' as const,
                        }}
                      >
                        {sendingId === c.id ? 'Sending…' : sentId === c.id ? 'Sent ✓' : 'Send Link'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── WITNESS SESSIONS SECTION ── */}
      <div style={{ marginTop: '3rem', paddingTop: '3rem', borderTop: '1px solid var(--portal-rule)' }}>

        <div className="mb-6">
          <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11.5px', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--portal-gold-ink)', marginBottom: '14px' }}>
            Witness sessions
          </p>
          <h2 className="font-serif" style={{ fontSize: '30px', fontWeight: 400, color: 'var(--portal-ink)', lineHeight: 1.2, marginBottom: '12px' }}>
            Invite someone who was there.
          </h2>
          <p className="font-serif" style={{ fontSize: '17.5px', color: 'var(--portal-body)', lineHeight: 1.65, maxWidth: '58ch' }}>
            People who know you can add what they saw. Their side of a story goes on the record alongside yours, marked as theirs.
          </p>
        </div>

        {/* Invite form */}
        {inviteSent ? (
          <div style={{
            background:   'var(--portal-gold-wash)',
            border:       '1px solid var(--portal-gold-line)',
            borderRadius: '2px',
            padding:      '1.5rem 2rem',
            marginBottom: '2rem',
          }}>
            <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--portal-gold-ink)', marginBottom: '0.4rem' }}>
              Invitation sent ✓
            </p>
            <p className="font-serif italic" style={{ fontSize: '0.9rem', color: 'var(--portal-body)' }}>
              They will receive an email with a link to their personal session.
            </p>
            <button
              onClick={() => setInviteSent(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--portal-gold-ink)', marginTop: '0.75rem', padding: 0 }}
            >
              Invite another →
            </button>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="rounded-sm border px-7 py-7 mb-8" style={{ background: 'var(--portal-card)', borderColor: 'var(--portal-gold-line)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              <div>
                <label className={labelCls} style={labelStyle}>Their name</label>
                <input type="text" required placeholder="Jane Whitmore" value={inviteForm.contributorName}
                  onChange={setInvite('contributorName')} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>Their email</label>
                <input type="email" required placeholder="jane@example.com" value={inviteForm.contributorEmail}
                  onChange={setInvite('contributorEmail')} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>Relationship</label>
                <select required value={inviteForm.relationship} onChange={setInvite('relationship')} className={inputCls} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="" disabled style={{ background: 'var(--portal-card)' }}>Select relationship</option>
                  {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
                    <option key={value} value={value} style={{ background: 'var(--portal-card)' }}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>How they know you (your name / nickname)</label>
                <input type="text" required placeholder="Dad, Harold, Mr. Whitmore…" value={inviteForm.subjectName}
                  onChange={setInvite('subjectName')} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>Your name (for the invitation)</label>
                <input type="text" required placeholder="Harold Whitmore" value={inviteForm.ownerName}
                  onChange={setInvite('ownerName')} className={inputCls} style={inputStyle} />
              </div>
            </div>
            <div className="mb-5">
              <label className={labelCls} style={labelStyle}>Personal note (optional)</label>
              <textarea
                placeholder="Add a personal note to the invitation…"
                value={inviteForm.personalNote}
                onChange={setInvite('personalNote')}
                rows={3}
                className="font-serif italic w-full bg-transparent focus:outline-none resize-none"
                style={{ fontSize: '0.95rem', color: 'var(--portal-body)', borderBottom: '1px solid var(--portal-card-line)', paddingBottom: '0.5rem', lineHeight: 1.7 }}
              />
            </div>
            {inviteError && (
              <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', color: 'var(--portal-error)', marginBottom: '1rem' }}>{inviteError}</p>
            )}
            <button
              type="submit"
              disabled={inviting}
              style={{
                background:    inviting ? 'var(--portal-tint)' : 'var(--portal-btn)',
                border:        'none',
                borderRadius:  '2px',
                padding:       '0.7rem 2rem',
                fontFamily: 'var(--portal-mono)',
                fontSize: '11px',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color:         'var(--portal-btn-label)',
                cursor:        inviting ? 'not-allowed' : 'pointer',
              }}
            >
              {inviting ? 'Sending' : 'Send the invitation'}
            </button>
          </form>
        )}

        {/* Sent invitations table */}
        {witnessSessions.length > 0 && (
          <div>
            <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--portal-secondary)', marginBottom: '1rem' }}>
              Sent Invitations
            </p>
            <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'var(--portal-rule)', overflowX: 'auto' }}>
              <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: '560px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--portal-rule)', background: 'var(--portal-card)' }}>
                    {['Name', 'Relationship', 'Status', 'Answered', 'Sent', ''].map(h => (
                      <th key={h} className="font-sans text-[11px] tracking-[0.1em] uppercase text-left px-4 py-3" style={{ color: 'var(--portal-label)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {witnessSessions.map((s, i) => {
                    const answers    = Array.isArray(s.answers) ? s.answers : []
                    const relLabel   = RELATIONSHIP_LABELS[s.relationship] ?? s.relationship
                    const isLast     = i === witnessSessions.length - 1
                    const answerCount = answers.filter((a: any) => a.answer).length
                    return (
                      <tr key={s.id} style={{ borderBottom: isLast ? 'none' : '1px solid var(--portal-rule)', background: 'var(--portal-card)' }}>
                        <td className="px-4 py-3">
                          <p className="font-sans text-[15px]" style={{ color: 'var(--portal-ink)' }}>{s.contributor_name || 'Unnamed'}</p>
                          <p className="font-sans text-[11px] mt-0.5" style={{ color: 'var(--portal-label)' }}>{s.contributor_email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', color: 'var(--portal-body)' }}>{relLabel}</p>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={s.status} />
                        </td>
                        <td className="px-4 py-3">
                          <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', color: 'var(--portal-body)' }}>
                            {answerCount} / {WITNESS_SESSIONS[s.relationship]?.questions.length ?? 5}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', color: 'var(--portal-secondary)' }}>
                            {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {s.status === 'completed' && (
                            <button
                              onClick={() => setViewingSession(s)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--portal-gold-ink)', padding: 0 }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'var(--portal-btn)')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--portal-btn)')}
                            >
                              View answers →
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Answers modal */}
      {viewingSession && (
        <AnswersModal session={viewingSession} onClose={() => setViewingSession(null)} />
      )}

    </div>
  )
}
