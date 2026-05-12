'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const C = {
  bg:      '#0A0908',
  surface: '#111110',
  border:  'rgba(255,255,255,0.06)',
  gold:    '#C4A24A',
  text:    '#F0EDE6',
  muted:   '#9DA3A8',
  dim:     '#5C6166',
  ghost:   '#3A3F44',
  green:   '#4CAF50',
  red:     '#E57373',
}

const RESIDUAL_RATES = { active: 24, resting: 4, legacy: 0 }

function calculateProjection(
  currentArchives: number,
  avgTier:         'active' | 'resting' | 'legacy',
  monthlyClosings: number,
  retentionRate:   number,
): { year: number; monthly: number }[] {
  const rate   = RESIDUAL_RATES[avgTier]
  const points = []
  let archives = currentArchives
  for (let month = 0; month <= 120; month++) {
    if (month > 0) archives = archives * retentionRate + monthlyClosings
    if (month % 12 === 0) points.push({ year: month / 12, monthly: Math.round(archives * rate) })
  }
  return points
}

function ProjectionChart({ activeClients, monthlyMRR }: { activeClients: number; monthlyMRR: number }) {
  const avgRate  = monthlyMRR / Math.max(activeClients, 1)
  const avgTier: 'active' | 'resting' | 'legacy' = avgRate >= 20 ? 'active' : avgRate >= 4 ? 'resting' : 'active'
  const monthly  = Math.max(activeClients / 12, 0.5)
  const data     = calculateProjection(activeClients, avgTier, monthly, 0.85)
  const year5    = data.find(d => d.year === 5)?.monthly  ?? 0
  const year10   = data.find(d => d.year === 10)?.monthly ?? 0

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: '28px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.58rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: C.dim, marginBottom: '6px' }}>Residual Projection</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '1.8rem', fontWeight: 300, color: C.gold }}>
            ${monthlyMRR.toLocaleString()}<span style={{ fontSize: '0.9rem', color: C.dim }}>/mo now</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          {[{ label: 'Year 5', val: year5 }, { label: 'Year 10', val: year10 }].map(({ label, val }) => (
            <div key={label} style={{ textAlign: 'right' }}>
              <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.55rem', letterSpacing: '0.2em', color: C.ghost, marginBottom: '3px' }}>{label}</p>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', fontWeight: 300, color: C.muted }}>${val.toLocaleString()}/mo</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: '180px', marginBottom: '16px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
            <XAxis dataKey="year" tick={{ fontFamily: 'Courier New, monospace', fontSize: 10, fill: C.dim }} tickFormatter={v => `Yr ${v}`} axisLine={{ stroke: C.border }} tickLine={false} />
            <YAxis tick={{ fontFamily: 'Courier New, monospace', fontSize: 10, fill: C.dim }} tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} axisLine={false} tickLine={false} width={48} />
            <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, fontFamily: 'Courier New, monospace', fontSize: '0.7rem', color: C.text }} formatter={(val) => [`$${Number(val).toLocaleString()}/mo`, 'Residual']} labelFormatter={l => `Year ${l}`} />
            <Line type="monotone" dataKey="monthly" stroke={C.gold} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.58rem', color: C.ghost, lineHeight: 1.6 }}>
        Based on {activeClients} active archives · 85% annual retention · ~{monthly.toFixed(1)} new closings/month projected
      </p>
    </div>
  )
}

function StatCard({ label, value, caption, color }: { label: string; value: string; caption?: string; color?: string }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderTop: `2px solid ${color ?? C.gold}`, padding: '20px 24px' }}>
      <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.55rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: C.dim, marginBottom: '8px' }}>{label}</p>
      <p style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 300, color: color ?? C.gold, lineHeight: 1 }}>{value}</p>
      {caption && <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.55rem', letterSpacing: '0.08em', color: C.ghost, marginTop: '6px' }}>{caption}</p>}
    </div>
  )
}

const STAGES = ['New', 'Contacted', 'Demo', 'Proposal', 'Active Client']

