'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

type ArchiveItem = {
  id:          string
  title:       string
  year:        number | ''
  decade:      string
  category:    string
  location:    string
  description: string
  people:      string
  contributor: string
  imageData?:  string
  labeledAt:   string
}

const CATEGORIES = [
  'Photograph', 'Document', 'Letter', 'Certificate',
  'Newspaper', 'Artwork', 'Audio/Video', 'Other',
]

const MILESTONE_THRESHOLDS = [1, 5, 10, 25, 50, 100]

function getDepthScore(item: Partial<ArchiveItem>): number {
  let score = 0
  if (item.title)       score += 10
  if (item.year)        score += 15
  if (item.category)    score += 10
  if (item.location)    score += 15
  if (item.description && item.description.length > 20)  score += 25
  if (item.people)      score += 15
  if (item.imageData)   score += 10
  return score
}

function DepthMeter({ score }: { score: number }) {
  const pct = Math.min(score, 100)
  const label = pct < 30 ? 'Surface' : pct < 60 ? 'Developing' : pct < 85 ? 'Rich' : 'Complete'
  const color = pct < 30 ? 'rgba(92,97,102,0.6)' : pct < 60 ? 'rgba(196,162,74,0.4)' : pct < 85 ? 'rgba(196,162,74,0.7)' : 'rgba(196,162,74,1)'
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="font-sans text-[0.58rem] tracking-[0.12em] uppercase" style={{ color: '#5C6166' }}>Archive Depth</p>
        <p className="font-sans text-[0.65rem] font-medium" style={{ color }}>{label} · {pct}%</p>
      </div>
      <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-px transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

export default function LabelPage() {
  const [form, setForm] = useState<ArchiveItem>({
    id:          '',
    title:       '',
    year:        '',
    decade:      '',
    category:    '',
    location:    '',
    description: '',
    people:      '',
    contributor: '',
    imageData:   undefined,
    labeledAt:   '',
  })
  const [imagePreview, setImagePreview]   = useState<string | null>(null)
  const [saving, setSaving]               = useState(false)
  const [saved, setSaved]                 = useState(false)
  const [streak, setStreak]               = useState(0)
  const [totalLabeled, setTotalLabeled]   = useState(0)
  const [milestone, setMilestone]         = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const items = JSON.parse(localStorage.getItem('archive-items') || '[]')
      setTotalLabeled(items.length)
      const streakVal = parseInt(localStorage.getItem('archive-streak') || '0', 10)
      setStreak(streakVal)
    } catch {}
  }, [])

  function set(key: keyof ArchiveItem) {
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

  const depth = getDepthScore(form)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const newItem: ArchiveItem = {
      ...form,
      id:        crypto.randomUUID(),
      labeledAt: new Date().toISOString(),
    }

    try {
      const items: ArchiveItem[] = JSON.parse(localStorage.getItem('archive-items') || '[]')
      items.unshift(newItem)
      localStorage.setItem('archive-items', JSON.stringify(items))

      const newTotal  = items.length
      const newStreak = streak + 1
      localStorage.setItem('archive-streak', String(newStreak))
      setStreak(newStreak)
      setTotalLabeled(newTotal)

      // Check milestone
      if (MILESTONE_THRESHOLDS.includes(newTotal)) {
        setMilestone(newTotal)
      }

      // Also fire API
      await fetch('/api/archive/save', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...newItem, imageData: undefined }),
      }).catch(() => {})

      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    setForm({ id:'', title:'', year:'', decade:'', category:'', location:'', description:'', people:'', contributor:'', labeledAt:'' })
    setImagePreview(null)
    setSaved(false)
    setMilestone(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const inputCls = 'w-full bg-transparent font-sans text-[0.88rem] placeholder:text-[#3A3F44] focus:outline-none pb-2 transition-colors duration-200'
  const inputStyle = { color: '#F0F0EE', borderBottom: '1px solid rgba(255,255,255,0.10)' }
  const labelCls  = 'font-sans text-[0.58rem] font-bold tracking-[0.14em] uppercase block mb-2'
  const labelStyle = { color: '#5C6166' }

  if (saved) {
    return (
      <div className="max-w-lg mx-auto pt-12">
        <div
          className="rounded-sm border px-10 py-14 text-center"
          style={{ background: '#111112', borderColor: 'rgba(196,162,74,0.2)' }}
        >
          {/* Depth score display */}
          <p className="font-sans text-[0.58rem] tracking-[0.14em] uppercase mb-4" style={{ color: '#5C6166' }}>Archive Depth</p>
          <p className="font-serif font-semibold mb-1" style={{ fontSize: '3.5rem', color: '#F0F0EE', lineHeight: 1 }}>{depth}</p>
          <p className="font-sans text-[0.65rem] tracking-[0.1em] uppercase mb-8" style={{ color: 'rgba(196,162,74,0.7)' }}>
            {depth >= 85 ? 'Complete Record' : depth >= 60 ? 'Rich Record' : 'Partial Record'}
          </p>

          {/* Streak */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="text-center">
              <p className="font-serif font-semibold" style={{ fontSize: '1.6rem', color: '#F0F0EE', lineHeight: 1 }}>{streak}</p>
              <p className="font-sans text-[0.58rem] tracking-[0.1em] uppercase mt-1" style={{ color: '#5C6166' }}>Streak</p>
            </div>
            <div className="w-px h-10" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="text-center">
              <p className="font-serif font-semibold" style={{ fontSize: '1.6rem', color: '#F0F0EE', lineHeight: 1 }}>{totalLabeled}</p>
              <p className="font-sans text-[0.58rem] tracking-[0.1em] uppercase mt-1" style={{ color: '#5C6166' }}>Total Labeled</p>
            </div>
          </div>

          {/* Milestone banner */}
          {milestone && (
            <div className="rounded-sm px-6 py-4 mb-8" style={{ background: 'rgba(196,162,74,0.06)', border: '1px solid rgba(196,162,74,0.2)' }}>
              <p className="font-serif font-semibold mb-1" style={{ color: '#F0F0EE', fontSize: '1rem' }}>
                Milestone: {milestone} items labeled
              </p>
              <p className="font-sans text-[0.72rem]" style={{ color: 'rgba(196,162,74,0.8)' }}>
                This archive is becoming a record of permanence.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button onClick={reset} className="btn-monolith-amber w-full text-center">
              Label Another
            </button>
            <a href="/archive/gallery" className="font-sans text-[0.7rem] tracking-[0.1em] uppercase no-underline transition-colors duration-200" style={{ color: '#5C6166' }}>
              View Gallery →
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">

      <div className="mb-8">
        <p className="eyebrow mb-3">Labeling Game</p>
        <h1 className="font-serif font-semibold leading-[0.95] tracking-[-0.03em]"
            style={{ fontSize: 'clamp(1.8rem,3vw,2.4rem)', color: '#F0F0EE' }}>
          Label a Memory
        </h1>
      </div>

      {/* Streak bar */}
      <div className="flex items-center gap-6 mb-8 px-5 py-4 rounded-sm border" style={{ background: '#111112', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div>
          <p className="font-sans text-[0.58rem] tracking-[0.12em] uppercase mb-0.5" style={{ color: '#5C6166' }}>Streak</p>
          <p className="font-serif font-semibold" style={{ color: '#F0F0EE', fontSize: '1.3rem', lineHeight: 1 }}>{streak}</p>
        </div>
        <div className="w-px h-8 shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div>
          <p className="font-sans text-[0.58rem] tracking-[0.12em] uppercase mb-0.5" style={{ color: '#5C6166' }}>Total Labeled</p>
          <p className="font-serif font-semibold" style={{ color: '#F0F0EE', fontSize: '1.3rem', lineHeight: 1 }}>{totalLabeled}</p>
        </div>
        <div className="flex-1 pl-4">
          <DepthMeter score={depth} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-7">

        {/* Image upload */}
        <div>
          <label className={labelCls} style={labelStyle}>Photograph or Document</label>
          {imagePreview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full rounded-sm object-cover"
                style={{ maxHeight: '280px', objectFit: 'cover', background: '#111112' }}
              />
              <button
                type="button"
                onClick={() => { setImagePreview(null); setForm(f => ({ ...f, imageData: undefined })); if (fileRef.current) fileRef.current.value = '' }}
                className="absolute top-2 right-2 font-sans text-[0.6rem] tracking-[0.1em] uppercase px-2 py-1 rounded-sm"
                style={{ background: 'rgba(12,12,13,0.9)', color: '#5C6166', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 rounded-sm border py-10 transition-colors duration-200"
              style={{ borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed', background: '#111112' }}
            >
              <div className="w-8 h-8 flex items-center justify-center rounded-sm border" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                <span style={{ color: 'rgba(196,162,74,0.5)', fontSize: '1.1rem', lineHeight: 1 }}>+</span>
              </div>
              <p className="font-sans text-[0.7rem] tracking-[0.08em]" style={{ color: '#5C6166' }}>Upload image</p>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
        </div>

        {/* Title */}
        <div>
          <label className={labelCls} style={labelStyle}>Title or Description</label>
          <input
            type="text"
            required
            placeholder="e.g. Family portrait at Lake House, Summer"
            value={form.title}
            onChange={set('title')}
            className={inputCls}
            style={inputStyle}
          />
        </div>

        {/* Year + Category */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className={labelCls} style={labelStyle}>Year</label>
            <input
              type="number"
              placeholder="e.g. 1974"
              min={1800}
              max={2030}
              value={form.year}
              onChange={set('year')}
              className={inputCls}
              style={inputStyle}
            />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Category</label>
            <select value={form.category} onChange={set('category')} className={inputCls} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="" disabled style={{ background: '#111112' }}>Select type</option>
              {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#111112' }}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Location */}
        <div>
          <label className={labelCls} style={labelStyle}>Location</label>
          <input
            type="text"
            placeholder="City, State or Country"
            value={form.location}
            onChange={set('location')}
            className={inputCls}
            style={inputStyle}
          />
        </div>

        {/* People */}
        <div>
          <label className={labelCls} style={labelStyle}>People Present</label>
          <input
            type="text"
            placeholder="Names of people in this memory"
            value={form.people}
            onChange={set('people')}
            className={inputCls}
            style={inputStyle}
          />
        </div>

        {/* Description */}
        <div>
          <label className={labelCls} style={labelStyle}>Context & Story</label>
          <textarea
            rows={4}
            placeholder="What is the story behind this memory? Who was there, what was happening?"
            value={form.description}
            onChange={set('description')}
            className={inputCls + ' resize-none'}
            style={{ ...inputStyle, paddingTop: '0.25rem' }}
          />
        </div>

        {/* Contributor */}
        <div>
          <label className={labelCls} style={labelStyle}>Your Name</label>
          <input
            type="text"
            placeholder="Who is labeling this memory?"
            value={form.contributor}
            onChange={set('contributor')}
            className={inputCls}
            style={inputStyle}
          />
        </div>

        {/* Depth preview */}
        <div className="rounded-sm border px-5 py-4" style={{ background: '#111112', borderColor: 'rgba(255,255,255,0.06)' }}>
          <DepthMeter score={depth} />
          {depth >= 85 && (
            <p className="font-sans text-[0.65rem] mt-3" style={{ color: 'rgba(196,162,74,0.7)' }}>
              This is a complete record. Every field contributes to the permanence of this memory.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-monolith-amber w-full text-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Consecrate to Archive'}
        </button>

      </form>
    </div>
  )
}
