'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

type Milestone = {
  id:                  string
  title:               string
  description:         string | null
  category:            string
  trigger_type:        string
  trigger_value:       string
  status:              string
  beneficiary_id:      string | null
  requires_key_holder: boolean
  created_at:          string
}

type Curator = { id: string; display_name: string }

const STATUS_STYLES: Record<string, string> = {
  armed:     'text-amber border-amber/25 bg-amber/[0.07]',
  pending:   'text-text-muted border-border-subtle bg-transparent',
  triggered: 'text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.07]',
  cancelled: 'text-text-muted/50 border-border-subtle bg-transparent',
}

const CATEGORIES    = ['Financial', 'Personal', 'Continuity', 'Legal']
const TRIGGER_TYPES = ['Age Gate', 'Temporal', 'Manual']

const TRIGGER_PLACEHOLDERS: Record<string, string> = {
  'Age Gate': '30  (age in years)',
  'Temporal': '2040-01-01  (ISO date)',
  'Manual':   'Describe the manual condition',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={[
      'inline-flex items-center px-2 py-0.5 rounded-sm border font-sans text-[0.6rem] font-bold tracking-[0.12em] uppercase',
      STATUS_STYLES[status] ?? STATUS_STYLES.pending,
    ].join(' ')}>
      {status}
    </span>
  )
}

const inputClass =
  'w-full border border-border-subtle rounded-sm px-4 py-3 font-sans text-[0.9rem] text-text-primary bg-obsidian focus:outline-none focus:border-border-amber transition-colors duration-200 placeholder:text-text-muted'

