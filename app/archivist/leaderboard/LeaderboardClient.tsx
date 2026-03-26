'use client'

import { useState, useEffect } from 'react'

type LeaderRow = {
  id:                    string
  name:                  string
  rank:                  string
  total_closings:        number
  this_month_closings:   number
  sprint_closings:       number
  top_tier:              string
  residual_income_cents: number
}

const TIER_RESIDUALS: Record<string, number> = {
  Archive: 96,
  Estate:  288,
  Dynasty: 768,
}

function fmtResidual(cents: number) {
  return '$' + Math.round(cents / 100).toLocaleString('en-US')
}

const PLACEHOLDER: LeaderRow[] = [
  { id: '1', name: 'J. Whitmore',    rank: 'Active Archivist',      total_closings: 18, this_month_closings: 5, sprint_closings: 5, top_tier: 'Estate',  residual_income_cents: 518400 },
  { id: '2', name: 'M. Calloway',    rank: 'Senior Archivist',      total_closings: 14, this_month_closings: 4, sprint_closings: 4, top_tier: 'Dynasty', residual_income_cents: 1075200 },
  { id: '3', name: 'S. Pemberton',   rank: 'Active Archivist',      total_closings: 12, this_month_closings: 3, sprint_closings: 3, top_tier: 'Estate',  residual_income_cents: 345600 },
  { id: '4', name: 'A. Harrington',  rank: 'Provisional Archivist', total_closings: 9,  this_month_closings: 2, sprint_closings: 2, top_tier: 'Archive', residual_income_cents: 86400 },
  { id: '5', name: 'R. Montague',    rank: 'Active Archivist',      total_closings: 7,  this_month_closings: 1, sprint_closings: 1, top_tier: 'Estate',  residual_income_cents: 201600 },
]

