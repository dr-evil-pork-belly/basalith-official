'use client'

import { useState, useEffect } from 'react'

type TierKey = 'Archive' | 'Estate' | 'Dynasty'

const TIERS: TierKey[] = ['Archive', 'Estate', 'Dynasty']

const TIER_DATA: Record<TierKey, { price: string; annual: number; residual: number }> = {
  Archive: { price: '$1,200/yr', annual: 1200, residual: 96  },
  Estate:  { price: '$3,600/yr', annual: 3600, residual: 288 },
  Dynasty: { price: '$9,600/yr', annual: 9600, residual: 768 },
}

const RANKS = [
  { title: 'Provisional Archivist', range: '0–2',   rate: '40%',  override: '—',  notes: 'Demo account, training access'                       },
  { title: 'Active Archivist',      range: '3–9',   rate: '40%',  override: '—',  notes: 'Sprint eligible, leaderboard access'                 },
  { title: 'Senior Archivist',      range: '10–24', rate: '40%',  override: '2%', notes: 'Priority support, proposal builder, recruit override' },
  { title: 'Master Archivist',      range: '25–49', rate: '40%',  override: '2%', notes: 'Sovereign Gathering, Council access'                 },
  { title: 'Sovereign Archivist',   range: '50+',   rate: '27%',  override: '2%', notes: 'Founding Council, direct founder access'             },
]

const SPRINTS = [
  { trigger: '5 closings/month',  bonus: '$500'   },
  { trigger: '10 closings/month', bonus: '$1,500' },
  { trigger: '20 closings/month', bonus: '$4,000' },
  { trigger: '#1 on leaderboard', bonus: '$2,500' },
]

type CommissionRow = {
  id:           string
  created_at:   string
  type:         string
  amount_cents: number
  status:       string
  description:  string
}

type ArchivistSummary = {
  total_closings:        number
  this_month_closings:   number
  residual_income_cents: number
  rank:                  string
}

function fmt(n: number) { return '$' + Math.round(n).toLocaleString('en-US') }
function fmtCents(cents: number) { return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-serif font-semibold text-text-primary tracking-[-0.025em] mb-6" style={{ fontSize: 'clamp(1.5rem,3vw,2rem)' }}>
      {children}
    </h2>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-sans text-[0.58rem] font-bold tracking-[0.22em] uppercase mb-3" style={{ color: '#C4A24A' }}>{children}</p>
  )
}

