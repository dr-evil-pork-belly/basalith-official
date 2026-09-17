'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// The owner's coverage map: a map of absence by kind of judgment, measured by
// probing the entity and reading the verifier, never inferred from deposit
// counts. Renders what GET /api/archive/coverage returns, labels and copy
// included, and draws nothing that looks like a score. The API decides the
// taxonomy and the copy by archive tier; this component knows neither. Every
// text color here is measured against the portal's dark ground.

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
  | { available: false; reason: string; openArea?: string | null }
  | {
      available:  true
      /** The area of an open area call on this archive, if any. */
      openArea?:  string | null
      scope:      'business' | 'personal'
      domains:    Domain[]
      computedAt: string
      probeSet:   string
      complete:   boolean
      intro:      string
      explainer:  string | null
      caveat:     string
    }

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

export default function CoverageMap({ link }: { link?: { href: string; label: string } }) {
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

  // An off-label reading is never shown. Anything else the API declines to
  // render (a tier with no set) renders nothing rather than a wrong map.
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
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '18px', flexWrap: 'wrap' }}>
          {coverage?.available && (
            <p style={{ fontFamily: MONO, fontSize: '0.56rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: LABEL }}>
              Read {fmtDate(coverage.computedAt)} · question set {coverage.probeSet}
            </p>
          )}
          {link && (
            <Link
              href={link.href}
              className="no-underline"
              style={{ fontFamily: MONO, fontSize: '0.56rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD, whiteSpace: 'nowrap' }}
            >
              {link.label} →
            </Link>
          )}
        </div>
      </div>

      {coverage?.available && (
        <p style={{ fontFamily: SERIF, fontSize: '1.05rem', fontWeight: 300, color: BODY, lineHeight: 1.7, marginBottom: '22px', maxWidth: '640px' }}>
          {coverage.intro}
        </p>
      )}

      {failed && (
        <p role="alert" style={{ fontFamily: SERIF, fontSize: '1rem', color: '#D98C8C' }}>Could not load the coverage map right now.</p>
      )}

      {!failed && coverage === null && (
        <div style={{ height: '96px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px' }} />
      )}

      {coverage && !coverage.available && coverage.reason === 'no_reading' && (
        <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1.05rem', color: BODY, lineHeight: 1.7, margin: '8px 0 0' }}>
          No reading yet. Your archive is read once the Founding Sequence is complete, and again each month. Each reading asks your entity a fixed set of questions and counts only the answers that came from something you deposited.
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
                  {/* One mark per question. Filled = grounded. No bar, no percent. */}
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
                  {/* The way in. One incident interview aimed at this area, on
                      /archive/founding. A card whose call is already open says
                      so; any other card opens a new one, and the page explains
                      if another interview has to finish first. */}
                  {d.state !== 'backed' && (
                    <Link
                      href={`/archive/founding?area=${encodeURIComponent(d.domain)}`}
                      className="no-underline"
                      style={{ display: 'inline-block', marginTop: '12px', fontFamily: MONO, fontSize: '0.56rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: GOLD }}
                    >
                      {coverage.openArea === d.domain ? 'Continue your call' : 'Deposit here'} →
                    </Link>
                  )}
                </div>
              )
            })}
          </div>

          {coverage.explainer && (
            <p style={{ fontFamily: SERIF, fontSize: '0.98rem', fontWeight: 300, color: BODY, lineHeight: 1.7, margin: '18px 0 0', maxWidth: '640px' }}>
              {coverage.explainer}
            </p>
          )}
          <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.95rem', fontWeight: 300, color: LABEL, lineHeight: 1.7, margin: `${coverage.explainer ? 10 : 18}px 0 0`, maxWidth: '640px' }}>
            {coverage.caveat}{!coverage.complete ? ' This reading did not finish every question, so an open area here is a weaker claim than usual.' : ''}
          </p>
        </>
      )}
    </section>
  )
}
