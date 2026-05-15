'use client'

import { useState } from 'react'

type SubmitResult = {
  archiveId:   string
  archiveName: string
  clientEmail: string
  tierLabel:   string
  billing:     string
  totalDue:    number
}

const LABEL: React.CSSProperties = {
  display:       'block',
  fontFamily:    "'Space Mono', 'DM Mono', monospace",
  fontSize:      '0.42rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase' as const,
  color:         '#5C6166',
  marginBottom:  '0.5rem',
}

const HELPER: React.CSSProperties = {
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontSize:   '0.8rem',
  fontStyle:  'italic',
  color:      '#3A3F44',
  marginTop:  '0.4rem',
}

const INPUT: React.CSSProperties = {
  width:        '100%',
  background:   'rgba(255,255,255,0.02)',
  border:       '1px solid rgba(255,255,255,0.07)',
  borderRadius: '2px',
  outline:      'none',
  fontFamily:   "'Cormorant Garamond', Georgia, serif",
  fontSize:     '0.95rem',
  color:        '#F0EDE6',
  padding:      '0.55rem 0.75rem',
  lineHeight:   1.4,
}

function Sigil() {
  return (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="20" y="3"  width="12" height="12" transform="rotate(45 20 3)"  fill="none" stroke="rgba(196,162,74,0.45)" strokeWidth="1"/>
      <rect x="20" y="10" width="8"  height="8"  transform="rotate(45 20 10)" fill="none" stroke="rgba(196,162,74,0.75)" strokeWidth="1"/>
      <rect x="20" y="16" width="4"  height="4"  transform="rotate(45 20 16)" fill="rgba(196,162,74,0.95)"/>
    </svg>
  )
}

const TIER_LABELS: Record<string, { label: string; annualPrice: string; monthlyPrice: string; oneTime?: boolean; note?: string }> = {
  active:  { label: 'Active',  annualPrice: '$3,600/yr', monthlyPrice: '$360/mo' },
  resting: { label: 'Resting', annualPrice: '$600/yr',   monthlyPrice: '$60/mo',  note: 'For clients who want to preserve data without full engagement features.' },
  legacy:  { label: 'Legacy',  annualPrice: '$1,200/yr', monthlyPrice: '$1,200/yr', note: 'For families of someone who has passed. Annual billing only — billed to estate or family.' },
}

const FOUNDING_FEE = 2500
const ANNUAL_PRICES:  Record<string, number> = { active: 3600, resting: 600, legacy: 1200 }
const MONTHLY_PRICES: Record<string, number> = { active: 360,  resting: 60,  legacy: 0    }

const RELATIONSHIP_OPTIONS = [
  { value: 'referral',              label: 'Referral'               },
  { value: 'existing_relationship', label: 'Existing relationship'  },
  { value: 'cold_outreach',         label: 'Cold outreach'          },
  { value: 'family_friend',         label: 'Family friend'          },
]