function PipelineStrip({ prospects }: { prospects: Array<{ id: string; name: string; status: string; tier: string }> }) {
  const by: Record<string, typeof prospects> = {}
  for (const p of prospects) { if (!by[p.status]) by[p.status] = []; by[p.status].push(p) }

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, marginBottom: '24px' }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.6rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: C.dim }}>My Practice</p>
        <Link href="/archivist/pipeline" style={{ fontFamily: 'Courier New, monospace', fontSize: '0.58rem', color: C.gold, textDecoration: 'none' }}>Full Pipeline →</Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STAGES.length}, 1fr)`, gap: '1px', background: C.border }}>
        {STAGES.map(stage => {
          const items = by[stage] ?? []
          return (
            <div key={stage} style={{ background: C.surface, padding: '14px 12px' }}>
              <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.55rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: C.ghost, marginBottom: '8px' }}>{stage}</p>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: '1.4rem', fontWeight: 300, color: stage === 'Active Client' ? C.green : C.text, marginBottom: '6px' }}>{items.length}</p>
              {items.slice(0, 2).map(p => (
                <p key={p.id} style={{ fontFamily: 'Courier New, monospace', fontSize: '0.6rem', color: C.dim, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
              ))}
              {items.length > 2 && <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.55rem', color: C.ghost }}>+{items.length - 2} more</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RecentCommissions({ commissions }: { commissions: Array<{ id: string; created_at: string; description: string; amount_cents: number; status: string }> }) {
  if (!commissions.length) return null
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.6rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: C.dim }}>Recent Commissions</p>
        <Link href="/archivist/earnings" style={{ fontFamily: 'Courier New, monospace', fontSize: '0.58rem', color: C.gold, textDecoration: 'none' }}>All Earnings →</Link>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {commissions.slice(0, 6).map((c, i, arr) => (
            <tr key={c.id} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <td style={{ padding: '12px 20px', fontFamily: 'Courier New, monospace', fontSize: '0.62rem', color: C.dim, whiteSpace: 'nowrap' }}>{new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
              <td style={{ padding: '12px 8px', fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: C.muted }}>{c.description ?? 'Commission'}</td>
              <td style={{ padding: '12px 8px', fontFamily: 'Courier New, monospace', fontSize: '0.65rem', color: c.status === 'paid' ? C.green : C.gold, textAlign: 'right', whiteSpace: 'nowrap' }}>${((c.amount_cents ?? 0) / 100).toLocaleString()}</td>
              <td style={{ padding: '12px 20px', fontFamily: 'Courier New, monospace', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: c.status === 'paid' ? C.green : C.dim }}>{c.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function DashboardClient({ archivistId }: { archivistId: string }) {
  const [data,    setData]    = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/archivist/dashboard?id=${archivistId}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [archivistId])

  if (loading) {
    return (
      <div style={{ padding: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.65rem', letterSpacing: '0.24em', color: C.dim }}>Loading…</p>
      </div>
    )
  }

  const archivist     = (data?.archivist   as Record<string, unknown>) ?? {}
  const metrics       = (data?.metrics     as Record<string, number>)  ?? {}
  const prospects     = (data?.prospects   as Array<Record<string, string>>) ?? []
  const commissions   = (data?.commissions as Array<Record<string, unknown>>) ?? []
  const certification = (data?.certification as Record<string, unknown>) ?? {}

  const certified    = certification?.certified_at != null || archivist?.certification_status === 'certified'
  const qualityColor = (metrics.qualityScore ?? 0) >= 70 ? C.green : (metrics.qualityScore ?? 0) >= 50 ? C.gold : C.red
  const monthlyMRR   = Math.round(((metrics.residualMRRCents ?? 0) / 100))

  const h        = new Date().getHours()
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = String(archivist?.name ?? '').split(' ')[0]

  return (
    <div style={{ padding: 'clamp(24px,5vw,48px)', maxWidth: '1100px' }}>

      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.4rem,2.5vw,1.9rem)', fontWeight: 300, color: C.text }}>
          {greeting}{firstName ? `, ${firstName}.` : '.'}
        </h1>
      </div>

      {/* Certification alert */}
      {!certified && (
        <div style={{ background: 'rgba(229,115,115,0.04)', border: '1px solid rgba(229,115,115,0.15)', borderLeft: '3px solid rgba(229,115,115,0.4)', padding: '16px 20px', marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: C.red, marginBottom: '4px' }}>Certification Required</p>
            <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.9rem', color: C.muted }}>Complete your certification to unlock full dashboard access and commission tracking.</p>
          </div>
          <Link href="/archivist/certification" style={{ fontFamily: 'Courier New, monospace', fontSize: '0.62rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#0A0908', background: C.gold, padding: '10px 20px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Begin Certification →
          </Link>
        </div>
      )}

      {certified && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', paddingBottom: '20px', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontFamily: 'Courier New, monospace', fontSize: '0.55rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: C.gold, background: 'rgba(196,162,74,0.08)', border: '1px solid rgba(196,162,74,0.2)', padding: '4px 10px' }}>✓ Certified Legacy Guide</span>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        <StatCard label="Active Clients" value={String(metrics.activeClients ?? 0)} caption="archives generating residuals" />
        <StatCard label="This Month"     value={`$${((metrics.thisMonthCents ?? 0) / 100).toLocaleString()}`} caption="founding commissions" />
        <StatCard label="Residual MRR"   value={`$${monthlyMRR.toLocaleString()}`} caption="/ month recurring" />
        <StatCard label="Quality Score"  value={`${Math.round(metrics.qualityScore ?? 0)}`} caption="archive health average" color={qualityColor} />
      </div>

      {/* Residual projection chart — only for certified guides */}
      {certified && <ProjectionChart activeClients={metrics.activeClients ?? 0} monthlyMRR={monthlyMRR} />}

      {/* Pipeline strip */}
      <PipelineStrip prospects={prospects as Array<{ id: string; name: string; status: string; tier: string }>} />

      {/* Recent commissions */}
      <RecentCommissions commissions={commissions as Array<{ id: string; created_at: string; description: string; amount_cents: number; status: string }>} />

    </div>
  )
}
