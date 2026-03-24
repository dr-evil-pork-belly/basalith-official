'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type LabeledItem = {
  id:          string
  title:       string
  year:        number
  decade:      string
  category:    string
  labeledAt:   string
  contributor: string
}

const DECADES = ['1940s','1950s','1960s','1970s','1980s','1990s','2000s','2010s','2020s']

function decadeOf(year: number): string {
  const d = Math.floor(year / 10) * 10
  return `${d}s`
}

export default function ArchiveDashboard() {
  const [items, setItems] = useState<LabeledItem[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('archive-items')
      if (stored) setItems(JSON.parse(stored))
    } catch {}
  }, [])

  const total       = items.length
  const thisMonth   = items.filter(i => {
    const d = new Date(i.labeledAt)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length
  const contributors = [...new Set(items.map(i => i.contributor).filter(Boolean))].length
  const categories   = [...new Set(items.map(i => i.category).filter(Boolean))].length

  // Items per decade
  const byDecade: Record<string, number> = {}
  DECADES.forEach(d => { byDecade[d] = 0 })
  items.forEach(i => {
    const d = decadeOf(i.year)
    if (byDecade[d] !== undefined) byDecade[d]++
  })
  const maxCount = Math.max(...Object.values(byDecade), 1)

  // Recent activity (last 8)
  const recent = [...items].sort((a, b) => new Date(b.labeledAt).getTime() - new Date(a.labeledAt).getTime()).slice(0, 8)

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-10">
        <p className="eyebrow mb-3">Archive Overview</p>
        <h1 className="font-serif font-semibold leading-[0.95] tracking-[-0.03em]"
            style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', color: '#F0F0EE' }}>
          The Family Archive
        </h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {[
          { label: 'Labeled Items', value: total },
          { label: 'This Month',    value: thisMonth },
          { label: 'Contributors',  value: contributors },
          { label: 'Categories',    value: categories },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-sm px-5 py-5 border" style={{ background: '#111112', borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="font-sans text-[0.58rem] tracking-[0.14em] uppercase mb-2" style={{ color: '#5C6166' }}>{label}</p>
            <p className="font-serif font-semibold" style={{ fontSize: '2rem', color: '#F0F0EE', lineHeight: 1 }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Decade timeline */}
      <div className="rounded-sm border p-8 mb-10" style={{ background: '#111112', borderColor: 'rgba(255,255,255,0.06)' }}>
        <p className="font-sans text-[0.62rem] tracking-[0.14em] uppercase mb-8" style={{ color: '#5C6166' }}>
          Archive by Decade
        </p>

        <div className="flex items-end gap-3 h-36">
          {DECADES.map(decade => {
            const count  = byDecade[decade] || 0
            const height = count === 0 ? 4 : Math.max(12, Math.round((count / maxCount) * 120))
            return (
              <div key={decade} className="flex flex-col items-center gap-2 flex-1">
                <p className="font-sans text-[0.58rem]" style={{ color: count > 0 ? 'rgba(196,162,74,0.8)' : '#3A3F44' }}>
                  {count > 0 ? count : ''}
                </p>
                <div
                  className="w-full rounded-sm transition-all duration-500"
                  style={{
                    height:     `${height}px`,
                    background: count > 0 ? 'rgba(196,162,74,0.25)' : 'rgba(255,255,255,0.04)',
                    borderTop:  count > 0 ? '1px solid rgba(196,162,74,0.5)' : '1px solid rgba(255,255,255,0.06)',
                  }}
                />
                <p className="font-sans text-[0.55rem] tracking-[0.06em]" style={{ color: '#3A3F44' }}>{decade}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent activity + CTA */}
      <div className="grid md:grid-cols-3 gap-6">

        {/* Recent activity */}
        <div className="md:col-span-2 rounded-sm border" style={{ background: '#111112', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="font-sans text-[0.62rem] tracking-[0.14em] uppercase" style={{ color: '#5C6166' }}>Recent Labels</p>
          </div>
          {recent.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="font-serif font-light" style={{ color: '#3A3F44', fontSize: '0.95rem' }}>
                No items labeled yet.<br />Begin with the first photograph.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-transparent">
              {recent.map(item => (
                <li key={item.id} className="px-6 py-3 flex items-center justify-between gap-4 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <div className="min-w-0">
                    <p className="font-sans text-[0.78rem] truncate" style={{ color: '#F0F0EE' }}>{item.title || 'Untitled'}</p>
                    <p className="font-sans text-[0.62rem] mt-0.5" style={{ color: '#5C6166' }}>
                      {item.year || '—'} · {item.category || '—'}
                    </p>
                  </div>
                  <p className="font-sans text-[0.6rem] tracking-[0.06em] uppercase shrink-0" style={{ color: '#3A3F44' }}>
                    {new Date(item.labeledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex flex-col gap-4">
          <Link
            href="/archive/label"
            className="rounded-sm border px-6 py-6 no-underline flex flex-col gap-3 transition-colors duration-200 hover:border-amber/30 group"
            style={{ background: '#111112', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <div className="w-8 h-px" style={{ background: 'rgba(196,162,74,0.5)' }} />
            <p className="font-serif font-semibold" style={{ color: '#F0F0EE', fontSize: '1.05rem' }}>Label a Photo</p>
            <p className="font-sans text-[0.72rem] leading-relaxed" style={{ color: '#5C6166' }}>
              Upload and annotate a memory from the archive.
            </p>
          </Link>
          <Link
            href="/archive/gallery"
            className="rounded-sm border px-6 py-6 no-underline flex flex-col gap-3 transition-colors duration-200 group"
            style={{ background: '#111112', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <div className="w-8 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <p className="font-serif font-semibold" style={{ color: '#F0F0EE', fontSize: '1.05rem' }}>View Gallery</p>
            <p className="font-sans text-[0.72rem] leading-relaxed" style={{ color: '#5C6166' }}>
              Browse labeled memories across all decades.
            </p>
          </Link>
          <Link
            href="/archive/contributors"
            className="rounded-sm border px-6 py-6 no-underline flex flex-col gap-3 transition-colors duration-200 group"
            style={{ background: '#111112', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <div className="w-8 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <p className="font-serif font-semibold" style={{ color: '#F0F0EE', fontSize: '1.05rem' }}>Contributors</p>
            <p className="font-sans text-[0.72rem] leading-relaxed" style={{ color: '#5C6166' }}>
              Manage who can add to this archive.
            </p>
          </Link>
        </div>

      </div>
    </div>
  )
}
