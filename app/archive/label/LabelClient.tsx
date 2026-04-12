'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

type ArchiveItem = {
  id:          string
  title:       string
  story:       string
  essence:     string
  people:      string
  year:        number | ''
  season:      string
  decade:      string
  location:    string
  inviteEmail: string
  contributor: string
  imageData?:  string
  labeledAt:   string
}

const SEASONS   = ['Spring', 'Summer', 'Autumn', 'Winter', 'Unknown']

const MILESTONE_THRESHOLDS = [1, 5, 10, 25, 50, 100]

const MILESTONE_TEXTS: Record<number, { main: string; sub: string }> = {
  1:   { main: 'The archive has begun.',                           sub: 'ONE PHOTOGRAPH · ONE MEMORY · PERMANENT'   },
  5:   { main: 'Five moments preserved.',                          sub: 'THE RECORD IS GROWING'                     },
  10:  { main: 'Ten photographs.\nA decade comes alive.',          sub: 'KEEP GOING'                                },
  25:  { main: 'Twenty-five.\nThis family is being remembered.',   sub: 'THE ARCHIVE IS TAKING SHAPE'               },
  50:  { main: 'Fifty photographs.\nThis is a serious archive.',   sub: 'HALF A CENTURY OF MOMENTS · PRESERVED'     },
  100: { main: 'One hundred.\nThis is a legacy.',                  sub: 'THE WHITFIELD ARCHIVE · GENERATION I'      },
}

function getDepthScore(item: Partial<ArchiveItem>): number {
  let s = 0
  if (item.story   && item.story.length   > 50) s += 30
  if (item.essence && item.essence.length > 20) s += 25
  if (item.people)    s += 15
  if (item.year)      s += 10
  if (item.location)  s += 10
  if (item.imageData) s += 10
  return Math.min(s, 100)
}

function DepthMeter({ score }: { score: number }) {
  const pct   = Math.min(score, 100)
  const label = pct < 30 ? 'Surface' : pct < 60 ? 'Developing' : pct < 85 ? 'Rich' : 'Complete'
  const color = pct < 30
    ? 'rgba(92,97,102,0.6)'
    : pct < 60 ? 'rgba(196,162,74,0.4)'
    : pct < 85 ? 'rgba(196,162,74,0.7)'
    : 'rgba(196,162,74,1)'
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p style={{ fontFamily: 'monospace', fontSize: '0.52rem', letterSpacing: '0.12em', color: '#5C6166', textTransform: 'uppercase' }}>
          Archive Depth
        </p>
        <p style={{ fontFamily: 'monospace', fontSize: '0.58rem', color }}>{label} · {pct}%</p>
      </div>
      <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-px transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function Sigil({ size = 40, pulse = false }: { size?: number; pulse?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true"
      style={pulse ? { animation: 'sigilPulse 1.5s ease-in-out 2' } : undefined}>
      <rect x="20" y="3"  width="12" height="12" transform="rotate(45 20 3)"  fill="none" stroke="rgba(196,162,74,0.45)" strokeWidth="1"/>
      <rect x="20" y="10" width="8"  height="8"  transform="rotate(45 20 10)" fill="none" stroke="rgba(196,162,74,0.75)" strokeWidth="1"/>
      <rect x="20" y="16" width="4"  height="4"  transform="rotate(45 20 16)" fill="rgba(196,162,74,0.95)"/>
    </svg>
  )
}

function MilestoneOverlay({ count, onDone }: { count: number; onDone: () => void }) {
  const [showGhost, setShowGhost] = useState(false)
  const [showMain,  setShowMain]  = useState(false)
  const [showSub,   setShowSub]   = useState(false)
  const [exiting,   setExiting]   = useState(false)

  const texts = MILESTONE_TEXTS[count] ?? { main: `${count} memories preserved.`, sub: 'THE ARCHIVE GROWS' }

  useEffect(() => {
    const t1 = setTimeout(() => setShowGhost(true), 400)
    const t2 = setTimeout(() => setShowMain(true),  700)
    const t3 = setTimeout(() => setShowSub(true),   1200)
    const t4 = setTimeout(() => setExiting(true),   3500)
    const t5 = setTimeout(() => onDone(),            4100)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5) }
  }, [onDone])

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background:    'rgba(2,2,1,0.97)',
        animation:     exiting ? 'milestoneOut 0.6s ease forwards' : 'milestoneGhostIn 0.4s ease forwards',
        pointerEvents: exiting ? 'none' : 'all',
      }}
    >
      {showGhost && (
        <p className="absolute select-none"
          style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontWeight: 700, fontSize: 'clamp(7rem,20vw,14rem)', color: 'rgba(196,162,74,0.12)', letterSpacing: '-0.05em', lineHeight: 1, userSelect: 'none', animation: 'milestoneGhostIn 0.5s ease forwards' }}>
          {count}
        </p>
      )}
      <div className="relative flex flex-col items-center gap-6 px-8 text-center" style={{ maxWidth: '500px' }}>
        <Sigil size={40} pulse />
        {showMain && (
          <p style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(1.5rem,4vw,2.5rem)', color: '#F0F0EE', lineHeight: 1.3, whiteSpace: 'pre-line', animation: 'milestoneMainIn 0.6s cubic-bezier(0.16,1,0.3,1) forwards' }}>
            {texts.main}
          </p>
        )}
        {showSub && (
          <p style={{ fontFamily: 'monospace', fontSize: '0.48rem', letterSpacing: '0.4em', color: 'rgba(196,162,74,0.8)', textTransform: 'uppercase', animation: 'milestoneSubIn 0.4s ease forwards' }}>
            {texts.sub}
          </p>
        )}
      </div>
    </div>
  )
}

