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

  // Group years into decades for the filter pills
  const decades = [...new Set(
    items.map(i => {
      const yr = parseInt(i.year as string)
      return isNaN(yr) ? null : `${Math.floor(yr / 10) * 10}s`
    }).filter(Boolean)
  )].sort() as string[]
  const filters = [ALL_FILTER, ...decades]

  const filtered = items.filter(item => {
    let matchFilter = filter === ALL_FILTER
    if (!matchFilter) {
      const decadeStart = parseInt(filter)
      const yr          = parseInt(item.year as string)
      matchFilter = !isNaN(yr) && yr >= decadeStart && yr < decadeStart + 10
    }
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

      <style>{`
        .gallery-card { position: relative; overflow: hidden; cursor: pointer; }
        .gallery-card-overlay {
          position: absolute; inset: 0;
          background: rgba(10,9,8,0.75);
          opacity: 0;
          transition: opacity 300ms ease;
          display: flex; flex-direction: column;
          justify-content: flex-end;
          padding: 16px;
        }
        .gallery-card:hover .gallery-card-overlay { opacity: 1; }
        .gallery-pill {
          border: none; cursor: pointer; padding: 6px 14px;
          font-family: "Space Mono","Courier New",monospace;
          font-size: 0.48rem; letter-spacing: 0.2em; text-transform: uppercase;
          transition: all 200ms ease; background: transparent;
        }
        .gallery-pill-active {
          background: rgba(196,162,74,0.12) !important;
          color: #C4A24A !important;
          border: 1px solid rgba(196,162,74,0.35) !important;
        }
        .gallery-pill-inactive {
          color: rgba(240,237,230,0.35);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .gallery-pill-inactive:hover {
          color: rgba(240,237,230,0.7);
          border-color: rgba(255,255,255,0.12);
        }
        .gallery-load-more {
          font-family: "Space Mono","Courier New",monospace;
          font-size: 0.52rem; letter-spacing: 0.2em; text-transform: uppercase;
          color: rgba(240,237,230,0.3); background: transparent;
          border: 1px solid rgba(255,255,255,0.06);
          padding: 12px 32px; cursor: pointer; transition: all 200ms ease;
        }
        .gallery-load-more:hover {
          color: rgba(240,237,230,0.7);
          border-color: rgba(255,255,255,0.15);
        }
      `}</style>

      <div className="mb-8">
        <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.52rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#C4A24A', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <span style={{ display: 'block', width: '20px', height: '1px', background: '#C4A24A', flexShrink: 0 }} aria-hidden="true" />
          Memory Gallery
        </p>
        <h1 style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontSize: 'clamp(1.8rem,3vw,2.4rem)', fontWeight: 300, letterSpacing: '-0.025em', color: '#F0EDE6' }}>
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

      <div style={{ marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <input
          type="text"
          placeholder="Search memories, people, places…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width:        '100%', maxWidth: '400px',
            background:   '#141210', border: '1px solid rgba(196,162,74,0.12)',
            borderRadius: '2px', outline: 'none',
            fontFamily:   '"Cormorant Garamond",Georgia,serif',
            fontSize:     '1rem', fontStyle: 'italic', fontWeight: 300,
            color:        '#F0EDE6', padding: '10px 16px',
            boxSizing:    'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.44rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(112,108,101,0.5)', marginRight: '4px' }}>
            Decade
          </span>
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`gallery-pill ${filter === f ? 'gallery-pill-active' : 'gallery-pill-inactive'}`}
              style={{ borderRadius: '2px' }}
            >
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
        <div style={{ textAlign: 'center', padding: '80px 24px' }}>
          {items.length === 0 ? (
            <>
              <div style={{ width: '40px', height: '1px', background: '#C4A24A', margin: '0 auto 32px' }} aria-hidden="true" />
              <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontSize: '1.25rem', fontWeight: 500, color: '#F0EDE6', marginBottom: '12px' }}>
                Your archive is empty.
              </p>
              <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, color: '#706C65', lineHeight: 1.8, maxWidth: '380px', margin: '0 auto 32px' }}>
                Upload your family photographs to begin. Every evening one photograph goes to every family member. They reply with what they remember.
              </p>
              <a
                href="/archive/label"
                style={{ display: 'inline-block', fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.52rem', letterSpacing: '0.25em', textTransform: 'uppercase', background: '#C4A24A', color: '#0A0908', padding: '12px 24px', textDecoration: 'none' }}
              >
                Upload Your First Photos →
              </a>
            </>
          ) : (
            <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontSize: '1rem', fontStyle: 'italic', color: '#5C6166' }}>
              No memories match this filter.
            </p>
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <>
          <div style={{ columns: '2', columnGap: '12px' }} className="columns-2 md:columns-3 lg:columns-4">
            {filtered.map((item, i) => (
              <div
                key={item.id}
                className="gallery-card break-inside-avoid"
                style={{
                  background:    '#141210',
                  border:        '1px solid rgba(196,162,74,0.06)',
                  marginBottom:  '12px',
                  animation:     `cardReveal 500ms cubic-bezier(0.16,1,0.3,1) both`,
                  animationDelay: `${Math.min(i * 40, 400)}ms`,
                }}
                onClick={() => setSelected(item)}
              >
                {item.imageUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt={item.title || 'Archive photograph'}
                      style={{ display: 'block', width: '100%', objectFit: 'cover', minHeight: '160px' }}
                    />
                    {/* Hover overlay */}
                    <div className="gallery-card-overlay">
                      <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontSize: '0.85rem', fontStyle: 'italic', fontWeight: 300, color: '#F0EDE6', lineHeight: 1.4, marginBottom: '6px' }}>
                        {item.title?.slice(0, 60)}
                      </p>
                      <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.4rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)' }}>
                        {item.year}{item.location !== '—' ? ` · ${item.location}` : ''}
                        {' '}VIEW DETAILS →
                      </p>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '20px 16px' }}>
                    <div style={{ height: '60px', background: 'rgba(196,162,74,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                      <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.4rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(112,108,101,0.4)' }}>
                        No Image
                      </p>
                    </div>
                    <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontSize: '0.88rem', fontWeight: 300, color: '#F0EDE6', lineHeight: 1.5, marginBottom: '6px' }}>
                      {item.title}
                    </p>
                    <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.42rem', color: 'rgba(112,108,101,0.6)', letterSpacing: '0.1em' }}>
                      {item.year}{item.location !== '—' ? ` · ${item.location}` : ''}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {page < totalPages && (
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <button onClick={loadMore} className="gallery-load-more">
                Load More
              </button>
            </div>
          )}
        </>
      )}

      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(10,9,8,0.94)', backdropFilter: 'blur(12px)' }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{ width: '100%', maxWidth: '680px', background: '#141210', border: '1px solid rgba(196,162,74,0.12)', overflow: 'hidden', maxHeight: '90svh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            {selected.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.imageUrl}
                alt={selected.title}
                style={{ display: 'block', width: '100%', objectFit: 'cover', maxHeight: '400px' }}
              />
            )}
            <div style={{ padding: '28px 32px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontSize: '1.4rem', fontWeight: 500, color: '#F0EDE6', lineHeight: 1.25, marginBottom: '6px' }}>
                    {selected.title}
                  </h2>
                  <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.5rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.6)' }}>
                    {selected.year}{selected.location !== '—' ? ` · ${selected.location}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                  style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.44rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(112,108,101,0.5)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, marginTop: '4px' }}
                >
                  Close ×
                </button>
              </div>

              {(selected.people || selected.contributor) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px', marginBottom: '20px' }}>
                  {selected.people && (
                    <div>
                      <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.44rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(112,108,101,0.5)', marginBottom: '4px' }}>People</p>
                      <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontSize: '0.95rem', fontWeight: 300, color: '#B8B4AB' }}>{selected.people}</p>
                    </div>
                  )}
                  {selected.contributor && (
                    <div>
                      <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.44rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(112,108,101,0.5)', marginBottom: '4px' }}>Labeled by</p>
                      <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontSize: '0.95rem', fontWeight: 300, color: '#B8B4AB' }}>{selected.contributor}</p>
                    </div>
                  )}
                </div>
              )}

              {selected.description && (
                <div style={{ marginBottom: '20px', paddingTop: '20px', borderTop: '1px solid rgba(196,162,74,0.06)' }}>
                  <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.44rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(112,108,101,0.5)', marginBottom: '10px' }}>What Was Happening</p>
                  <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontSize: '1rem', fontWeight: 300, lineHeight: 1.8, color: '#9DA3A8' }}>{selected.description}</p>
                </div>
              )}

              {selected.legacyNote && (
                <div style={{ marginBottom: '20px', paddingTop: '16px', borderTop: '1px solid rgba(196,162,74,0.04)' }}>
                  <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.44rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.3)', marginBottom: '10px' }}>Legacy Note</p>
                  <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontSize: '0.95rem', fontWeight: 300, fontStyle: 'italic', lineHeight: 1.8, color: '#9DA3A8' }}>{selected.legacyNote}</p>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid rgba(196,162,74,0.06)' }}>
                <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.44rem', letterSpacing: '0.1em', color: 'rgba(112,108,101,0.4)' }}>{selected.date}</p>
                <button onClick={() => deleteItem(selected.id, selected.source)} style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.44rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(112,108,101,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
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
