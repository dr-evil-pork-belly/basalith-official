'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { calculateArchiveScore } from '@/lib/archiveScore'
import OnboardingGuide from '@/app/components/OnboardingGuide'
import SuccessionDashboard from './SuccessionDashboard'
import FoundingBanner from '../components/FoundingBanner'
import CoverageMap from '../components/CoverageMap'

// ── Coverage map ────────────────────────────────────────────────────────────
// The entity accuracy card that lived here until September 15, 2026 (a score
// out of 100, ten dimension percentages, "N% accurate across 10 dimensions")
// was a readiness reading derived from deposit counts, presented as accuracy.
// Nothing measured accuracy. It is replaced by the coverage map below, which
// is measured by probing the entity and reading the verifier, leads with
// counts, and carries no score. /api/archive/entity-accuracy still exists for
// the iOS app; nothing on the web reads it now.

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

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://basalith.ai'

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

// ── Family access ───────────────────────────────────────────────────────────
// The four-milestone "Entity Progress" ladder that lived here until September
// 16, 2026 counted photographs, deposits, and voice recordings against fixed
// targets and gated contributor access behind 500 photographs. It is removed:
// the coverage map is the reading of the archive now. What survives is the
// access control itself, shown only while family access is on, so an owner who
// has already opened it can see that and revoke it.

type FamilyAccessData = {
  access:                'none' | 'preview' | 'open'
  previewContributorIds: string[]
}

