'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { calculateArchiveScore } from '@/lib/archiveScore'

// ── Accuracy types ──────────────────────────────────────────────────────────
type DimensionResult = {
  id:          string
  label:       string
  description: string
  score:       number
}
type AccuracyData = {
  overallScore:       number
  depthLabel:         string
  dimensions:         DimensionResult[]
  improvements:       string[]
  totalDeposits:      number
  totalConversations: number
  totalLabels:        number
}

// ── Accuracy Dashboard component ────────────────────────────────────────────
function AccuracyDashboard({ archiveId }: { archiveId: string }) {
  const [data,     setData]     = useState<AccuracyData | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [animated, setAnimated] = useState(false)

  async function doFetch() {
    setAnimated(false)
    try {
      const r = await fetch(`/api/archive/entity-accuracy?archiveId=${archiveId}`)
      if (r.ok) { const d = await r.json(); setData(d) }
    } catch {}
    setLoading(false)
  }

  async function refresh() {
    setLoading(true)
    await doFetch()
  }

  // Initial load
  useEffect(() => { doFetch() }, [archiveId])

  // Auto-refresh if user visited entity page this session
  useEffect(() => {
    const flag = sessionStorage.getItem('visited-entity')
    if (flag) {
      sessionStorage.removeItem('visited-entity')
      refresh()
    }
  }, [])

  useEffect(() => {
    if (!loading && data) {
      const t = setTimeout(() => setAnimated(true), 100)
      return () => clearTimeout(t)
    }
  }, [loading, data])

  function scoreColor(score: number): string {
    if (score > 80) return 'rgba(196,162,74,1)'
    if (score > 60) return '#F0EDE6'
    if (score > 40) return '#B8B4AB'
    if (score > 20) return '#9DA3A8'
    return '#5C6166'
  }

  return (
    <div
      className="rounded-sm mb-8"
      style={{
        background:  'rgba(196,162,74,0.04)',
        border:      '1px solid rgba(196,162,74,0.12)',
        borderTop:   '3px solid rgba(196,162,74,0.5)',
        padding:     '2rem 2.5rem',
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)', marginBottom: '0.5rem' }}>
            Your Entity
          </p>
          {loading ? (
            <div style={{ height: '64px', width: '120px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', animation: 'mysteryGlowPulse 1.8s ease-in-out infinite' }} />
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="font-serif" style={{ fontWeight: 700, fontSize: '4rem', color: '#F0EDE6', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {data?.overallScore ?? 0}
                </span>
                <span className="font-serif font-light" style={{ fontSize: '1.5rem', color: '#5C6166' }}>/100</span>
              </div>
              <p style={{ fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.8)', marginTop: '0.25rem' }}>
                {data?.depthLabel ?? 'Just beginning'}
              </p>
            </>
          )}
        </div>
        <div className="flex items-center gap-4 shrink-0 mt-1">
          <button
            onClick={refresh}
            style={{ fontFamily: 'monospace', fontSize: '0.38rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5C6166', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            ↻ REFRESH
          </button>
          <Link
            href="/archive/entity"
            className="no-underline group flex items-center gap-1"
            style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.8)' }}
          >
            Talk to your entity
            <span className="transition-transform duration-150 group-hover:translate-x-1 inline-block">→</span>
          </Link>
        </div>
      </div>

      {/* Gold rule */}
      <div style={{ height: '1px', background: 'rgba(196,162,74,0.15)', marginBottom: '1.5rem' }} />

      {/* Ten dimension bars — two column grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4 mb-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div style={{ width: '140px', height: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', animation: 'mysteryGlowPulse 1.8s ease-in-out infinite', animationDelay: `${i * 80}ms` }} />
              <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '3px', animation: 'mysteryGlowPulse 1.8s ease-in-out infinite', animationDelay: `${i * 80}ms` }} />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5 mb-6">
          {data.dimensions.map((dim, i) => (
            <div key={dim.id} className="flex items-center gap-3">
              {/* Label */}
              <div style={{ width: '140px', flexShrink: 0 }}>
                <p className="font-serif" style={{ fontWeight: 700, fontSize: '0.9rem', color: '#F0EDE6', lineHeight: 1.2 }}>
                  {dim.label}
                </p>
                <p className="font-serif font-light" style={{ fontSize: '0.78rem', color: '#5C6166', lineHeight: 1.3 }}>
                  {dim.description}
                </p>
              </div>
              {/* Bar */}
              <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'rgba(240,237,230,0.08)', overflow: 'hidden' }}>
                <div
                  style={{
                    height:     '100%',
                    borderRadius: '3px',
                    background: 'linear-gradient(90deg,rgba(196,162,74,0.6),rgba(196,162,74,1))',
                    width:      animated ? `${dim.score}%` : '0%',
                    transition: `width 0.8s ease-out ${i * 80}ms`,
                  }}
                />
              </div>
              {/* Score */}
              <p style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.06em', color: scoreColor(dim.score), width: '32px', textAlign: 'right', flexShrink: 0 }}>
                {dim.score}%
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Improvements */}
      {!loading && data && data.improvements.length > 0 && (
        <>
          <div style={{ height: '1px', background: 'rgba(196,162,74,0.1)', marginBottom: '1.25rem' }} />
          <p style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#5C6166', marginBottom: '0.75rem' }}>
            What would deepen your entity most
          </p>
          <ul className="flex flex-col gap-2 mb-5">
            {data.improvements.map((text, i) => (
              <li key={i}>
                <Link
                  href="/archive/entity"
                  className="no-underline flex items-start gap-2 group"
                >
                  <span style={{ color: 'rgba(196,162,74,0.5)', flexShrink: 0, fontFamily: 'monospace', fontSize: '0.8rem' }}>→</span>
                  <p className="font-serif italic" style={{ fontSize: '0.9rem', color: '#9DA3A8', lineHeight: 1.5, transition: 'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#E8E4DC')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#9DA3A8')}
                  >
                    {text}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Footer stats */}
      {!loading && data && (
        <p style={{ fontFamily: 'monospace', fontSize: '0.4rem', letterSpacing: '0.1em', color: '#5C6166' }}>
          {data.totalDeposits} deposit{data.totalDeposits !== 1 ? 's' : ''} · {data.totalConversations} conversation{data.totalConversations !== 1 ? 's' : ''} · {data.totalLabels} family memor{data.totalLabels !== 1 ? 'ies' : 'y'}
        </p>
      )}
    </div>
  )
}

// ── Upcoming Dates component ─────────────────────────────────────────────────
type SignificantDate = {
  id:          string
  person_name: string
  date_type:   string
  month:       number
  day:         number
  year:        number | null
}

const MONTH_ABBR = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function daysUntilDate(month: number, day: number): number {
  const today  = new Date()
  today.setHours(0, 0, 0, 0)
  const thisYear = today.getFullYear()
  let target   = new Date(thisYear, month - 1, day)
  if (target.getTime() < today.getTime()) target = new Date(thisYear + 1, month - 1, day)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

function isTodayDate(month: number, day: number): boolean {
  const t = new Date()
  return t.getMonth() + 1 === month && t.getDate() === day
}

function UpcomingDates({ archiveId }: { archiveId: string }) {
  const [dates,   setDates]   = useState<SignificantDate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/archive/dates?archiveId=${archiveId}`)
      .then(r => r.ok ? r.json() : { dates: [] })
      .then(d => setDates(d.dates ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [archiveId])

  if (loading) return null

  const upcoming = [...dates]
    .map(d => ({ ...d, days: daysUntilDate(d.month, d.day), today: isTodayDate(d.month, d.day) }))
    .sort((a, b) => a.days - b.days)
    .slice(0, 3)

  if (upcoming.length === 0) return null

  return (
    <div className="rounded-sm mb-8" style={{ background: '#111112', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '0.52rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5C6166', margin: 0 }}>
          Upcoming Dates
        </p>
        <Link href="/archive/dates" style={{ fontFamily: 'monospace', fontSize: '0.46rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5C6166', textDecoration: 'none' }}>
          Manage →
        </Link>
      </div>
      <div className="flex flex-col">
        {upcoming.map((d, i) => (
          <div
            key={d.id}
            className="flex items-center gap-4 px-6 py-3"
            style={{
              borderBottom: i < upcoming.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              background:   d.today ? 'rgba(196,162,74,0.05)' : 'transparent',
            }}
          >
            <div style={{ minWidth: '42px', textAlign: 'center', flexShrink: 0 }}>
              <p style={{ fontFamily: 'monospace', fontSize: '0.48rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5C6166', margin: '0 0 1px' }}>
                {MONTH_ABBR[d.month]}
              </p>
              <p className="font-serif" style={{ fontWeight: 700, fontSize: '1.4rem', color: d.today ? '#C4A24A' : '#F0EDE6', lineHeight: 1, margin: 0 }}>
                {d.day}
              </p>
            </div>
            <div style={{ flex: 1 }}>
              <p className="font-serif" style={{ fontWeight: 600, fontSize: '0.9rem', color: '#F0EDE6', margin: '0 0 2px' }}>
                {d.person_name}
              </p>
              <p style={{ fontFamily: 'monospace', fontSize: '0.46rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5C6166', margin: 0 }}>
                {d.date_type.replace(/_/g, ' ')}
                {d.year && d.date_type === 'birthday' ? ` · Would be ${new Date().getFullYear() - d.year}` : ''}
              </p>
            </div>
            {d.today ? (
              <span style={{ fontFamily: 'monospace', fontSize: '0.46rem', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'rgba(196,162,74,0.15)', color: '#C4A24A', padding: '3px 8px', borderRadius: '2px', flexShrink: 0 }}>
                TODAY
              </span>
            ) : (
              <p style={{ fontFamily: 'monospace', fontSize: '0.52rem', letterSpacing: '0.08em', color: '#5C6166', margin: 0, flexShrink: 0 }}>
                {d.days}d
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

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
  story_extracted:     string | null
  year_taken:          number | null
  location:            string | null
  labelled_by:         string
  is_primary_label:    boolean
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

type ScoreBreakdown = {
  score: number
  max:   number
  next:  string
  count?: number
  days?:  number
  covered?: number
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

function timeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hrs   = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 2)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24)  return `${hrs}h ago`
  if (days < 7)  return `${days}d ago`
  return new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function DashboardClient({ archiveId }: { archiveId: string }) {
  const [loading,      setLoading]      = useState(true)
  const [archive,      setArchive]      = useState<ArchiveRow | null>(null)
  const [byDecade,     setByDecade]     = useState<Record<string, number>>({})
  const [recent,       setRecent]       = useState<{ id: string; quote: string; contributor: string; year: string; ago: string }[]>([])
  const [stats,        setStats]        = useState({ total: 0, streak: 0, contributors: 0, thisMonth: 0 })
  const [scoreData,    setScoreData]    = useState<{ score: number; label: string; breakdown: Record<string, ScoreBreakdown> } | null>(null) // kept for archive score calculation

  useEffect(() => { fetchFromDB() }, [archiveId])

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
        id:          l.id,
        quote:       (l.what_was_happening || l.story_extracted || '').slice(0, 80),
        contributor: l.labelled_by || 'Unknown',
        year:        l.year_taken ? String(l.year_taken) : '—',
        ago:         timeAgo(l.created_at),
      }))

      const now = new Date()
      const thisMonthLabels = (data.recentLabels ?? []).filter((l: LabelRow) => {
        const d = new Date(l.created_at)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      }).length

      setRecent(recentRows)
      setStats({ total: a.labelled_photos, streak: a.current_streak, contributors: conts, thisMonth: thisMonthLabels })

      // Calculate archive score
      const result = calculateArchiveScore(
        a,
        data.photographs   ?? [],
        data.recentLabels  ?? [],
        data.contributors  ?? [],
        data.decades       ?? [],
        data.ownerDeposits ?? [],
      )
      setScoreData(result as { score: number; label: string; breakdown: Record<string, ScoreBreakdown> })

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
      const now    = new Date()
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
            id:          i.id,
            quote:       (i.title || i.story || '').slice(0, 80),
            contributor: i.contributor || 'You',
            year:        i.year ? String(i.year) : '—',
            ago:         timeAgo(i.labeledAt),
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

      {/* ── ENTITY ACCURACY DASHBOARD ── */}
      <AccuracyDashboard archiveId={archiveId} />

      {/* ── UPCOMING DATES ── */}
      <UpcomingDates archiveId={archiveId} />

      {/* ── STAT CARDS ── */}
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

      {/* ── DECADE CHART ── */}
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

      {/* ── RECENT FAMILY MEMORIES + QUICK LINKS ── */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 rounded-sm border" style={{ background: '#111112', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p style={{ fontFamily: 'monospace', fontSize: '0.52rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5C6166' }}>
              Recent Family Memories
            </p>
          </div>
          {loading ? (
            <div className="flex flex-col gap-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <Skeleton className="h-3 w-3/4 mb-2" />
                  <Skeleton className="h-2 w-1/3" />
                </div>
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="font-serif font-light" style={{ color: '#3A3F44', fontSize: '0.95rem' }}>
                No memories added yet.<br />Begin with the first photograph.
              </p>
            </div>
          ) : (
            <ul>
              {recent.map(item => (
                <li key={item.id} className="px-6 py-4 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  {item.quote && (
                    <p className="font-serif italic text-[0.85rem] mb-1" style={{ color: '#B8B4AB', lineHeight: 1.6 }}>
                      &ldquo;{item.quote}{item.quote.length >= 80 ? '…' : ''}&rdquo;
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <p style={{ fontFamily: 'monospace', fontSize: '0.46rem', letterSpacing: '0.08em', color: '#C4A24A' }}>
                      {item.contributor}{item.year !== '—' ? ' · ' + item.year : ''}
                    </p>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.06em', color: '#3A3F44', whiteSpace: 'nowrap' }}>
                      {item.ago}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {[
            { href: '/archive/label',        label: 'Label a Photo',    desc: 'Upload and annotate a memory from the archive.',  gold: true  },
            { href: '/archive/gallery',       label: 'View Gallery',     desc: 'Browse labeled memories across all decades.',     gold: false },
            { href: '/archive/contributors',  label: 'Contributors',     desc: 'Manage who can add to this archive.',             gold: false },
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