export default function OnboardClient({ archivistId }: { archivistId: string }) {
  const [form, setForm] = useState({
    familyName:       '',
    clientName:       '',
    clientEmail:      '',
    phone:            '',
    tier:             'active',
    billing:          'annual',
    relationshipType: 'referral',
    notes:            '',
  })
  const [birthYear, setBirthYear] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result,     setResult]     = useState<SubmitResult | null>(null)
  const [error,      setError]      = useState<string | null>(null)

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  const tierInfo     = TIER_LABELS[form.tier] ?? TIER_LABELS.active
  const isLegacy     = form.tier === 'legacy'
  const firstPeriod  = isLegacy
    ? ANNUAL_PRICES.legacy
    : form.billing === 'annual'
      ? ANNUAL_PRICES[form.tier]  ?? 3600
      : MONTHLY_PRICES[form.tier] ?? 360
  const totalDue = FOUNDING_FEE + firstPeriod

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/archivist/submit-client', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ archivistId, ...form, birthYear: birthYear ? parseInt(birthYear) : null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit client')
      setResult(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setForm({ familyName: '', clientName: '', clientEmail: '', phone: '', tier: 'active', billing: 'annual', relationshipType: 'referral', notes: '' })
    setBirthYear('')
    setResult(null)
    setError(null)
  }

  return (
    <div style={{ maxWidth: '560px' }}>

      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.42rem', letterSpacing: '0.25em', textTransform: 'uppercase' as const, color: '#C4A24A', marginBottom: '0.5rem' }}>
          New Client
        </p>
        <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 700, fontSize: '1.6rem', color: '#F0EDE6', lineHeight: 1.15, margin: '0 0 0.5rem' }}>
          Submit Client for Review
        </h1>
        <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '0.95rem', fontStyle: 'italic', color: '#9DA3A8', lineHeight: 1.7, margin: 0 }}>
          Submit the client's details. A payment email is sent to them automatically.
          The archive activates when their founding investment is complete.
        </p>
      </div>

      {result ? (
        <div style={{ background: 'rgba(196,162,74,0.05)', border: '1px solid rgba(196,162,74,0.2)', borderTop: '2px solid rgba(196,162,74,0.6)', borderRadius: '2px', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <Sigil />
          </div>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 700, fontSize: '1.3rem', color: '#F0EDE6', margin: '0 0 0.5rem', textAlign: 'center' }}>
            {result.archiveName}
          </p>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: 'italic', fontSize: '1rem', color: '#C4A24A', margin: '0 0 1.5rem', textAlign: 'center' }}>
            Submitted. Awaiting client payment.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '2px', padding: '1rem 1.25rem' }}>
            {[
              ['CLIENT',  result.clientEmail],
              ['TIER',    `${result.tierLabel} — ${result.billing === 'annual' ? 'Annual' : 'Monthly'}`],
              ['DUE',     `$${result.totalDue.toLocaleString('en-US')} (founding + first ${result.billing === 'annual' ? 'year' : 'month'})`],
              ['STATUS',  'Payment email sent to client'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline' }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.38rem', letterSpacing: '0.2em', color: '#5C6166', flexShrink: 0, width: '60px' }}>{k}</span>
                <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '0.9rem', color: k === 'STATUS' ? '#4CAF50' : '#B8B4AB' }}>{v}</span>
              </div>
            ))}
          </div>

          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '0.88rem', fontStyle: 'italic', color: '#9DA3A8', lineHeight: 1.7, margin: '0 0 1.5rem' }}>
            Follow up within 24 hours to discuss the Founding Session.
            The archive activates as soon as the client completes payment.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' as const }}>
            <a
              href="/archivist/pipeline"
              style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.42rem', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#C4A24A', textDecoration: 'none', border: '1px solid rgba(196,162,74,0.4)', padding: '0.5rem 1rem' }}
            >
              View in Pipeline →
            </a>
            <button
              onClick={reset}
              style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.42rem', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#5C6166', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', padding: '0.5rem 1rem', cursor: 'pointer' }}
            >
              Submit Another →
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          {/* Family + Client name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={LABEL}>Family Name</label>
              <input type="text" required placeholder="Morrison" value={form.familyName} onChange={set('familyName')} style={INPUT} />
              <p style={HELPER}>The {form.familyName || 'Morrison'} Archive</p>
            </div>
            <div>
              <label style={LABEL}>Client Name</label>
              <input type="text" required placeholder="Margaret Morrison" value={form.clientName} onChange={set('clientName')} style={INPUT} />
            </div>
          </div>

          {/* Email + Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={LABEL}>Client Email</label>
              <input type="email" required placeholder="margaret@email.com" value={form.clientEmail} onChange={set('clientEmail')} style={INPUT} />
              <p style={HELPER}>Payment email sent here</p>
            </div>
            <div>
              <label style={LABEL}>Phone (optional)</label>
              <input type="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={set('phone')} style={INPUT} />
            </div>
          </div>

          {/* Tier */}
          <div>
            <label style={LABEL}>Stewardship Tier</label>
            <select value={form.tier} onChange={set('tier')} style={{ ...INPUT, cursor: 'pointer' }}>
              <option value="active">Active — {TIER_LABELS.active.annualPrice} / {TIER_LABELS.active.monthlyPrice}</option>
              <option value="resting">Resting — {TIER_LABELS.resting.annualPrice} / {TIER_LABELS.resting.monthlyPrice}</option>
              <option value="legacy">Legacy — {TIER_LABELS.legacy.annualPrice} annual</option>
            </select>
            {tierInfo.note && (
              <p style={HELPER}>{tierInfo.note}</p>
            )}
          </div>

          {/* Billing — hidden for Legacy (always annual) */}
          {!isLegacy && (
            <div>
              <label style={LABEL}>Billing</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {(['annual', 'monthly'] as const).map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, billing: b }))}
                    style={{
                      flex:          1,
                      fontFamily:    "'Space Mono', monospace",
                      fontSize:      '0.42rem',
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase' as const,
                      padding:       '0.6rem 1rem',
                      border:        form.billing === b ? '1px solid rgba(196,162,74,0.6)' : '1px solid rgba(255,255,255,0.07)',
                      background:    form.billing === b ? 'rgba(196,162,74,0.08)' : 'transparent',
                      color:         form.billing === b ? '#C4A24A' : '#5C6166',
                      cursor:        'pointer',
                      transition:    'all 150ms ease',
                    }}
                  >
                    {b === 'annual' ? 'Annual (save 20%)' : 'Monthly'}
                  </button>
                ))}
              </div>
              <p style={HELPER}>
                {form.billing === 'annual'
                  ? `${tierInfo.label} at ${tierInfo.annualPrice}`
                  : `${tierInfo.label} at ${tierInfo.monthlyPrice}, 12-month minimum`}
              </p>
            </div>
          )}

          {/* Relationship */}
          <div>
            <label style={LABEL}>Your relationship to this family</label>
            <select value={form.relationshipType} onChange={set('relationshipType')} style={{ ...INPUT, cursor: 'pointer' }}>
              {RELATIONSHIP_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Birth Year */}
          <div>
            <label style={LABEL}>Birth Year (optional)</label>
            <input
              type="number"
              min={1900}
              max={new Date().getFullYear()}
              placeholder="e.g. 1949"
              value={birthYear}
              onChange={e => setBirthYear(e.target.value)}
              style={{ ...INPUT, fontFamily: "'Space Mono', monospace", fontSize: '0.6rem' }}
            />
            <p style={HELPER}>Used to build the life timeline. Optional but recommended.</p>
          </div>

          {/* Notes */}
          <div>
            <label style={LABEL}>Notes (optional)</label>
            <textarea
              rows={3}
              placeholder="Why this family. Any context that matters."
              value={form.notes}
              onChange={set('notes')}
              style={{ ...INPUT, resize: 'none' as const }}
            />
          </div>

          {/* Total due preview */}
          <div style={{ background: 'rgba(196,162,74,0.04)', border: '1px solid rgba(196,162,74,0.12)', borderRadius: '2px', padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.42rem', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#5C6166' }}>
                Client will be invoiced
              </span>
              <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.4rem', color: '#C4A24A', letterSpacing: '-0.02em' }}>
                ${totalDue.toLocaleString('en-US')}
              </span>
            </div>
            <p style={{ ...HELPER, marginTop: '0.25rem', fontSize: '0.75rem' }}>
              {isLegacy
                ? `$2,500 founding fee + $1,200/year Legacy (annual, billed to estate or family)`
                : `$2,500 founding fee + ${form.billing === 'annual' ? 'first year' : 'first month'} (${tierInfo.label})`}
            </p>
          </div>

          {error && (
            <div style={{ background: 'rgba(255,80,80,0.06)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '2px', padding: '0.75rem 1rem' }}>
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.52rem', color: '#9DA3A8', margin: 0 }}>
                {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              fontFamily:    "'Space Mono', 'DM Mono', monospace",
              fontSize:      '0.44rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase' as const,
              background:    submitting ? 'rgba(196,162,74,0.5)' : '#C4A24A',
              color:         '#0A0908',
              border:        'none',
              padding:       '0.9rem 1.5rem',
              cursor:        submitting ? 'not-allowed' : 'pointer',
              width:         '100%',
              transition:    'background 0.2s',
            }}
          >
            {submitting ? 'Submitting…' : 'Submit for Review'}
          </button>

        </form>
      )}
    </div>
  )
}
