'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { calculateArchiveScore } from '@/lib/archiveScore'
import OnboardingGuide from '@/app/components/OnboardingGuide'
import TrainingDataCard from './TrainingDataCard'

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
        padding:     'clamp(1.25rem,4vw,2rem) clamp(1rem,4vw,2.5rem)',
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
              <div style={{ width: 'clamp(90px,28%,140px)', flexShrink: 0 }}>
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
        <>
          <p style={{ fontFamily: 'monospace', fontSize: '0.4rem', letterSpacing: '0.1em', color: '#5C6166' }}>
            {data.totalDeposits} deposit{data.totalDeposits !== 1 ? 's' : ''} · {data.totalConversations} conversation{data.totalConversations !== 1 ? 's' : ''} · {data.totalLabels} family memor{data.totalLabels !== 1 ? 'ies' : 'y'}
          </p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', fontStyle: 'italic', color: '#706C65', marginTop: '0.75rem' }}>
            Your entity is {data.overallScore}% accurate across 10 dimensions of your life.{' '}
            {data.overallScore >= 80 ? 'Speaking with authority.' :
             data.overallScore >= 60 ? 'Speaking with depth.' :
             data.overallScore >= 40 ? 'Taking shape.' :
             data.overallScore >= 20 ? 'Still learning.' :
             'Just beginning.'}
          </p>
        </>
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

// ── Memory Game Card component ───────────────────────────────────────────────

type GameSession = {
  id:            string
  closesAt:      string
  totalMemories: number
  photoCount:    number
}
type GameLeaderRow = { name: string; count: number }