function FamilyAccessCard() {
  const [data,   setData]   = useState<FamilyAccessData | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/archive/entity-readiness')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData({ access: d.access ?? 'none', previewContributorIds: d.previewContributorIds ?? [] }) })
      .catch(() => {})
  }, [])

  async function revoke() {
    setSaving(true)
    try {
      const res = await fetch('/api/archive/entity-readiness', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable' }),
      })
      if (res.ok) setData({ access: 'none', previewContributorIds: [] })
    } catch {}
    setSaving(false)
  }

  if (!data || data.access === 'none') return null

  return (
    <div className="rounded-sm mb-8" style={{ background: '#111112', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' as const }}>
        <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#5C6166', margin: 0 }}>
          Family access to your entity
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#4CAF50', margin: 0 }}>
            {data.access === 'open' ? 'Open to all' : `${data.previewContributorIds.length} invited`}
          </p>
          <button
            onClick={revoke}
            disabled={saving}
            style={{ fontFamily: 'monospace', fontSize: '0.4rem', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#5C6166', background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', padding: '0.3rem 0.6rem', cursor: 'pointer', borderRadius: '2px' }}
          >
            {saving ? 'Revoking' : 'Revoke'}
          </button>
        </div>
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
  status:           string
  paused_at:        string | null
  tier:             string | null
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

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-sm ${className ?? ''}`}
      style={{ background: 'rgba(255,255,255,0.04)', animation: 'mysteryGlowPulse 1.8s ease-in-out infinite', ...style }}
    />
  )
}

// ── Random Thought Capture ────────────────────────────────────────────────────

function RandomThoughtCapture({ archiveId }: { archiveId: string }) {
  const [open,   setOpen]   = useState(false)
  const [text,   setText]   = useState('')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  async function handleSave() {
    if (!text.trim() || text.length < 5) return
    setSaving(true)
    try {
      await fetch('/api/archive/random-thought', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ thought: text, source: 'random_thought' }),
      })
      setSaved(true)
      setText('')
      setTimeout(() => { setSaved(false); setOpen(false) }, 2000)
    } catch {}
    setSaving(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          width:           '100%',
          background:      'rgba(196,162,74,0.05)',
          border:          '1px dashed rgba(196,162,74,0.25)',
          borderRadius:    '4px',
          padding:         '14px 20px',
          cursor:          'pointer',
          fontFamily:      '"Space Mono","Courier New",monospace',
          fontSize:        '0.42rem',
          letterSpacing:   '0.28em',
          textTransform:   'uppercase' as const,
          color:           'rgba(196,162,74,0.55)',
          textAlign:       'left' as const,
          marginBottom:    '24px',
          display:         'flex',
          alignItems:      'center',
          gap:             '10px',
          transition:      'border-color 200ms, color 200ms',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(196,162,74,0.5)'; (e.currentTarget as HTMLButtonElement).style.color = '#C4A24A' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(196,162,74,0.25)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(196,162,74,0.55)' }}
      >
        <span style={{ fontSize: '1rem', opacity: 0.7 }}>💭</span>
        Something just came to mind? Capture it.
      </button>
    )
  }

  return (
    <div style={{ background: 'rgba(196,162,74,0.05)', border: '1px solid rgba(196,162,74,0.25)', borderRadius: '4px', padding: '20px 24px', marginBottom: '24px' }}>
      <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.42rem', letterSpacing: '0.28em', textTransform: 'uppercase' as const, color: '#C4A24A', marginBottom: '12px' }}>
        Capture This Thought
      </p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Whatever is on your mind. A memory. A thought. Something you want to remember. No minimum. No format."
        autoFocus
        rows={4}
        style={{
          width:       '100%',
          background:  'rgba(196,162,74,0.04)',
          border:      '1px solid rgba(196,162,74,0.18)',
          borderRadius:'2px',
          padding:     '12px 16px',
          fontFamily:  '"Cormorant Garamond",Georgia,serif',
          fontSize:    '1rem',
          color:       '#F0EDE6',
          lineHeight:  1.7,
          resize:      'vertical' as const,
          outline:     'none',
          boxSizing:   'border-box' as const,
        }}
      />
      <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
        <button
          onClick={handleSave}
          disabled={saving || text.length < 5}
          style={{
            background:    saved ? '#4A8A4A' : '#C4A24A',
            color:         '#0A0908',
            border:        'none',
            borderRadius:  '2px',
            padding:       '10px 20px',
            fontFamily:    '"Space Mono","Courier New",monospace',
            fontSize:      '0.42rem',
            letterSpacing: '0.25em',
            textTransform: 'uppercase' as const,
            cursor:        saving ? 'not-allowed' : 'pointer',
            opacity:       text.length < 5 ? 0.5 : 1,
            transition:    'background 200ms',
          }}
        >
          {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save This Thought'}
        </button>
        <button
          onClick={() => { setOpen(false); setText('') }}
          style={{
            background:    'transparent',
            color:         '#706C65',
            border:        '1px solid rgba(240,237,230,0.1)',
            borderRadius:  '2px',
            padding:       '10px 20px',
            fontFamily:    '"Space Mono","Courier New",monospace',
            fontSize:      '0.42rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase' as const,
            cursor:        'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Mirror Card ──────────────────────────────────────────────────────────────
// The entity reflecting back what it is learning. The reflection is the hero.

type MirrorData = {
  id:              string
  reflection:      string
  thread_question: string
  owner_reaction:  string | null
  created_at:      string
}

function MirrorCard({ archiveId }: { archiveId: string }) {
  const [mirror,       setMirror]       = useState<MirrorData | null>(null)
  const [reaction,     setReaction]     = useState<string | null>(null)
  const [respondOpen,  setRespondOpen]  = useState(false)
  const [responseText, setResponseText] = useState('')
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)

  useEffect(() => {
    fetch('/api/archive/mirror')
      .then(r => (r.ok ? r.json() : { mirror: null }))
      .then(d => {
        const m: MirrorData | null = d.mirror ?? null
        if (!m) return
        // Only surface a reflection from the last 10 days.
        if (Date.now() - new Date(m.created_at).getTime() > 10 * 86400000) return
        setMirror(m)
        setReaction(m.owner_reaction ?? null)
      })
      .catch(() => {})
  }, [archiveId])

  if (!mirror) return null

  async function react(value: string) {
    setReaction(value)
    try {
      await fetch('/api/archive/mirror/react', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ reflectionId: mirror!.id, reaction: value }),
      })
    } catch {}
  }

  async function saveResponse() {
    if (responseText.trim().length < 5 || saving) return
    setSaving(true)
    try {
      await fetch('/api/archive/owner-deposit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ prompt: mirror!.thread_question, response: responseText, source_type: 'mirror' }),
      })
      setSaved(true)
      setResponseText('')
      setTimeout(() => { setSaved(false); setRespondOpen(false) }, 2500)
    } catch {}
    setSaving(false)
  }

  const reactionBtnStyle = (active: boolean): React.CSSProperties => ({
    fontFamily:    '"Space Mono","Courier New",monospace',
    fontSize:      '0.42rem',
    letterSpacing: '0.16em',
    textTransform: 'uppercase' as const,
    color:         active ? '#C4A24A' : '#5C6166',
    background:    active ? 'rgba(196,162,74,0.1)' : 'transparent',
    border:        `1px solid ${active ? 'rgba(196,162,74,0.4)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius:  '2px',
    padding:       '0.45rem 0.9rem',
    cursor:        'pointer',
    transition:    'all 0.15s',
  })

  return (
    <div
      className="rounded-sm mb-8"
      style={{
        background: 'rgba(196,162,74,0.04)',
        border:     '1px solid rgba(196,162,74,0.12)',
        borderTop:  '3px solid rgba(196,162,74,0.5)',
        padding:    'clamp(1.5rem,4vw,2.25rem) clamp(1.25rem,4vw,2.5rem)',
      }}
    >
      {/* Eyebrow */}
      <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.44rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.8)', marginBottom: '1.5rem' }}>
        What Your Entity Is Learning
      </p>

      {/* Reflection — the hero */}
      <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(1.3rem,2.8vw,1.7rem)', color: '#F0EDE6', lineHeight: 1.9, whiteSpace: 'pre-wrap', margin: 0 }}>
        {mirror.reflection}
      </p>

      {/* Divider */}
      <div style={{ height: '1px', background: 'rgba(196,162,74,0.18)', margin: '1.85rem 0 1.5rem' }} />

      {/* Thread question */}
      <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontStyle: 'italic', fontWeight: 300, fontSize: '1.1rem', color: '#B8B4AB', lineHeight: 1.65, marginBottom: '1.1rem' }}>
        {mirror.thread_question}
      </p>

      {/* Respond */}
      {saved ? (
        <p style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: '0.92rem', color: 'rgba(196,162,74,0.85)', margin: 0 }}>
          Saved to your archive.
        </p>
      ) : respondOpen ? (
        <div>
          <textarea
            value={responseText}
            onChange={e => setResponseText(e.target.value)}
            placeholder="Answer in your own words. No length required."
            autoFocus
            rows={4}
            style={{
              width:        '100%',
              background:   'rgba(196,162,74,0.04)',
              border:       '1px solid rgba(196,162,74,0.18)',
              borderRadius: '2px',
              padding:      '12px 16px',
              fontFamily:   '"Cormorant Garamond",Georgia,serif',
              fontSize:     '1rem',
              color:        '#F0EDE6',
              lineHeight:   1.7,
              resize:       'vertical' as const,
              outline:      'none',
              boxSizing:    'border-box' as const,
            }}
          />
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
            <button
              onClick={saveResponse}
              disabled={saving || responseText.trim().length < 5}
              style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.44rem', letterSpacing: '0.25em', textTransform: 'uppercase' as const, color: '#0A0908', background: '#C4A24A', border: 'none', borderRadius: '2px', padding: '0.6rem 1.25rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: responseText.trim().length < 5 ? 0.5 : 1 }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => { setRespondOpen(false); setResponseText('') }}
              style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.44rem', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#706C65', background: 'transparent', border: '1px solid rgba(240,237,230,0.1)', borderRadius: '2px', padding: '0.6rem 1.25rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setRespondOpen(true)}
          style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.46rem', letterSpacing: '0.25em', textTransform: 'uppercase' as const, color: '#0A0908', background: '#C4A24A', border: 'none', borderRadius: '2px', padding: '0.65rem 1.4rem', cursor: 'pointer' }}
        >
          Respond →
        </button>
      )}

      {/* Reactions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(196,162,74,0.1)' }}>
        <button onClick={() => react('this_is_me')} style={reactionBtnStyle(reaction === 'this_is_me')}>
          This is me
        </button>
        <button onClick={() => react('not_quite_right')} style={reactionBtnStyle(reaction === 'not_quite_right')}>
          Not quite right
        </button>
        <button
          onClick={() => react('heart')}
          aria-label="Love this"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.3rem', display: 'flex', alignItems: 'center', marginLeft: '0.1rem' }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill={reaction === 'heart' ? '#C4A24A' : 'none'} stroke={reaction === 'heart' ? '#C4A24A' : '#5C6166'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function DashboardClient({ archiveId }: { archiveId: string }) {
  const [loading,              setLoading]              = useState(true)
  const [archive,              setArchive]              = useState<ArchiveRow | null>(null)
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

      const conts = (data.contributors ?? []).length
      setContributorNames((data.contributors ?? []).map((c: { name: string }) => c.name.split(' ')[0]))

      const now = new Date()
      const thisMonthLabels = (data.recentLabels ?? []).filter((l: LabelRow) => {
        const d = new Date(l.created_at)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      }).length

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
      setStats({ total: stored.length, streak, contributors: contSet.size, thisMonth })
    } catch {}
    setLoading(false)
  }

  // Succession archives get a distinct judgment-capture dashboard. This branch
  // only adds a path; the consumer return below is untouched.
  if (!loading && archive?.tier === 'succession') {
    return <SuccessionDashboard archiveId={archiveId} ownerName={archive.owner_name} />
  }

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

      {/* ── FOUNDING SEQUENCE (until complete) ── */}
      {!loading && <FoundingBanner trial={archive?.status === 'trial'} />}

      {/* ── PAUSED ARCHIVE BANNER ── */}
      {!loading && archive?.status === 'paused' && (
        <div style={{
          background:   'rgba(196,162,74,0.06)',
          border:       '1px solid rgba(196,162,74,0.3)',
          borderLeft:   '3px solid #C4A24A',
          borderRadius: '2px',
          padding:      '20px 24px',
          marginBottom: '32px',
        }}>
          <p style={{
            fontFamily:    '"Cormorant Garamond", Georgia, serif',
            fontSize:      '1.1rem',
            fontWeight:    500,
            color:         '#F0EDE6',
            marginBottom:  '8px',
          }}>
            Your archive is paused.
          </p>
          <p style={{
            fontFamily:   '"Cormorant Garamond", Georgia, serif',
            fontSize:      '0.95rem',
            fontWeight:    300,
            fontStyle:     'italic',
            lineHeight:    1.7,
            color:         'rgba(250,250,248,0.55)',
            marginBottom:  '16px',
          }}>
            Your data is safe. Everything you have built is exactly as you left it.
            Resume your archive to continue adding memories and receiving photographs.
          </p>
          <a
            href="/resume"
            style={{
              display:        'inline-block',
              fontFamily:     '"Space Mono","Courier New",monospace',
              fontSize:       '0.44rem',
              letterSpacing:  '0.2em',
              textTransform:  'uppercase',
              color:          '#0A0908',
              background:     '#C4A24A',
              textDecoration: 'none',
              padding:        '10px 20px',
              borderRadius:   '2px',
            }}
          >
            Resume Now →
          </a>
        </div>
      )}

      {/* ── MIRROR (what the entity is learning) ── */}
      {!loading && archive?.status !== 'paused' && (
        <MirrorCard archiveId={archiveId} />
      )}

      {/* ── RANDOM THOUGHT CAPTURE ── */}
      {!loading && archive?.status !== 'paused' && (
        <RandomThoughtCapture archiveId={archiveId} />
      )}

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

      {/* ── COVERAGE MAP ── */}
      <CoverageMap link={{ href: '/archive/entity', label: 'Talk to your entity' }} />

      {/* ── FAMILY ACCESS (only while on) ── */}
      <FamilyAccessCard />

      {/* ── UPCOMING DATES ── */}
      <UpcomingDates archiveId={archiveId} />

      {/* ── MEMORY GAME ── */}
      <MemoryGameCard archiveId={archiveId} />

      {/* ── QUICK LINKS ── */}
      <div className="grid md:grid-cols-2 gap-4">
          {[
            { href: '/archive/label',        label: 'Upload Photos',    desc: 'Upload photographs from your phone or computer.',  gold: true  },
            { href: '/archive/gallery',       label: 'View Gallery',     desc: 'Browse preserved memories across all decades.',    gold: false },
            // Trials cannot invite contributors (skeleton 1.5, decision 5.2).
            // The card that opens the invite form is replaced by one line.
            ...(archive?.status === 'trial'
              ? []
              : [{ href: '/archive/contributors',  label: 'Contributors',     desc: 'Invite family to contribute their memories.',      gold: false }]),
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

          {archive?.status === 'trial' && (
            <div
              className="rounded-sm border px-6 py-6 flex flex-col gap-3"
              style={{ background: '#111112', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <div className="w-8 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <p className="font-serif font-semibold" style={{ color: '#F0F0EE', fontSize: '1.05rem' }}>Contributors</p>
              <p className="font-sans text-[0.72rem] leading-relaxed" style={{ color: '#5C6166' }}>Invite family once your archive is founded.</p>
            </div>
          )}

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
  )
}
