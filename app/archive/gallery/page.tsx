'use client'

import { useState, useEffect } from 'react'

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

const ALL_FILTER = 'All'

export default function GalleryPage() {
  const [items, setItems]         = useState<ArchiveItem[]>([])
  const [filter, setFilter]       = useState(ALL_FILTER)
  const [selected, setSelected]   = useState<ArchiveItem | null>(null)
  const [search, setSearch]       = useState('')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('archive-items')
      if (stored) setItems(JSON.parse(stored))
    } catch {}
  }, [])

  // Close modal on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  const decades    = [ALL_FILTER, ...[...new Set(items.map(i => i.decade).filter(Boolean))].sort()]
  const categories = [ALL_FILTER, ...[...new Set(items.map(i => i.category).filter(Boolean))].sort()]

  const filtered = items.filter(item => {
    const matchesFilter = filter === ALL_FILTER || item.decade === filter || item.category === filter
    const q = search.toLowerCase()
    const matchesSearch = !q ||
      item.title?.toLowerCase().includes(q) ||
      item.people?.toLowerCase().includes(q) ||
      item.location?.toLowerCase().includes(q) ||
      String(item.year).includes(q)
    return matchesFilter && matchesSearch
  })

  function deleteItem(id: string) {
    const next = items.filter(i => i.id !== id)
    setItems(next)
    localStorage.setItem('archive-items', JSON.stringify(next))
    setSelected(null)
  }

  const filterOpts = [...new Set([...decades, ...categories])].filter(f => f !== ALL_FILTER)

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <p className="eyebrow mb-3">Memory Gallery</p>
        <h1 className="font-serif font-semibold leading-[0.95] tracking-[-0.03em]"
            style={{ fontSize: 'clamp(1.8rem,3vw,2.4rem)', color: '#F0F0EE' }}>
          {items.length} {items.length === 1 ? 'Memory' : 'Memories'} Archived
        </h1>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <input
          type="text"
          placeholder="Search by title, person, location, year…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-transparent font-sans text-[0.82rem] placeholder:text-[#3A3F44] focus:outline-none px-4 py-2.5 rounded-sm border transition-colors duration-200"
          style={{ color: '#F0F0EE', borderColor: 'rgba(255,255,255,0.08)', background: '#111112' }}
        />
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter(ALL_FILTER)}
            className="font-sans text-[0.62rem] tracking-[0.1em] uppercase px-3 py-2 rounded-sm border transition-colors duration-200"
            style={{
              background:   filter === ALL_FILTER ? 'rgba(196,162,74,0.12)' : 'transparent',
              borderColor:  filter === ALL_FILTER ? 'rgba(196,162,74,0.4)'  : 'rgba(255,255,255,0.08)',
              color:        filter === ALL_FILTER ? '#F0F0EE'               : '#5C6166',
            }}
          >
            All
          </button>
          {filterOpts.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="font-sans text-[0.62rem] tracking-[0.1em] uppercase px-3 py-2 rounded-sm border transition-colors duration-200"
              style={{
                background:  filter === f ? 'rgba(196,162,74,0.12)' : 'transparent',
                borderColor: filter === f ? 'rgba(196,162,74,0.4)'  : 'rgba(255,255,255,0.08)',
                color:       filter === f ? '#F0F0EE'               : '#5C6166',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="font-serif font-light" style={{ color: '#3A3F44', fontSize: '1.1rem' }}>
            {items.length === 0
              ? 'The archive is empty. Begin labeling memories.'
              : 'No memories match this filter.'}
          </p>
          {items.length === 0 && (
            <a href="/archive/label" className="btn-monolith-amber inline-block mt-6">
              Label First Memory
            </a>
          )}
        </div>
      )}

      {/* Masonry grid */}
      {filtered.length > 0 && (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {filtered.map((item, i) => (
            <div
              key={item.id}
              className="break-inside-avoid rounded-sm border cursor-pointer transition-all duration-200 group"
              style={{
                background:   '#111112',
                borderColor:  'rgba(255,255,255,0.06)',
                animation:    `cardReveal 500ms cubic-bezier(0.16,1,0.3,1) both`,
                animationDelay: `${i * 40}ms`,
              }}
              onClick={() => setSelected(item)}
            >
              {item.imageData && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageData}
                  alt={item.title || 'Archive image'}
                  className="w-full rounded-t-sm object-cover"
                  style={{ maxHeight: '200px', objectFit: 'cover' }}
                />
              )}
              <div className="px-3 py-3">
                {!item.imageData && (
                  <div
                    className="w-full rounded-sm mb-3 flex items-center justify-center"
                    style={{ height: '80px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <p className="font-sans text-[0.58rem] tracking-[0.1em] uppercase" style={{ color: '#3A3F44' }}>
                      {item.category || 'Document'}
                    </p>
                  </div>
                )}
                <p className="font-sans text-[0.72rem] font-medium leading-snug mb-1 line-clamp-2" style={{ color: '#F0F0EE' }}>
                  {item.title || 'Untitled'}
                </p>
                <p className="font-sans text-[0.6rem]" style={{ color: '#5C6166' }}>
                  {item.year || '—'}{item.location ? ` · ${item.location}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(12,12,13,0.92)', backdropFilter: 'blur(8px)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-2xl rounded-sm border overflow-hidden"
            style={{ background: '#111112', borderColor: 'rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}
          >
            {selected.imageData && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.imageData}
                alt={selected.title || 'Archive image'}
                className="w-full object-cover"
                style={{ maxHeight: '360px', objectFit: 'cover' }}
              />
            )}
            <div className="px-8 py-7">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="font-serif font-semibold leading-snug mb-1" style={{ fontSize: '1.3rem', color: '#F0F0EE' }}>
                    {selected.title || 'Untitled'}
                  </h2>
                  <p className="font-sans text-[0.7rem]" style={{ color: 'rgba(196,162,74,0.7)' }}>
                    {selected.year || '—'} · {selected.category || '—'}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="font-sans text-[0.62rem] tracking-[0.1em] uppercase mt-1 shrink-0 transition-colors duration-200"
                  style={{ color: '#3A3F44' }}
                  aria-label="Close"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6">
                {selected.location && (
                  <div>
                    <p className="font-sans text-[0.56rem] tracking-[0.12em] uppercase mb-0.5" style={{ color: '#3A3F44' }}>Location</p>
                    <p className="font-sans text-[0.78rem]" style={{ color: '#9DA3A8' }}>{selected.location}</p>
                  </div>
                )}
                {selected.people && (
                  <div>
                    <p className="font-sans text-[0.56rem] tracking-[0.12em] uppercase mb-0.5" style={{ color: '#3A3F44' }}>People</p>
                    <p className="font-sans text-[0.78rem]" style={{ color: '#9DA3A8' }}>{selected.people}</p>
                  </div>
                )}
                {selected.contributor && (
                  <div>
                    <p className="font-sans text-[0.56rem] tracking-[0.12em] uppercase mb-0.5" style={{ color: '#3A3F44' }}>Labeled by</p>
                    <p className="font-sans text-[0.78rem]" style={{ color: '#9DA3A8' }}>{selected.contributor}</p>
                  </div>
                )}
                {selected.decade && (
                  <div>
                    <p className="font-sans text-[0.56rem] tracking-[0.12em] uppercase mb-0.5" style={{ color: '#3A3F44' }}>Decade</p>
                    <p className="font-sans text-[0.78rem]" style={{ color: '#9DA3A8' }}>{selected.decade}</p>
                  </div>
                )}
              </div>

              {selected.description && (
                <div className="mb-6 pt-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <p className="font-serif font-light leading-relaxed" style={{ color: '#9DA3A8', fontSize: '0.95rem' }}>
                    {selected.description}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="font-sans text-[0.6rem]" style={{ color: '#3A3F44' }}>
                  {new Date(selected.labeledAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <button
                  onClick={() => deleteItem(selected.id)}
                  className="font-sans text-[0.62rem] tracking-[0.1em] uppercase transition-colors duration-200"
                  style={{ color: '#3A3F44' }}
                >
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
