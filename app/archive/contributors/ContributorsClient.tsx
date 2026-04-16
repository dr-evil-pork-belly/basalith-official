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
const INITIAL_CONTRIB = { name: '', email: '', role: '', relationship: '' }
const INITIAL_INVITE  = {
  contributorName:  '',
  contributorEmail: '',
  relationship:     '',
  subjectName:      '',
  ownerName:        '',
  personalNote:     '',
}

const inputCls   = 'w-full bg-transparent font-sans text-[0.82rem] placeholder:text-[#3A3F44] focus:outline-none pb-2 transition-colors duration-200'
const inputStyle = { color: '#F0F0EE', borderBottom: '1px solid rgba(255,255,255,0.10)' }
const labelCls   = 'font-sans text-[0.56rem] font-bold tracking-[0.14em] uppercase block mb-2'
const labelStyle = { color: '#5C6166' }

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const config =
    status === 'completed'   ? { color: 'rgba(120,180,100,0.9)', bg: 'rgba(120,180,100,0.08)', label: 'Completed' } :
    status === 'in_progress' ? { color: 'rgba(196,162,74,1)',    bg: 'rgba(196,162,74,0.08)',  label: 'In Progress' } :
                               { color: '#5C6166',               bg: 'rgba(255,255,255,0.04)', label: 'Pending' }
  return (
    <span style={{
      fontFamily:    'monospace',
      fontSize:      '0.38rem',
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
      style={{ background: 'rgba(10,9,8,0.85)' }}
      onClick={onClose}
    >
      <div
        style={{
          background:   '#111112',
          border:       '1px solid rgba(196,162,74,0.2)',
          borderTop:    '3px solid rgba(196,162,74,0.5)',
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
            <p style={{ fontFamily: 'monospace', fontSize: '0.4rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)', marginBottom: '0.3rem' }}>
              Witness Session
            </p>
            <h3 className="font-serif" style={{ fontWeight: 700, fontSize: '1.2rem', color: '#F0EDE6' }}>
              {name}
            </h3>
            <p style={{ fontFamily: 'monospace', fontSize: '0.38rem', color: '#5C6166' }}>{relLabel}</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#5C6166', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0 0 1rem' }}
          >
            ×
          </button>
        </div>

        {answers.length === 0 ? (
          <p className="font-serif italic" style={{ color: '#5C6166', fontSize: '0.9rem' }}>No answers saved yet.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {answers.map((a: any, i: number) => (
              <div key={i} style={{ borderLeft: '2px solid rgba(196,162,74,0.25)', paddingLeft: '1.25rem' }}>
                <p style={{ fontFamily: 'monospace', fontSize: '0.38rem', letterSpacing: '0.1em', color: 'rgba(196,162,74,0.6)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Q{i + 1}
                </p>
                <p className="font-serif italic" style={{ fontSize: '0.85rem', color: '#9DA3A8', lineHeight: 1.6, marginBottom: '0.5rem' }}>
                  {a.question}
                </p>
                <p className="font-serif" style={{ fontSize: '0.95rem', color: '#F0EDE6', lineHeight: 1.8 }}>
                  {a.answer || <span style={{ color: '#5C6166', fontStyle: 'italic' }}>No answer provided</span>}
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
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
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
        body:    JSON.stringify({ archiveId, name: form.name, email: form.email, role: form.role, relationship: form.relationship || 'other' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setContributors(prev => [data.contributor, ...prev.filter(c => c.id !== data.contributor.id)])
      setForm(INITIAL_CONTRIB)
      setShowForm(false)
    } catch (err: any) {
      setAddError(err.message ?? 'Failed to add contributor')
    } finally {
      setAdding(false)
    }
  }

  async function remove(id: string) {
    try {
      await fetch('/api/archive/contributors', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ archiveId, contributorId: id }),
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
      setInviteError(err.message ?? 'Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">

      {/* ── CONTRIBUTORS SECTION ── */}
      <div className="flex items-end justify-between mb-8 gap-4">
        <div>
          <p className="eyebrow mb-3">Contributors</p>
          <h1 className="font-serif font-semibold leading-[0.95] tracking-[-0.03em]"
              style={{ fontSize: 'clamp(1.8rem,3vw,2.4rem)', color: '#F0F0EE' }}>
            Archive Access
          </h1>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-monolith-amber shrink-0 !py-2.5 !px-5 !text-[0.7rem]">
          {showForm ? 'Cancel' : 'Add Contributor'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="rounded-sm border px-7 py-7 mb-8" style={{ background: '#111112', borderColor: 'rgba(196,162,74,0.15)' }}>
          <p className="font-sans text-[0.62rem] tracking-[0.14em] uppercase mb-6" style={{ color: 'rgba(196,162,74,0.7)' }}>New Contributor</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
            <div>
              <label className={labelCls} style={labelStyle}>Full Name</label>
              <input type="text" required placeholder="Jane Whitmore" value={form.name} onChange={setContrib('name')} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Email</label>
              <input type="email" required placeholder="jane@example.com" value={form.email} onChange={setContrib('email')} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Role</label>
              <select required value={form.role} onChange={setContrib('role')} className={inputCls} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="" disabled style={{ background: '#111112' }}>Select role</option>
                {ROLES.map(r => <option key={r} value={r} style={{ background: '#111112' }}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Relationship to Subject</label>
              <select value={form.relationship} onChange={setContrib('relationship')} className={inputCls} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="" style={{ background: '#111112' }}>Select (optional)</option>
                {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
                  <option key={value} value={value} style={{ background: '#111112' }}>{label as string}</option>
                ))}
              </select>
            </div>
          </div>
          {addError && (
            <p style={{ fontFamily: 'monospace', fontSize: '0.4rem', color: '#8B5555', marginBottom: '1rem' }}>{addError}</p>
          )}
          <button type="submit" disabled={adding} className="btn-monolith-amber disabled:opacity-50">
            {adding ? 'Adding…' : 'Add to Archive'}
          </button>
        </form>
      )}

      {contributors.length === 0 && (
        <div className="text-center py-12">
          <p className="font-serif font-light" style={{ color: '#3A3F44', fontSize: '1rem' }}>
            No contributors yet. Add the first person to this archive.
          </p>
        </div>
      )}

      {contributors.length > 0 && (
        <div className="rounded-sm border overflow-hidden mb-8" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#111112' }}>
                {['Name', 'Role', 'Labels', 'Added', ''].map(h => (
                  <th key={h} className="font-sans text-[0.56rem] tracking-[0.12em] uppercase text-left px-5 py-3" style={{ color: '#3A3F44', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contributors.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i < contributors.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: '#111112' }}>
                  <td className="px-5 py-4">
                    <p className="font-sans text-[0.8rem]" style={{ color: '#F0F0EE' }}>{c.name}</p>
                    <p className="font-sans text-[0.62rem] mt-0.5" style={{ color: '#3A3F44' }}>{c.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-sans text-[0.6rem] tracking-[0.08em] uppercase px-2 py-1 rounded-sm" style={{ background: 'rgba(255,255,255,0.05)', color: '#9DA3A8' }}>
                      {c.role}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-serif font-semibold" style={{ color: '#F0F0EE', fontSize: '1.1rem' }}>{c.photos_labelled ?? 0}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-sans text-[0.65rem]" style={{ color: '#5C6166' }}>
                      {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => remove(c.id)} className="font-sans text-[0.6rem] tracking-[0.08em] uppercase transition-colors duration-200" style={{ color: '#3A3F44' }}>
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
        <div style={{ marginTop: '3rem', paddingTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="mb-6">
            <p style={{ fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)', marginBottom: '0.5rem' }}>
              Contributor Portals
            </p>
            <h2 className="font-serif font-semibold" style={{ fontSize: 'clamp(1.5rem,2.5vw,2rem)', color: '#F0F0EE', letterSpacing: '-0.02em' }}>
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
                  style={{ background: '#111112', border: '1px solid rgba(255,255,255,0.06)', padding: '1rem 1.25rem' }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-sans text-[0.8rem]" style={{ color: '#F0F0EE' }}>{c.name || c.email}</p>
                        {relLabel && (
                          <span style={{ fontFamily: 'monospace', fontSize: '0.38rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5C6166', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '2px' }}>
                            {relLabel as string}
                          </span>
                        )}
                      </div>
                      <p className="font-sans text-[0.62rem] truncate" style={{ color: '#3A3F44' }}>
                        {url}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => copyPortalLink(c)}
                        style={{
                          background:    copiedId === c.id ? 'rgba(120,180,100,0.12)' : 'rgba(255,255,255,0.05)',
                          border:        `1px solid ${copiedId === c.id ? 'rgba(120,180,100,0.3)' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius:  '2px',
                          padding:       '0.45rem 0.9rem',
                          fontFamily:    'monospace',
                          fontSize:      '0.38rem',
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase' as const,
                          color:         copiedId === c.id ? 'rgba(120,180,100,0.9)' : '#9DA3A8',
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
                          background:    sentId === c.id ? 'rgba(120,180,100,0.12)' : 'rgba(196,162,74,0.08)',
                          border:        `1px solid ${sentId === c.id ? 'rgba(120,180,100,0.3)' : 'rgba(196,162,74,0.2)'}`,
                          borderRadius:  '2px',
                          padding:       '0.45rem 0.9rem',
                          fontFamily:    'monospace',
                          fontSize:      '0.38rem',
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase' as const,
                          color:         sentId === c.id ? 'rgba(120,180,100,0.9)' : 'rgba(196,162,74,0.8)',
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
      <div style={{ marginTop: '3rem', paddingTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>

        <div className="mb-6">
          <p style={{ fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)', marginBottom: '0.5rem' }}>
            Witness Sessions
          </p>
          <h2 className="font-serif font-semibold" style={{ fontSize: 'clamp(1.5rem,2.5vw,2rem)', color: '#F0F0EE', letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
            Invite a Witness
          </h2>
          <p className="font-serif italic font-light" style={{ fontSize: '0.95rem', color: '#9DA3A8', lineHeight: 1.8, maxWidth: '540px' }}>
            Invite people who know you to contribute their memories and observations.
            Their perspective trains your entity with things only they can provide.
          </p>
        </div>

        {/* Invite form */}
        {inviteSent ? (
          <div style={{
            background:   'rgba(196,162,74,0.06)',
            border:       '1px solid rgba(196,162,74,0.2)',
            borderRadius: '2px',
            padding:      '1.5rem 2rem',
            marginBottom: '2rem',
          }}>
            <p style={{ fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.9)', marginBottom: '0.4rem' }}>
              Invitation sent ✓
            </p>
            <p className="font-serif italic" style={{ fontSize: '0.9rem', color: '#9DA3A8' }}>
              They will receive an email with a link to their personal session.
            </p>
            <button
              onClick={() => setInviteSent(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.38rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.6)', marginTop: '0.75rem', padding: 0 }}
            >
              Invite another →
            </button>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="rounded-sm border px-7 py-7 mb-8" style={{ background: '#111112', borderColor: 'rgba(196,162,74,0.15)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              <div>
                <label className={labelCls} style={labelStyle}>Contributor Name</label>
                <input type="text" required placeholder="Jane Whitmore" value={inviteForm.contributorName}
                  onChange={setInvite('contributorName')} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>Contributor Email</label>
                <input type="email" required placeholder="jane@example.com" value={inviteForm.contributorEmail}
                  onChange={setInvite('contributorEmail')} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>Relationship</label>
                <select required value={inviteForm.relationship} onChange={setInvite('relationship')} className={inputCls} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="" disabled style={{ background: '#111112' }}>Select relationship</option>
                  {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
                    <option key={value} value={value} style={{ background: '#111112' }}>{label}</option>
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
              <label className={labelCls} style={labelStyle}>Personal Note (optional)</label>
              <textarea
                placeholder="Add a personal note to the invitation…"
                value={inviteForm.personalNote}
                onChange={setInvite('personalNote')}
                rows={3}
                className="font-serif italic w-full bg-transparent focus:outline-none resize-none"
                style={{ fontSize: '0.95rem', color: '#9DA3A8', borderBottom: '1px solid rgba(255,255,255,0.10)', paddingBottom: '0.5rem', lineHeight: 1.7 }}
              />
            </div>
            {inviteError && (
              <p style={{ fontFamily: 'monospace', fontSize: '0.4rem', color: '#8B5555', marginBottom: '1rem' }}>{inviteError}</p>
            )}
            <button
              type="submit"
              disabled={inviting}
              style={{
                background:    inviting ? 'rgba(196,162,74,0.4)' : 'rgba(196,162,74,1)',
                border:        'none',
                borderRadius:  '2px',
                padding:       '0.7rem 2rem',
                fontFamily:    'monospace',
                fontSize:      '0.44rem',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color:         '#0A0A0B',
                cursor:        inviting ? 'not-allowed' : 'pointer',
              }}
            >
              {inviting ? 'Sending…' : 'Send Witness Invitation'}
            </button>
          </form>
        )}

        {/* Sent invitations table */}
        {witnessSessions.length > 0 && (
          <div>
            <p style={{ fontFamily: 'monospace', fontSize: '0.4rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#5C6166', marginBottom: '1rem' }}>
              Sent Invitations
            </p>
            <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#111112' }}>
                    {['Name', 'Relationship', 'Status', 'Answered', 'Sent', ''].map(h => (
                      <th key={h} className="font-sans text-[0.52rem] tracking-[0.1em] uppercase text-left px-4 py-3" style={{ color: '#3A3F44', fontWeight: 600 }}>{h}</th>
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
                      <tr key={s.id} style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)', background: '#111112' }}>
                        <td className="px-4 py-3">
                          <p className="font-sans text-[0.78rem]" style={{ color: '#F0F0EE' }}>{s.contributor_name || '—'}</p>
                          <p className="font-sans text-[0.6rem] mt-0.5" style={{ color: '#3A3F44' }}>{s.contributor_email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p style={{ fontFamily: 'monospace', fontSize: '0.4rem', color: '#9DA3A8' }}>{relLabel}</p>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={s.status} />
                        </td>
                        <td className="px-4 py-3">
                          <p style={{ fontFamily: 'monospace', fontSize: '0.4rem', color: '#9DA3A8' }}>
                            {answerCount} / {WITNESS_SESSIONS[s.relationship]?.questions.length ?? 5}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p style={{ fontFamily: 'monospace', fontSize: '0.4rem', color: '#5C6166' }}>
                            {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {s.status === 'completed' && (
                            <button
                              onClick={() => setViewingSession(s)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.38rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)', padding: 0 }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(196,162,74,1)')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(196,162,74,0.7)')}
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