export default function MilestonesPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [curators, setCurators]     = useState<Curator[]>([])
  const [vaultId, setVaultId]       = useState<string | null>(null)
  const [loading, setLoading]       = useState(true)
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [showForm, setShowForm]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')
  const [formSuccess, setFormSuccess] = useState(false)

  const [form, setForm] = useState({
    title:               '',
    description:         '',
    category:            'Financial',
    trigger_type:        'Age Gate',
    trigger_value:       '',
    beneficiary_id:      '',
    requires_key_holder: false,
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: vault } = await supabase
        .from('vaults')
        .select('id')
        .eq('archivist_id', user.id)
        .single()

      if (!vault) { setLoading(false); return }
      setVaultId(vault.id)

      const [{ data: ms }, { data: cs }] = await Promise.all([
        supabase.from('milestones').select('*').eq('vault_id', vault.id).order('created_at', { ascending: false }),
        supabase.from('curators').select('id, display_name').eq('vault_id', vault.id).eq('invite_accepted', true),
      ])

      setMilestones(ms ?? [])
      setCurators(cs ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')

    const res  = await fetch('/api/dashboard/add-milestone', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        ...form,
        beneficiary_id: form.beneficiary_id || undefined,
      }),
    })
    const data = await res.json()

    if (!data.ok) {
      setFormError(data.error ?? 'Something went wrong.')
      setSubmitting(false)
      return
    }

    setFormSuccess(true)
    setSubmitting(false)

    // Refresh list
    if (vaultId) {
      const supabase = createClient()
      const { data: fresh } = await supabase
        .from('milestones')
        .select('*')
        .eq('vault_id', vaultId)
        .order('created_at', { ascending: false })
      setMilestones(fresh ?? [])
    }
  }

  return (
    <div className="max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-10">
        <div>
          <p className="eyebrow mb-2">Archive Security</p>
          <h1 className="font-serif text-[2rem] font-semibold text-text-primary tracking-[-0.02em]">
            Firewall Controls
          </h1>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-monolith-amber flex-shrink-0">
            Add Milestone →
          </button>
        )}
      </div>

      {/* Milestone list */}
      {loading ? (
        <div className="flex justify-center py-16"><span className="ai-dot" /></div>
      ) : milestones.length === 0 ? (
        <div className="glass-obsidian rounded-sm px-6 py-10 text-center mb-8">
          <p className="font-sans text-[0.85rem] text-text-muted mb-2">No milestones configured.</p>
          <p className="font-sans text-[0.78rem] text-text-muted">
            Milestones are conditional access controls that trigger based on age, date, or manual action.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 mb-8">
          {milestones.map(m => (
            <div key={m.id} className="glass-obsidian rounded-sm overflow-hidden">

              {/* Closed row */}
              <button
                onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-white/[0.02] transition-colors duration-150"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-[0.88rem] font-medium text-text-primary truncate">{m.title}</p>
                    <p className="font-sans text-[0.72rem] text-text-muted mt-0.5">{m.trigger_type} · {m.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={m.status} />
                  <svg
                    width="12" height="12" viewBox="0 0 12 12" fill="none"
                    className={['text-text-muted transition-transform duration-200', expanded === m.id ? 'rotate-180' : ''].join(' ')}
                    aria-hidden="true"
                  >
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </button>

              {/* Expanded detail */}
              {expanded === m.id && (
                <div className="border-t border-border-subtle px-6 py-5 flex flex-col gap-3">
                  {m.description && (
                    <p className="font-sans text-[0.82rem] text-text-secondary leading-[1.7]">{m.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                    <div>
                      <p className="font-sans text-[0.6rem] font-bold tracking-[0.14em] uppercase text-text-muted mb-0.5">Trigger Value</p>
                      <p className="font-sans text-[0.82rem] text-text-secondary">{m.trigger_value}</p>
                    </div>
                    <div>
                      <p className="font-sans text-[0.6rem] font-bold tracking-[0.14em] uppercase text-text-muted mb-0.5">Category</p>
                      <p className="font-sans text-[0.82rem] text-text-secondary">{m.category}</p>
                    </div>
                    {m.requires_key_holder && (
                      <div className="col-span-2">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border border-amber/25 bg-amber/[0.06] font-sans text-[0.6rem] font-bold tracking-[0.14em] uppercase text-amber">
                          <span className="ai-dot !w-[5px] !h-[5px]" />Requires Key Holder
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="glass-obsidian rounded-sm p-8 border border-border-amber/30">
          {formSuccess ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-amber/10 border border-border-amber flex items-center justify-center mx-auto mb-5 animate-spark">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12l5 5L20 7" stroke="#FFB347" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="font-serif text-[1.25rem] font-semibold text-text-primary mb-2">Milestone Armed.</p>
              <p className="font-sans text-[0.82rem] text-text-secondary mb-6">
                Your firewall control is now active.
              </p>
              <button
                onClick={() => { setShowForm(false); setFormSuccess(false); setForm({ title: '', description: '', category: 'Financial', trigger_type: 'Age Gate', trigger_value: '', beneficiary_id: '', requires_key_holder: false }) }}
                className="btn-monolith-ghost"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <p className="font-serif text-[1.25rem] font-semibold text-text-primary mb-6">Configure Milestone</p>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block font-sans text-[0.68rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">Title <span className="text-amber">*</span></label>
                  <input name="title" value={form.title} onChange={handleChange} placeholder="Distribute estate assets to Sarah" className={inputClass} />
                </div>
                <div>
                  <label className="block font-sans text-[0.68rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">Description <span className="font-normal normal-case tracking-normal">— optional</span></label>
                  <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Describe the condition in plain language…" className={inputClass + ' resize-none'} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-sans text-[0.68rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">Category <span className="text-amber">*</span></label>
                    <select name="category" value={form.category} onChange={handleChange} className={inputClass + ' appearance-none'}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block font-sans text-[0.68rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">Trigger Type <span className="text-amber">*</span></label>
                    <select name="trigger_type" value={form.trigger_type} onChange={handleChange} className={inputClass + ' appearance-none'}>
                      {TRIGGER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block font-sans text-[0.68rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">Trigger Value <span className="text-amber">*</span></label>
                  <input name="trigger_value" value={form.trigger_value} onChange={handleChange} placeholder={TRIGGER_PLACEHOLDERS[form.trigger_type]} className={inputClass} />
                </div>
                {curators.length > 0 && (
                  <div>
                    <label className="block font-sans text-[0.68rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">Beneficiary <span className="font-normal normal-case tracking-normal">— optional</span></label>
                    <select name="beneficiary_id" value={form.beneficiary_id} onChange={handleChange} className={inputClass + ' appearance-none'}>
                      <option value="">No specific beneficiary</option>
                      {curators.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
                    </select>
                  </div>
                )}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="requires_key_holder" checked={form.requires_key_holder} onChange={handleChange} className="w-4 h-4 rounded-sm border border-border-subtle bg-obsidian accent-amber" />
                  <span className="font-sans text-[0.8rem] text-text-secondary">Requires Key Holder to activate</span>
                </label>
              </div>

              {formError && <p className="font-sans text-[0.82rem] text-red-400 mt-4" role="alert">{formError}</p>}

              <div className="flex items-center gap-4 mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="font-sans text-[0.78rem] text-text-muted hover:text-text-primary transition-colors duration-200">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-monolith-amber">
                  {submitting ? (
                    <><span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-obsidian/40 border-t-obsidian animate-spin" aria-hidden="true" />Arming…</>
                  ) : 'Arm Milestone →'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
