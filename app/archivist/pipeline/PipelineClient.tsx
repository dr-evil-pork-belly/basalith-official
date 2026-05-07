'use client'

import { useState, useEffect, useCallback } from 'react'

const C = {
  bg:      '#0A0908',
  surface: '#111110',
  border:  'rgba(255,255,255,0.06)',
  gold:    '#C4A24A',
  text:    '#F0EDE6',
  muted:   '#9DA3A8',
  dim:     '#5C6166',
  ghost:   '#3A3F44',
  green:   '#4CAF50',
  yellow:  '#FFC107',
  red:     '#E57373',
}

type Status = 'New' | 'Contacted' | 'Demo' | 'Proposal' | 'Closed' | 'Lost' | 'Payment Pending' | 'Active Client'
type Tier   = '' | 'Archive' | 'Estate' | 'Dynasty'

type Prospect = {
  id:           string
  name:         string
  contact:      string
  status:       Status
  tier:         Tier
  last_contact: string | null
  next_action:  string | null
  notes:        string | null
  updated_at:   string
  created_at:   string
}

const STAGES: Status[] = ['New', 'Contacted', 'Demo', 'Proposal', 'Payment Pending', 'Active Client']

const STAGE_COLOR: Record<string, string> = {
  'New':             C.dim,
  'Contacted':       C.muted,
  'Demo':            C.gold,
  'Proposal':        C.gold,
  'Payment Pending': C.yellow,
  'Active Client':   C.green,
  'Closed':          C.green,
  'Lost':            C.red,
}