function MemoryGameCard({ archiveId }: { archiveId: string }) {
  const [session,     setSession]     = useState<GameSession | null>(null)
  const [leaderboard, setLeaderboard] = useState<GameLeaderRow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [copied,      setCopied]      = useState(false)

  useEffect(() => {
    fetch(`/api/game/active?archiveId=${archiveId}`)
      .then(r => r.ok ? r.json() : { session: null })
      .then(data => {
        setSession(data.session ?? null)
        setLeaderboard(data.leaderboard ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [archiveId])

  if (loading) return null

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://basalith.xyz'

  function handleCopyLink() {
    if (!session) return
    navigator.clipboard.writeText(`${siteUrl}/game/${session.id}`)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
      .catch(() => {})
  }

  function hoursLeft(closesAt: string): string {
    const diff = new Date(closesAt).getTime() - Date.now()
    if (diff <= 0) return '0h'
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  if (!session) {
    return (
      <div className="rounded-sm mb-8" style={{ background: '#111112', border: '1px solid rgba(255,255,255,0.06)', padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18M9 21V9"/>
          </svg>
          <p style={{ fontFamily: 'monospace', fontSize: '0.48rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3A3F44', margin: 0 }}>
            Memory Game · Next game: Wednesday
          </p>
        </div>
      </div>
    )
  }

  const maxCount = leaderboard[0]?.count ?? 1

  return (
    <div className="rounded-sm mb-8" style={{ background: '#111112', border: '1px solid rgba(196,162,74,0.15)', borderTop: '2px solid rgba(196,162,74,0.4)' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(196,162,74,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C4A24A', margin: 0 }}>
            Memory Game · Live
          </p>
        </div>
        <p style={{ fontFamily: 'monospace', fontSize: '0.48rem', letterSpacing: '0.1em', color: 'rgba(196,162,74,0.5)', margin: 0 }}>
          Closes in {hoursLeft(session.closesAt)}
        </p>
      </div>

      <div style={{ padding: '1rem 1.5rem' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '0.48rem', letterSpacing: '0.1em', color: '#5C6166', margin: '0 0 0.75rem' }}>
          {session.totalMemories} {session.totalMemories === 1 ? 'memory' : 'memories'} contributed so far
        </p>

        {leaderboard.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            {leaderboard.slice(0, 3).map((row, i) => {
              const barWidth = Math.round((row.count / maxCount) * 100)
              return (
                <div key={row.name} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.46rem', color: '#3A3F44', width: '14px', flexShrink: 0 }}>#{i + 1}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.52rem', color: i === 0 ? '#C4A24A' : '#9DA3A8', minWidth: '80px', flexShrink: 0 }}>{row.name}</span>
                  <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${barWidth}%`, background: i === 0 ? 'rgba(196,162,74,0.5)' : 'rgba(240,237,230,0.12)', borderRadius: '2px' }} />
                  </div>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.48rem', color: '#5C6166', flexShrink: 0 }}>{row.count}</span>
                </div>
              )
            })}
          </div>
        )}

        {leaderboard.length === 0 && (
          <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.85rem', color: '#3A3F44', marginBottom: '1rem' }}>
            No memories yet. Share the link to start.
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleCopyLink}
            style={{ fontFamily: 'monospace', fontSize: '0.52rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: copied ? '#4CAF50' : '#C4A24A', background: 'transparent', border: `1px solid ${copied ? 'rgba(76,175,80,0.3)' : 'rgba(196,162,74,0.3)'}`, padding: '0.5rem 1rem', cursor: 'pointer', borderRadius: '2px', transition: 'all 0.15s' }}
          >
            {copied ? '✓ Copied' : 'Share Game Link →'}
          </button>
          <a
            href={`/game/${session.id}/leaderboard`}
            style={{ fontFamily: 'monospace', fontSize: '0.52rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5C6166', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.06)', padding: '0.5rem 1rem', borderRadius: '2px' }}
          >
            View Leaderboard →
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Entity Readiness Card ─────────────────────────────────────────────────────

type ReadinessData = {
  ready:    boolean
  score:    number
  breakdown: {
    photographs: number
    deposits: number
    accuracyAvg: number
    voiceRecordings: number
    wisdomSessions: number
  }
  missing:  string[]
  access:   'none' | 'preview' | 'open'
  previewContributorIds: string[]
  contributors: { id: string; name: string; email: string }[]
}

type MilestoneRow = {
  id:       number
  label:    string
  complete: boolean
  criteria: Record<string, number>
}

function getMilestones(b: ReadinessData['breakdown']): MilestoneRow[] {
  return [
    { id: 1, label: 'Foundations',              complete: b.photographs >= 10  && b.deposits >= 5,                                           criteria: { photographs: 10,  deposits: 5 } },
    { id: 2, label: 'Taking Shape',             complete: b.photographs >= 100 && b.deposits >= 25 && b.voiceRecordings >= 1,                criteria: { photographs: 100, deposits: 25, voiceRecordings: 1  } },
    { id: 3, label: 'Recognizable',             complete: b.photographs >= 250 && b.deposits >= 50 && b.wisdomSessions >= 5,                 criteria: { photographs: 250, deposits: 50, wisdomSessions: 5   } },
    { id: 4, label: 'Ready to Meet Your Family', complete: b.photographs >= 500 && b.deposits >= 100 && b.voiceRecordings >= 10 && b.accuracyAvg >= 50, criteria: { photographs: 500, deposits: 100, voiceRecordings: 10, accuracyAvg: 50 } },
  ]
}

const CRITERIA_LABELS: Record<string, string> = {
  photographs:     'photographs processed',
  deposits:        'deposits completed',
  voiceRecordings: 'voice recordings',
  wisdomSessions:  'wisdom sessions completed',
  accuracyAvg:     '% entity accuracy',
}

const CRITERIA_LINKS: Record<string, string> = {
  photographs:     '/archive/upload',
  deposits:        '/archive/entity',
  voiceRecordings: '/archive/voice',
  wisdomSessions:  '/archive/wisdom',
  accuracyAvg:     '/archive/entity',
}

function MilestoneItem({
  milestone, status, breakdown,
}: {
  milestone: MilestoneRow
  status: 'complete' | 'current' | 'locked'
  breakdown: ReadinessData['breakdown']
}) {
  const icon = status === 'complete' ? '✓' : status === 'current' ? '◐' : '○'
  const iconColor = status === 'complete' ? '#C4A24A' : status === 'current' ? '#9DA3A8' : '#3A3F44'
  const labelColor = status === 'complete' ? '#C4A24A' : status === 'current' ? '#F0EDE6' : '#3A3F44'

  return (
    <div style={{ display: 'flex', gap: '0.9rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.04)', marginBottom: '0.75rem' }}>
      <span style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: iconColor, flexShrink: 0, lineHeight: 1.4 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: 'monospace', fontSize: '0.48rem', letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: labelColor, margin: '0 0 0.35rem' }}>
          Milestone {milestone.id} — {milestone.label}
        </p>
        {status === 'complete' && (
          <p style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: '0.82rem', color: 'rgba(196,162,74,0.6)', margin: 0 }}>Complete</p>
        )}
        {status === 'current' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {Object.entries(milestone.criteria).map(([key, target]) => {
              const current = breakdown[key as keyof typeof breakdown] ?? 0
              const done    = current >= target
              const label   = CRITERIA_LABELS[key] ?? key
              const href    = CRITERIA_LINKS[key]
              const text    = done
                ? `✓ ${current} of ${target} ${label}`
                : `${current} of ${target} ${label}`
              return (
                <a
                  key={key}
                  href={done ? undefined : href}
                  style={{
                    fontFamily:     'Georgia,serif',
                    fontStyle:      'italic',
                    fontSize:       '0.82rem',
                    color:          done ? 'rgba(196,162,74,0.5)' : '#9DA3A8',
                    textDecoration: 'none',
                    display:        'block',
                  }}
                >
                  {text}
                </a>
              )
            })}
          </div>
        )}
        {status === 'locked' && (
          <p style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: '0.82rem', color: '#3A3F44', margin: 0 }}>
            Unlocks after Milestone {milestone.id - 1}
          </p>
        )}
      </div>
    </div>
  )
}

function EntityReadinessCard({ archiveId }: { archiveId: string }) {
  const [data,        setData]        = useState<ReadinessData | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [saving,      setSaving]      = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    fetch(`/api/archive/entity-readiness?archiveId=${archiveId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [archiveId])

  async function setAccess(action: 'enable_preview' | 'enable_open' | 'disable', ids?: string[]) {
    setSaving(true)
    try {
      const res = await fetch('/api/archive/entity-readiness', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, contributorIds: ids }),
      })
      const updated = await res.json()
      if (res.ok && data) {
        setData({ ...data, access: updated.access, previewContributorIds: ids ?? [] })
      }
    } catch {}
    setSaving(false)
    setShowModal(false)
    setShowConfirm(false)
  }

  if (loading || !data) return null

  const { ready, access, contributors } = data
  const bd = data.breakdown
  const milestones = getMilestones(bd)
  const allComplete = milestones.every(m => m.complete)
  const currentIdx  = milestones.findIndex(m => !m.complete)

  // Contextual guidance based on current milestone
  function guidanceText(): string | null {
    if (allComplete && access === 'none') return null // replaced by activation prompt below
    if (currentIdx === 2) { // working toward M3
      return 'Upload more photographs from your phone. Every decade of your life makes the entity more accurate.\n\nCall 1‑888‑688‑9168 and share a memory. Voice recordings teach the entity how you speak — not just what you say.'
    }
    if (currentIdx === 3) { // working toward M4
      return 'You are close.\n\nSchedule your next wisdom session. The questions are designed to reveal how you think under pressure. Your entity needs to hear you reason through difficult things.'
    }
    return null
  }

  const guidance = guidanceText()

  return (
    <>
      <div
        className="rounded-sm mb-8"
        style={{
          background: '#111112',
          border:     allComplete ? '1px solid rgba(196,162,74,0.3)' : '1px solid rgba(255,255,255,0.06)',
          borderTop:  allComplete ? '3px solid rgba(196,162,74,0.7)' : '3px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: allComplete ? '#C4A24A' : '#5C6166', margin: 0 }}>
            Entity Progress
          </p>
          {access !== 'none' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <p style={{ fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#4CAF50', margin: 0 }}>
                {access === 'open' ? 'Open to all' : `${data.previewContributorIds.length} invited`}
              </p>
              <button
                onClick={() => setAccess('disable')}
                disabled={saving}
                style={{ fontFamily: 'monospace', fontSize: '0.4rem', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#5C6166', background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', padding: '0.3rem 0.6rem', cursor: 'pointer', borderRadius: '2px' }}
              >
                Revoke
              </button>
            </div>
          )}
        </div>

        <div style={{ padding: '1.25rem 1.5rem' }}>
          {/* Milestone list */}
          {milestones.map((m, i) => {
            const status: 'complete' | 'current' | 'locked' =
              m.complete               ? 'complete' :
              i === currentIdx         ? 'current'  :
              'locked'
            return (
              <MilestoneItem
                key={m.id}
                milestone={m}
                status={status}
                breakdown={bd}
              />
            )
          })}

          {/* Contextual guidance */}
          {guidance && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '2px', padding: '1rem', margin: '0.5rem 0 1rem' }}>
              {guidance.split('\n\n').map((para, i) => (
                <p key={i} style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: '0.88rem', color: '#706C65', lineHeight: 1.75, margin: i > 0 ? '0.75rem 0 0' : 0 }}>
                  {para}
                </p>
              ))}
            </div>
          )}

          {/* Activation prompt — M4 complete, not yet activated */}
          {allComplete && access === 'none' && (
            <>
              <div style={{ borderTop: '1px solid rgba(196,162,74,0.15)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#C4A24A', marginBottom: '1rem' }}>
                  Your Entity Is Ready to Meet Your Family.
                </p>
                <p style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: '0.9rem', color: '#9DA3A8', lineHeight: 1.75, marginBottom: '0.5rem' }}>
                  You have built something worth sharing.
                </p>
                <p style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: '0.9rem', color: '#9DA3A8', lineHeight: 1.75, marginBottom: '0.5rem' }}>
                  When you are ready you can invite your family to talk to your entity.
                </p>
                <p style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: '0.9rem', color: '#706C65', lineHeight: 1.75, marginBottom: '1.25rem' }}>
                  We recommend talking to it yourself first. Make sure it sounds like you.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' as const }}>
                  <button
                    onClick={() => { setSelectedIds([]); setShowModal(true) }}
                    style={{ fontFamily: 'monospace', fontSize: '0.48rem', letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#0A0908', background: '#C4A24A', border: 'none', padding: '0.6rem 1.25rem', cursor: 'pointer', borderRadius: '2px' }}
                  >
                    Activate Contributor Access
                  </button>
                  <a
                    href="/archive/entity"
                    style={{ fontFamily: 'monospace', fontSize: '0.48rem', letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#C4A24A', background: 'transparent', border: '1px solid rgba(196,162,74,0.3)', padding: '0.6rem 1.25rem', borderRadius: '2px', textDecoration: 'none', display: 'inline-block' }}
                  >
                    Talk to It First →
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Contributor selector modal */}
      {showModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div style={{ background: '#0F0F10', border: '1px solid rgba(196,162,74,0.2)', borderRadius: '4px', padding: '1.75rem', width: '100%', maxWidth: '480px' }}>
            <p style={{ fontFamily: 'monospace', fontSize: '0.52rem', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#C4A24A', marginBottom: '0.75rem' }}>
              Activate Contributor Access
            </p>
            <p style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: '0.9rem', color: '#9DA3A8', lineHeight: 1.7, marginBottom: '1.25rem' }}>
              Select which contributors can talk to your entity. They will receive an invitation email. You can also open it to everyone.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {contributors.map(c => (
                <label
                  key={c.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem 0.75rem', border: `1px solid ${selectedIds.includes(c.id) ? 'rgba(196,162,74,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '2px' }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(c.id)}
                    onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, c.id] : prev.filter(id => id !== c.id))}
                    style={{ accentColor: '#C4A24A', width: '14px', height: '14px', flexShrink: 0 }}
                  />
                  <div>
                    <p style={{ fontFamily: 'Georgia,serif', fontSize: '0.9rem', color: '#F0EDE6', margin: 0 }}>{c.name}</p>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.08em', color: '#5C6166', margin: 0 }}>{c.email}</p>
                  </div>
                </label>
              ))}
              {contributors.length === 0 && (
                <p style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: '0.9rem', color: '#5C6166' }}>No active contributors found.</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' as const, justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => setShowConfirm(true)}
                style={{ fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#706C65', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Open to all instead
              </button>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button onClick={() => setShowModal(false)} style={{ fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#5C6166', background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', padding: '0.5rem 1rem', cursor: 'pointer', borderRadius: '2px' }}>
                  Cancel
                </button>
                <button
                  onClick={() => setAccess('enable_preview', selectedIds)}
                  disabled={saving || selectedIds.length === 0}
                  style={{ fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#0A0908', background: saving || selectedIds.length === 0 ? 'rgba(196,162,74,0.4)' : '#C4A24A', border: 'none', padding: '0.5rem 1rem', cursor: saving || selectedIds.length === 0 ? 'not-allowed' : 'pointer', borderRadius: '2px' }}
                >
                  {saving ? 'Sending…' : `Invite ${selectedIds.length > 0 ? selectedIds.length : ''} Contributor${selectedIds.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Open-to-all confirmation */}
      {showConfirm && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowConfirm(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div style={{ background: '#0F0F10', border: '1px solid rgba(196,162,74,0.2)', borderRadius: '4px', padding: '1.75rem', width: '100%', maxWidth: '420px' }}>
            <p style={{ fontFamily: 'monospace', fontSize: '0.52rem', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#C4A24A', marginBottom: '1rem' }}>Are you sure?</p>
            <p style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: '0.9rem', color: '#9DA3A8', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              Your contributors will be able to talk to your entity. You can revoke this at any time.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowConfirm(false)} style={{ fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#5C6166', background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', padding: '0.5rem 1rem', cursor: 'pointer', borderRadius: '2px' }}>Cancel</button>
              <button onClick={() => setAccess('enable_open')} disabled={saving} style={{ fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#0A0908', background: saving ? 'rgba(196,162,74,0.4)' : '#C4A24A', border: 'none', padding: '0.5rem 1rem', cursor: saving ? 'not-allowed' : 'pointer', borderRadius: '2px' }}>
                {saving ? 'Enabling…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── WeChat Connect Card ──────────────────────────────────────────────────────

function WeChatConnectCard({ archiveId }: { archiveId: string }) {
  const [code,    setCode]    = useState<string | null>(null)
  const [linked,  setLinked]  = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied,  setCopied]  = useState(false)

  useEffect(() => {
    fetch(`/api/archive/wechat-link?archiveId=${archiveId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setCode(d.code); setLinked(d.linked) } })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [archiveId])

  function handleCopy() {
    if (!code) return
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  if (loading || !code) return null

  return (
    <div
      className="rounded-sm mb-8"
      style={{
        background: '#111112',
        border:     linked ? '1px solid rgba(196,162,74,0.2)' : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.04)' }}
      >
        <div className="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={linked ? 'rgba(196,162,74,0.8)' : 'rgba(255,255,255,0.2)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: linked ? '#C4A24A' : '#5C6166', margin: 0 }}>
            WeChat
          </p>
        </div>
        {linked && (
          <span style={{ fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4CAF50' }}>
            Connected
          </span>
        )}
      </div>

      <div style={{ padding: '1.25rem 1.5rem' }}>
        {linked ? (
          <p style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: '0.88rem', color: '#706C65', lineHeight: 1.75, margin: 0 }}>
            Your WeChat is connected. Send a voice message or text to deposit memories directly from WeChat.
          </p>
        ) : (
          <>
            <p style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: '0.88rem', color: '#9DA3A8', lineHeight: 1.75, marginBottom: '1rem' }}>
              Follow the Basalith Official Account on WeChat, then send this code to link your archive.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <div style={{ background: 'rgba(196,162,74,0.06)', border: '1px solid rgba(196,162,74,0.2)', borderRadius: '2px', padding: '0.5rem 1.25rem' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '1.5rem', letterSpacing: '0.3em', color: '#C4A24A', fontWeight: 700 }}>
                  {code}
                </span>
              </div>
              <button
                onClick={handleCopy}
                style={{ fontFamily: 'monospace', fontSize: '0.48rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: copied ? '#4CAF50' : '#5C6166', background: 'transparent', border: `1px solid ${copied ? 'rgba(76,175,80,0.3)' : 'rgba(255,255,255,0.08)'}`, padding: '0.5rem 0.9rem', cursor: 'pointer', borderRadius: '2px', transition: 'all 0.15s' }}
              >
                {copied ? '✓ Copied' : 'Copy Code'}
              </button>
            </div>
            <p style={{ fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.08em', color: '#3A3F44', marginTop: '0.75rem' }}>
              Open WeChat, follow Basalith, and send: {code}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ── ArchiveRow ───────────────────────────────────────────────────────────────

type ArchiveRow = {
  name:             string
  owner_name:       string | null
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
  const [loading,              setLoading]              = useState(true)
  const [archive,              setArchive]              = useState<ArchiveRow | null>(null)
  const [byDecade,             setByDecade]             = useState<Record<string, number>>({})
  const [recent,               setRecent]               = useState<{ id: string; quote: string; contributor: string; year: string; ago: string }[]>([])
  const [stats,                setStats]                = useState({ total: 0, streak: 0, contributors: 0, thisMonth: 0 })
  const [entityConversations,  setEntityConversations]  = useState(0)
  const [significantDates,     setSignificantDates]     = useState(0)
  const [contributorNames,     setContributorNames]     = useState<string[]>([])
  const [scoreData,            setScoreData]            = useState<{ score: number; label: string; breakdown: Record<string, ScoreBreakdown> } | null>(null)

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
      setContributorNames((data.contributors ?? []).map((c: { name: string }) => c.name.split(' ')[0]))

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
      setEntityConversations(data.entityConversations ?? 0)
      setSignificantDates(data.significantDates ?? 0)

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
        {loading ? (
          <>
            <Skeleton className="h-8 w-56 mb-3" />
            <Skeleton className="h-4 w-80" />
          </>
        ) : (
          <>
            <h1
              style={{
                fontFamily:    '"Cormorant Garamond",Georgia,serif',
                fontSize:      'clamp(1.8rem,3.5vw,2.75rem)',
                fontWeight:    300,
                lineHeight:    1.1,
                letterSpacing: '-0.025em',
                color:         '#F0EDE6',
                marginBottom:  '10px',
              }}
            >
              {(() => {
                const hour      = new Date().getHours()
                const firstName = archive?.owner_name?.split(' ')[0] ?? null
                const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
                return firstName ? `${greeting}, ${firstName}.` : `${greeting}.`
              })()}
            </h1>
            <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.48rem', letterSpacing: '0.12em', color: 'rgba(112,108,101,0.6)' }}>
              {(() => {
                const n = archive?.total_photos ?? 0
                if (n === 0)       return 'Your archive is ready for its first photographs.'
                if (n <= 10)       return `Your archive is growing. ${n} photograph${n !== 1 ? 's' : ''} preserved so far.`
                if (n <= 50)       return `Your archive is taking shape. ${n} photographs preserved.`
                return `A meaningful archive. ${n} photographs and counting.`
              })()}
            </p>
          </>
        )}
      </div>

      {/* ── ONBOARDING GUIDE (first-time users) ── */}
      {!loading && (
        <OnboardingGuide
          archiveId={archiveId}
          photoCount={archive?.total_photos ?? stats.total}
          contributorCount={stats.contributors}
          entityConversations={entityConversations}
          significantDates={significantDates}
        />
      )}

      {/* ── ENTITY ACCURACY DASHBOARD ── */}
      <AccuracyDashboard archiveId={archiveId} />

      {/* ── ENTITY READINESS + ACCESS ── */}
      <EntityReadinessCard archiveId={archiveId} />

      {/* ── TRAINING DATA ── */}
      <TrainingDataCard />

      {/* ── UPCOMING DATES ── */}
      <UpcomingDates archiveId={archiveId} />

      {/* ── MEMORY GAME ── */}
      <MemoryGameCard archiveId={archiveId} />

      {/* ── WECHAT CONNECT ── */}
      <WeChatConnectCard archiveId={archiveId} />

      {/* ── STAT CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px', marginBottom: '40px' }} className="md:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: '96px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', animation: 'mysteryGlowPulse 1.8s ease-in-out infinite', animationDelay: `${i * 100}ms` }} />
          ))
        ) : (
          [
            { label: 'Photos Archived',   value: archive?.total_photos ?? stats.total },
            { label: 'Contributors',      value: stats.contributors },
            { label: 'Days Active',       value: Math.max(1, Math.ceil((Date.now() - new Date(archive?.last_label_date ?? Date.now()).getTime()) / 86400000)) },
            { label: 'Labels This Month', value: stats.thisMonth },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                background:  '#141210',
                border:      '1px solid rgba(196,162,74,0.08)',
                borderTop:   '2px solid rgba(196,162,74,0.3)',
                padding:     '20px 24px 18px',
              }}
            >
              <p
                style={{
                  fontFamily:    '"Cormorant Garamond",Georgia,serif',
                  fontSize:      'clamp(2rem,4vw,2.75rem)',
                  fontWeight:    300,
                  color:         '#C4A24A',
                  lineHeight:    1,
                  marginBottom:  '8px',
                  letterSpacing: '-0.02em',
                }}
              >
                {value}
              </p>
              <p
                style={{
                  fontFamily:    '"Space Mono","Courier New",monospace',
                  fontSize:      '0.44rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase' as const,
                  color:         'rgba(112,108,101,0.6)',
                }}
              >
                {label}
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
              <p className="font-serif" style={{ color: '#5C6166', fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Your archive is empty.
              </p>
              <p className="font-serif italic" style={{ color: '#3A3F44', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                Upload your family photographs to begin. Your family will receive one photograph by email every evening and can reply with their memories.
              </p>
              <Link href="/archive/label" className="no-underline" style={{ fontFamily: 'monospace', fontSize: '0.46rem', letterSpacing: '0.2em', color: '#C4A24A' }}>
                UPLOAD YOUR FIRST PHOTOS →
              </Link>
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
            { href: '/archive/label',        label: 'Upload Photos',    desc: 'Upload photographs from your phone or computer.',  gold: true  },
            { href: '/archive/gallery',       label: 'View Gallery',     desc: 'Browse preserved memories across all decades.',    gold: false },
            { href: '/archive/contributors',  label: 'Contributors',     desc: 'Invite family to contribute their memories.',      gold: false },
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

          {/* Next email time */}
          {!loading && (
            <div className="rounded-sm border px-5 py-4" style={{ background: '#111112', borderColor: 'rgba(255,255,255,0.04)' }}>
              <p style={{ fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.1em', color: '#3A3F44', marginBottom: '0.25rem' }}>
                NEXT PHOTOGRAPH EMAIL
              </p>
              <p style={{ fontFamily: 'monospace', fontSize: '0.52rem', letterSpacing: '0.1em', color: '#5C6166' }}>
                {(() => {
                  const now  = new Date()
                  const utcH = now.getUTCHours()
                  return utcH < 21 ? 'Tonight at 9pm' : 'Tomorrow at 9pm'
                })()}
              </p>
              {stats.contributors > 0 && (
                <p style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.08em', color: '#3A3F44', marginTop: '0.35rem' }}>
                  {stats.contributors} family member{stats.contributors !== 1 ? 's' : ''} receiving photos
                </p>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
