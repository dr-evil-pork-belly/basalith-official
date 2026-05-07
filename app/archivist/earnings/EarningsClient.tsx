'use client'

import { useState, useEffect } from 'react'

const C = {
  surface: '#111110', border: 'rgba(255,255,255,0.06)',
  gold: '#C4A24A', text: '#F0EDE6', muted: '#9DA3A8', dim: '#5C6166', ghost: '#3A3F44',
  green: '#4CAF50', red: '#E57373',
}

type Commission = {
  id: string; created_at: string; description: string | null
  amount_cents: number; status: string; type: string
}

type Prospect = { id: string; name: string; status: string; tier: string }

const RESIDUAL_MONTHLY: Record<string, number> = { archive: 12, estate: 24, dynasty: 64 }

const TIER_TIER: Record<string, { annual: number; monthly: number }> = {
  Archive: { annual: 1800, monthly: 180 },
  Estate:  { annual: 3600, monthly: 360 },
  Dynasty: { annual: 9600, monthly: 960 },
}

export default function EarningsClient({ archivistId }: { archivistId: string }) {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [prospects,   setProspects]   = useState<Prospect[]>([])
  const [archivist,   setArchivist]   = useState<Record<string, unknown>>({})
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState<'founding' | 'residuals'>('founding')

  useEffect(() => {
    Promise.all([
      fetch(`/api/archivist/dashboard?id=${archivistId}`).then(r => r.json()),
    ]).then(([dash]) => {
      setCommissions(dash.commissions ?? [])
      setProspects(dash.prospects ?? [])
      setArchivist(dash.archivist ?? {})
    }).catch(() => {})
    .finally(() => setLoading(false))
  }, [archivistId])

  if (loading) return <div style={{ padding: '48px' }}><p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.65rem', color: C.dim }}>Loading…</p></div>

  // ── Founding commissions ─────────────────────────────────────────────────────
  const founding      = commissions.filter(c => c.type?.includes('founding') || !c.type)
  const now           = new Date()
  const monthStart    = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const qStart        = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString()
  const thisMonth     = founding.filter(c => c.created_at >= monthStart).reduce((s, c) => s + (c.amount_cents ?? 0), 0)
  const thisQuarter   = founding.filter(c => c.created_at >= qStart).reduce((s, c) => s + (c.amount_cents ?? 0), 0)
  const allTime       = founding.reduce((s, c) => s + (c.amount_cents ?? 0), 0)

  // ── Stewardship residuals ────────────────────────────────────────────────────
  const activeClients = prospects.filter(p => p.status === 'Active Client')
  const monthlyMRR    = activeClients.reduce((sum, p) => {
    const t = (p.tier ?? '').toLowerCase()
    return sum + (RESIDUAL_MONTHLY[t] ?? 24)
  }, 0)
  const annualResidual = monthlyMRR * 12

  // ── Tier info ────────────────────────────────────────────────────────────────
  const totalClosings  = Number(archivist?.total_closings ?? 0)
  const qualityScore   = Number(archivist?.quality_score ?? 0)
  const certified      = archivist?.certification_status === 'certified'

  // Next tier threshold
  const nextTierReqs = [
    { label: '25+ active archives', done: activeClients.length >= 25, current: activeClients.length, target: 25 },
    { label: 'Quality score above 75', done: qualityScore >= 75, current: Math.round(qualityScore), target: 75 },
    { label: '85% client retention', done: Number(archivist?.client_retention_rate ?? 0) >= 85, current: Math.round(Number(archivist?.client_retention_rate ?? 0)), target: 85 },
  ]

  function fmt(cents: number) { return `$${(cents / 100).toLocaleString()}` }

  const TabBtn = ({ id, label }: { id: typeof tab; label: string }) => (
    <button
      onClick={() => setTab(id)}
      style={{ fontFamily: 'Courier New, monospace', fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '10px 20px', background: tab === id ? C.gold : 'transparent', color: tab === id ? '#0A0908' : C.dim, border: `1px solid ${tab === id ? C.gold : C.border}`, cursor: 'pointer' }}
    >{label}</button>
  )

  return (
    <div style={{ padding: 'clamp(24px,5vw,48px)', maxWidth: '900px' }}>

      <div style={{ marginBottom: '32px' }}>
        <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.58rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: C.dim, marginBottom: '6px' }}>Earnings</p>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.4rem,2.5vw,1.9rem)', fontWeight: 300, color: C.text }}>Your Practice Income</h1>
      </div>

      {/* Annual projection callout */}
      <div style={{ background: 'rgba(196,162,74,0.06)', border: '1px solid rgba(196,162,74,0.25)', borderTop: '3px solid #C4A24A', padding: '24px 28px', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.58rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: C.dim, marginBottom: '6px' }}>Annual Stewardship Income</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '2.2rem', fontWeight: 300, color: C.gold, lineHeight: 1 }}>
            ${annualResidual.toLocaleString()}
          </p>
          <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.58rem', color: C.ghost, marginTop: '6px' }}>
            {activeClients.length} active {activeClients.length === 1 ? 'archive' : 'archives'} · ${monthlyMRR}/month
          </p>
        </div>
        <div style={{ borderLeft: `1px solid rgba(196,162,74,0.2)`, paddingLeft: '32px' }}>
          <div style={{ display: 'flex', gap: '28px' }}>
            <div>
              <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.55rem', color: C.ghost, marginBottom: '4px' }}>This Month</p>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: '1.3rem', fontWeight: 300, color: C.text }}>{fmt(thisMonth)}</p>
            </div>
            <div>
              <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.55rem', color: C.ghost, marginBottom: '4px' }}>All Time</p>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: '1.3rem', fontWeight: 300, color: C.text }}>{fmt(allTime)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Commission tier */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: '20px 24px', marginBottom: '28px', display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: certified ? C.gold : C.dim, marginBottom: '8px' }}>
            {certified ? 'Certified Guide' : 'Uncertified'}
          </p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.95rem', color: C.muted }}>Founding: <span style={{ color: C.gold }}>$1,000</span> per archive</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.95rem', color: C.muted }}>Residual: <span style={{ color: C.gold }}>8%</span> annually</p>
        </div>
        {certified && (
          <div style={{ borderLeft: `1px solid ${C.border}`, paddingLeft: '32px', flex: 1 }}>
            <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.55rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.ghost, marginBottom: '12px' }}>Next Tier: Senior Guide</p>
            {nextTierReqs.map(req => (
              <div key={req.label} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.6rem', color: req.done ? C.green : C.muted }}>{req.done ? '✓ ' : ''}{req.label}</p>
                  <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.6rem', color: C.dim }}>{req.current}/{req.target}</p>
                </div>
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
                  <div style={{ height: '100%', width: `${Math.min((req.current / req.target) * 100, 100)}%`, background: req.done ? C.green : C.gold, borderRadius: '2px', transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <TabBtn id="founding"  label="Founding Commissions" />
        <TabBtn id="residuals" label="Stewardship Residuals" />
      </div>

      {/* Founding commissions table */}
      {tab === 'founding' && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 80px', borderBottom: `1px solid ${C.border}` }}>
            {['Date', 'Client', 'Amount', 'Status'].map(h => (
              <div key={h} style={{ padding: '10px 16px' }}>
                <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.55rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: C.ghost }}>{h}</p>
              </div>
            ))}
          </div>
          {founding.length === 0 && (
            <p style={{ padding: '24px', fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.9rem', color: C.ghost }}>No founding commissions yet.</p>
          )}
          {founding.map((c, i) => (
            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 80px', borderBottom: i < founding.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ padding: '12px 16px' }}><p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.62rem', color: C.dim }}>{new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p></div>
              <div style={{ padding: '12px 16px' }}><p style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: C.muted }}>{c.description ?? 'Founding commission'}</p></div>
              <div style={{ padding: '12px 16px', textAlign: 'right' }}><p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.65rem', color: C.gold }}>{fmt(c.amount_cents)}</p></div>
              <div style={{ padding: '12px 16px' }}><p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: c.status === 'paid' ? C.green : C.dim }}>{c.status}</p></div>
            </div>
          ))}
          {/* Totals */}
          <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 16px', display: 'flex', justifyContent: 'flex-end', gap: '32px' }}>
            {[{ label: 'This Month', val: thisMonth }, { label: 'This Quarter', val: thisQuarter }, { label: 'All Time', val: allTime }].map(({ label, val }) => (
              <div key={label} style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.55rem', color: C.ghost, marginBottom: '3px' }}>{label}</p>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', color: C.gold }}>{fmt(val)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stewardship residuals */}
      {tab === 'residuals' && (
        <div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, marginBottom: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', borderBottom: `1px solid ${C.border}` }}>
              {['Archive', 'Tier', 'Monthly'].map(h => (
                <div key={h} style={{ padding: '10px 16px' }}>
                  <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.55rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: C.ghost }}>{h}</p>
                </div>
              ))}
            </div>
            {activeClients.length === 0 && (
              <p style={{ padding: '24px', fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.9rem', color: C.ghost }}>No active archives yet.</p>
            )}
            {activeClients.map((p, i) => {
              const tierKey = p.tier as keyof typeof RESIDUAL_MONTHLY
              const monthly = RESIDUAL_MONTHLY[(p.tier ?? '').toLowerCase()] ?? 24
              return (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', borderBottom: i < activeClients.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ padding: '12px 16px' }}><p style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: C.muted }}>{p.name}</p></div>
                  <div style={{ padding: '12px 16px' }}><p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.6rem', color: C.dim }}>{p.tier || '—'}</p></div>
                  <div style={{ padding: '12px 16px', textAlign: 'right' }}><p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.65rem', color: C.gold }}>${monthly}/mo</p></div>
                </div>
              )
            })}
            {activeClients.length > 0 && (
              <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 16px', display: 'flex', justifyContent: 'flex-end', gap: '24px' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.55rem', color: C.ghost, marginBottom: '3px' }}>Total Monthly</p>
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', color: C.gold }}>${monthlyMRR}/mo</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.55rem', color: C.ghost, marginBottom: '3px' }}>Annual</p>
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', color: C.gold }}>${annualResidual.toLocaleString()}/yr</p>
                </div>
              </div>
            )}
          </div>
          <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.85rem', color: C.ghost, lineHeight: 1.6 }}>
            Residuals are paid on the 1st of each month for all archives active on the last day of the previous month.
          </p>
        </div>
      )}
    </div>
  )
}
