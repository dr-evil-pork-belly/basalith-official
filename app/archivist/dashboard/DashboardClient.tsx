'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const SPRINT_TIERS = [
  { threshold: 5,  bonus: '$500'   },
  { threshold: 10, bonus: '$1,500' },
  { threshold: 20, bonus: '$4,000' },
]

const STATUS_COLOR: Record<string, string> = {
  New:       '#5C6166',
  Contacted: '#9DA3A8',
  Demo:      '#C4A24A',
  Proposal:  '#FFB347',
  Closed:    '#4CAF50',
  Lost:      '#444',
}

type ArchivistRow = {
  id:                    string
  name:                  string
  rank:                  string
  total_closings:        number
  this_month_closings:   number
  sprint_closings:       number
  residual_income_cents: number
}

type TodayAction = {
  id:          string
  name:        string
  status:      string
  next_action: string
  tier:        string
}

type LeaderRow = {
  id:                    string
  name:                  string
  rank:                  string
  this_month_closings:   number
  total_closings:        number
  top_tier:              string
  residual_income_cents: number
}

type Commission = {
  id:           string
  created_at:   string
  type:         string
  amount_cents: number
  status:       string
  description:  string
}

function fmt(cents: number) {
  return '$' + Math.round(cents / 100).toLocaleString('en-US')
}

// ── Cron test panel ───────────────────────────────────────────────────────────

const CRON_JOBS = [
  { label: 'Send Daily Photos',          route: '/api/cron/send-photos'            },
  { label: 'Send Weekly Prompt',         route: '/api/cron/weekly-prompt'          },
  { label: 'Send Monday Mystery',        route: '/api/cron/story-prompt-monday'    },
  { label: 'Send Friday Reveal',         route: '/api/cron/story-prompt-friday'    },
  { label: 'Send Monthly Report',        route: '/api/cron/monthly-report'         },
  { label: 'Send Gratitude Note',        route: '/api/cron/gratitude-note'         },
  { label: 'Send Memory Game Start',     route: '/api/cron/memory-game-start'      },
  { label: 'Send Memory Game Reminder',  route: '/api/cron/memory-game-reminder'   },
  { label: 'Send Memory Game Summary',          route: '/api/cron/memory-game-summary'  },
  { label: 'Refresh Contributor Questions',      route: '/api/cron/weekly-prompt'        },
] as const

type CronState = 'idle' | 'running' | 'ok' | 'error'