export default function EarningsClient({ archivistId }: { archivistId: string }) {
  const [closings,    setClosings]    = useState(5)
  const [tier,        setTier]        = useState<TierKey>('Estate')
  const [archivist,   setArchivist]   = useState<ArchivistSummary | null>(null)
  const [commissions, setCommissions] = useState<CommissionRow[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    fetch(`/api/archivist/dashboard?id=${archivistId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        setArchivist(data.archivist)
        setCommissions(data.commissions ?? [])
        if (data.archivist?.this_month_closings > 0) {
          setClosings(data.archivist.this_month_closings)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingData(false))
  }, [archivistId])

  const upfront        = closings * 1000
  const annualResidual = closings * 12 * TIER_DATA[tier].residual
  const year1Total     = Math.round(closings * 12 * 1000 + closings * TIER_DATA[tier].residual * 6.5)
  const sprintEligible = closings >= 5

  const totalEarned  = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount_cents, 0)
  const totalPending = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount_cents, 0)

  return (
    <div className="max-w-4xl flex flex-col gap-16">

      <div>
        <p className="font-sans text-[0.62rem] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: '#C4A24A' }}>Your Earnings</p>
        <h1 className="font-serif font-semibold text-text-primary tracking-[-0.025em]" style={{ fontSize: 'clamp(1.8rem,3vw,2.5rem)' }}>
          Commission &amp; Residual Structure
        </h1>
      </div>

      {/* ── REAL EARNINGS SUMMARY ── */}
      {!loadingData && archivist && (
        <div>
          <Eyebrow>Your Summary</Eyebrow>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Earned',    value: fmtCents(totalEarned),                     sub: 'All paid commissions' },
              { label: 'Pending',         value: fmtCents(totalPending),                    sub: 'Awaiting payment cycle' },
              { label: 'Annual Residual', value: fmtCents(archivist.residual_income_cents), sub: 'Current run rate' },
              { label: 'Total Closings',  value: String(archivist.total_closings),           sub: archivist.rank },
            ].map(({ label, value, sub }) => (
              <div key={label} className="rounded-sm border border-border-subtle px-5 py-5" style={{ background: '#111112' }}>
                <p className="font-sans text-[0.58rem] font-bold tracking-[0.16em] uppercase text-text-muted mb-2">{label}</p>
                <p className="font-serif font-semibold" style={{ fontSize: '1.6rem', letterSpacing: '-0.025em', color: '#C4A24A' }}>{value}</p>
                <p className="font-sans text-[0.62rem] text-text-muted mt-1">{sub}</p>
              </div>
            ))}
          </div>

          {commissions.length > 0 && (
            <div className="rounded-sm border border-border-subtle overflow-hidden" style={{ background: '#111112' }}>
              <div className="px-6 py-4 border-b border-border-subtle">
                <p className="font-sans text-[0.6rem] font-bold tracking-[0.18em] uppercase text-text-muted">Commission History</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Date', 'Description', 'Type', 'Amount', 'Status'].map(h => (
                        <th key={h} className="text-left px-5 py-3 font-sans text-[0.58rem] font-bold tracking-[0.14em] uppercase text-text-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((c, i) => (
                      <tr key={c.id} style={i < commissions.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}>
                        <td className="px-5 py-3 font-sans text-[0.72rem] text-text-muted whitespace-nowrap">
                          {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-3 font-sans text-[0.78rem] text-text-secondary">{c.description || '—'}</td>
                        <td className="px-5 py-3">
                          <span className="font-sans text-[0.62rem] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded-sm capitalize" style={{ background: 'rgba(255,255,255,0.05)', color: '#9DA3A8' }}>
                            {c.type}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-serif font-semibold" style={{ fontSize: '1rem', color: '#C4A24A', letterSpacing: '-0.02em' }}>
                          {fmtCents(c.amount_cents)}
                        </td>
                        <td className="px-5 py-3 font-sans text-[0.72rem] capitalize" style={{ color: c.status === 'paid' ? '#4CAF50' : '#9DA3A8' }}>
                          {c.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CALCULATOR ── */}
      <div>
        <Eyebrow>Earnings Calculator</Eyebrow>
        <Heading>The math is straightforward.</Heading>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-sm border border-border-subtle p-7" style={{ background: '#111112' }}>
            <div className="mb-7">
              <div className="flex items-baseline justify-between mb-4">
                <label className="font-sans text-[0.65rem] font-bold tracking-[0.14em] uppercase text-text-muted">Closings per month</label>
                <span className="font-serif font-semibold text-text-primary" style={{ fontSize: '1.6rem', letterSpacing: '-0.02em' }}>{closings}</span>
              </div>
              <input type="range" min={1} max={20} value={closings} onChange={e => setClosings(Number(e.target.value))} className="range-amber" aria-label="Closings per month" />
              <div className="flex justify-between mt-1.5">
                <span className="font-sans text-[0.58rem] text-text-muted">1</span>
                <span className="font-sans text-[0.58rem] text-text-muted">20</span>
              </div>
            </div>
            <div>
              <p className="font-sans text-[0.65rem] font-bold tracking-[0.14em] uppercase text-text-muted mb-3">Subscription tier sold</p>
              <div className="flex gap-2">
                {TIERS.map(t => (
                  <button key={t} onClick={() => setTier(t)} className="flex-1 rounded-sm py-2.5 font-sans text-[0.72rem] font-medium tracking-[0.04em] transition-all duration-150 border"
                    style={tier === t
                      ? { background: '#C4A24A', borderColor: '#C4A24A', color: '#0C0C0D' }
                      : { background: 'transparent', borderColor: 'rgba(196,162,74,0.22)', color: '#5C6166' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <p className="font-sans text-[0.62rem] font-bold tracking-[0.14em] uppercase text-text-muted mb-1">Month 1 Earnings</p>
              <p className="font-serif font-semibold text-text-primary" style={{ fontSize: 'clamp(2rem,4vw,3rem)', letterSpacing: '-0.03em' }}>{fmt(upfront)}</p>
            </div>
            <div className="h-px bg-white/[0.06]" />
            <div className="flex flex-col gap-3">
              {[
                { label: 'Upfront commissions (this month)', value: fmt(upfront),        suffix: ''    },
                { label: 'Annual residual after 12 months',  value: fmt(annualResidual), suffix: '/yr' },
                { label: 'Projected year 1 total',           value: fmt(year1Total),     suffix: ''    },
              ].map(({ label, value, suffix }) => (
                <div key={label} className="flex items-baseline justify-between gap-4">
                  <span className="font-sans text-[0.78rem] text-text-muted">{label}</span>
                  <span className="font-serif font-medium text-text-primary text-[1rem] flex-shrink-0">{value}{suffix}</span>
                </div>
              ))}
            </div>
            {sprintEligible && (
              <div className="rounded-sm px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(196,162,74,0.06)', border: '1px solid rgba(196,162,74,0.2)' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2.5 7l3 3L11.5 4" stroke="#C4A24A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="font-sans text-[0.78rem]" style={{ color: '#C4A24A' }}>Sprint bonus eligible: +$500 to +$4,000</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── COMMISSION OVERVIEW ── */}
      <div>
        <Eyebrow>Commission Structure</Eyebrow>
        <Heading>How you earn.</Heading>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { value: '$1,000', label: 'Per Founding',   sub: 'Paid on every completed Founding engagement'       },
            { value: '8%',     label: 'Annual Residual', sub: 'Of the annual subscription, every year, for life' },
            { value: '$0',     label: 'To Join',         sub: 'No buy-in. No inventory. No fees.'                },
          ].map(({ value, label, sub }) => (
            <div key={label} className="rounded-sm border border-border-subtle p-6" style={{ background: '#111112' }}>
              <p className="font-serif font-semibold text-text-primary mb-1" style={{ fontSize: '2rem', letterSpacing: '-0.02em', color: '#C4A24A' }}>{value}</p>
              <p className="font-sans text-[0.7rem] font-bold tracking-[0.12em] uppercase text-text-primary mb-2">{label}</p>
              <p className="font-sans text-[0.75rem] text-text-muted leading-[1.6]">{sub}</p>
            </div>
          ))}
        </div>
        <div className="rounded-sm border border-border-subtle overflow-hidden" style={{ background: '#111112' }}>
          <div className="px-6 py-4 border-b border-border-subtle">
            <p className="font-sans text-[0.6rem] font-bold tracking-[0.18em] uppercase text-text-muted">Residual Breakdown by Tier</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Tier', 'Annual Price', 'Your Residual Rate', 'Your Annual Residual'].map(h => (
                    <th key={h} className="text-left px-6 py-3 font-sans text-[0.58rem] font-bold tracking-[0.14em] uppercase text-text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIERS.map((t, i) => (
                  <tr key={t} style={i < TIERS.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.06)' } : {}}>
                    <td className="px-6 py-4 font-sans text-[0.85rem] font-semibold text-text-primary">{t}</td>
                    <td className="px-6 py-4 font-sans text-[0.85rem] text-text-secondary">{TIER_DATA[t].price}</td>
                    <td className="px-6 py-4 font-sans text-[0.85rem] text-text-secondary">8%</td>
                    <td className="px-6 py-4 font-serif font-semibold" style={{ fontSize: '1rem', color: '#C4A24A' }}>{fmt(TIER_DATA[t].residual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── SPRINT BONUSES ── */}
      <div>
        <Eyebrow>Sprint Bonuses</Eyebrow>
        <Heading>The game within the game.</Heading>
        <div className="rounded-sm border border-border-subtle overflow-hidden mb-4" style={{ background: '#111112' }}>
          {SPRINTS.map(({ trigger, bonus }, i) => (
            <div key={trigger} className="flex items-center justify-between px-6 py-4" style={i < SPRINTS.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.06)' } : {}}>
              <span className="font-sans text-[0.85rem] text-text-secondary">{trigger}</span>
              <span className="font-serif font-semibold" style={{ fontSize: '1.1rem', color: '#C4A24A', letterSpacing: '-0.02em' }}>+{bonus}</span>
            </div>
          ))}
        </div>
        <p className="font-serif italic text-text-muted" style={{ fontSize: '0.88rem' }}>Sprint bonuses are paid in addition to all standard commissions and residuals.</p>
      </div>

      {/* ── RANKS ── */}
      <div>
        <Eyebrow>Rank Structure</Eyebrow>
        <Heading>Every activation moves you forward.</Heading>
        <div className="rounded-sm border border-border-subtle overflow-hidden" style={{ background: '#111112' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Rank', 'Activations', 'Commission', 'Override', 'Unlocks'].map(h => (
                    <th key={h} className="text-left px-5 py-3 font-sans text-[0.58rem] font-bold tracking-[0.14em] uppercase text-text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RANKS.map(({ title, range, rate, override, notes }, i) => (
                  <tr key={title} style={i < RANKS.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.06)' } : {}}>
                    <td className="px-5 py-4 font-sans text-[0.78rem] font-semibold text-text-primary whitespace-nowrap">{title}</td>
                    <td className="px-5 py-4 font-sans text-[0.78rem] text-text-secondary">{range}</td>
                    <td className="px-5 py-4 font-sans text-[0.78rem] font-semibold" style={{ color: '#C4A24A' }}>{rate}</td>
                    <td className="px-5 py-4 font-sans text-[0.78rem] text-text-secondary">{override}</td>
                    <td className="px-5 py-4 font-sans text-[0.75rem] text-text-muted leading-[1.6]">{notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── PAYMENT SCHEDULE ── */}
      <div>
        <Eyebrow>Payment Schedule</Eyebrow>
        <Heading>When you get paid.</Heading>
        <div className="rounded-sm border border-border-subtle p-8" style={{ background: '#111112' }}>
          <div className="flex flex-col gap-5">
            {[
              { label: 'Founding commissions', detail: 'Paid within 5 business days of Founding completion and payment clearance.'                  },
              { label: 'Monthly residuals',     detail: 'Paid on the 15th of each month for all active accounts from the prior period.'             },
              { label: 'Sprint bonuses',        detail: "Paid with the following month's residual cycle after sprint verification."                 },
              { label: 'Override commissions',  detail: 'Paid monthly with residuals. Requires Senior Archivist rank or above.'                    },
            ].map(({ label, detail }) => (
              <div key={label} className="flex gap-4">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-0.5" aria-hidden="true">
                  <path d="M2.5 7l3 3L11.5 4" stroke="#C4A24A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div>
                  <p className="font-sans text-[0.82rem] font-semibold text-text-primary mb-0.5">{label}</p>
                  <p className="font-sans text-[0.78rem] text-text-muted leading-[1.6]">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
