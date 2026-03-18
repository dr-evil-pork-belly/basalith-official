'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

type Curator = {
  id:              string
  display_name:    string
  email:           string
  relation:        string | null
  clearance:       string
  is_key_holder:   boolean
  invite_accepted: boolean
  invite_token:    string
  created_at:      string
}

const CLEARANCE_LABELS: Record<string, string> = {
  level_3_curator: 'Curator Access',
  level_4_legal:   'Legal & Financial',
  level_5_full:    'Full Access',
}

const CLEARANCE_OPTIONS = [
  { value: 'level_3_curator', label: 'Curator Access'    },
  { value: 'level_4_legal',   label: 'Legal & Financial' },
  { value: 'level_5_full',    label: 'Full Access'       },
]

function ClearanceBadge({ clearance }: { clearance: string }) {
  const color =
    clearance === 'full'            ? 'text-amber border-amber/25 bg-amber/[0.07]' :
    clearance === 'legal_financial' ? 'text-text-secondary border-border-default bg-white/[0.03]' :
                                      'text-text-muted border-border-subtle bg-transparent'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm border font-sans text-[0.6rem] font-bold tracking-[0.12em] uppercase ${color}`}>
      {CLEARANCE_LABELS[clearance] ?? clearance}
    </span>
  )
}

const INVITE_BASE = 'https://www.basalith.xyz/join?token='

function CopyLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(INVITE_BASE + token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select a temp input
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 font-sans text-[0.68rem] font-bold tracking-[0.08em] uppercase px-2.5 py-1 rounded-sm border transition-all duration-150"
      style={copied
        ? { borderColor: 'rgba(52,211,153,0.3)', color: 'rgb(52,211,153)', background: 'rgba(52,211,153,0.06)' }
        : { borderColor: 'rgba(255,179,71,0.2)', color: 'rgba(255,179,71,0.7)', background: 'rgba(255,179,71,0.04)' }
      }
    >
      {copied ? (
        <>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" />
          </svg>
          Copy Link
        </>
      )}
    </button>
  )
}

const inputClass =
  'w-full border border-border-subtle rounded-sm px-4 py-3 font-sans text-[0.9rem] text-text-primary bg-obsidian focus:outline-none focus:border-border-amber transition-colors duration-200 placeholder:text-text-muted'

export default function CuratorsPage() {
  const [curators, setCurators] = useState<Curator[]>([])
  const [vaultId, setVaultId]   = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')
  const [formSuccess, setFormSuccess] = useState(false)

  const [form, setForm] = useState({
    name:         '',
    email:        '',
    relation:     '',
    clearance:    'level_3_curator',
    is_key_holder: false,
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

      const { data } = await supabase
        .from('curators')
        .select('*')
        .eq('vault_id', vault.id)
        .order('created_at', { ascending: false })

      setCurators(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')

    const res  = await fetch('/api/dashboard/invite-curator', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    })
    const data = await res.json()

    if (!data.ok) {
      setFormError(data.error ?? 'Something went wrong.')
      setSubmitting(false)
      return
    }

    setFormSuccess(true)
    setSubmitting(false)
    // Refresh curator list
    if (vaultId) {
      const supabase = createClient()
      const { data: fresh } = await supabase
        .from('curators')
        .select('*')
        .eq('vault_id', vaultId)
        .order('created_at', { ascending: false })
      setCurators(fresh ?? [])
    }
  }

  return (
    <div className="max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-10">
        <div>
          <p className="eyebrow mb-2">Archive Governance</p>
          <h1 className="font-serif text-[2rem] font-semibold text-text-primary tracking-[-0.02em]">
            Guardians & Curators
          </h1>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-monolith-amber flex-shrink-0">
            Add Curator →
          </button>
        )}
      </div>

      {/* Curator list */}
      {loading ? (
        <div className="flex justify-center py-16"><span className="ai-dot" /></div>
      ) : curators.length === 0 ? (
        <div className="glass-obsidian rounded-sm px-6 py-10 text-center mb-8">
          <p className="font-sans text-[0.85rem] text-text-muted mb-2">No curators invited yet.</p>
          <p className="font-sans text-[0.78rem] text-text-muted">
            Curators are the trusted people who contribute to and help govern your archive.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 mb-8">
          {curators.map(c => (
            <div key={c.id} className="glass-obsidian rounded-sm px-6 py-5 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-0.5 flex-wrap">
                    <p className="font-sans text-[0.88rem] font-medium text-text-primary">{c.display_name}</p>
                    {c.is_key_holder && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border border-amber/25 bg-amber/[0.07] font-sans text-[0.58rem] font-bold tracking-[0.14em] uppercase text-amber">
                        <span className="ai-dot !w-[5px] !h-[5px]" />Key Holder
                      </span>
                    )}
                  </div>
                  <p className="font-sans text-[0.75rem] text-text-muted">{c.email}</p>
                  {c.relation && <p className="font-sans text-[0.72rem] text-text-muted mt-0.5">{c.relation}</p>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <ClearanceBadge clearance={c.clearance} />
                  {c.invite_accepted ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border border-emerald-500/25 bg-emerald-500/[0.07] font-sans text-[0.6rem] font-bold tracking-[0.12em] uppercase text-emerald-400">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-sm border border-border-subtle bg-transparent font-sans text-[0.6rem] font-bold tracking-[0.12em] uppercase text-text-muted">
                      Pending
                    </span>
                  )}
                </div>
              </div>

              {/* Invite link — shown only for pending curators */}
              {!c.invite_accepted && (
                <div className="flex items-center gap-3 pt-1 border-t border-border-subtle flex-wrap">
                  <p className="font-sans text-[0.68rem] text-text-muted truncate flex-1 min-w-0">
                    <span className="text-text-muted/50 mr-1.5">Link</span>
                    <span className="font-mono">{INVITE_BASE}{c.invite_token}</span>
                  </p>
                  <CopyLinkButton token={c.invite_token} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invite form */}
      {showForm && (
        <div className="glass-obsidian rounded-sm p-8 border border-border-amber/30">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber/30 to-transparent" style={{ position: 'relative', marginBottom: '1.5rem' }} />

          {formSuccess ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-amber/10 border border-border-amber flex items-center justify-center mx-auto mb-5 animate-spark">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12l5 5L20 7" stroke="#FFB347" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="font-serif text-[1.25rem] font-semibold text-text-primary mb-2">Invitation Sent.</p>
              <p className="font-sans text-[0.82rem] text-text-secondary mb-6">
                {form.name} will receive a secure invite link at {form.email}.
              </p>
              <button
                onClick={() => { setShowForm(false); setFormSuccess(false); setForm({ name: '', email: '', relation: '', clearance: 'curator', is_key_holder: false }) }}
                className="btn-monolith-ghost"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleInvite} noValidate>
              <p className="font-serif text-[1.25rem] font-semibold text-text-primary mb-6">Invite a Curator</p>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-sans text-[0.68rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">Full Name <span className="text-amber">*</span></label>
                    <input name="name" value={form.name} onChange={handleChange} placeholder="Margaret Whitfield" className={inputClass} />
                  </div>
                  <div>
                    <label className="block font-sans text-[0.68rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">Email <span className="text-amber">*</span></label>
                    <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="margaret@whitfield.com" className={inputClass} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-sans text-[0.68rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">Relation <span className="font-normal normal-case tracking-normal">— optional</span></label>
                    <input name="relation" value={form.relation} onChange={handleChange} placeholder="Spouse, Attorney, Daughter…" className={inputClass} />
                  </div>
                  <div>
                    <label className="block font-sans text-[0.68rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">Clearance Level <span className="text-amber">*</span></label>
                    <select name="clearance" value={form.clearance} onChange={handleChange} className={inputClass + ' appearance-none'}>
                      {CLEARANCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_key_holder"
                    checked={form.is_key_holder}
                    onChange={handleChange}
                    className="w-4 h-4 rounded-sm border border-border-subtle bg-obsidian accent-amber"
                  />
                  <span className="font-sans text-[0.8rem] text-text-secondary">Designate as Key Holder</span>
                </label>
              </div>

              {formError && <p className="font-sans text-[0.82rem] text-red-400 mt-4" role="alert">{formError}</p>}

              <div className="flex items-center gap-4 mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="font-sans text-[0.78rem] text-text-muted hover:text-text-primary transition-colors duration-200">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-monolith-amber">
                  {submitting ? (
                    <><span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-obsidian/40 border-t-obsidian animate-spin" aria-hidden="true" />Sending…</>
                  ) : 'Send Invitation →'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
