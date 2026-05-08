'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { certificationModules } from '@/lib/certificationContent'

const MONO = '"Space Mono", "Courier New", monospace'
const SERIF = '"Cormorant Garamond", Georgia, serif'

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

type CertData = {
  module_1_status:    string; module_1_score: number | null; module_1_passed_at: string | null; module_1_attempts: number
  module_2_status:    string; module_2_score: number | null; module_2_passed_at: string | null; module_2_attempts: number
  module_3_status:    string; module_3_score: number | null; module_3_passed_at: string | null; module_3_attempts: number
  certified_at:       string | null
  retry_available_at: string | null
}

type ModuleMeta = { number: number; title: string; subtitle: string; estimatedMinutes: number }

const META: ModuleMeta[] = [1, 2, 3].map(n => {
  const m = certificationModules[n]
  return { number: n, title: m.title, subtitle: m.subtitle, estimatedMinutes: m.estimatedMinutes }
})

function retryLabel(retryAt: string | null): string {
  if (!retryAt) return 'RETRY'
  const diff = new Date(retryAt).getTime() - Date.now()
  if (diff <= 0) return 'RETRY'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return h > 0 ? `RETRY IN ${h}h ${m}m` : `RETRY IN ${m}m`
}

function StatusBadge({ status, retryAt }: { status: string; retryAt?: string | null }) {
  const cfg: Record<string, { label: string; color: string; bg: string; pulse?: boolean }> = {
    locked:      { label: 'LOCKED',      color: C.ghost,  bg: 'transparent'              },
    available:   { label: 'AVAILABLE',   color: C.gold,   bg: 'rgba(196,162,74,0.08)', pulse: true },
    in_progress: { label: 'IN PROGRESS', color: C.gold,   bg: 'rgba(196,162,74,0.12)'    },
    passed:      { label: '✓ PASSED',    color: C.green,  bg: 'rgba(76,175,80,0.08)'     },
    failed:      { label: 'FAILED',      color: C.red,    bg: 'rgba(229,115,115,0.06)'   },
  }
  const c = cfg[status] ?? cfg.locked
  return (
    <span
      style={{
        fontFamily:    MONO,
        fontSize:      '0.52rem',
        letterSpacing: '0.2em',
        color:         c.color,
        background:    c.bg,
        border:        `1px solid ${c.color}30`,
        padding:       '3px 9px',
        animation:     c.pulse ? 'certPulse 2.2s ease-in-out infinite' : 'none',
      }}
    >
      {status === 'failed' && retryAt ? retryLabel(retryAt) : c.label}
    </span>
  )
}