const TIER_LABEL: Record<string, string> = {
  Archive: 'Archive · $1,800/yr',
  Estate:  'Estate · $3,600/yr',
  Dynasty: 'Dynasty · $9,600/yr',
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 999
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

function healthColor(days: number): string {
  if (days <= 7)  return C.green
  if (days <= 21) return C.gold
  return C.red
}

// ── Card ──────────────────────────────────────────────────────────────────────

function ProspectCard({
  prospect, onEdit, onAdvance,
}: {
  prospect: Prospect
  onEdit:    (p: Prospect) => void
  onAdvance: (id: string, toStatus: Status) => void
}) {
  const days    = daysSince(prospect.updated_at)
  const stageIdx = STAGES.indexOf(prospect.status)
  const next    = stageIdx >= 0 && stageIdx < STAGES.length - 1 ? STAGES[stageIdx + 1] : null

  return (
    <div
      style={{ background: C.surface, border: `1px solid ${C.border}`, padding: '14px', borderLeft: `2px solid ${STAGE_COLOR[prospect.status] ?? C.dim}`, cursor: 'pointer', transition: 'border-color 0.12s' }}
      onClick={() => onEdit(prospect)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: C.text, lineHeight: 1.3 }}>{prospect.name}</p>
        <span style={{ fontFamily: 'Courier New, monospace', fontSize: '0.52rem', letterSpacing: '0.1em', color: healthColor(days), flexShrink: 0 }}>{days}d</span>
      </div>
      {prospect.tier && (
        <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.55rem', letterSpacing: '0.1em', color: C.gold, marginBottom: '4px' }}>{prospect.tier}</p>
      )}
      {prospect.next_action && (
        <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.8rem', color: C.muted, lineHeight: 1.4, marginBottom: '8px' }}>{prospect.next_action}</p>
      )}
      {next && prospect.status !== 'Active Client' && (
        <button
          onClick={e => { e.stopPropagation(); onAdvance(prospect.id, next) }}
          style={{ fontFamily: 'Courier New, monospace', fontSize: '0.52rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: C.dim, background: 'transparent', border: `1px solid ${C.border}`, padding: '4px 8px', cursor: 'pointer' }}
        >
          → {next}
        </button>
      )}
    </div>
  )
}

// ── Edit modal ────────────────────────────────────────────────────────────────

function EditModal({
  prospect, archivistId, onSave, onClose, onDelete,
}: {
  prospect:    Prospect | null
  archivistId: string
  onSave:      (p: Prospect) => void
  onClose:     () => void
  onDelete:    (id: string) => void
}) {
  const [form,   setForm]   = useState<Partial<Prospect>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(prospect ?? { status: 'New', tier: '', name: '', contact: '', next_action: '', notes: '' })
  }, [prospect])

  const isNew = !prospect?.id

  async function handleSave() {
    setSaving(true)
    try {
      const method = isNew ? 'POST' : 'PATCH'
      const body   = isNew
        ? { archivistId, ...form }
        : { id: prospect?.id, ...form }
      const res    = await fetch('/api/archivist/prospects', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) onSave(data)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!prospect?.id) return
    if (!confirm('Remove this prospect?')) return
    await fetch('/api/archivist/prospects', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: prospect.id }) })
    onDelete(prospect.id)
  }

  const inputStyle = { width: '100%', background: '#0A0908', border: `1px solid rgba(255,255,255,0.1)`, color: C.text, fontFamily: 'Georgia, serif', fontSize: '0.9rem', padding: '10px 12px', boxSizing: 'border-box' as const }
  const labelStyle = { fontFamily: 'Courier New, monospace', fontSize: '0.58rem', letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: C.dim, display: 'block', marginBottom: '6px' }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#111110', border: `1px solid ${C.border}`, padding: '28px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
        <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.6rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: C.gold, marginBottom: '20px' }}>
          {isNew ? 'Add Prospect' : 'Edit Prospect'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { key: 'name',        label: 'Client Name',   type: 'text' },
            { key: 'contact',     label: 'Email / Phone', type: 'text' },
            { key: 'next_action', label: 'Next Action',   type: 'text' },
            { key: 'notes',       label: 'Notes',         type: 'textarea' },
          ].map(({ key, label, type }) => (
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              {type === 'textarea' ? (
                <textarea value={(form as Record<string, string>)[key] ?? ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
              ) : (
                <input type="text" value={(form as Record<string, string>)[key] ?? ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
              )}
            </div>
          ))}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={form.status ?? 'New'} onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))} style={{ ...inputStyle }}>
                {[...STAGES, 'Lost'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tier</label>
              <select value={form.tier ?? ''} onChange={e => setForm(f => ({ ...f, tier: e.target.value as Tier }))} style={{ ...inputStyle }}>
                <option value="">— Select —</option>
                {['Archive', 'Estate', 'Dynasty'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '24px', justifyContent: 'space-between' }}>
          {!isNew && (
            <button onClick={handleDelete} style={{ fontFamily: 'Courier New, monospace', fontSize: '0.58rem', color: C.red, background: 'transparent', border: `1px solid rgba(229,115,115,0.2)`, padding: '8px 14px', cursor: 'pointer' }}>Delete</button>
          )}
          <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
            <button onClick={onClose} style={{ fontFamily: 'Courier New, monospace', fontSize: '0.58rem', color: C.dim, background: 'transparent', border: `1px solid ${C.border}`, padding: '8px 14px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ fontFamily: 'Courier New, monospace', fontSize: '0.58rem', color: '#0A0908', background: saving ? 'rgba(196,162,74,0.5)' : C.gold, border: 'none', padding: '8px 18px', cursor: 'pointer' }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PipelineClient({ archivistId }: { archivistId: string }) {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading,   setLoading]   = useState(true)
  const [editing,   setEditing]   = useState<Prospect | null | 'new'>('__unset__' as unknown as null)
  const [filter,    setFilter]    = useState<Status | 'all'>('all')

  const load = useCallback(async () => {
    const res  = await fetch(`/api/archivist/prospects?archivistId=${archivistId}`)
    const data = await res.json()
    setProspects(data.prospects ?? data ?? [])
    setLoading(false)
  }, [archivistId])

  useEffect(() => { load() }, [load])
  useEffect(() => { setEditing(null) }, []) // init to null after mount

  async function handleAdvance(id: string, toStatus: Status) {
    await fetch('/api/archivist/prospects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: toStatus }) })
    setProspects(prev => prev.map(p => p.id === id ? { ...p, status: toStatus } : p))
  }

  function handleSave(saved: Prospect) {
    setProspects(prev => {
      const idx = prev.findIndex(p => p.id === saved.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n }
      return [saved, ...prev]
    })
    setEditing(null)
  }

  function handleDelete(id: string) {
    setProspects(prev => prev.filter(p => p.id !== id))
    setEditing(null)
  }

  const filtered  = filter === 'all' ? prospects : prospects.filter(p => p.status === filter)
  const byStage   = STAGES.reduce<Record<string, Prospect[]>>((acc, s) => ({ ...acc, [s]: filtered.filter(p => p.status === s) }), {})
  const lostCount = prospects.filter(p => p.status === 'Lost').length

  return (
    <div style={{ padding: 'clamp(24px,5vw,48px)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.58rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: C.dim, marginBottom: '6px' }}>My Practice</p>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.4rem,2.5vw,1.9rem)', fontWeight: 300, color: C.text }}>CRM Pipeline</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)} style={{ fontFamily: 'Courier New, monospace', fontSize: '0.62rem', letterSpacing: '0.08em', background: C.surface, border: `1px solid ${C.border}`, color: C.muted, padding: '8px 12px' }}>
            <option value="all">All Stages</option>
            {[...STAGES, 'Lost'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => setEditing({} as Prospect)} style={{ fontFamily: 'Courier New, monospace', fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0A0908', background: C.gold, border: 'none', padding: '8px 16px', cursor: 'pointer' }}>
            + Add Prospect
          </button>
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {STAGES.map(stage => {
          const count = byStage[stage]?.length ?? 0
          return (
            <div key={stage} style={{ background: C.surface, border: `1px solid ${count > 0 ? STAGE_COLOR[stage] + '30' : C.border}`, padding: '10px 16px', cursor: 'pointer' }} onClick={() => setFilter(filter === stage ? 'all' : stage as Status)}>
              <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.55rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: C.ghost, marginBottom: '3px' }}>{stage}</p>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: '1.2rem', fontWeight: 300, color: count > 0 ? (STAGE_COLOR[stage] ?? C.text) : C.ghost }}>{count}</p>
            </div>
          )
        })}
        {lostCount > 0 && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: '10px 16px', opacity: 0.5 }}>
            <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.55rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: C.ghost, marginBottom: '3px' }}>Lost</p>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '1.2rem', fontWeight: 300, color: C.ghost }}>{lostCount}</p>
          </div>
        )}
      </div>

      {loading ? (
        <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.65rem', letterSpacing: '0.2em', color: C.dim }}>Loading…</p>
      ) : (
        /* Kanban board */
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STAGES.length}, minmax(180px, 1fr))`, gap: '12px', overflowX: 'auto' }}>
          {STAGES.map(stage => (
            <div key={stage}>
              <div style={{ padding: '10px 0', marginBottom: '10px', borderBottom: `2px solid ${STAGE_COLOR[stage] ?? C.border}` }}>
                <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: STAGE_COLOR[stage] ?? C.dim }}>
                  {stage} <span style={{ color: C.ghost }}>({byStage[stage]?.length ?? 0})</span>
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(byStage[stage] ?? []).map(p => (
                  <ProspectCard key={p.id} prospect={p} onEdit={setEditing} onAdvance={handleAdvance} />
                ))}
                {(byStage[stage]?.length ?? 0) === 0 && (
                  <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.58rem', color: C.ghost, padding: '12px 0' }}>None</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing !== null && editing !== ('__unset__' as unknown as null) && (
        <EditModal
          prospect={editing === ({} as Prospect) ? null : editing as Prospect}
          archivistId={archivistId}
          onSave={handleSave}
          onClose={() => setEditing(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
