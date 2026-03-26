'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type ArchiveRow = {
  name:             string
  labelled_photos:  number
  total_photos:     number
  current_streak:   number
  longest_streak:   number
  last_label_date:  string | null
}

type DecadeRow = {
  decade:         string
  photo_count:    number
  labelled_count: number
}

type LabelRow = {
  id:                  string
  created_at:          string
  what_was_happening:  string | null
  year_taken:          number | null
  location:            string | null
  labelled_by:         string
}

type LocalItem = {
  id:          string
  title:       string
  year:        number
  decade:      string
  story:       string
  people:      string
  location:    string
  contributor: string
  labeledAt:   string
}

const ALL_DECADES = ['1940s','1950s','1960s','1970s','1980s','1990s','2000s','2010s','2020s']

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-sm ${className ?? ''}`}
      style={{ background: 'rgba(255,255,255,0.04)', animation: 'mysteryGlowPulse 1.8s ease-in-out infinite', ...style }}
    />
  )
}

function buildDecadeMap(rows: DecadeRow[]): Record<string, number> {
  const map: Record<string, number> = {}
  ALL_DECADES.forEach(d => { map[d] = 0 })
  rows.forEach(r => { if (map[r.decade] !== undefined) map[r.decade] = r.labelled_count })
  return map
}

function buildDecadeMapFromLocal(items: LocalItem[]): Record<string, number> {
  const map: Record<string, number> = {}
  ALL_DECADES.forEach(d => { map[d] = 0 })
  items.forEach(i => { if (i.decade && map[i.decade] !== undefined) map[i.decade]++ })
  return map
}

export default function DashboardClient({ archiveId }: { archiveId: string }) {
  const [loading,  setLoading]  = useState(true)
  const [archive,  setArchive]  = useState<ArchiveRow | null>(null)
  const [byDecade, setByDecade] = useState<Record<string, number>>({})
  const [recent,   setRecent]   = useState<{ id: string; title: string; year: string; location: string; date: string }[]>([])
  const [stats,    setStats]    = useState({ total: 0, streak: 0, contributors: 0, thisMonth: 0 })

  useEffect(() => { fetchFromDB() }, [])

  async function fetchFromDB() {
    try {
      const res  = await fetch(`/api/archive/dashboard?archiveId=${archiveId}`)
      if (!res.ok) throw new Error('API error')
      const data = await res.json()

      const a: ArchiveRow = data.archive
      setArchive(a)
      setByDecade(buildDecadeMap(data.decades ?? []))

      const conts = (data.contributors ?? []).length
      const recentRows = (data.recentLabels ?? []).map((l: LabelRow) => ({
        id:       l.id,
        title:    l.what_was_happening?.slice(0, 60) || 'Untitled',
        year:     l.year_taken ? String(l.year_taken) : '—',
        location: l.location || '—',
        date:     new Date(l.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }))

      const now = new Date()
      const thisMonthLabels = (data.recentLabels ?? []).filter((l: LabelRow) => {
        const d = new Date(l.created_at)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      }).length

      setRecent(recentRows)
      setStats({ total: a.labelled_photos, streak: a.current_streak, contributors: conts, thisMonth: thisMonthLabels })
    } catch {
      loadFromLocalStorage()
    } finally {
      setLoading(false)
    }
  }

  function loadFromLocalStorage() {
    try {
      const stored: LocalItem[] = JSON.parse(localStorage.getItem('archive-items') || '[]')
      const streak = parseInt(localStorage.getItem('archive-streak') || '0', 10)
      const now = new Date()
      const thisMonth = stored.filter(i => {
        const d = new Date(i.labeledAt)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      }).length
      const contSet = new Set(stored.map(i => i.contributor).filter(Boolean))
      setByDecade(buildDecadeMapFromLocal(stored))
      setStats({ total: stored.length, streak, contributors: contSet.size, thisMonth })
      setRecent(
        [...stored]
          .sort((a, b) => new Date(b.labeledAt).getTime() - new Date(a.labeledAt).getTime())
          .slice(0, 8)
          .map(i => ({
            id:       i.id,
            title:    i.title || i.story?.slice(0, 60) || 'Untitled',
            year:     i.year ? String(i.year) : '—',
            location: i.location || '—',
            date:     new Date(i.labeledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          }))
      )
    } catch {}
    setLoading(false)
  }

  const maxCount = Math.max(...Object.values(byDecade), 1)

  return (
    <div className="max-w-4xl mx-auto">

      <div className="mb-10">
        <p className="eyebrow mb-3">Archive Overview</p>
        {loading ? (
          <Skeleton className="h-8 w-64 mb-1" />
        ) : (
          <h1
            className="font-serif font-semibold leading-[0.95] tracking-[-0.03em]"
            style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', color: '#F0F0EE' }}
          >
            {archive?.name ?? 'The Family Archive'}
          </h1>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          [
            { label: 'Labeled Photos', value: stats.total        },
            { label: 'Current Streak', value: stats.streak       },
            { label: 'Contributors',   value: stats.contributors  },
            { label: 'This Month',     value: stats.thisMonth     },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-sm px-5 py-5 border" style={{ background: '#111112', borderColor: 'rgba(255,255,255,0.06)' }}>
              <p style={{ fontFamily: 'monospace', fontSize: '0.52rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5C6166', marginBottom: '0.5rem' }}>
                {label}
              </p>
              <p className="font-serif font-semibold" style={{ fontSize: '2rem', color: '#F0F0EE', lineHeight: 1 }}>
                {value}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="rounded-sm border p-8 mb-10" style={{ background: '#111112', borderColor: 'rgba(255,255,255,0.06)' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '0.52rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5C6166', marginBottom: '2rem' }}>
          Archive by Decade
        </p>
        {loading ? (
          <div className="flex items-end gap-3 h-36">
            {ALL_DECADES.map(d => <Skeleton key={d} className="flex-1" style={{ height: '40px' }} />)}
          </div>
        ) : (
          <div className="flex items-end gap-3 h-36">
            {ALL_DECADES.map(decade => {
              const count  = byDecade[decade] || 0
              const height = count === 0 ? 4 : Math.max(12, Math.round((count / maxCount) * 120))
              return (
                <div key={decade} className="flex flex-col items-center gap-2 flex-1">
                  <p style={{ fontFamily: 'monospace', fontSize: '0.52rem', color: count > 0 ? 'rgba(196,162,74,0.8)' : '#3A3F44' }}>
                    {count > 0 ? count : ''}
                  </p>
                  <div
                    className="w-full rounded-sm transition-all duration-500"
                    style={{
                      height:    `${height}px`,
                      background: count > 0 ? 'rgba(196,162,74,0.25)' : 'rgba(255,255,255,0.04)',
                      borderTop:  count > 0 ? '1px solid rgba(196,162,74,0.5)' : '1px solid rgba(255,255,255,0.06)',
                    }}
                  />
                  <p style={{ fontFamily: 'monospace', fontSize: '0.48rem', letterSpacing: '0.04em', color: '#3A3F44' }}>{decade}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 rounded-sm border" style={{ background: '#111112', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p style={{ fontFamily: 'monospace', fontSize: '0.52rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5C6166' }}>
              Recent Labels
            </p>
          </div>
          {loading ? (
            <div className="flex flex-col gap-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <Skeleton className="h-3 w-3/4 mb-2" />
                  <Skeleton className="h-2 w-1/3" />
                </div>
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="font-serif font-light" style={{ color: '#3A3F44', fontSize: '0.95rem' }}>
                No items labeled yet.<br />Begin with the first photograph.
              </p>
            </div>
          ) : (
            <ul>
              {recent.map(item => (
                <li key={item.id} className="px-6 py-3 flex items-center justify-between gap-4 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <div className="min-w-0">
                    <p className="font-sans text-[0.78rem] truncate" style={{ color: '#F0F0EE' }}>{item.title}</p>
                    <p className="font-sans text-[0.62rem] mt-0.5" style={{ color: '#5C6166' }}>
                      {item.year} · {item.location}
                    </p>
                  </div>
                  <p style={{ fontFamily: 'monospace', fontSize: '0.52rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#3A3F44', whiteSpace: 'nowrap' }}>
                    {item.date}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {[
            { href: '/archive/label',       label: 'Label a Photo', desc: 'Upload and annotate a memory from the archive.', gold: true  },
            { href: '/archive/gallery',      label: 'View Gallery',  desc: 'Browse labeled memories across all decades.',    gold: false },
            { href: '/archive/contributors', label: 'Contributors',  desc: 'Manage who can add to this archive.',            gold: false },
          ].map(({ href, label, desc, gold }) => (
            <Link
              key={href}
              href={href}
              className="rounded-sm border px-6 py-6 no-underline flex flex-col gap-3 transition-colors duration-200"
              style={{ background: '#111112', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <div className="w-8 h-px" style={{ background: gold ? 'rgba(196,162,74,0.5)' : 'rgba(255,255,255,0.1)' }} />
              <p className="font-serif font-semibold" style={{ color: '#F0F0EE', fontSize: '1.05rem' }}>{label}</p>
              <p className="font-sans text-[0.72rem] leading-relaxed" style={{ color: '#5C6166' }}>{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