function ModuleCard({ meta, cert }: { meta: ModuleMeta; cert: CertData | null }) {
  const statusKey  = `module_${meta.number}_status`  as keyof CertData
  const scoreKey   = `module_${meta.number}_score`   as keyof CertData
  const passedKey  = `module_${meta.number}_passed_at` as keyof CertData

  const status   = (cert?.[statusKey]  as string)         ?? (meta.number === 1 ? 'available' : 'locked')
  const score    = (cert?.[scoreKey]   as number | null)  ?? null
  const passedAt = (cert?.[passedKey]  as string | null)  ?? null

  const isLocked = status === 'locked'
  const isPassed = status === 'passed'
  const isFailed = status === 'failed'

  const borderColor = isPassed ? C.green : status === 'available' ? C.gold : 'transparent'
  const topColor    = isPassed ? C.green : status === 'available' || status === 'in_progress' ? C.gold : C.ghost

  return (
    <div style={{
      background:  C.surface,
      border:      `1px solid ${borderColor || C.border}`,
      borderTop:   `3px solid ${topColor}`,
      opacity:     isLocked ? 0.45 : 1,
      transition:  'opacity 0.25s',
      padding:     '28px 32px',
      display:     'flex',
      gap:         '24px',
      alignItems:  'flex-start',
      flexWrap:    'wrap',
    }}>
      <div style={{ flex: 1, minWidth: '200px' }}>
        {/* Eyebrow row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.3em', color: C.ghost }}>
            MODULE {meta.number}
          </span>
          <StatusBadge status={status} retryAt={cert?.retry_available_at} />
          {score !== null && (
            <span style={{ fontFamily: MONO, fontSize: '0.52rem', letterSpacing: '0.1em', color: isPassed ? C.green : C.red }}>
              {score}/100
            </span>
          )}
        </div>

        {/* Title */}
        <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(1.2rem,2.5vw,1.55rem)', fontWeight: 300, fontStyle: 'italic', color: isLocked ? C.ghost : C.text, marginBottom: '8px', lineHeight: 1.2 }}>
          {meta.title.replace('THE ', '')}
        </h2>
        <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.95rem', color: C.dim, lineHeight: 1.7, marginBottom: '10px' }}>
          {meta.subtitle}
        </p>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.12em', color: C.ghost }}>
            {meta.estimatedMinutes} min read · exam included
          </span>
          {passedAt && (
            <span style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.1em', color: C.green }}>
              Passed {new Date(passedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      {/* CTA */}
      {!isLocked && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          {isPassed ? (
            <Link href={`/archivist/certification/${meta.number}`} style={{ fontFamily: MONO, fontSize: '0.58rem', letterSpacing: '0.14em', color: C.dim, border: `1px solid ${C.border}`, padding: '10px 20px', textDecoration: 'none' }}>
              REVIEW
            </Link>
          ) : isFailed ? (
            <Link href={`/archivist/certification/${meta.number}/exam`} style={{ fontFamily: MONO, fontSize: '0.58rem', letterSpacing: '0.14em', color: C.red, border: `1px solid ${C.red}30`, padding: '10px 20px', textDecoration: 'none' }}>
              RETRY EXAM →
            </Link>
          ) : (
            <Link href={`/archivist/certification/${meta.number}`} style={{ fontFamily: MONO, fontSize: '0.6rem', letterSpacing: '0.18em', color: '#0A0908', background: C.gold, padding: '12px 24px', textDecoration: 'none' }}>
              {status === 'in_progress' ? 'CONTINUE →' : 'BEGIN MODULE →'}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

function CertifiedBadge({ certifiedAt }: { certifiedAt: string }) {
  return (
    <div style={{
      marginTop:   '52px',
      textAlign:   'center',
      padding:     '52px 32px',
      background:  'linear-gradient(180deg, rgba(196,162,74,0.04) 0%, rgba(196,162,74,0.08) 100%)',
      border:      '1px solid rgba(196,162,74,0.25)',
      animation:   'certFadeIn 1.2s ease forwards',
    }}>
      {/* Diamond sigil */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
        <div style={{ position: 'relative', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', width: '48px', height: '48px', border: '1px solid rgba(196,162,74,0.3)', transform: 'rotate(45deg)' }} />
          <div style={{ position: 'absolute', width: '32px', height: '32px', border: '1px solid rgba(196,162,74,0.6)', transform: 'rotate(45deg)' }} />
          <div style={{ width: '14px', height: '14px', background: C.gold, transform: 'rotate(45deg)' }} />
        </div>
      </div>

      <p style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.4em', textTransform: 'uppercase', color: C.gold, marginBottom: '14px' }}>
        Heritage Nexus Inc.
      </p>
      <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 300, fontStyle: 'italic', color: C.text, lineHeight: 1.2, marginBottom: '12px' }}>
        Certified Legacy Guide
      </h2>
      <p style={{ fontFamily: MONO, fontSize: '0.52rem', letterSpacing: '0.18em', color: C.dim }}>
        Certified {new Date(certifiedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      </p>
    </div>
  )
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

  const allPassed  = cert?.certified_at != null
  const modsPassed = [1, 2, 3].filter(n => {
    const k = `module_${n}_status` as keyof CertData
    return cert?.[k] === 'passed'
  }).length

  return (
    <div style={{ padding: 'clamp(24px,5vw,52px)', maxWidth: '820px' }}>

      <style>{`
        @keyframes certPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes certFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '48px' }}>
        <p style={{ fontFamily: MONO, fontSize: '0.52rem', letterSpacing: '0.32em', textTransform: 'uppercase', color: C.dim, marginBottom: '10px' }}>
          Certification Path
        </p>
        <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 300, fontStyle: 'italic', color: C.text, marginBottom: '14px', lineHeight: 1.2 }}>
          Become a Certified Legacy Guide.
        </h1>
        <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1.05rem', color: C.dim, lineHeight: 1.85 }}>
          Three written modules. Each one is a complete reading experience — philosophy, technique, and custodianship. Complete all three to unlock full dashboard access and commission tracking.
        </p>
        {!allPassed && cert && (
          <p style={{ fontFamily: MONO, fontSize: '0.52rem', letterSpacing: '0.12em', color: modsPassed > 0 ? C.gold : C.ghost, marginTop: '16px' }}>
            {modsPassed} of 3 modules passed
          </p>
        )}
      </div>

      {/* Module cards */}
      {loading ? (
        <div style={{ height: '260px', background: C.surface, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontFamily: MONO, fontSize: '0.6rem', letterSpacing: '0.22em', color: C.dim }}>Loading…</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {META.map(meta => (
            <ModuleCard key={meta.number} meta={meta} cert={cert} />
          ))}
        </div>
      )}

      {/* Certification badge — revealed after all three passed */}
      {allPassed && cert?.certified_at && (
        <CertifiedBadge certifiedAt={cert.certified_at} />
      )}

      {/* Footer note */}
      {!allPassed && !loading && (
        <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.88rem', color: C.ghost, lineHeight: 1.8, marginTop: '28px' }}>
          Each module unlocks the next after passing the exam. Passing score is 80 or above. Open-text answers are graded by Claude on understanding, clarity, and the ability to explain concepts to a real family.
        </p>
      )}
    </div>
  )
}