function SystemTestsPanel() {
  const [states,   setStates]   = useState<Record<string, CronState>>({})
  const [messages, setMessages] = useState<Record<string, string>>({})

  const run = useCallback(async (route: string) => {
    setStates(s  => ({ ...s, [route]: 'running' }))
    setMessages(m => ({ ...m, [route]: '' }))
    try {
      const res  = await fetch('/api/admin/test-cron', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ cronRoute: route }),
      })
      const envelope = await res.json()
      const isErr = !res.ok || !!envelope.error
      setStates(s  => ({ ...s, [route]: isErr ? 'error' : 'ok' }))
      setMessages(m => ({ ...m, [route]: JSON.stringify(envelope, null, 2) }))
    } catch (err: any) {
      setStates(s  => ({ ...s, [route]: 'error' }))
      setMessages(m => ({ ...m, [route]: JSON.stringify({ fetchError: err.message }) }))
    }
  }, [])

  return (
    <div className="rounded-sm border mb-8" style={{ background: '#111112', borderColor: 'rgba(196,162,74,0.18)' }}>
      <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(196,162,74,0.12)' }}>
        <p className="font-sans text-[0.6rem] font-bold tracking-[0.22em] uppercase" style={{ color: 'rgba(196,162,74,0.7)' }}>
          System Tests
        </p>
        <p className="font-sans text-[0.65rem] mt-0.5" style={{ color: '#3A3F44' }}>
          Each call runs with ?test=true — bypasses day/date guards
        </p>
      </div>
      <div className="p-6 flex flex-col gap-3">
        {CRON_JOBS.map(({ label, route }) => {
          const state = states[route] ?? 'idle'
          const msg   = messages[route] ?? ''
          return (
            <div key={route} className="flex items-start gap-4">
              <button
                onClick={() => run(route)}
                disabled={state === 'running'}
                className="shrink-0 font-sans text-[0.62rem] font-medium tracking-[0.08em] uppercase px-4 py-2 rounded-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background:  state === 'ok' ? 'rgba(76,175,80,0.12)' : state === 'error' ? 'rgba(255,80,80,0.08)' : 'rgba(255,255,255,0.04)',
                  border:      `1px solid ${state === 'ok' ? 'rgba(76,175,80,0.3)' : state === 'error' ? 'rgba(255,80,80,0.2)' : 'rgba(255,255,255,0.07)'}`,
                  color:       state === 'ok' ? '#4CAF50' : state === 'error' ? '#ff6b6b' : '#9DA3A8',
                  minWidth:    '190px',
                  textAlign:   'left',
                }}
              >
                {state === 'running' ? '⟳ Running…' : state === 'ok' ? '✓ ' + label : state === 'error' ? '✗ ' + label : label}
              </button>
              {msg && (
                <pre className="text-[0.6rem] leading-relaxed mt-1 overflow-x-auto max-w-md whitespace-pre-wrap" style={{ color: state === 'error' ? '#ff6b6b' : '#5C6166', fontFamily: 'monospace' }}>
                  {msg}
                </pre>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`rounded-sm ${className ?? ''}`}
      style={{ background: 'rgba(255,255,255,0.04)', animation: 'mysteryGlowPulse 1.8s ease-in-out infinite' }} />
  )
}

export default function DashboardClient({ archivistId }: { archivistId: string }) {
  const [loading,     setLoading]     = useState(true)
  const [archivist,   setArchivist]   = useState<ArchivistRow | null>(null)
  const [pipeline,    setPipeline]    = useState<Record<string, number>>({})
  const [actions,     setActions]     = useState<TodayAction[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [myRank,      setMyRank]      = useState<number | null>(null)
  const [showDebug,   setShowDebug]   = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setShowDebug(params.get('debug') === 'true' || process.env.NODE_ENV === 'development')
  }, [])

  useEffect(() => { fetchFromDB() }, [])

  async function fetchFromDB() {
    try {
      const res = await fetch(`/api/archivist/dashboard?id=${archivistId}`)
      if (!res.ok) throw new Error('API error')
      const data = await res.json()

      setArchivist(data.archivist)
      setPipeline(data.pipelineCounts ?? {})
      setActions(data.todaysActions ?? [])
      setLeaderboard(data.leaderboard ?? [])
      setCommissions(data.commissions ?? [])

      const rank = (data.leaderboard ?? []).findIndex((r: LeaderRow) => r.id === data.archivist?.id)
      setMyRank(rank >= 0 ? rank + 1 : null)
    } catch {
      // show empty state
    } finally {
      setLoading(false)
    }
  }

  const sprintCount = archivist?.sprint_closings ?? 0
  const nextSprint  = SPRINT_TIERS.find(t => sprintCount < t.threshold) ?? SPRINT_TIERS[SPRINT_TIERS.length - 1]
  const sprintPct   = Math.min(100, Math.round((sprintCount / nextSprint.threshold) * 100))

  const statCards = archivist
    ? [
        { label: 'Total Closings',  value: archivist.total_closings,      sub: 'All time' },
        { label: 'This Month',      value: archivist.this_month_closings,  sub: 'Current period' },
        { label: 'Annual Residual', value: fmt(archivist.residual_income_cents), sub: 'Monthly run rate: ' + fmt(Math.round(archivist.residual_income_cents / 12)) },
      ]
    : [
        { label: 'Total Closings',  value: '—', sub: 'All time'       },
        { label: 'This Month',      value: '—', sub: 'Current period' },
        { label: 'Annual Residual', value: '—', sub: 'Monthly run rate' },
      ]

  const pipelineStatuses = ['New', 'Contacted', 'Demo', 'Proposal', 'Closed']

  return (
    <div className="max-w-4xl">

      <div className="mb-10">
        <p className="font-sans text-[0.62rem] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: '#C4A24A' }}>Welcome back</p>
        {loading ? <Skeleton className="h-8 w-64 mb-1" /> : (
          <h1 className="font-serif font-semibold text-text-primary tracking-[-0.025em]" style={{ fontSize: 'clamp(1.8rem,3vw,2.5rem)' }}>
            {archivist?.name ?? 'Legacy Guide Dashboard'}
          </h1>
        )}
        {archivist && (
          <p className="font-sans text-[0.65rem] mt-1" style={{ color: '#5C6166' }}>
            {archivist.rank}{myRank !== null ? ` · #${myRank} on leaderboard` : ''}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)
          : statCards.map(({ label, value, sub }) => (
              <div key={label} className="rounded-sm border border-border-subtle px-6 py-5" style={{ background: '#111112' }}>
                <p className="font-sans text-[0.6rem] font-bold tracking-[0.18em] uppercase text-text-muted mb-3">{label}</p>
                <p className="font-serif font-semibold text-text-primary mb-1" style={{ fontSize: '2rem', letterSpacing: '-0.02em' }}>{value}</p>
                <p className="font-sans text-[0.68rem] text-text-muted">{sub}</p>
              </div>
            ))
        }
      </div>

      {!loading && archivist && (
        <div className="rounded-sm border border-border-subtle px-6 py-5 mb-8" style={{ background: '#111112' }}>
          <div className="flex items-baseline justify-between mb-3">
            <p className="font-sans text-[0.6rem] font-bold tracking-[0.18em] uppercase text-text-muted">Sprint Progress · This Month</p>
            <p className="font-sans text-[0.68rem]" style={{ color: '#C4A24A' }}>Next bonus: {nextSprint.bonus} at {nextSprint.threshold} closings</p>
          </div>
          <div className="h-1.5 rounded-full mb-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${sprintPct}%`, background: 'rgba(196,162,74,0.8)' }} />
          </div>
          <p className="font-sans text-[0.65rem]" style={{ color: '#5C6166' }}>{sprintCount} / {nextSprint.threshold} closings this month</p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2 rounded-sm border border-border-subtle" style={{ background: '#111112' }}>
          <div className="px-6 py-4 border-b border-border-subtle">
            <p className="font-sans text-[0.62rem] font-bold tracking-[0.18em] uppercase text-text-muted">Follow-up Actions</p>
          </div>
          {loading ? (
            <div className="flex flex-col gap-0">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-6 py-3 border-b border-border-subtle last:border-0">
                  <Skeleton className="h-3 w-3/4 mb-2" /><Skeleton className="h-2 w-1/3" />
                </div>
              ))}
            </div>
          ) : actions.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="font-serif italic text-text-muted" style={{ fontSize: '0.95rem' }}>No pending actions. Add prospects to your pipeline.</p>
            </div>
          ) : (
            <ul>
              {actions.map(a => (
                <li key={a.id} className="px-6 py-3 flex items-start justify-between gap-4 border-b border-border-subtle last:border-0">
                  <div className="min-w-0">
                    <p className="font-sans text-[0.8rem] font-medium text-text-primary truncate">{a.name}</p>
                    <p className="font-sans text-[0.68rem] mt-0.5 text-text-muted">{a.next_action}</p>
                  </div>
                  <span className="font-sans text-[0.62rem] font-medium tracking-[0.06em] uppercase shrink-0 mt-0.5" style={{ color: STATUS_COLOR[a.status] ?? '#5C6166' }}>
                    {a.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-sm border border-border-subtle p-6" style={{ background: '#111112' }}>
          <p className="font-sans text-[0.6rem] font-bold tracking-[0.18em] uppercase text-text-muted mb-5">Pipeline</p>
          {loading ? (
            <div className="flex flex-col gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
          ) : (
            <div className="flex flex-col gap-3">
              {pipelineStatuses.map(status => (
                <div key={status} className="flex items-center justify-between">
                  <span className="font-sans text-[0.72rem]" style={{ color: STATUS_COLOR[status] ?? '#5C6166' }}>{status}</span>
                  <span className="font-serif font-semibold text-text-primary" style={{ fontSize: '1.1rem', letterSpacing: '-0.02em' }}>{pipeline[status] ?? 0}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-5 pt-4 border-t border-border-subtle">
            <Link href="/archivist/pipeline" className="font-sans text-[0.68rem] font-medium no-underline transition-colors duration-150" style={{ color: '#C4A24A' }}>
              Manage Pipeline →
            </Link>
          </div>
        </div>
      </div>

      {!loading && leaderboard.length > 0 && (
        <div className="rounded-sm border border-border-subtle mb-8" style={{ background: '#111112' }}>
          <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
            <p className="font-sans text-[0.62rem] font-bold tracking-[0.18em] uppercase text-text-muted">Leaderboard</p>
            <Link href="/archivist/leaderboard" className="font-sans text-[0.62rem] no-underline" style={{ color: '#5C6166' }}>View all →</Link>
          </div>
          <table className="w-full">
            <tbody>
              {leaderboard.slice(0, 5).map((row, i) => (
                <tr key={row.id} style={i < Math.min(leaderboard.length, 5) - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}>
                  <td className="px-5 py-3 w-8">
                    <span className="font-serif font-semibold" style={{ fontSize: '1rem', color: i === 0 ? '#C4A24A' : '#3A3F44', letterSpacing: '-0.02em' }}>{i + 1}</span>
                  </td>
                  <td className="px-2 py-3">
                    <p className="font-sans text-[0.8rem] font-medium" style={{ color: row.id === archivist?.id ? '#C4A24A' : '#F0F0EE' }}>
                      {row.name} {row.id === archivist?.id ? '(you)' : ''}
                    </p>
                    <p className="font-sans text-[0.62rem] text-text-muted">{row.rank}</p>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <p className="font-sans text-[0.78rem] font-medium text-text-secondary">{row.this_month_closings} this mo.</p>
                    <p className="font-sans text-[0.62rem] text-text-muted">{row.total_closings} total</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && commissions.length > 0 && (
        <div className="rounded-sm border border-border-subtle mb-8" style={{ background: '#111112' }}>
          <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
            <p className="font-sans text-[0.62rem] font-bold tracking-[0.18em] uppercase text-text-muted">Recent Commissions</p>
            <Link href="/archivist/earnings" className="font-sans text-[0.62rem] no-underline" style={{ color: '#5C6166' }}>View all →</Link>
          </div>
          <ul>
            {commissions.slice(0, 5).map((c, i) => (
              <li key={c.id} className="px-6 py-3 flex items-center justify-between gap-4"
                style={i < Math.min(commissions.length, 5) - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}>
                <div className="min-w-0">
                  <p className="font-sans text-[0.78rem] text-text-primary truncate">{c.description || c.type}</p>
                  <p className="font-sans text-[0.62rem] mt-0.5 capitalize" style={{ color: c.status === 'paid' ? '#4CAF50' : '#9DA3A8' }}>{c.status}</p>
                </div>
                <p className="font-serif font-semibold shrink-0" style={{ fontSize: '1rem', letterSpacing: '-0.02em', color: '#C4A24A' }}>
                  {'$' + Math.round(c.amount_cents / 100).toLocaleString('en-US')}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showDebug && <SystemTestsPanel />}

      <div className="flex flex-wrap gap-3">
        <Link href="/archivist/pipeline"    className="btn-monolith-amber">View Pipeline →</Link>
        <Link href="/archivist/earnings"    className="btn-monolith-ghost">Earnings &amp; Commissions</Link>
        <Link href="/archivist/leaderboard" className="btn-monolith-ghost">Leaderboard</Link>
      </div>

    </div>
  )
}
