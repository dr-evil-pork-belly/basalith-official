'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
type SealPhase = 'idle' | 'sealing' | 'drawing' | 'consecrating' | 'done'

const TRAIT_CHOICES: Record<TraitKey, string[]> = {
  'Core Disposition':   ['Quiet Strength',   'Joyful Presence',   'Steady Authority'],
  'Values & Beliefs':   ['Family First',      'Hard Work',         'Faith & Tradition'],
  'Emotional Register': ['Warmly Reserved',   'Openly Expressive', 'Deeply Private'],
  'Legacy Intent':      ['Provide & Protect', 'Inspire & Guide',   'Remember & Honor'],
}

const TRAIT_DESCRIPTIONS: Record<TraitKey, string> = {
  'Core Disposition':   'How they carry themselves through life.',
  'Values & Beliefs':   'What they stood for and lived by.',
  'Emotional Register': 'How they felt and expressed themselves.',
  'Legacy Intent':      'What they wanted to leave behind.',
}

const TRAITS = Object.keys(TRAIT_CHOICES) as TraitKey[]

const QUESTIONS: Record<string, string[]> = {
  photograph: [
    'What truth does this image hold about them?',
    'What were they protecting in this moment?',
    'Who were they becoming when this was taken?',
    'What joy lived in this ordinary day?',
    'What would they say if they could see this now?',
  ],
  document: [
    'What did they believe when they wrote this?',
    'What did they want the world to know?',
    'What obligation shaped these words?',
    'What did they leave unsaid here?',
    'What version of themselves signed this?',
  ],
  video: [
    'What were they trying to hold onto?',
    'Who were they performing for?',
    'What light moved through them here?',
    'What did they want remembered?',
    'What would they want you to feel watching this?',
  ],
  audio: [
    'What did their voice carry that words alone cannot?',
    'What were they listening for in the silence?',
    'What frequency of theirs lives in this recording?',
    'Who were they speaking to, truly?',
    'What did this sound mean to them?',
  ],
  text: [
    "What did they need to say that couldn't wait?",
    'What were they working through here?',
    'What did they hope someone would understand?',
    'What belief anchors these words?',
    'What were they afraid to leave unsaid?',
  ],
}

const MYSTERY_QUESTION = 'You cannot see this memory clearly. What do you feel?'
const EMOTION_WORDS    = ['Longing', 'Pride', 'Tenderness', 'Grief', 'Joy', 'Peace']

function toastPersonalLine(count: number): string {
  if (count === 1) return 'The first seal is the most sacred.'
  if (count <= 3)  return 'Each memory deepens the archive.'
  if (count <= 6)  return 'You are shaping something lasting.'
  return 'You are building a cathedral of memory.'
}

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

// ── Essence Ring (Change 7 — larger) ──────────────────────────────────────────

function EssenceRing({ percent }: { percent: number }) {
  const radius      = 28
  const stroke      = 3
  const normalised  = Math.min(100, Math.max(0, percent))
  const circ        = 2 * Math.PI * radius
  const dash        = (normalised / 100) * circ

  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90" aria-hidden="true">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(255,179,71,0.12)" strokeWidth={stroke} />
        <circle
          cx="40" cy="40" r={radius} fill="none"
          stroke="#FFB347" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="font-sans text-[0.75rem] font-bold text-amber tabular-nums">{normalised}%</span>
        <span className="font-sans text-[0.48rem] font-bold tracking-[0.1em] uppercase text-text-muted/60">Essence</span>
      </div>
    </div>
  )
}

// ── Memory Card ───────────────────────────────────────────────────────────────