export default function LeaderboardClient({ archivistId }: { archivistId: string }) {
  const [tab,     setTab]     = useState<'month' | 'alltime'>('month')
  const [rows,    setRows]    = useState<LeaderRow[]>([])
  const [myId,    setMyId]    = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/archivist/dashboard?id=${archivistId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { setRows(PLACEHOLDER); return }
        const lb: LeaderRow[] = data.leaderboard ?? []
        setRows(lb.length > 0 ? lb : PLACEHOLDER)
        setMyId(data.archivist?.id ?? null)
      })
      .catch(() => setRows(PLACEHOLDER))
      .finally(() => setLoading(false))
  }, [archivistId])

  const sorted = tab === 'month'
    ? [...rows].sort((a, b) => b.this_month_closings - a.this_month_closings || b.total_closings - a.total_closings)
    : [...rows].sort((a, b) => b.total_closings - a.total_closings || b.this_month_closings - a.this_month_closings)

  return (
    <div className="max-w-3xl">

      <div className="mb-10">
        <p className="font-sans text-[0.62rem] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: '#C4A24A' }}>Leaderboard</p>
        <h1 className="font-serif font-semibold text-text-primary tracking-[-0.025em]" style={{ fontSize: 'clamp(1.8rem,3vw,2.5rem)' }}>
          Current Rankings
        </h1>
      </div>

      <div className="flex gap-2 mb-6">
        {([['month', 'This Month'], ['alltime', 'All Time']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="font-sans text-[0.7rem] font-medium tracking-[0.06em] rounded-sm px-4 py-2 border transition-all duration-150"
            style={tab === key
              ? { background: '#C4A24A', borderColor: '#C4A24A', color: '#0C0C0D' }
              : { background: 'transparent', borderColor: 'rgba(255,255,255,0.08)', color: '#5C6166' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-sm border border-border-subtle px-6 py-16 text-center" style={{ background: '#111112' }}>
          <p className="font-serif italic text-text-muted" style={{ fontSize: '0.95rem' }}>Loading rankings…</p>
        </div>
      ) : (
        <div className="rounded-sm border border-border-subtle overflow-hidden mb-10" style={{ background: '#111112' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Rank', 'Archivist', tab === 'month' ? 'This Month' : 'Total Closings', 'Top Tier', 'Annual Residual'].map(h => (
                    <th key={h} className="text-left px-5 py-3 font-sans text-[0.58rem] font-bold tracking-[0.14em] uppercase text-text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => {
                  const closings = tab === 'month' ? row.this_month_closings : row.total_closings
                  const isMe     = row.id === myId
                  const residual = row.residual_income_cents > 0
                    ? fmtResidual(row.residual_income_cents)
                    : fmtResidual((row.total_closings * (TIER_RESIDUALS[row.top_tier] ?? 288)) * 100)

                  return (
                    <tr key={row.id} style={i < sorted.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.06)' } : {}}>
                      <td className="px-5 py-4">
                        <span className="font-serif font-semibold"
                          style={{ fontSize: '1.1rem', color: i === 0 ? '#C4A24A' : '#5C6166', letterSpacing: '-0.02em' }}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-sans text-[0.85rem] font-medium" style={{ color: isMe ? '#C4A24A' : '#F0F0EE' }}>
                          {row.name}{isMe && <span className="font-sans text-[0.62rem] ml-1 font-normal" style={{ color: '#C4A24A' }}>· you</span>}
                        </p>
                        <p className="font-sans text-[0.65rem] text-text-muted">{row.rank}</p>
                      </td>
                      <td className="px-5 py-4 font-sans text-[0.85rem] text-text-secondary">{closings}</td>
                      <td className="px-5 py-4 font-sans text-[0.78rem] text-text-muted">{row.top_tier}</td>
                      <td className="px-5 py-4 font-sans text-[0.85rem] font-medium" style={{ color: '#C4A24A' }}>{residual}/yr</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-sm border border-border-subtle overflow-hidden mb-6" style={{ background: '#111112' }}>
        <div className="px-6 py-4 border-b border-border-subtle">
          <p className="font-sans text-[0.6rem] font-bold tracking-[0.18em] uppercase text-text-muted">Sprint Standings — This Month</p>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-center">
            <p className="font-serif italic text-text-muted" style={{ fontSize: '0.9rem' }}>Loading…</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {['Archivist', 'Sprint Closings', 'Bonus Tier'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-sans text-[0.56rem] font-bold tracking-[0.14em] uppercase text-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...rows]
                .sort((a, b) => (b.sprint_closings ?? b.this_month_closings) - (a.sprint_closings ?? a.this_month_closings))
                .slice(0, 5)
                .map((row, i) => {
                  const sc        = row.sprint_closings ?? row.this_month_closings
                  const bonusTier = sc >= 20 ? '$4,000' : sc >= 10 ? '$1,500' : sc >= 5 ? '$500' : '—'
                  const isMe      = row.id === myId
                  return (
                    <tr key={row.id}
                      style={i < Math.min(rows.length, 5) - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}>
                      <td className="px-5 py-3 font-sans text-[0.8rem]" style={{ color: isMe ? '#C4A24A' : '#F0F0EE' }}>
                        {row.name}{isMe && <span className="font-sans text-[0.62rem] ml-1" style={{ color: '#5C6166' }}>(you)</span>}
                      </td>
                      <td className="px-5 py-3 font-serif font-semibold"
                        style={{ fontSize: '1rem', color: '#F0F0EE', letterSpacing: '-0.02em' }}>{sc}</td>
                      <td className="px-5 py-3 font-sans text-[0.78rem]"
                        style={{ color: bonusTier !== '—' ? '#C4A24A' : '#3A3F44' }}>{bonusTier}</td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-sm border border-border-subtle px-6 py-5 text-center" style={{ background: '#111112' }}>
        <p className="font-serif italic text-text-muted" style={{ fontSize: '0.9rem' }}>
          Leaderboard updates in real time. Your position reflects all recorded closings.
        </p>
      </div>

    </div>
  )
}