const EMPTY: ArchiveItem = {
  id: '', title: '', story: '', essence: '', people: '',
  year: '', season: '', decade: '', location: '',
  inviteEmail: '', contributor: '', labeledAt: '',
}

const BATCH_SIZE = 20

type UploadStatus = 'idle' | 'selecting' | 'uploading' | 'complete'

interface UploadState {
  status:        UploadStatus
  totalSelected: number
  totalUploaded: number
  totalFailed:   number
  currentBatch:  number
  totalBatches:  number
}

function BulkUploadTab({ archiveId }: { archiveId: string }) {
  const [state, setState] = useState<UploadState>({
    status: 'idle', totalSelected: 0, totalUploaded: 0,
    totalFailed: 0, currentBatch: 0, totalBatches: 0,
  })
  const [dragging, setDragging] = useState(false)
  const inputRef       = useRef<HTMLInputElement>(null)
  const queueRef       = useRef<File[]>([])
  const isUploadingRef = useRef(false)

  const processQueue = useCallback(async () => {
    if (isUploadingRef.current) return
    isUploadingRef.current = true

    const queue       = queueRef.current
    const totalBatches = Math.ceil(queue.length / BATCH_SIZE)
    setState(prev => ({ ...prev, status: 'uploading', totalBatches }))

    let uploaded = 0
    let failed   = 0

    for (let i = 0; i < queue.length; i += BATCH_SIZE) {
      const batch       = queue.slice(i, i + BATCH_SIZE)
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      setState(prev => ({ ...prev, currentBatch: batchNumber }))

      try {
        const fd = new FormData()
        fd.append('archiveId', archiveId)
        fd.append('uploadedBy', 'owner')
        for (const file of batch) fd.append('photos', file)

        const res = await fetch('/api/archive/bulk-upload', {
          method: 'POST',
          body:   fd,
          signal: AbortSignal.timeout(60000),
        })
        if (res.ok) {
          const data = await res.json()
          uploaded += data.uploaded ?? batch.length
          failed   += data.failed   ?? 0
        } else {
          failed += batch.length
        }
      } catch {
        failed += batch.length
      }

      setState(prev => ({ ...prev, totalUploaded: uploaded, totalFailed: failed }))
      // brief pause between batches
      await new Promise(r => setTimeout(r, 300))
    }

    isUploadingRef.current = false
    queueRef.current = []
    setState(prev => ({ ...prev, status: 'complete', totalUploaded: uploaded, totalFailed: failed }))
  }, [archiveId])

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return

    setState({ status: 'selecting', totalSelected: 0, totalUploaded: 0, totalFailed: 0, currentBatch: 0, totalBatches: 0 })

    // Iterate lazily — never call Array.from(fileList) on large iCloud libraries
    // as iOS resolves all iCloud references simultaneously, freezing the browser.
    const collected: File[] = []
    for (let i = 0; i < fileList.length; i++) {
      collected.push(fileList[i])
      // Yield to the UI every 50 files so the browser stays responsive
      if (i % 50 === 49) {
        setState(prev => ({ ...prev, totalSelected: i + 1 }))
        await new Promise(r => setTimeout(r, 0))
      }
    }

    queueRef.current = collected
    setState(prev => ({ ...prev, totalSelected: collected.length }))
    processQueue()
  }, [processQueue])

  function reset() {
    setState({ status: 'idle', totalSelected: 0, totalUploaded: 0, totalFailed: 0, currentBatch: 0, totalBatches: 0 })
    queueRef.current = []
    isUploadingRef.current = false
    if (inputRef.current) inputRef.current.value = ''
  }

  // ── Selecting state ──────────────────────────────────────────────────────────
  if (state.status === 'selecting') {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="font-serif" style={{ fontSize: '1.1rem', fontStyle: 'italic', color: '#F0EDE6' }}>
          Reading your photos…
        </p>
        <p style={{ fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.22em', color: '#C4A24A' }}>
          {state.totalSelected} SELECTED
        </p>
      </div>
    )
  }

  // ── Uploading state ──────────────────────────────────────────────────────────
  if (state.status === 'uploading') {
    const pct = state.totalBatches > 0
      ? Math.round((state.currentBatch / state.totalBatches) * 100)
      : 0
    return (
      <div style={{ padding: '2rem 0' }}>
        <p className="font-serif" style={{ fontSize: '1.1rem', fontStyle: 'italic', color: '#F0EDE6', marginBottom: '0.5rem' }}>
          Uploading your archive…
        </p>
        <div className="w-full" style={{ height: '4px', background: 'rgba(240,237,230,0.08)', borderRadius: '2px', margin: '1rem 0', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#C4A24A', borderRadius: '2px', width: `${pct}%`, transition: 'width 0.5s ease' }} />
        </div>
        <p style={{ fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.18em', color: '#5C6166' }}>
          {state.totalUploaded} UPLOADED
          {state.totalFailed > 0 && ` · ${state.totalFailed} FAILED`}
          {' · '}BATCH {state.currentBatch} OF {state.totalBatches}
        </p>
        <p className="font-serif" style={{ fontSize: '0.85rem', fontStyle: 'italic', color: '#3A3830', marginTop: '1rem' }}>
          Keep this page open. Our AI is analyzing each photo as it uploads.
        </p>
      </div>
    )
  }

  // ── Complete state ───────────────────────────────────────────────────────────
  if (state.status === 'complete') {
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <Sigil size={36} />
        <div>
          <p className="font-serif font-semibold" style={{ fontSize: '2rem', color: '#F0F0EE', lineHeight: 1.1 }}>
            {state.totalUploaded} photograph{state.totalUploaded === 1 ? '' : 's'} received.
          </p>
          <p className="font-serif" style={{ fontSize: '1rem', color: 'rgba(196,162,74,0.7)', fontStyle: 'italic', marginTop: '0.5rem' }}>
            Our AI is reviewing each one now.
          </p>
          {state.totalFailed > 0 && (
            <p style={{ fontFamily: 'monospace', fontSize: '0.52rem', letterSpacing: '0.1em', color: '#5C6166', marginTop: '0.75rem' }}>
              {state.totalFailed} could not be uploaded — try again
            </p>
          )}
        </div>
        <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5C6166', maxWidth: '320px' }}>
          Check your gallery in 15–20 minutes. Blurry or unrelated photos will be filtered automatically.
        </p>
        <div className="flex gap-3 mt-2">
          <button onClick={reset} className="btn-monolith-amber">Upload More</button>
          <a href="/archive/gallery"
            style={{ fontFamily: 'monospace', fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5C6166', display: 'flex', alignItems: 'center' }}>
            View Gallery →
          </a>
        </div>
      </div>
    )
  }

  // ── Idle state ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">

      {/* iPhone tip */}
      <div style={{ background: 'rgba(196,162,74,0.04)', border: '1px solid rgba(196,162,74,0.12)', borderRadius: '2px', padding: '1rem 1.25rem' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.25em', color: '#C4A24A', marginBottom: '0.4rem' }}>
          FOR IPHONE · ICLOUD LIBRARIES
        </p>
        <p className="font-serif" style={{ fontSize: '0.88rem', fontStyle: 'italic', color: '#5C6166', lineHeight: 1.7, margin: 0 }}>
          Select photos in batches of 200–300 rather than tapping Select All. Choose by date range or album. Each batch uploads automatically while you prepare the next.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        className="w-full flex flex-col items-center justify-center gap-3 rounded-sm border py-14 cursor-pointer transition-all duration-200"
        style={{
          borderColor: dragging ? 'rgba(196,162,74,0.5)' : 'rgba(255,255,255,0.08)',
          borderStyle: 'dashed',
          background:  dragging ? 'rgba(196,162,74,0.04)' : '#111112',
        }}
      >
        <div className="w-10 h-10 flex items-center justify-center rounded-sm border" style={{ borderColor: 'rgba(196,162,74,0.3)' }}>
          <span style={{ color: 'rgba(196,162,74,0.6)', fontSize: '1.4rem', lineHeight: 1 }}>↑</span>
        </div>
        <p className="font-serif" style={{ color: '#F0F0EE', fontSize: '1rem', fontWeight: 300 }}>
          {dragging ? 'Drop them here.' : 'Drop photographs here, or click to select.'}
        </p>
        <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.14em', color: '#5C6166', textTransform: 'uppercase' }}>
          JPG · PNG · HEIC · MOV · MP4 · Any format
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*,.heic,.heif"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      <p style={{ fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3A3F44', textAlign: 'center' }}>
        Uploads in batches of {BATCH_SIZE} · AI reviews each photograph automatically
      </p>
    </div>
  )
}

export default function LabelClient({ archiveId }: { archiveId: string }) {
  const [tab, setTab]                       = useState<'single' | 'bulk'>('single')
  const [form, setForm]                     = useState<ArchiveItem>(EMPTY)
  const [imagePreview, setImagePreview]     = useState<string | null>(null)
  const [saving, setSaving]                 = useState(false)
  const [saved, setSaved]                   = useState(false)
  const [streak, setStreak]                 = useState(0)
  const [totalLabeled, setTotalLabeled]     = useState(0)
  const [milestoneCount, setMilestoneCount] = useState<number | null>(null)
  const [showOverlay, setShowOverlay]       = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const items = JSON.parse(localStorage.getItem('archive-items') || '[]')
      setTotalLabeled(items.length)
      setStreak(parseInt(localStorage.getItem('archive-streak') || '0', 10))
    } catch {}
  }, [])

  useEffect(() => {
    if (saved && milestoneCount !== null) {
      const t = setTimeout(() => setShowOverlay(true), 400)
      return () => clearTimeout(t)
    }
  }, [saved, milestoneCount])

  function setField(key: keyof ArchiveItem) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const val = e.target.value
      setForm(f => {
        const next = { ...f, [key]: val }
        if (key === 'year' && val) {
          const yr = parseInt(val, 10)
          if (!isNaN(yr)) next.decade = `${Math.floor(yr / 10) * 10}s`
        }
        return next
      })
    }
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const data = ev.target?.result as string
      setImagePreview(data)
      setForm(f => ({ ...f, imageData: data }))
    }
    reader.readAsDataURL(file)
  }

  function removeImage() {
    setImagePreview(null)
    setForm(f => ({ ...f, imageData: undefined }))
    if (fileRef.current) fileRef.current.value = ''
  }

  const depth = getDepthScore(form)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const titleParts = [
      form.people?.split(',')[0]?.trim(),
      form.year ? String(form.year) : '',
      form.location,
    ].filter(Boolean)
    const autoTitle = titleParts.join(' · ') || 'Untitled Memory'

    const newItem: ArchiveItem = { ...form, title: autoTitle, id: crypto.randomUUID(), labeledAt: new Date().toISOString() }

    try {
      const items: ArchiveItem[] = JSON.parse(localStorage.getItem('archive-items') || '[]')
      items.unshift(newItem)
      localStorage.setItem('archive-items', JSON.stringify(items))

      let localTotal  = items.length
      let localStreak = streak + 1
      localStorage.setItem('archive-streak', String(localStreak))

      const peopleTagged = form.people
        ? form.people.split(',').map(s => s.trim()).filter(Boolean)
        : []

      const payload = {
        archiveId,
        photoBase64:        form.imageData ?? null,
        photoName:          form.imageData ? 'photo.jpg' : null,
        whatWasHappening:   form.story    || null,
        legacyNote:         form.essence  || null,
        yearTaken:          form.year     || null,
        seasonTaken:        form.season   || null,
        location:           form.location || null,
        peopleTagged,
        invitedContributor: form.inviteEmail || null,
        labelledBy:         form.contributor || 'owner',
      }

      try {
        const res  = await fetch('/api/archive/save', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        })
        if (res.ok) {
          const data = await res.json()
          if (!data.mock) {
            localTotal  = data.archiveDepth  ?? localTotal
            localStreak = data.streak        ?? localStreak
            if (data.milestoneReached) setMilestoneCount(data.milestoneReached)
          }
        }
      } catch {
        // DB failed — localStorage counts used for milestone check
      }

      if (MILESTONE_THRESHOLDS.includes(localTotal) && milestoneCount === null) {
        setMilestoneCount(localTotal)
      }

      setStreak(localStreak)
      setTotalLabeled(localTotal)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    setForm(EMPTY)
    setImagePreview(null)
    setSaved(false)
    setMilestoneCount(null)
    setShowOverlay(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function testMilestone() {
    const keys = Object.keys(MILESTONE_TEXTS).map(Number)
    const k    = keys[Math.floor(Math.random() * keys.length)]
    setMilestoneCount(k)
    setShowOverlay(true)
  }

  if (saved) {
    return (
      <>
        {showOverlay && milestoneCount !== null && (
          <MilestoneOverlay count={milestoneCount} onDone={() => setShowOverlay(false)} />
        )}
        <div className="max-w-lg mx-auto pt-12">
          <div className="rounded-sm border px-10 py-14 text-center" style={{ background: '#111112', borderColor: 'rgba(196,162,74,0.2)' }}>
            <p style={{ fontFamily: 'monospace', fontSize: '0.52rem', letterSpacing: '0.14em', color: '#5C6166', textTransform: 'uppercase', marginBottom: '1rem' }}>Archive Depth</p>
            <p className="font-serif font-semibold mb-1" style={{ fontSize: '3.5rem', color: '#F0F0EE', lineHeight: 1 }}>{depth}</p>
            <p style={{ fontFamily: 'monospace', fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)', marginBottom: '2rem' }}>
              {depth >= 85 ? 'Complete Record' : depth >= 60 ? 'Rich Record' : 'Partial Record'}
            </p>
            <div className="flex items-center justify-center gap-6 mb-10">
              <div className="text-center">
                <p className="font-serif font-semibold" style={{ fontSize: '1.6rem', color: '#F0F0EE', lineHeight: 1 }}>{streak}</p>
                <p style={{ fontFamily: 'monospace', fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5C6166', marginTop: '0.25rem' }}>Streak</p>
              </div>
              <div className="w-px h-10" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="text-center">
                <p className="font-serif font-semibold" style={{ fontSize: '1.6rem', color: '#F0F0EE', lineHeight: 1 }}>{totalLabeled}</p>
                <p style={{ fontFamily: 'monospace', fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5C6166', marginTop: '0.25rem' }}>Total Labeled</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={reset} className="btn-monolith-amber w-full text-center">Add Another</button>
              <a href="/archive/gallery" className="no-underline transition-colors duration-200" style={{ fontFamily: 'monospace', fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5C6166' }}>
                View Gallery →
              </a>
            </div>
          </div>
        </div>
      </>
    )
  }

  const monoLabel = { display: 'block', fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.35em', textTransform: 'uppercase' as const, color: 'rgba(196,162,74,0.75)', marginBottom: '0.75rem' }
  const compactLabel = { display: 'block', fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.28em', textTransform: 'uppercase' as const, color: '#5C6166', marginBottom: '0.6rem' }
  const baseInput = { width: '100%', background: 'transparent', color: '#F0F0EE', borderBottom: '1px solid rgba(255,255,255,0.10)', outline: 'none', fontFamily: 'var(--font-public-sans), system-ui, sans-serif', fontSize: '0.88rem' }

  return (
    <>
      {showOverlay && milestoneCount !== null && (
        <MilestoneOverlay count={milestoneCount} onDone={() => setShowOverlay(false)} />
      )}

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="eyebrow mb-3">Labeling Game</p>
          <h1 className="font-serif font-semibold leading-[0.95] tracking-[-0.03em]" style={{ fontSize: 'clamp(1.8rem,3vw,2.4rem)', color: '#F0F0EE' }}>
            {tab === 'single' ? 'Label a Memory' : 'Upload Everything'}
          </h1>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-0 mb-10 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {(['single', 'bulk'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                fontFamily:    'monospace',
                fontSize:      '0.5rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                padding:       '0.6rem 1.25rem',
                color:         tab === t ? 'rgba(196,162,74,0.9)' : '#5C6166',
                borderBottom:  tab === t ? '1px solid rgba(196,162,74,0.6)' : '1px solid transparent',
                marginBottom:  '-1px',
                background:    'transparent',
                transition:    'color 0.15s',
              }}
            >
              {t === 'single' ? 'One Photograph' : 'Upload Everything'}
            </button>
          ))}
        </div>

        {tab === 'bulk' && <BulkUploadTab archiveId={archiveId} />}

        {tab === 'single' && (<>
        <div className="flex items-center gap-6 mb-10 px-5 py-4 rounded-sm border" style={{ background: '#111112', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div>
            <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5C6166', marginBottom: '0.25rem' }}>Streak</p>
            <p className="font-serif font-semibold" style={{ color: '#F0F0EE', fontSize: '1.3rem', lineHeight: 1 }}>{streak}</p>
          </div>
          <div className="w-px h-8 shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div>
            <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5C6166', marginBottom: '0.25rem' }}>Total Labeled</p>
            <p className="font-serif font-semibold" style={{ color: '#F0F0EE', fontSize: '1.3rem', lineHeight: 1 }}>{totalLabeled}</p>
          </div>
          <div className="flex-1 pl-4">
            <DepthMeter score={depth} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-10">

          <div>
            <label style={compactLabel}>Photograph or Document</label>
            {imagePreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Preview" className="w-full rounded-sm" style={{ maxHeight: '280px', objectFit: 'cover', background: '#111112' }} />
                <button type="button" onClick={removeImage} className="absolute top-2 right-2 rounded-sm"
                  style={{ fontFamily: 'monospace', fontSize: '0.58rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.25rem 0.5rem', background: 'rgba(12,12,13,0.9)', color: '#5C6166', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Remove
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-2 rounded-sm border py-10 transition-colors duration-200"
                style={{ borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed', background: '#111112' }}>
                <div className="w-8 h-8 flex items-center justify-center rounded-sm border" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                  <span style={{ color: 'rgba(196,162,74,0.5)', fontSize: '1.1rem', lineHeight: 1 }}>+</span>
                </div>
                <p style={{ fontFamily: 'monospace', fontSize: '0.58rem', letterSpacing: '0.08em', color: '#5C6166' }}>Upload image</p>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
          </div>

          <div>
            <label style={monoLabel}>What Was Happening</label>
            <div className="relative">
              <textarea rows={8} value={form.story} onChange={setField('story')}
                placeholder={"Describe what was happening in this moment. What brought everyone together? What was the occasion? What do you remember about this day? What was the mood? What happened right before and right after this photograph was taken?\n\nWrite as much as you remember. Nothing is too small."}
                className="w-full resize-none focus:outline-none placeholder:italic"
                style={{ background: 'transparent', color: '#F0F0EE', borderBottom: '1px solid rgba(196,162,74,0.3)', fontFamily: 'var(--font-cormorant), Georgia, serif', fontStyle: 'normal', fontWeight: 300, fontSize: '1.15rem', lineHeight: 1.9, padding: '1rem 0' }} />
              <p className="absolute bottom-2 right-0" style={{ fontFamily: 'monospace', fontSize: '0.4rem', color: '#3A3F44' }}>{form.story.length} characters</p>
            </div>
          </div>

          <div>
            <label style={monoLabel}>What Should They Know</label>
            <textarea rows={5} value={form.essence} onChange={setField('essence')}
              placeholder={"What should the people who come after you understand about this moment and the people in it? What did it mean? What does it still mean?\n\nThis becomes part of the Essence record."}
              className="w-full resize-none focus:outline-none placeholder:italic"
              style={{ background: 'transparent', color: '#F0F0EE', borderBottom: '1px solid rgba(255,255,255,0.10)', fontFamily: 'var(--font-cormorant), Georgia, serif', fontWeight: 300, fontSize: '1.05rem', lineHeight: 1.9, padding: '0.75rem 0' }} />
            <p className="font-serif" style={{ fontSize: '0.78rem', fontStyle: 'italic', color: 'rgba(196,162,74,0.55)', marginTop: '0.5rem' }}>This field trains the Ancestor AI.</p>
          </div>

          <div>
            <label style={compactLabel}>Who Is in This Photograph</label>
            <input type="text" placeholder="Names of people in this memory" value={form.people} onChange={setField('people')}
              className="focus:outline-none placeholder:text-[#3A3F44]" style={{ ...baseInput, paddingBottom: '0.5rem' }} />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label style={compactLabel}>Year</label>
              <input type="number" placeholder="e.g. 1974" min={1800} max={2030} value={form.year} onChange={setField('year')}
                className="focus:outline-none placeholder:text-[#3A3F44]" style={{ ...baseInput, paddingBottom: '0.5rem' }} />
            </div>
            <div>
              <label style={compactLabel}>Season</label>
              <select value={form.season} onChange={setField('season')} className="focus:outline-none" style={{ ...baseInput, paddingBottom: '0.5rem', cursor: 'pointer' }}>
                <option value="" disabled style={{ background: '#111112' }}>Select season</option>
                {SEASONS.map(s => <option key={s} value={s} style={{ background: '#111112' }}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={compactLabel}>Where</label>
            <input type="text" placeholder="City, State or Country" value={form.location} onChange={setField('location')}
              className="focus:outline-none placeholder:text-[#3A3F44]" style={{ ...baseInput, paddingBottom: '0.5rem' }} />
          </div>

          <div className="rounded-sm border px-5 py-4" style={{ background: '#111112', borderColor: 'rgba(255,255,255,0.06)' }}>
            <DepthMeter score={depth} />
            {depth >= 85 && (
              <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.06em', color: 'rgba(196,162,74,0.7)', marginTop: '0.75rem' }}>
                Complete record. Every detail contributes to the permanence of this memory.
              </p>
            )}
          </div>

          <div>
            <div className="mb-6" style={{ borderTop: '1px solid rgba(196,162,74,0.12)', paddingTop: '2rem' }}>
              <label style={{ ...monoLabel, color: 'rgba(196,162,74,0.5)' }}>Who Else Would Remember This?</label>
              <input type="email" placeholder="their@email.com" value={form.inviteEmail} onChange={setField('inviteEmail')}
                className="focus:outline-none placeholder:text-[#3A3F44]" style={{ ...baseInput, paddingBottom: '0.5rem' }} />
              <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.08em', color: '#3A3F44', marginTop: '0.6rem' }}>
                Optional · They will be invited to contribute their own memories
              </p>
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-monolith-amber w-full text-center disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? 'Saving…' : 'Save to Archive'}
          </button>

        </form>

        <div className="mt-8 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          <button type="button" onClick={testMilestone} className="w-full py-2 rounded-sm border transition-colors duration-200"
            style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3A3F44', borderColor: 'rgba(255,255,255,0.04)', background: 'transparent' }}>
            [ Test Milestone Overlay — Remove Before Deploy ]
          </button>
        </div>
        </>)}

      </div>
    </>
  )
}
