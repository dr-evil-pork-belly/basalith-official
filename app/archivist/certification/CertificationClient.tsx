'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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

const monoFont = '"Space Mono", "Courier New", monospace'
const bodyFont = '"Cormorant Garamond", "Georgia", serif'

const MODULES = [
  {
    number:      1,
    title:       'The Basalith Philosophy',
    description: 'What this is. What it is not. Why every deposit matters. Your role in a process that technology alone cannot complete.',
    minutes:     20,
  },
  {
    number:      2,
    title:       'The Art of the Session',
    description: 'The 90 minutes that build everything. How to open, how to go deep, how to handle difficulty, how to close in a way that keeps them engaged for years.',
    minutes:     25,
  },
  {
    number:      3,
    title:       'Technical Custodianship',
    description: 'What you can and cannot see. How to submit a client, read archive health, and build a practice that generates meaningful recurring income.',
    minutes:     15,
  },
]

type CertData = {
  module_1_status: string; module_1_score: number | null; module_1_passed_at: string | null
  module_2_status: string; module_2_score: number | null; module_2_passed_at: string | null
  module_3_status: string; module_3_score: number | null; module_3_passed_at: string | null
  certified_at: string | null
}

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, { label: string; color: string; bg: string }> = {
    locked:      { label: 'Locked',       color: C.ghost,  bg: 'rgba(255,255,255,0.02)' },
    available:   { label: 'Begin',        color: C.gold,   bg: 'rgba(196,162,74,0.08)'  },
    in_progress: { label: 'Continue',     color: C.gold,   bg: 'rgba(196,162,74,0.1)'   },
    passed:      { label: '✓ Passed',     color: C.green,  bg: 'rgba(76,175,80,0.08)'   },
    failed:      { label: 'Retry',        color: C.red,    bg: 'rgba(229,115,115,0.06)' },
  }
  const c = cfg[status] ?? cfg.locked
  return (
    <span style={{ fontFamily: monoFont, fontSize: '0.54rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: c.color, background: c.bg, border: `1px solid ${c.color}25`, padding: '4px 10px' }}>
      {c.label}
    </span>
  )
}

function ctaLabel(status: string): string {
  if (status === 'passed')      return 'Review'
  if (status === 'failed')      return 'Retry'
  if (status === 'in_progress') return 'Continue'
  if (status === 'available')   return 'Begin'
  return ''
}

export default function CertificationClient({ archivistId }: { archivistId: string }) {
  const [cert,    setCert]    = useState<CertData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/archivist/certification?archivistId=${archivistId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCert(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [archivistId])

  const certified = cert?.certified_at != null

  return (
    <div style={{ padding: 'clamp(24px,5vw,48px)', maxWidth: '840px' }}>

      {/* Header */}
      <div style={{ marginBottom: '48px' }}>
        <p style={{ fontFamily: monoFont, fontSize: '0.56rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: C.dim, marginBottom: '10px' }}>
          Certification
        </p>
        <h1 style={{ fontFamily: bodyFont, fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 300, fontStyle: 'italic', color: C.text, marginBottom: '14px' }}>
          Become a Certified Legacy Guide.
        </h1>
        <p style={{ fontFamily: bodyFont, fontSize: '1.05rem', fontStyle: 'italic', color: C.dim, lineHeight: 1.8 }}>
          Three modules. Each one is a long-form reading experience with inline questions and a final exam. Complete all three to unlock full dashboard access and commission tracking.
        </p>
      </div>

      {/* Certified badge */}
      {certified && (
        <div style={{ background: 'rgba(196,162,74,0.05)', border: '1px solid rgba(196,162,74,0.2)', borderTop: '3px solid #C4A24A', padding: '24px 28px', marginBottom: '40px' }}>
          <p style={{ fontFamily: monoFont, fontSize: '0.56rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: C.gold, marginBottom: '6px' }}>
            Certified Legacy Guide
          </p>
          <p style={{ fontFamily: bodyFont, fontStyle: 'italic', fontSize: '1.05rem', color: C.muted, lineHeight: 1.7 }}>
            You have completed all three modules.
            {cert?.certified_at && ` Certified ${new Date(cert.certified_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`}
          </p>
        </div>
      )}

      {/* Module cards */}
      {loading ? (
        <div style={{ height: '240px', background: C.surface, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontFamily: monoFont, fontSize: '0.62rem', letterSpacing: '0.2em', color: C.dim }}>Loading…</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {MODULES.map(mod => {
            const statusKey   = `module_${mod.number}_status`  as keyof CertData
            const scoreKey    = `module_${mod.number}_score`   as keyof CertData
            const passedKey   = `module_${mod.number}_passed_at` as keyof CertData
            const status      = (cert?.[statusKey] as string)  ?? (mod.number === 1 ? 'available' : 'locked')
            const score       = cert?.[scoreKey]  as number | null ?? null
            const passedAt    = cert?.[passedKey] as string | null ?? null

            const isLocked    = status === 'locked'
            const hasCta      = !isLocked
            const isPassed    = status === 'passed'
            const cta         = ctaLabel(status)

            return (
              <div
                key={mod.number}
                style={{
                  background:  C.surface,
                  border:      `1px solid ${isPassed ? 'rgba(76,175,80,0.15)' : status === 'available' ? 'rgba(196,162,74,0.15)' : C.border}`,
                  borderTop:   `3px solid ${isPassed ? C.green : status === 'available' ? C.gold : C.ghost}`,
                  opacity:     isLocked ? 0.45 : 1,
                  transition:  'opacity 0.2s',
                }}
              >
                <div style={{ padding: '24px 28px', display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
                  {/* Left: content */}
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: monoFont, fontSize: '0.52rem', letterSpacing: '0.22em', color: C.ghost }}>
                        MODULE {mod.number}
                      </span>
                      <StatusPill status={status} />
                      {score !== null && (
                        <span style={{ fontFamily: monoFont, fontSize: '0.56rem', color: isPassed ? C.green : C.red }}>
                          {score}/100
                        </span>
                      )}
                    </div>

                    <h2 style={{ fontFamily: bodyFont, fontSize: '1.25rem', fontStyle: 'italic', fontWeight: 300, color: isLocked ? C.ghost : C.text, marginBottom: '8px' }}>
                      {mod.title}
                    </h2>

                    <p style={{ fontFamily: bodyFont, fontStyle: 'italic', fontSize: '0.95rem', color: C.dim, lineHeight: 1.7, marginBottom: '8px' }}>
                      {mod.description}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <p style={{ fontFamily: monoFont, fontSize: '0.54rem', letterSpacing: '0.12em', color: C.ghost }}>
                        {mod.minutes} min read · Exam included
                      </p>
                      {passedAt && (
                        <p style={{ fontFamily: monoFont, fontSize: '0.52rem', color: C.green }}>
                          Passed {new Date(passedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: CTA */}
                  {hasCta && (
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                      <Link
                        href={`/archivist/certification/${mod.number}`}
                        style={{ fontFamily: monoFont, fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: isPassed ? C.dim : '#0A0908', background: isPassed ? 'transparent' : C.gold, border: isPassed ? `1px solid ${C.border}` : 'none', padding: '12px 24px', textDecoration: 'none', display: 'block' }}
                      >
                        {cta} →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Progress note */}
      {!certified && !loading && (
        <p style={{ fontFamily: bodyFont, fontStyle: 'italic', fontSize: '0.9rem', color: C.ghost, lineHeight: 1.7, marginTop: '28px' }}>
          Each module unlocks the next after passing. You must score 80 or above on the final exam to pass. Open-text answers are scored by Claude on clarity, accuracy, and the ability to explain to a real family.
        </p>
      )}

    </div>
  )
}
