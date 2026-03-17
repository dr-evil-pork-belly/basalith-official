'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'

type VaultFile = {
  id:            string
  original_name: string
  category:      'photograph' | 'document' | 'video' | 'audio' | 'text'
  year:          number | null
  location:      string | null
  description:   string | null
  mime_type:     string
}

type TraitKey = 'Core Disposition' | 'Values & Beliefs' | 'Emotional Register' | 'Legacy Intent'

const TRAIT_CHOICES: Record<TraitKey, string[]> = {
  'Core Disposition':   ['Quiet Strength',    'Joyful Presence',    'Steady Authority'],
  'Values & Beliefs':   ['Family First',       'Hard Work',          'Faith & Tradition'],
  'Emotional Register': ['Warmly Reserved',    'Openly Expressive',  'Deeply Private'],
  'Legacy Intent':      ['Provide & Protect',  'Inspire & Guide',    'Remember & Honor'],
}

const TRAIT_DESCRIPTIONS: Record<TraitKey, string> = {
  'Core Disposition':   'How they carry themselves through life.',
  'Values & Beliefs':   'What they stood for and lived by.',
  'Emotional Register': 'How they felt and expressed themselves.',
  'Legacy Intent':      'What they wanted to leave behind.',
}

const TRAITS = Object.keys(TRAIT_CHOICES) as TraitKey[]

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  photograph: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 5l1.5-2h5L16 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  video: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="6" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 10l6-3v10l-6-3V10z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  document: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 2v6h6M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  audio: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  text: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M4 10h16M4 14h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
}

function EssenceRing({ percent }: { percent: number }) {
  const radius      = 20
  const stroke      = 3
  const normalised  = Math.min(100, Math.max(0, percent))
  const circumference = 2 * Math.PI * radius
  const dash        = (normalised / 100) * circumference

  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90" aria-hidden="true">
        <circle cx="28" cy="28" r={radius} fill="none" stroke="rgba(255,179,71,0.12)" strokeWidth={stroke} />
        <circle
          cx="28" cy="28" r={radius} fill="none"
          stroke="#FFB347" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-sans text-[0.65rem] font-bold text-amber tabular-nums">{normalised}%</span>
      </div>
    </div>
  )
}

