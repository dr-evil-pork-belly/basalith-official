'use client'

import { useEffect, useState } from 'react'

// The owner's coverage map: a map of absence by decision domain, measured by
// probing the entity and reading the verifier, never inferred from deposit
// counts. Renders what GET /api/archive/coverage returns, labels included, and
// draws nothing that looks like a score. Every text color here is measured
// against the portal's dark ground (table in globals.css).

type Domain = {
  domain:        string
  description:   string
  countLine:     string
  stateLabel:    string
  state:         'backed' | 'partial' | 'open'
  overreachLine: string | null
  held:          boolean
  deposit:       number
  total:         number
}

type Coverage =
  | { available: false; reason: 'not_succession' | 'off_label' | 'no_reading' }
  | { available: true; domains: Domain[]; computedAt: string; probeSet: string; complete: boolean; explainer: string; caveat: string }

const SERIF = '"Cormorant Garamond",Georgia,serif'
const MONO  = '"Space Mono","Courier New",monospace'
const GOLD  = '#C4A24A'
const BONE  = 'rgba(250,248,244,0.9)'
const BODY  = 'rgba(250,248,244,0.62)'
const LABEL = 'rgba(250,248,244,0.55)'

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  } catch {
    return ''
  }
}

export default function CoverageMap() {
  const [coverage, setCoverage] = useState<Coverage | null>(null)
  const [failed,   setFailed]   = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/archive/coverage', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(d => { if (active) setCoverage(d as Coverage) })
      .catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [])

  // A personal archive has no on-label probe set yet: render nothing rather
  // than a business map that would mislead.
  if (coverage && !coverage.available && coverage.reason !== 'no_reading') return null

  return (
    <section
      aria-label="Coverage map"
      className="rounded-sm mb-10"
      style={{ background: '#111112', border: '1px solid rgba(255,255,255,0.06)', padding: 'clamp(1.5rem,4vw,2rem)' }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '6px' }}>
        <p style={{ fontFamily: MONO, fontSize: '0.6rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: GOLD }}>
          Where your archive is thin
        </p>
        {coverage?.available && (
          <p style={{ fontFamily: MONO, fontSize: '0.56rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: LABEL }}>
            Read {fmtDate(coverage.computedAt)} · question set {coverage.probeSet}
          </p>
        )}
      </div>
      <p style={{ fontFamily: SERIF, fontSize: '1.05rem', fontWeight: 300, color: BODY, lineHeight: 1.7, marginBottom: '22px', maxWidth: '640px' }}>
        Each domain is put to your entity as a fixed set of questions an operator in that domain has had to answer. A question counts only when the answer came from something you deposited, checked against your archive. This is a map of where your archive is still silent.
      </p>

      {failed && (
        <p role="alert" style={{ fontFamily: SERIF, fontSize: '1rem', color: '#D98C8C' }}>Could not load the coverage map right now.</p>
      )}

      {!failed && coverage === null && (
        <div style={{ height: '96px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px' }} />
      )}

      {coverage && !coverage.available && coverage.reason === 'no_reading' && (
        <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1.05rem', color: BODY, lineHeight: 1.7, margin: 0 }}>
          No reading yet. The first one runs after the Founding Sequence is complete, and the map is read again each month.
        </p>
      )}

      {coverage?.available && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '2px' }}>
            {coverage.domains.map(d => {
              const tint = d.state === 'backed' ? 'rgba(196,162,74,0.07)' : d.state === 'partial' ? 'rgba(196,162,74,0.035)' : 'rgba(250,248,244,0.025)'
              const rule = d.state === 'backed' ? 'rgba(196,162,74,0.4)' : d.state === 'partial' ? 'rgba(196,162,74,0.2)' : 'rgba(250,248,244,0.12)'
              return (
                <div key={d.domain} style={{ padding: '18px 20px', background: tint, border: `1px solid ${rule}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', marginBottom: '6px' }}>
                    <p style={{ fontFamily: SERIF, fontSize: '1.2rem', fontWeight: 400, color: BONE, margin: 0 }}>{d.domain}</p>
                    <p style={{ fontFamily: MONO, fontSize: '0.54rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: d.state === 'open' ? LABEL : GOLD, margin: 0, whiteSpace: 'nowrap' }}>
                      {d.stateLabel}
                    </p>
                  </div>
                  <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.95rem', fontWeight: 300, color: LABEL, lineHeight: 1.5, margin: '0 0 10px' }}>
                    {d.description}
                  </p>
                  {/* Six marks, one per question. Filled = grounded. No bar, no percent. */}
                  <div aria-hidden="true" style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
                    {Array.from({ length: d.total }).map((_, i) => (
                      <span key={i} style={{ width: '14px', height: '6px', borderRadius: '1px', background: i < d.deposit ? GOLD : 'rgba(250,248,244,0.12)' }} />
                    ))}
                  </div>
                  <p style={{ fontFamily: SERIF, fontSize: '1rem', fontWeight: 300, color: BONE, lineHeight: 1.6, margin: 0 }}>
                    {d.countLine}{d.held ? ' (held from the last reading)' : ''}
                  </p>
                  {d.overreachLine && (
                    <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.95rem', fontWeight: 300, color: BODY, lineHeight: 1.6, margin: '6px 0 0' }}>
                      {d.overreachLine}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          <p style={{ fontFamily: SERIF, fontSize: '0.98rem', fontWeight: 300, color: BODY, lineHeight: 1.7, margin: '18px 0 0', maxWidth: '640px' }}>
            {coverage.explainer}
          </p>
          <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.95rem', fontWeight: 300, color: LABEL, lineHeight: 1.7, margin: '10px 0 0', maxWidth: '640px' }}>
            {coverage.caveat}{!coverage.complete ? ' This reading did not finish every question, so an open domain here is a weaker claim than usual.' : ''}
          </p>
        </>
      )}
    </section>
  )
}
