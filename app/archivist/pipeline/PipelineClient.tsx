'use client'

import { useState, useEffect, useCallback } from 'react'

type Status = 'New' | 'Contacted' | 'Demo' | 'Proposal' | 'Closed' | 'Lost'
type Tier   = '' | 'Archive' | 'Estate' | 'Dynasty'

type Prospect = {
  id:           string
  name:         string
  contact:      string
  status:       Status
  tier:         Tier
  last_contact: string
  next_action:  string
  notes:        string
  created_at:   string
}

const STATUSES: Status[] = ['New', 'Contacted', 'Demo', 'Proposal', 'Closed', 'Lost']
const TIERS:   Tier[]    = ['', 'Archive', 'Estate', 'Dynasty']

const STATUS_COLOR: Record<Status, string> = {
  New:       '#5C6166',
  Contacted: '#9DA3A8',
  Demo:      '#C4A24A',
  Proposal:  '#FFB347',
  Closed:    '#4CAF50',
  Lost:      '#444',
}

const EMPTY_FORM = {
  name: '', contact: '', status: 'New' as Status, tier: '' as Tier,
  last_contact: '', next_action: '', notes: '',
}

export default function PipelineClient({ archivistId }: { archivistId: string }) {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [filter,    setFilter]    = useState<Status | 'all'>('all')
  const [adding,    setAdding]    = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [loading,   setLoading]   = useState(true)

  const loadProspects = useCallback(async () => {
    try {
      const res = await fetch(`/api/archivist/prospects?archivistId=${archivistId}`)
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setProspects(data.prospects ?? [])
    } catch {
      setProspects([])
    } finally {
      setLoading(false)
    }
  }, [archivistId])

  useEffect(() => { loadProspects() }, [loadProspects])

  function setField(key: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function addProspect() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/archivist/prospects', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, archivistId }),
      })
      if (!res.ok) throw new Error('Save failed')
      const data = await res.json()
      setProspects(prev => [data.prospect, ...prev])
      setForm(EMPTY_FORM)
      setAdding(false)
    } catch {
      // keep form open on error
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(id: string, status: Status) {
    setProspects(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    await fetch('/api/archivist/prospects', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, status, archivistId }),
    })
  }

  async function deleteProspect(id: string) {
    setProspects(prev => prev.filter(p => p.id !== id))
    await fetch(`/api/archivist/prospects?id=${id}&archivistId=${archivistId}`, { method: 'DELETE' })
  }

  const filtered = filter === 'all' ? prospects : prospects.filter(p => p.status === filter)

  const inputCls = 'bg-obsidian-deep border border-border-subtle rounded-sm px-3 py-2 font-sans text-[0.82rem] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-amber/40 transition-colors duration-200 w-full'

  return (
    <div className="max-w-5xl">

      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <p className="font-sans text-[0.62rem] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: '#C4A24A' }}>Pipeline</p>
          <h1 className="font-serif font-semibold text-text-primary tracking-[-0.025em]" style={{ fontSize: 'clamp(1.8rem,3vw,2.5rem)' }}>
            My Prospects
          </h1>
        </div>
        <button onClick={() => setAdding(true)} className="btn-monolith-amber flex-shrink-0">+ Add Prospect</button>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {(['all', ...STATUSES] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} className="font-sans text-[0.68rem] font-medium tracking-[0.06em] rounded-sm px-3 py-1.5 border transition-all duration-150"
            style={filter === s
              ? { background: '#C4A24A', borderColor: '#C4A24A', color: '#0C0C0D' }
              : { background: 'transparent', borderColor: 'rgba(255,255,255,0.08)', color: '#5C6166' }}>
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      {adding && (
        <div className="rounded-sm border px-6 py-6 mb-6" style={{ background: '#111112', borderColor: 'rgba(196,162,74,0.15)' }}>
          <p className="font-sans text-[0.62rem] font-bold tracking-[0.18em] uppercase mb-5" style={{ color: 'rgba(196,162,74,0.7)' }}>New Prospect</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <input className={inputCls} placeholder="Name"                      value={form.name}         onChange={setField('name')}         />
            <input className={inputCls} placeholder="Contact (email / phone)"   value={form.contact}      onChange={setField('contact')}      />
            <input className={inputCls} placeholder="Next action"               value={form.next_action}  onChange={setField('next_action')}  />
            <select className={inputCls} value={form.status} onChange={setField('status')}>
              {STATUSES.map(s => <option key={s} value={s} style={{ background: '#111112' }}>{s}</option>)}
            </select>
            <select className={inputCls} value={form.tier} onChange={setField('tier')}>
              <option value="" style={{ background: '#111112' }}>Tier unknown</option>
              {TIERS.filter(Boolean).map(t => <option key={t} value={t} style={{ background: '#111112' }}>{t}</option>)}
            </select>
            <input className={inputCls} type="date" value={form.last_contact} onChange={setField('last_contact')} />
          </div>
          <textarea className={inputCls + ' resize-none mb-4'} rows={2} placeholder="Notes (optional)" value={form.notes} onChange={setField('notes')} />
          <div className="flex gap-3">
            <button onClick={addProspect} disabled={saving} className="btn-monolith-amber disabled:opacity-50">{saving ? 'Saving…' : 'Save Prospect'}</button>
            <button onClick={() => { setAdding(false); setForm(EMPTY_FORM) }} className="btn-monolith-ghost">Cancel</button>
          </div>
        </div>
      )}

      {loading && (
        <div className="rounded-sm border border-border-subtle px-6 py-14 text-center" style={{ background: '#111112' }}>
          <p className="font-serif italic text-text-muted" style={{ fontSize: '0.95rem' }}>Loading pipeline…</p>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="rounded-sm border border-border-subtle px-6 py-14 text-center" style={{ background: '#111112' }}>
          <p className="font-serif italic text-text-muted" style={{ fontSize: '0.95rem' }}>
            {prospects.length === 0 ? 'No prospects yet. Add your first one above.' : 'No prospects match this filter.'}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="rounded-sm border border-border-subtle overflow-hidden" style={{ background: '#111112' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Name', 'Contact', 'Status', 'Tier', 'Last Contact', 'Next Action', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-sans text-[0.56rem] font-bold tracking-[0.14em] uppercase text-text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ id, name, contact, status, tier, last_contact, next_action }, i) => (
                  <tr key={id} style={i < filtered.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.06)' } : {}}>
                    <td className="px-4 py-3 font-sans text-[0.82rem] font-medium text-text-primary whitespace-nowrap">{name}</td>
                    <td className="px-4 py-3 font-sans text-[0.78rem] text-text-muted">{contact || '—'}</td>
                    <td className="px-4 py-3">
                      <select value={status} onChange={e => updateStatus(id, e.target.value as Status)}
                        className="bg-transparent font-sans text-[0.72rem] font-medium cursor-pointer outline-none" style={{ color: STATUS_COLOR[status] }}>
                        {STATUSES.map(s => <option key={s} value={s} style={{ background: '#111112', color: '#9DA3A8' }}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 font-sans text-[0.78rem] text-text-muted">{tier || '—'}</td>
                    <td className="px-4 py-3 font-sans text-[0.75rem] text-text-muted whitespace-nowrap">{last_contact || '—'}</td>
                    <td className="px-4 py-3 font-sans text-[0.78rem] text-text-secondary">{next_action || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteProspect(id)} className="font-sans text-[0.65rem] text-text-muted transition-colors duration-150" aria-label={`Remove ${name}`}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
