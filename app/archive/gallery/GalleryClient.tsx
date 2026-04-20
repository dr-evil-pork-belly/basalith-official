'use client'

import { useState, useEffect, useCallback } from 'react'

type PhotoLabel = {
  what_was_happening: string | null
  legacy_note:        string | null
  year_taken:         number | null
  season_taken:       string | null
  location:           string | null
  people_tagged:      string[] | null
  labelled_by:        string
  created_at:         string
}

type DBPhoto = {
  id:            string
  created_at:    string
  storage_path:  string | null
  original_name: string | null
  signedUrl:     string | null
  labels:        PhotoLabel[]
}

type LocalItem = {
  id:          string
  title:       string
  year:        number | ''
  decade:      string
  story:       string
  people:      string
  location:    string
  contributor: string
  imageData?:  string
  labeledAt:   string
}

type GalleryItem = {
  id:          string
  imageUrl:    string | null
  title:       string
  year:        string
  location:    string
  people:      string
  description: string
  legacyNote:  string
  contributor: string
  date:        string
  source:      'db' | 'local'
}

function fromDB(p: DBPhoto): GalleryItem {
  const label = p.labels?.[0]
  return {
    id:          p.id,
    imageUrl:    p.signedUrl,
    title:       label?.what_was_happening?.slice(0, 70) || p.original_name || 'Untitled',
    year:        label?.year_taken ? String(label.year_taken) : '—',
    location:    label?.location || '—',
    people:      label?.people_tagged?.join(', ') || '',
    description: label?.what_was_happening || '',
    legacyNote:  label?.legacy_note || '',
    contributor: label?.labelled_by || '',
    date:        new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    source:      'db',
  }
}