function MemoryCard({
  file, index, selected, sealed, isMystery, mysteryRevealed, onClick,
}: {
  file:            VaultFile
  index:           number
  selected:        boolean
  sealed:          boolean
  isMystery:       boolean
  mysteryRevealed: boolean
  onClick:         () => void
}) {
  const borderClass = isMystery && !sealed
    ? 'border-2 border-amber/50'
    : selected
    ? 'border border-amber shadow-[0_0_20px_rgba(255,179,71,0.2)] scale-[1.02] z-10'
    : 'border border-border-subtle hover:border-amber/40'

  return (
    <button
      onClick={onClick}
      className={`relative rounded-sm overflow-hidden cursor-pointer transition-all duration-200 aspect-[4/3] flex flex-col glass-obsidian ${borderClass}`}
      style={{
        animationName:           'cardReveal',
        animationDuration:       '500ms',
        animationDelay:          `${index * 120}ms`,
        animationFillMode:       'both',
        animationTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
      }}
      aria-pressed={selected}
      aria-label={isMystery ? 'Mystery Memory' : file.original_name}
    >
      {/* Mystery treatment */}
      {isMystery ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Blurred background */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(160deg,rgba(180,140,90,0.13) 0%,rgba(100,70,40,0.22) 60%,rgba(20,15,10,0.7) 100%)',
              filter: mysteryRevealed ? 'blur(0px)' : 'blur(7px)',
              transition: 'filter 1.2s cubic-bezier(0.16,1,0.3,1)',
            }}
          />
          {/* Overlay (hidden when revealed) */}
          {!mysteryRevealed && (
            <div
              className="relative flex flex-col items-center gap-1.5"
              style={{ animation: 'mysteryPulse 2.5s ease-in-out infinite' }}
            >
              <span className="font-serif text-[2.2rem] font-semibold text-amber/80 leading-none">?</span>
              <span className="font-sans text-[0.5rem] font-bold tracking-[0.12em] uppercase text-amber/50">
                Mystery Memory
              </span>
              <span className="font-sans text-[0.48rem] text-amber/30 mt-0.5">Trust your instinct</span>
            </div>
          )}
        </div>
      ) : file.category === 'photograph' ? (
        <div
          className="flex-1 flex flex-col items-center justify-end p-3"
          style={{ background: 'linear-gradient(160deg,rgba(180,140,90,0.13) 0%,rgba(100,70,40,0.22) 60%,rgba(20,15,10,0.7) 100%)' }}
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

      {/* Mystery pulsing border */}
      {isMystery && !sealed && (
        <div
          className="absolute inset-0 rounded-sm pointer-events-none"
          style={{ animation: 'mysteryBorderPulse 2.5s ease-in-out infinite' }}
        />
      )}
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EssencePage() {
  const [vaultId, setVaultId]               = useState<string | null>(null)
  const [vaultName, setVaultName]           = useState('')
  const [curatorFirstName, setCuratorFirst] = useState('')
  const [essencePercent, setEssence]        = useState(0)
  const [files, setFiles]                   = useState<VaultFile[]>([])
  const [sealedIds, setSealedIds]           = useState<Set<string>>(new Set())
  const [skippedIds, setSkippedIds]         = useState<string[]>([])
  const [mysteryRevealedIds, setMysteryRevealedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading]               = useState(true)
  const [selected, setSelected]             = useState<VaultFile | null>(null)
  const [mysteryFileId, setMysteryFileId]   = useState<string | null>(null)
  const [trait, setTrait]                   = useState<TraitKey | null>(null)
  const [choice, setChoice]                 = useState<string | null>(null)
  const [mysteryEmotion, setMysteryEmotion] = useState<string | null>(null)
  const [question, setQuestion]             = useState<string | null>(null)
  const [sealPhase, setSealPhase]           = useState<SealPhase>('idle')
  const [sealCount, setSealCount]           = useState(0)
  const [totalSealed, setTotalSealed]       = useState(0)
  const [done, setDone]                     = useState(false)
  const [toast, setToast]                   = useState<{ show: boolean; count: number }>({ show: false, count: 0 })
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('vault_id, full_name')
        .eq('id', user.id)
        .single()

      const rawFirst = profile?.full_name
        ? profile.full_name.split(' ')[0]
        : (user.email?.split('@')[0].split('.')[0] ?? 'you')
      setCuratorFirst(rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1))

      if (!profile?.vault_id) { setLoading(false); return }
      setVaultId(profile.vault_id)

      const [{ data: vault }, { data: rawFiles }, { count: sessCount }] = await Promise.all([
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
        supabase
          .from('essence_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('vault_id', profile.vault_id)
          .eq('curator_id', user.id)
          .eq('skipped', false),
      ])

      setVaultName(vault?.display_name ?? '')
      setEssence(vault?.essence_percent ?? 0)
      const loaded = rawFiles ?? []
      setFiles(loaded)
      setMysteryFileId(loaded[6]?.id ?? null)
      setTotalSealed(sessCount ?? 0)
      setLoading(false)
    }
    load()
  }, [])

  const displayFiles = [
    ...files.filter(f => !sealedIds.has(f.id) && !skippedIds.includes(f.id)),
    ...files.filter(f => skippedIds.includes(f.id)),
  ]

  const activeFiles = files.filter(f => !sealedIds.has(f.id))

  function handleSelect(file: VaultFile) {
    if (sealedIds.has(file.id)) return
    if (sealPhase !== 'idle') return

    const isMystery = file.id === mysteryFileId

    if (selected?.id === file.id) {
      setSelected(null)
      setTrait(null)
      setChoice(null)
      setMysteryEmotion(null)
      setQuestion(null)
    } else {
      setSelected(file)
      setTrait(null)
      setChoice(null)
      setMysteryEmotion(null)
      if (isMystery) {
        setQuestion(MYSTERY_QUESTION)
      } else {
        const pool = QUESTIONS[file.category] ?? QUESTIONS.photograph
        setQuestion(pool[Math.floor(Math.random() * pool.length)])
      }
    }
  }

  function handleSkip() {
    if (!selected || sealPhase !== 'idle') return
    const id = selected.id
    setSkippedIds(prev => [...prev.filter(x => x !== id), id])
    setSelected(null)
    setTrait(null)
    setChoice(null)
    setMysteryEmotion(null)
    setQuestion(null)
    const remaining = files.filter(f => !sealedIds.has(f.id) && f.id !== id)
    if (remaining.length === 0) setDone(true)
  }

  function showToast(count: number) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ show: true, count })
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 4000)
  }

  const handleSeal = useCallback(async () => {
    if (!selected || !vaultId || sealPhase !== 'idle') return
    const isMystery = selected.id === mysteryFileId
    if (!isMystery && (!trait || !choice)) return
    if (isMystery && !mysteryEmotion) return

    const sealTrait  = isMystery ? 'Mystery' : trait!
    const sealChoice = isMystery ? mysteryEmotion! : choice!
    const sealFile   = selected

    // Start ritual — fire API immediately in background
    setSealPhase('sealing')

    const apiPromise = fetch('/api/curator/seal-memory', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        file_id:            sealFile.id,
        trait:              sealTrait,
        choice_label:       sealChoice,
        choice_description: !isMystery && trait ? TRAIT_DESCRIPTIONS[trait] : undefined,
        vault_id:           vaultId,
        curator_name:       curatorFirstName,
        file_name:          sealFile.original_name,
        file_year:          sealFile.year,
      }),
    }).then(r => r.json())

    // 200ms — transition to line draw
    await new Promise<void>(r => setTimeout(r, 200))
    setSealPhase('drawing')

    // 900ms — gold line finishes drawing
    await new Promise<void>(r => setTimeout(r, 900))
    setSealPhase('consecrating')

    // 2400ms — consecration message shown (400ms fade-in + 2000ms hold)
    await new Promise<void>(r => setTimeout(r, 2400))

    const data = await apiPromise
    setSealPhase('done')

    if (data.ok) {
      const newTotal = totalSealed + sealCount + 1
      setSealedIds(prev => new Set([...prev, sealFile.id]))
      setSealCount(c => c + 1)
      if (data.new_essence_percent !== undefined) setEssence(data.new_essence_percent)
      if (isMystery) setMysteryRevealedIds(prev => new Set([...prev, sealFile.id]))
      showToast(newTotal)

      setTimeout(() => {
        setSealPhase('idle')
        setSelected(null)
        setTrait(null)
        setChoice(null)
        setMysteryEmotion(null)
        setQuestion(null)
        setSealedIds(prev => {
          const next = new Set([...prev, sealFile.id])
          const remaining = files.filter(f => !next.has(f.id))
          if (remaining.length === 0) setDone(true)
          return next
        })
      }, 500)
    } else {
      setSealPhase('idle')
    }
  }, [selected, mysteryFileId, trait, choice, mysteryEmotion, vaultId, sealPhase, totalSealed, sealCount, curatorFirstName, files])

  function handleNewSession() {
    setDone(false)
    setSealedIds(new Set())
    setSkippedIds([])
    setMysteryRevealedIds(new Set())
    setSelected(null)
    setTrait(null)
    setChoice(null)
    setMysteryEmotion(null)
    setQuestion(null)
    setSealCount(0)
    setSealPhase('idle')
    setLoading(true)
    ;(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('vault_files')
        .select('id, original_name, category, year, location, description, mime_type')
        .eq('vault_id', vaultId!)
        .eq('essence_tagged', false)
        .order('created_at', { ascending: true })
        .limit(8)
      const loaded = data ?? []
      setFiles(loaded)
      setMysteryFileId(loaded[6]?.id ?? null)
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

  // ── Completion state ───────────────────────────────────────────────────────
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
        <div className="my-10 flex flex-col items-center gap-3">
          {(() => {
            const r = 44, s = 5
            const circ = 2 * Math.PI * r
            const dash = (essencePercent / 100) * circ
            return (
              <div className="relative w-28 h-28">
                <svg width="112" height="112" viewBox="0 0 112 112" className="-rotate-90" aria-hidden="true">
                  <circle cx="56" cy="56" r={r} fill="none" stroke="rgba(255,179,71,0.1)" strokeWidth={s} />
                  <circle cx="56" cy="56" r={r} fill="none" stroke="#FFB347" strokeWidth={s} strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} />
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
          <button onClick={handleNewSession} className="btn-monolith-amber">Start Another Session &rarr;</button>
          <a href="/curator" className="btn-monolith-ghost">Return to Dashboard</a>
        </div>
      </div>
    )
  }

  const isMysterySelected = selected?.id === mysteryFileId

  return (
    <>
      <style>{`
        @keyframes cardReveal {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes mysteryPulse {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1;   }
        }
        @keyframes mysteryBorderPulse {
          0%, 100% { box-shadow: 0 0 0 1px rgba(255,179,71,0.25); }
          50%       { box-shadow: 0 0 12px rgba(255,179,71,0.45); }
        }
        @keyframes consecrateFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes lineDraw {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>

      <div className="flex flex-col gap-8">

        {/* ── Change 7: Emotional session header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="eyebrow mb-2">Essence Session</p>
            <h1 className="font-serif text-[2rem] font-semibold text-text-primary tracking-[-0.02em] leading-[1.1]">
              {vaultName}&apos;s Archive
            </h1>
            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-amber/30 bg-amber/[0.07] font-sans text-[0.58rem] font-bold tracking-[0.14em] uppercase text-amber">
                <span className="ai-dot !w-[5px] !h-[5px]" />
                Season I
              </span>
              <p className="font-sans text-[0.72rem] text-text-muted">
                <span className="text-amber font-medium">{sealCount}</span> sealed
                {' · '}
                <span>{Math.max(0, activeFiles.length - sealCount)}</span> remaining
                {' · '}
                <span>{skippedIds.length}</span> skipped
              </p>
            </div>
          </div>
          <EssenceRing percent={essencePercent} />
        </div>

        {/* ── Memory grid ── */}
        {files.length === 0 ? (
          /* ── Change 8: Empty state ── */
          <div className="glass-obsidian rounded-sm px-6 py-16 text-center">
            <div className="mb-6 flex justify-center">
              <span className="ai-dot !w-3 !h-3" />
            </div>
            <p className="font-serif text-[1.5rem] font-semibold text-text-primary tracking-[-0.02em] mb-3">
              The vault is resting.
            </p>
            <p className="font-sans text-[0.82rem] text-text-secondary italic leading-[1.7] mb-8 max-w-xs mx-auto">
              No memories await labeling at this moment. The archive breathes.
            </p>
            <a href="/curator" className="btn-monolith-ghost inline-flex">
              Return to your vault
            </a>
          </div>
        ) : (
          /* ── Change 1: Sequential card reveal ── */
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {displayFiles.map((file, index) => (
              <MemoryCard
                key={file.id}
                file={file}
                index={index}
                selected={selected?.id === file.id}
                sealed={sealedIds.has(file.id)}
                isMystery={file.id === mysteryFileId}
                mysteryRevealed={mysteryRevealedIds.has(file.id)}
                onClick={() => handleSelect(file)}
              />
            ))}
          </div>
        )}

        {/* ── Labeling panel ── */}
        <div
          className="overflow-hidden transition-all duration-300"
          style={{
            maxHeight: selected && !sealedIds.has(selected.id) ? '1000px' : '0px',
            opacity:   selected && !sealedIds.has(selected.id) ? 1 : 0,
          }}
        >
          {selected && !sealedIds.has(selected.id) && (
            <div className="glass-obsidian rounded-sm p-6 md:p-8 border border-border-subtle flex flex-col gap-6">

              {/* Memory details */}
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-sm border border-border-subtle font-sans text-[0.6rem] font-bold tracking-[0.1em] uppercase text-text-muted">
                    {isMysterySelected ? 'Unknown' : selected.category}
                  </span>
                  {!isMysterySelected && selected.year && (
                    <span className="font-sans text-[0.72rem] text-text-muted">{selected.year}</span>
                  )}
                  {!isMysterySelected && selected.location && (
                    <span className="font-sans text-[0.72rem] text-text-muted">{selected.location}</span>
                  )}
                </div>
                <p className="font-sans text-[0.88rem] font-medium text-text-primary">
                  {isMysterySelected ? 'A hidden memory' : selected.original_name}
                </p>
                {!isMysterySelected && selected.description && (
                  <p className="font-sans text-[0.75rem] text-text-muted mt-1 leading-[1.6] line-clamp-2">
                    {selected.description}
                  </p>
                )}
              </div>

              {/* Change 2: Presence-inducing question */}
              <div>
                <p className="font-serif text-[1.1rem] font-semibold text-text-primary mb-4 leading-[1.4]">
                  {question}
                </p>

                {isMysterySelected ? (
                  /* Change 5: Emotion word grid */
                  <div className="flex flex-wrap gap-2">
                    {EMOTION_WORDS.map(emotion => (
                      <button
                        key={emotion}
                        onClick={() => setMysteryEmotion(emotion)}
                        className={[
                          'rounded-sm px-4 py-2 font-sans text-[0.8rem] border transition-all duration-150',
                          mysteryEmotion === emotion
                            ? 'border-amber bg-amber/[0.08] text-amber'
                            : 'glass-obsidian border-border-subtle text-text-secondary hover:border-amber/40 hover:text-text-primary',
                        ].join(' ')}
                      >
                        {emotion}
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Trait grid */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {TRAITS.map(t => (
                      <button
                        key={t}
                        onClick={() => { setTrait(t); setChoice(null) }}
                        className={[
                          'glass-obsidian rounded-sm px-4 py-3.5 text-left transition-all duration-150 border',
                          trait === t ? 'border-amber bg-amber/[0.05]' : 'border-border-subtle hover:border-amber/40',
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
                )}
              </div>

              {/* Sub-choices (non-mystery only) */}
              {!isMysterySelected && trait && sealPhase === 'idle' && (
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

              {/* Change 3: Seal ritual or actions */}
              {(sealPhase === 'drawing' || sealPhase === 'consecrating' || sealPhase === 'done') ? (
                <div className="flex flex-col gap-4 pt-2">
                  {/* Gold line draws left-to-right */}
                  <div className="h-px bg-white/[0.06] rounded-full overflow-hidden w-full">
                    <div
                      className="h-full bg-amber/60 rounded-full"
                      style={{
                        animation: sealPhase === 'drawing'
                          ? 'lineDraw 900ms cubic-bezier(0.16,1,0.3,1) forwards'
                          : 'none',
                        width: sealPhase === 'drawing' ? undefined : '100%',
                      }}
                    />
                  </div>

                  {/* Consecration message */}
                  {(sealPhase === 'consecrating' || sealPhase === 'done') && (
                    <p
                      className="font-serif italic text-amber text-[0.95rem] text-center leading-[1.5]"
                      style={{ animation: 'consecrateFadeIn 400ms ease forwards' }}
                    >
                      This memory is now part of {vaultName}&apos;s permanent record.
                    </p>
                  )}

                  {/* Change 5: Mystery reveal message */}
                  {isMysterySelected && (sealPhase === 'consecrating' || sealPhase === 'done') && (
                    <p
                      className="font-sans text-[0.78rem] text-text-muted text-center"
                      style={{ animation: 'consecrateFadeIn 500ms 300ms ease both' }}
                    >
                      You felt <span className="text-amber font-medium">{mysteryEmotion}</span>
                      {selected.year ? <> &middot; {selected.year}</> : null}
                      {selected.location ? <> &middot; {selected.location}</> : null}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-4 pt-2">
                  <button
                    onClick={handleSeal}
                    disabled={
                      sealPhase !== 'idle' ||
                      (isMysterySelected ? !mysteryEmotion : (!trait || !choice))
                    }
                    className="btn-monolith-amber disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {sealPhase === 'sealing' ? (
                      <>
                        <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-obsidian/40 border-t-obsidian animate-spin" aria-hidden="true" />
                        Sealing&hellip;
                      </>
                    ) : 'Seal This Memory \u2192'}
                  </button>
                  <button
                    onClick={handleSkip}
                    className="font-sans text-[0.75rem] text-text-muted hover:text-text-primary transition-colors duration-200"
                  >
                    Skip for now
                  </button>
                </div>
              )}

            </div>
          )}
        </div>

      </div>

      {/* Change 4: Floating contribution toast */}
      {toast.show && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-obsidian border border-amber/30 rounded-sm px-6 py-4 flex flex-col gap-1 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
          style={{
            minWidth: '260px',
            maxWidth: '340px',
            animation: 'consecrateFadeIn 300ms ease forwards',
          }}
        >
          <p className="font-sans text-[0.82rem] font-medium text-text-primary">
            You have given {vaultName} <span className="text-amber">{toast.count}</span>{' '}
            {toast.count === 1 ? 'memory' : 'memories'}.
          </p>
          <p className="font-sans text-[0.72rem] text-text-muted">
            {toastPersonalLine(toast.count)}
          </p>
        </div>
      )}
    </>
  )
}