function MemoryCard({
  file,
  selected,
  sealed,
  onClick,
}: {
  file:     VaultFile
  selected: boolean
  sealed:   boolean
  onClick:  () => void
}) {
  const base =
    'relative rounded-sm overflow-hidden cursor-pointer transition-all duration-200 aspect-[4/3] flex flex-col'
  const style = selected
    ? 'border border-amber shadow-[0_0_20px_rgba(255,179,71,0.2)] scale-[1.02] z-10'
    : 'border border-border-subtle hover:border-amber/40'

  return (
    <button
      onClick={onClick}
      className={`${base} ${style} glass-obsidian`}
      aria-pressed={selected}
      aria-label={file.original_name}
    >
      {/* Category-specific inner */}
      {file.category === 'photograph' ? (
        <div
          className="flex-1 flex flex-col items-center justify-end p-3"
          style={{
            background:
              'linear-gradient(160deg, rgba(180,140,90,0.13) 0%, rgba(100,70,40,0.22) 60%, rgba(20,15,10,0.7) 100%)',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center text-amber/20">
            {CATEGORY_ICONS.photograph}
          </div>
          <div className="relative flex flex-wrap gap-1 justify-end w-full">
            {file.year && (
              <span className="font-sans text-[0.55rem] font-bold tracking-[0.1em] uppercase text-amber/80 bg-obsidian/60 px-1.5 py-0.5 rounded-sm">
                {file.year}
              </span>
            )}
            {file.location && (
              <span className="font-sans text-[0.55rem] font-bold tracking-[0.1em] uppercase text-text-muted bg-obsidian/60 px-1.5 py-0.5 rounded-sm truncate max-w-[80px]">
                {file.location}
              </span>
            )}
          </div>
        </div>
      ) : file.category === 'text' ? (
        <div className="flex-1 flex items-start p-3">
          <div className="absolute top-3 right-3 text-text-muted/30">{CATEGORY_ICONS.text}</div>
          <p className="font-sans text-[0.65rem] text-text-muted leading-[1.6] italic line-clamp-4 mt-1">
            {file.description?.slice(0, 100) ?? file.original_name}
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 p-3">
          <div className="text-amber/30">{CATEGORY_ICONS[file.category] ?? CATEGORY_ICONS.document}</div>
          {file.category === 'video' && (
            <div className="w-7 h-7 rounded-full border border-amber/30 flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M3 2l5 3-5 3V2z" fill="#FFB347" fillOpacity="0.6" />
              </svg>
            </div>
          )}
          <p className="font-sans text-[0.6rem] text-text-muted text-center leading-[1.4] truncate w-full px-1">
            {file.original_name}
          </p>
        </div>
      )}

      {/* Sealed overlay */}
      {sealed && (
        <div className="absolute inset-0 bg-obsidian/70 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12l5 5L20 7" stroke="#FFB347" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </button>
  )
}

export default function EssencePage() {
  const [vaultId, setVaultId]         = useState<string | null>(null)
  const [vaultName, setVaultName]     = useState('')
  const [essencePercent, setEssence]  = useState(0)
  const [files, setFiles]             = useState<VaultFile[]>([])
  const [sealedIds, setSealedIds]     = useState<Set<string>>(new Set())
  const [skippedIds, setSkippedIds]   = useState<string[]>([])
  const [loading, setLoading]         = useState(true)
  const [selected, setSelected]       = useState<VaultFile | null>(null)
  const [trait, setTrait]             = useState<TraitKey | null>(null)
  const [choice, setChoice]           = useState<string | null>(null)
  const [sealing, setSealing]         = useState(false)
  const [sealSuccess, setSealSuccess] = useState(false)
  const [sealCount, setSealCount]     = useState(0)
  const [done, setDone]               = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('vault_id')
        .eq('id', user.id)
        .single()

      if (!profile?.vault_id) { setLoading(false); return }
      setVaultId(profile.vault_id)

      const [{ data: vault }, { data: rawFiles }] = await Promise.all([
        supabase
          .from('vaults')
          .select('display_name, essence_percent')
          .eq('id', profile.vault_id)
          .single(),
        supabase
          .from('vault_files')
          .select('id, original_name, category, year, location, description, mime_type')
          .eq('vault_id', profile.vault_id)
          .eq('essence_tagged', false)
          .order('created_at', { ascending: true })
          .limit(8),
      ])

      setVaultName(vault?.display_name ?? '')
      setEssence(vault?.essence_percent ?? 0)
      setFiles(rawFiles ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // Ordered display: unsealed + unskipped first, then skipped at end
  const displayFiles = [
    ...files.filter(f => !sealedIds.has(f.id) && !skippedIds.includes(f.id)),
    ...files.filter(f => skippedIds.includes(f.id)),
  ]

  const activeFiles = files.filter(f => !sealedIds.has(f.id))

  function handleSelect(file: VaultFile) {
    if (sealedIds.has(file.id)) return
    if (selected?.id === file.id) {
      setSelected(null)
      setTrait(null)
      setChoice(null)
      setSealSuccess(false)
    } else {
      setSelected(file)
      setTrait(null)
      setChoice(null)
      setSealSuccess(false)
    }
  }

  function handleSkip() {
    if (!selected) return
    const id = selected.id
    setSkippedIds(prev => [...prev.filter(x => x !== id), id])
    setSelected(null)
    setTrait(null)
    setChoice(null)

    // Check completion after skip
    const remaining = files.filter(f => !sealedIds.has(f.id) && f.id !== id)
    if (remaining.length === 0) setDone(true)
  }

  const handleSeal = useCallback(async () => {
    if (!selected || !trait || !choice || !vaultId) return
    setSealing(true)
    setSealSuccess(false)

    const res  = await fetch('/api/curator/seal-memory', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        file_id:           selected.id,
        trait,
        choice_label:      choice,
        choice_description: TRAIT_DESCRIPTIONS[trait],
        vault_id:          vaultId,
      }),
    })
    const data = await res.json()

    if (data.ok) {
      setSealedIds(prev => new Set([...prev, selected.id]))
      setSealCount(c => c + 1)
      if (data.new_essence_percent !== undefined) setEssence(data.new_essence_percent)
      setSealSuccess(true)

      setTimeout(() => {
        setSealSuccess(false)
        setSelected(null)
        setTrait(null)
        setChoice(null)

        // Check if all cards are done
        const newSealed = new Set([...sealedIds, selected.id])
        const remaining = files.filter(f => !newSealed.has(f.id))
        if (remaining.length === 0) setDone(true)
      }, 900)
    }

    setSealing(false)
  }, [selected, trait, choice, vaultId, sealedIds, files])

  function handleNewSession() {
    setDone(false)
    setSealedIds(new Set())
    setSkippedIds([])
    setSelected(null)
    setTrait(null)
    setChoice(null)
    setSealCount(0)
    setSealSuccess(false)
    setLoading(true)

    // Reload files
    ;(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('vault_files')
        .select('id, original_name, category, year, location, description, mime_type')
        .eq('vault_id', vaultId!)
        .eq('essence_tagged', false)
        .order('created_at', { ascending: true })
        .limit(8)
      setFiles(data ?? [])
      setLoading(false)
    })()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="ai-dot" />
      </div>
    )
  }

  // ── Completion state ──
  if (done) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-amber/10 border border-border-amber flex items-center justify-center mx-auto mb-8 animate-spark">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12l5 5L20 7" stroke="#FFB347" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="eyebrow mb-4">Session Complete</p>
        <h2
          className="font-serif font-semibold text-text-primary tracking-[-0.03em] mb-4"
          style={{ fontSize: 'clamp(2rem,5vw,3rem)', lineHeight: '1' }}
        >
          Well Done.
        </h2>
        <p className="font-sans font-light text-body-sm text-text-secondary leading-[1.8] mb-3">
          You sealed{' '}
          <span className="text-text-primary font-medium">{sealCount} {sealCount === 1 ? 'memory' : 'memories'}</span>{' '}
          this session.
        </p>

        {/* Essence ring */}
        <div className="my-10 flex flex-col items-center gap-3">
          {(() => {
            const radius = 44
            const stroke = 5
            const circ   = 2 * Math.PI * radius
            const dash   = (essencePercent / 100) * circ
            return (
              <div className="relative w-28 h-28">
                <svg width="112" height="112" viewBox="0 0 112 112" className="-rotate-90" aria-hidden="true">
                  <circle cx="56" cy="56" r={radius} fill="none" stroke="rgba(255,179,71,0.1)" strokeWidth={stroke} />
                  <circle
                    cx="56" cy="56" r={radius} fill="none"
                    stroke="#FFB347" strokeWidth={stroke} strokeLinecap="round"
                    strokeDasharray={`${dash} ${circ}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-sans text-[1.2rem] font-bold text-amber tabular-nums">{essencePercent}%</span>
                </div>
              </div>
            )
          })()}
          <p className="font-sans text-[0.68rem] font-bold tracking-[0.12em] uppercase text-text-muted">
            Archive Essence
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button onClick={handleNewSession} className="btn-monolith-amber">
            Start Another Session →
          </button>
          <a href="/curator" className="btn-monolith-ghost">
            Return to Dashboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">

      {/* ── Header bar ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow mb-1">Essence Games</p>
          <h1 className="font-serif text-[1.75rem] font-semibold text-text-primary tracking-[-0.02em]">
            {vaultName}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="font-sans text-[0.7rem] font-bold tracking-[0.1em] uppercase text-text-muted">
              This Session
            </p>
            <p className="font-sans text-[0.85rem] text-text-secondary">
              <span className="text-amber font-medium">{sealCount}</span>
              {' '}of {activeFiles.length + sealCount} labeled
            </p>
          </div>
          <EssenceRing percent={essencePercent} />
        </div>
      </div>

      {/* ── Memory grid ── */}
      {files.length === 0 ? (
        <div className="glass-obsidian rounded-sm px-6 py-12 text-center">
          <p className="font-sans text-[0.85rem] text-text-muted mb-2">No unlabeled memories found.</p>
          <p className="font-sans text-[0.75rem] text-text-muted">
            All files in this archive have been labeled, or none have been uploaded yet.
          </p>
          <a href="/curator" className="btn-monolith-ghost inline-flex mt-6">Return to Dashboard</a>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {displayFiles.map(file => (
            <MemoryCard
              key={file.id}
              file={file}
              selected={selected?.id === file.id}
              sealed={sealedIds.has(file.id)}
              onClick={() => handleSelect(file)}
            />
          ))}
        </div>
      )}

      {/* ── Seal success flash ── */}
      {sealSuccess && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-sm border border-amber/25 bg-amber/[0.06]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12l5 5L20 7" stroke="#FFB347" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="font-sans text-[0.82rem] text-amber/90">Your essence contribution has been sealed.</p>
        </div>
      )}

      {/* ── Labeling panel ── */}
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: selected && !sealedIds.has(selected.id) ? '800px' : '0px', opacity: selected && !sealedIds.has(selected.id) ? 1 : 0 }}
      >
        {selected && !sealedIds.has(selected.id) && (
          <div className="glass-obsidian rounded-sm p-6 md:p-8 border border-border-subtle flex flex-col gap-6">

            {/* Memory details */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-sm border border-border-subtle font-sans text-[0.6rem] font-bold tracking-[0.1em] uppercase text-text-muted">
                    {selected.category}
                  </span>
                  {selected.year && (
                    <span className="font-sans text-[0.72rem] text-text-muted">{selected.year}</span>
                  )}
                  {selected.location && (
                    <span className="font-sans text-[0.72rem] text-text-muted">{selected.location}</span>
                  )}
                </div>
                <p className="font-sans text-[0.88rem] font-medium text-text-primary">{selected.original_name}</p>
                {selected.description && (
                  <p className="font-sans text-[0.75rem] text-text-muted mt-1 leading-[1.6] line-clamp-2">
                    {selected.description}
                  </p>
                )}
              </div>
            </div>

            {/* Question */}
            <div>
              <p className="font-serif text-[1.1rem] font-semibold text-text-primary mb-4">
                What does this memory represent?
              </p>

              {/* Trait grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TRAITS.map(t => (
                  <button
                    key={t}
                    onClick={() => { setTrait(t); setChoice(null) }}
                    className={[
                      'glass-obsidian rounded-sm px-4 py-3.5 text-left transition-all duration-150 border',
                      trait === t
                        ? 'border-amber bg-amber/[0.05]'
                        : 'border-border-subtle hover:border-amber/40',
                    ].join(' ')}
                  >
                    <p className={`font-sans text-[0.78rem] font-semibold ${trait === t ? 'text-amber' : 'text-text-primary'}`}>
                      {t}
                    </p>
                    <p className="font-sans text-[0.68rem] text-text-muted mt-0.5">
                      {TRAIT_DESCRIPTIONS[t]}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Choice options */}
            {trait && (
              <div>
                <p className="font-sans text-[0.68rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-3">
                  Choose one
                </p>
                <div className="flex flex-wrap gap-2">
                  {TRAIT_CHOICES[trait].map(c => (
                    <button
                      key={c}
                      onClick={() => setChoice(c)}
                      className={[
                        'rounded-sm px-4 py-2 font-sans text-[0.8rem] border transition-all duration-150',
                        choice === c
                          ? 'border-amber bg-amber/[0.08] text-amber'
                          : 'glass-obsidian border-border-subtle text-text-secondary hover:border-amber/40 hover:text-text-primary',
                      ].join(' ')}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={handleSeal}
                disabled={!trait || !choice || sealing}
                className="btn-monolith-amber disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sealing ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-obsidian/40 border-t-obsidian animate-spin" aria-hidden="true" />
                    Sealing…
                  </>
                ) : 'Seal This Memory →'}
              </button>
              <button
                onClick={handleSkip}
                className="font-sans text-[0.75rem] text-text-muted hover:text-text-primary transition-colors duration-200"
              >
                Skip for now
              </button>
            </div>

          </div>
        )}
      </div>

    </div>
  )
}