function fromLocal(i: LocalItem): GalleryItem {
  return {
    id:          i.id,
    imageUrl:    i.imageData || null,
    title:       i.title || i.story?.slice(0, 70) || 'Untitled',
    year:        i.year ? String(i.year) : '—',
    location:    i.location || '—',
    people:      i.people || '',
    description: i.story || '',
    legacyNote:  '',
    contributor: i.contributor || '',
    date:        new Date(i.labeledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    source:      'local',
  }
}

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-sm ${className ?? ''}`}
      style={{ background: 'rgba(255,255,255,0.04)', animation: 'mysteryGlowPulse 1.8s ease-in-out infinite', ...style }}
    />
  )
}

const ALL_FILTER = 'All'

export default function GalleryClient({ archiveId }: { archiveId: string }) {
  const [items,      setItems]      = useState<GalleryItem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState(ALL_FILTER)
  const [search,     setSearch]     = useState('')
  const [selected,   setSelected]   = useState<GalleryItem | null>(null)
  const [page,       setPage]       = useState(1)
  const [total,      setTotal]      = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [processingStatus, setProcessingStatus] = useState<{
    total:              number
    processed:          number
    kept:               number
    discarded:          number
    pending:            number
    processingComplete: boolean
  } | null>(null)
  const [showComplete, setShowComplete] = useState(false)

  useEffect(() => {
    if (!archiveId) return
    let interval: ReturnType<typeof setInterval>

    const checkStatus = async () => {
      try {
        const res  = await fetch(`/api/archive/processing-status?archiveId=${archiveId}`)
        const data = await res.json()
        setProcessingStatus(data)
        if (data.processingComplete || data.pending === 0) {
          clearInterval(interval)
          if (data.total > 0) {
            setShowComplete(true)
            setTimeout(() => setShowComplete(false), 6000)
          }
        }
      } catch (err) {
        console.error('Status check error:', err)
      }
    }

    checkStatus()
    interval = setInterval(checkStatus, 30000)
    return () => clearInterval(interval)
  }, [archiveId])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  const load = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const url = `/api/archive/gallery?archiveId=${archiveId}&page=${p}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setItems(prev => p === 1 ? data.photographs.map(fromDB) : [...prev, ...data.photographs.map(fromDB)])
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch {
      loadFromLocalStorage()
    }
    setLoading(false)
  }, [archiveId])

  function loadFromLocalStorage() {
    try {
      const stored: LocalItem[] = JSON.parse(localStorage.getItem('archive-items') || '[]')
      setItems(stored.map(fromLocal))
      setTotal(stored.length)
      setTotalPages(1)
    } catch {}
  }

  useEffect(() => { load(1) }, [load])

  function loadMore() {
    const next = page + 1
    setPage(next)
    load(next)
  }

  function deleteItem(id: string, source: 'db' | 'local') {
    if (source === 'local') {
      const stored: LocalItem[] = JSON.parse(localStorage.getItem('archive-items') || '[]')
      localStorage.setItem('archive-items', JSON.stringify(stored.filter(i => i.id !== id)))
    }
    setItems(prev => prev.filter(i => i.id !== id))
    setSelected(null)
  }

  const years   = [...new Set(items.map(i => i.year).filter(y => y !== '—'))].sort()
  const filters = [ALL_FILTER, ...years]

  const filtered = items.filter(item => {
    const matchFilter = filter === ALL_FILTER || item.year === filter
    const q           = search.toLowerCase()
    const matchSearch = !q ||
      item.title?.toLowerCase().includes(q)    ||
      item.people?.toLowerCase().includes(q)   ||
      item.location?.toLowerCase().includes(q) ||
      item.year?.includes(q)
    return matchFilter && matchSearch
  })

  return (
    <div className="max-w-5xl mx-auto">

      <div className="mb-8">
        <p className="eyebrow mb-3">Memory Gallery</p>
        <h1 className="font-serif font-semibold leading-[0.95] tracking-[-0.03em]" style={{ fontSize: 'clamp(1.8rem,3vw,2.4rem)', color: '#F0F0EE' }}>
          {loading ? '—' : `${total} ${total === 1 ? 'Memory' : 'Memories'} Archived`}
        </h1>
      </div>

      {processingStatus && processingStatus.pending > 0 && (
        <div style={{ background: 'rgba(196,162,74,0.06)', border: '1px solid rgba(196,162,74,0.15)', borderRadius: '2px', padding: '1rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#C4A24A', flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.95rem', fontStyle: 'italic', color: '#F0EDE6', margin: '0 0 4px' }}>
              {processingStatus.pending} photo{processingStatus.pending !== 1 ? 's' : ''} are being analyzed by AI.
            </p>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.38rem', letterSpacing: '0.2em', color: '#706C65', margin: '0 0 4px' }}>
              {processingStatus.processed} OF {processingStatus.total} ANALYZED
              {processingStatus.discarded > 0 && ` · ${processingStatus.discarded} REMOVED`}
            </p>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.38rem', letterSpacing: '0.2em', color: '#5C6166', margin: '0 0 8px' }}>
              THIS USUALLY TAKES 15-20 MINUTES · YOUR GALLERY WILL UPDATE AUTOMATICALLY
            </p>
            <div style={{ height: '3px', background: 'rgba(240,237,230,0.08)', borderRadius: '2px', overflow: 'hidden', maxWidth: '300px' }}>
              <div style={{ height: '100%', background: '#C4A24A', borderRadius: '2px', width: processingStatus.total > 0 ? `${Math.round((processingStatus.processed / processingStatus.total) * 100)}%` : '0%', transition: 'width 0.5s ease' }} />
            </div>
          </div>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.8rem', fontStyle: 'italic', color: '#706C65', margin: 0, flexShrink: 0 }}>
            Screenshots and unrelated photos are removed automatically.
          </p>
        </div>
      )}

      {showComplete && processingStatus && (
        <div style={{ background: 'rgba(196,162,74,0.08)', border: '1px solid rgba(196,162,74,0.25)', borderRadius: '2px', padding: '1rem 1.5rem', marginBottom: '2rem', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', fontStyle: 'italic', color: '#F0EDE6', margin: '0 0 4px' }}>
            Analysis complete.
          </p>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.4rem', letterSpacing: '0.25em', color: '#C4A24A', margin: 0 }}>
            {processingStatus.kept} PHOTOGRAPHS READY · {processingStatus.discarded} REMOVED
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <input
          type="text"
          placeholder="Search by title, person, location, year…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 focus:outline-none placeholder:text-[#3A3F44] rounded-sm border px-4 py-2.5"
          style={{ background: '#111112', borderColor: 'rgba(255,255,255,0.08)', color: '#F0F0EE', fontSize: '0.82rem', fontFamily: 'inherit' }}
        />
        <div className="flex gap-2 flex-wrap">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)} className="rounded-sm border px-3 py-2 transition-colors duration-200"
              style={{ fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                background:  filter === f ? 'rgba(196,162,74,0.12)' : 'transparent',
                borderColor: filter === f ? 'rgba(196,162,74,0.4)'  : 'rgba(255,255,255,0.08)',
                color:       filter === f ? '#F0F0EE'               : '#5C6166' }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="break-inside-avoid" style={{ height: `${120 + (i % 3) * 60}px` } as React.CSSProperties} />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-20">
          {items.length === 0 ? (
            <>
              <p className="font-serif font-semibold" style={{ color: '#9DA3A8', fontSize: '1.1rem', marginBottom: '0.75rem' }}>
                Your archive is empty.
              </p>
              <p className="font-serif italic" style={{ color: '#5C6166', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '2rem', maxWidth: '420px', margin: '0 auto 2rem' }}>
                Upload your family photographs to begin. Your family will receive one photograph by email every evening and can reply with their memories.
              </p>
              <a
                href="/archive/label"
                className="inline-block font-compute text-xs tracking-widest no-underline"
                style={{ background: '#C4A24A', color: '#0A0908', padding: '0.6rem 1.5rem' }}
              >
                UPLOAD YOUR FIRST PHOTOS →
              </a>
            </>
          ) : (
            <p className="font-serif font-light" style={{ color: '#3A3F44', fontSize: '1.1rem' }}>
              No memories match this filter.
            </p>
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <>
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {filtered.map((item, i) => (
              <div key={item.id} className="break-inside-avoid rounded-sm border cursor-pointer transition-all duration-200"
                style={{ background: '#111112', borderColor: 'rgba(255,255,255,0.06)', animation: `cardReveal 500ms cubic-bezier(0.16,1,0.3,1) both`, animationDelay: `${i * 40}ms` }}
                onClick={() => setSelected(item)}>
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.title || 'Archive image'} className="w-full rounded-t-sm object-cover" style={{ maxHeight: '200px', objectFit: 'cover' }} />
                )}
                <div className="px-3 py-3">
                  {!item.imageUrl && (
                    <div className="w-full rounded-sm mb-3 flex items-center justify-center" style={{ height: '80px', background: 'rgba(255,255,255,0.03)' }}>
                      <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#3A3F44' }}>No Image</p>
                    </div>
                  )}
                  <p className="font-sans text-[0.72rem] font-medium leading-snug mb-1 line-clamp-2" style={{ color: '#F0F0EE' }}>{item.title}</p>
                  <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', color: '#5C6166', letterSpacing: '0.06em' }}>
                    {item.year}{item.location !== '—' ? ` · ${item.location}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {page < totalPages && (
            <div className="text-center mt-10">
              <button onClick={loadMore} className="rounded-sm border px-6 py-3 transition-colors duration-200"
                style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase' as const, borderColor: 'rgba(255,255,255,0.08)', color: '#5C6166', background: 'transparent' }}>
                Load More
              </button>
            </div>
          )}
        </>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(12,12,13,0.92)', backdropFilter: 'blur(8px)' }}
          onClick={() => setSelected(null)}>
          <div className="w-full max-w-2xl rounded-sm border overflow-hidden" style={{ background: '#111112', borderColor: 'rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
            {selected.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selected.imageUrl} alt={selected.title} className="w-full object-cover" style={{ maxHeight: '360px', objectFit: 'cover' }} />
            )}
            <div className="px-8 py-7">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="font-serif font-semibold leading-snug mb-1" style={{ fontSize: '1.3rem', color: '#F0F0EE' }}>{selected.title}</h2>
                  <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.08em', color: 'rgba(196,162,74,0.7)' }}>
                    {selected.year}{selected.location !== '—' ? ` · ${selected.location}` : ''}
                  </p>
                </div>
                <button onClick={() => setSelected(null)} style={{ fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#3A3F44', marginTop: '0.25rem', flexShrink: 0 }} aria-label="Close">
                  Close
                </button>
              </div>

              {(selected.people || selected.contributor) && (
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-5">
                  {selected.people && (
                    <div>
                      <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#3A3F44', marginBottom: '0.25rem' }}>People</p>
                      <p className="font-sans text-[0.78rem]" style={{ color: '#9DA3A8' }}>{selected.people}</p>
                    </div>
                  )}
                  {selected.contributor && (
                    <div>
                      <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#3A3F44', marginBottom: '0.25rem' }}>Labeled by</p>
                      <p className="font-sans text-[0.78rem]" style={{ color: '#9DA3A8' }}>{selected.contributor}</p>
                    </div>
                  )}
                </div>
              )}

              {selected.description && (
                <div className="mb-5 pt-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#3A3F44', marginBottom: '0.6rem' }}>What Was Happening</p>
                  <p className="font-serif font-light leading-relaxed" style={{ color: '#9DA3A8', fontSize: '0.95rem' }}>{selected.description}</p>
                </div>
              )}

              {selected.legacyNote && (
                <div className="mb-5 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'rgba(196,162,74,0.4)', marginBottom: '0.6rem' }}>Legacy Note</p>
                  <p className="font-serif font-light leading-relaxed" style={{ color: '#9DA3A8', fontSize: '0.9rem', fontStyle: 'italic' }}>{selected.legacyNote}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                <p style={{ fontFamily: 'monospace', fontSize: '0.52rem', color: '#3A3F44' }}>{selected.date}</p>
                <button onClick={() => deleteItem(selected.id, selected.source)} style={{ fontFamily: 'monospace', fontSize: '0.52rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#3A3F44' }}>
                  Remove from Archive
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
