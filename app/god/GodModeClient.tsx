'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ── Types ──────────────────────────────────────────────────────────────────────

type AlertItem = {
  severity:  'critical' | 'warning' | 'info'
  message:   string
  action:    string
  actionUrl: string
}

type ArchiveData = {
  id:                  string
  name:                string
  familyName:          string
  ownerName:           string
  ownerEmail:          string
  tier:                string
  status:              string
  createdAt:           string
  daysSinceCreated:    number
  photoCount:          number
  labeledPhotoCount:   number
  contributorCount:    number
  depositCount:        number
  entityConversations: number
  lastEmailSent:       string | null
  entityDepth:         number
  health:              'green' | 'amber' | 'red'
  alerts:              AlertItem[]
  magicLinkToken:            string | null
  pausedAt:                  string | null
  scheduledDeletionAt:       string | null
  terminationRequestedAt:    string | null
  training?: {
    total:              number
    included:           number
    readyForFineTuning: boolean
    estimatedAccuracy:  string
  }
}

type ActivityItem = {
  timestamp:   string
  type:        string
  archiveName: string
  description: string
}

type GlobalAlert = AlertItem & { archiveId: string; archiveName: string }

type GodData = {
  archives:       ArchiveData[]
  recentActivity: ActivityItem[]
  alerts:         GlobalAlert[]
  revenue:        { activeArchives: number; byTier: Record<string, number>; pipelineCount: number }
  system:         { emailsSentToday: number; apiHealth: string }
  fetchedAt:      string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const mono: React.CSSProperties = { fontFamily: "'Courier New', monospace" }

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)   return 'just now'
  if (m < 60)  return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h`
  return `${Math.floor(h / 24)}d`
}

const ACTIVITY_ICONS: Record<string, string> = {
  photo_upload:  '📷',
  entity_chat:   '💬',
  label_added:   '🏷',
  email_sent:    '📧',
  deposit_made:  '💾',
  video_upload:  '🎬',
  voice_rec:     '🎙',
  contributor_added: '👤',
}

const SEVERITY_COLORS = {
  critical: '#C44A4A',
  warning:  '#C4A24A',
  info:     '#4A7FC4',
}

const HEALTH_BORDER = {
  green: 'rgba(74,196,124,0.6)',
  amber: 'rgba(196,162,74,0.6)',
  red:   'rgba(196,74,74,0.6)',
}

const CRON_BUTTONS = [
  { label: 'DAILY PHOTOS',      route: 'send-photos' },
  { label: 'WEEKLY PROMPT',     route: 'weekly-prompt' },
  { label: 'MONDAY MYSTERY',    route: 'story-prompt-monday' },
  { label: 'FRIDAY REVEAL',     route: 'story-prompt-friday' },
  { label: 'MONTHLY REPORT',    route: 'monthly-report' },
  { label: 'GRATITUDE NOTE',    route: 'gratitude-note' },
  { label: 'MEMORY GAME',       route: 'memory-game' },
  { label: 'GAME REMINDER',     route: 'memory-game-reminder' },
  { label: 'GAME SUMMARY',      route: 'memory-game-summary' },
  { label: 'DAILY REFLECTION',  route: 'daily-reflection' },
  { label: 'PAUSE REMINDER',    route: 'pause-reminder' },
]

// ── Action handler ─────────────────────────────────────────────────────────────

async function callAlert(url: string): Promise<string> {
  if (url.startsWith('mailto:')) {
    window.open(url)
    return 'opened'
  }
  if (url.startsWith('/api/god/email')) {
    const params = new URL(url, 'http://x').searchParams
    const res = await fetch('/api/god/email', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ archiveId: params.get('archiveId'), type: params.get('type') }),
    })
    return res.ok ? 'sent' : 'failed'
  }
  if (url.startsWith('/api/god/trigger')) {
    const params = new URL(url, 'http://x').searchParams
    const res = await fetch('/api/god/trigger', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ route: params.get('route') }),
    })
    return res.ok ? 'triggered' : 'failed'
  }
  return 'unknown'
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      background:   'rgba(196,162,74,0.06)',
      border:       '1px solid rgba(196,162,74,0.15)',
      borderRadius: '2px',
      padding:      '4px 12px',
      ...mono,
      fontSize:     '0.38rem',
      letterSpacing: '0.12em',
      color:        '#9DA3A8',
      whiteSpace:   'nowrap',
    }}>
      {children}
    </span>
  )
}

function ActionBtn({
  label,
  onClick,
  variant = 'ghost',
  small = false,
}: {
  label:    string
  onClick:  () => void
  variant?: 'ghost' | 'gold' | 'red'
  small?:   boolean
}) {
  const bg = variant === 'gold' ? '#C4A24A' : variant === 'red' ? 'rgba(196,74,74,0.15)' : 'rgba(255,255,255,0.05)'
  const color = variant === 'gold' ? '#0A0908' : variant === 'red' ? '#C44A4A' : '#9DA3A8'
  const border = variant === 'ghost' ? '1px solid rgba(255,255,255,0.08)' : variant === 'red' ? '1px solid rgba(196,74,74,0.3)' : 'none'
  return (
    <button
      onClick={onClick}
      style={{
        background:    bg,
        border,
        borderRadius:  '2px',
        padding:       small ? '3px 8px' : '5px 12px',
        ...mono,
        fontSize:      '0.36rem',
        letterSpacing: '0.15em',
        color,
        cursor:        'pointer',
        whiteSpace:    'nowrap',
      }}
    >
      {label}
    </button>
  )
}

function TrainingPipelineButton({ label, url, body }: { label: string; url: string; body: object }) {
  const [state, setState] = React.useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [result, setResult] = React.useState('')
  const mono: React.CSSProperties = { fontFamily: '"Space Mono","Courier New",monospace', textTransform: 'uppercase' as const, letterSpacing: '0.15em' }

  async function run() {
    setState('running')
    setResult('')
    try {
      const res  = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      setResult(data.message ?? JSON.stringify(data).substring(0, 80))
      setState('done')
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'error')
      setState('error')
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' as const }}>
      <button
        onClick={run}
        disabled={state === 'running'}
        style={{
          background:   state === 'done' ? 'rgba(74,196,124,0.1)' : state === 'error' ? 'rgba(196,74,74,0.1)' : 'rgba(255,255,255,0.04)',
          border:       '1px solid rgba(255,255,255,0.07)',
          borderRadius: '2px',
          padding:      '5px 12px',
          ...mono,
          fontSize:     '0.36rem',
          color:        state === 'done' ? '#4AC47C' : state === 'error' ? '#C44A4A' : '#9DA3A8',
          cursor:       state === 'running' ? 'not-allowed' : 'pointer',
        }}
      >
        {state === 'running' ? '...' : state === 'done' ? `✓ ${label}` : label}
      </button>
      {result && <span style={{ ...mono, fontSize: '0.34rem', color: '#5C6166' }}>{result}</span>}
    </div>
  )
}

function BackfillButton() {
  return <TrainingPipelineButton label="Backfill Training Data" url="/api/god/backfill-training" body={{ batchSize: 20 }} />
}

function ScheduledDeletionsPanel({ archives, onRefresh }: { archives: ArchiveData[]; onRefresh: () => void }) {
  const [confirmed, setConfirmed] = React.useState<string | null>(null)
  const [deleting, setDeleting]   = React.useState<string | null>(null)
  const [results,  setResults]    = React.useState<Record<string, 'done' | 'error'>>({})

  async function processDeletion(archiveId: string) {
    if (confirmed !== archiveId) { setConfirmed(archiveId); return }
    setDeleting(archiveId)
    try {
      const res = await fetch('/api/god/trigger', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ route: `delete-archive?archiveId=${archiveId}` }),
      })
      setResults(prev => ({ ...prev, [archiveId]: res.ok ? 'done' : 'error' }))
      if (res.ok) onRefresh()
    } catch {
      setResults(prev => ({ ...prev, [archiveId]: 'error' }))
    }
    setDeleting(null)
    setConfirmed(null)
  }

  return (
    <div style={{ marginTop: '0.75rem', background: 'rgba(196,74,74,0.06)', border: '1px solid rgba(196,74,74,0.3)', borderRadius: '2px', padding: '0.75rem 1rem' }}>
      <p style={{ ...mono, fontSize: '0.38rem', letterSpacing: '0.2em', color: '#C44A4A', margin: '0 0 0.6rem' }}>
        ⚠ {archives.length} ARCHIVE{archives.length !== 1 ? 'S' : ''} PAST SCHEDULED DELETION DATE
      </p>
      {archives.map(a => (
        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <p style={{ ...mono, fontSize: '0.36rem', color: '#9DA3A8', letterSpacing: '0.08em', flex: 1, margin: 0 }}>
            {a.name.toUpperCase()} · {a.ownerEmail} · del {a.scheduledDeletionAt ? new Date(a.scheduledDeletionAt).toLocaleDateString() : '?'}
          </p>
          <button
            onClick={() => processDeletion(a.id)}
            disabled={deleting === a.id}
            style={{
              background:    confirmed === a.id ? 'rgba(196,74,74,0.3)' : 'rgba(196,74,74,0.1)',
              border:        '1px solid rgba(196,74,74,0.4)',
              borderRadius:  '2px',
              padding:       '3px 10px',
              ...mono,
              fontSize:      '0.34rem',
              letterSpacing: '0.12em',
              color:         results[a.id] === 'done' ? '#4AC47C' : results[a.id] === 'error' ? '#C44A4A' : '#C44A4A',
              cursor:        deleting === a.id ? 'not-allowed' : 'pointer',
            }}
          >
            {deleting === a.id ? '...' : results[a.id] === 'done' ? 'DELETED' : results[a.id] === 'error' ? 'FAILED' : confirmed === a.id ? 'CONFIRM DELETE' : 'PROCESS DELETION'}
          </button>
        </div>
      ))}
      <p style={{ ...mono, fontSize: '0.32rem', color: '#5C6166', letterSpacing: '0.08em', margin: '0.5rem 0 0' }}>
        Click once to confirm. Click again to permanently delete. This cannot be undone.
      </p>
    </div>
  )
}

import React from 'react'

type PhotoStatRow = { contributorId: string; name: string; sent: number; responded: number; remaining: number; exhausted: boolean }

function ArchiveCard({ archive, onRefresh }: { archive: ArchiveData; onRefresh: () => void }) {
  const router = useRouter()
  const [impersonating,  setImpersonating]  = useState(false)
  const [emailState,     setEmailState]     = useState<Record<string, 'idle' | 'sending' | 'done' | 'error'>>({})
  const [alertStates,    setAlertStates]    = useState<Record<string, string>>({})
  const [linkCopied,     setLinkCopied]     = useState(false)
  const [sendingLink,    setSendingLink]    = useState(false)
  const [linkEmailState, setLinkEmailState] = useState<'idle' | 'done' | 'error'>('idle')
  const [emailStatus,    setEmailStatus]    = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const [photoStats,     setPhotoStats]     = useState<PhotoStatRow[] | null>(null)

  useEffect(() => {
    if (archive.contributorCount > 0) {
      fetch(`/api/god/photo-stats?archiveId=${archive.id}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.contributors) setPhotoStats(d.contributors) })
        .catch(() => {})
    }
  }, [archive.id, archive.contributorCount])

  async function handleImpersonate() {
    setImpersonating(true)
    try {
      const res = await fetch('/api/god/impersonate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ archiveId: archive.id }),
      })
      if (res.ok) {
        window.open('/archive/dashboard', '_blank')
      }
    } catch {}
    setImpersonating(false)
  }

  async function handleEmail(type: string) {
    setEmailState(prev => ({ ...prev, [type]: 'sending' }))
    try {
      const res = await fetch('/api/god/email', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ archiveId: archive.id, type }),
      })
      setEmailState(prev => ({ ...prev, [type]: res.ok ? 'done' : 'error' }))
    } catch {
      setEmailState(prev => ({ ...prev, [type]: 'error' }))
    }
    setTimeout(() => setEmailState(prev => ({ ...prev, [type]: 'idle' })), 3000)
  }

  async function handleAlertAction(url: string, key: string) {
    setAlertStates(prev => ({ ...prev, [key]: '...' }))
    const result = await callAlert(url)
    setAlertStates(prev => ({ ...prev, [key]: result }))
    setTimeout(() => setAlertStates(prev => ({ ...prev, [key]: '' })), 3000)
  }

  function handleCopyLink() {
    if (!archive.magicLinkToken) return
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
    const url = `${siteUrl}/api/archive/magic-login?token=${archive.magicLinkToken}`
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    })
  }

  async function handleEmailOwner() {
    setEmailStatus('sending')
    try {
      const res = await fetch('/api/god/send-magic-link', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ archiveId: archive.id }),
      })
      setEmailStatus(res.ok ? 'sent' : 'failed')
    } catch {
      setEmailStatus('failed')
    }
    setTimeout(() => setEmailStatus('idle'), 3000)
  }

  async function handleEmailLink() {
    setSendingLink(true)
    try {
      const res = await fetch('/api/god/send-magic-link', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ archiveId: archive.id }),
      })
      setLinkEmailState(res.ok ? 'done' : 'error')
    } catch {
      setLinkEmailState('error')
    }
    setSendingLink(false)
    setTimeout(() => setLinkEmailState('idle'), 3000)
  }

  const isTerminated = !!archive.terminationRequestedAt
  const isPaused     = archive.status === 'paused'
  const borderColor  = isTerminated
    ? '#C44A4A'
    : isPaused
      ? '#C4A24A'
      : HEALTH_BORDER[archive.health]

  const lastEmailLabel = archive.lastEmailSent ? timeAgo(archive.lastEmailSent) + ' ago' : 'never'
  const unlabeled = archive.photoCount - archive.labeledPhotoCount

  const pausedDays = archive.pausedAt
    ? Math.round((Date.now() - new Date(archive.pausedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div style={{
      background:   'rgba(240,237,230,0.018)',
      border:       '1px solid rgba(196,162,74,0.1)',
      borderLeft:   `3px solid ${borderColor}`,
      borderRadius: '2px',
      padding:      '1.25rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div>
          <p style={{ ...mono, fontSize: '0.44rem', letterSpacing: '0.2em', color: '#F0EDE6', margin: 0 }}>
            {archive.name.toUpperCase()}
          </p>
          <p style={{ ...mono, fontSize: '0.36rem', letterSpacing: '0.15em', color: '#706C65', margin: '0.2rem 0 0' }}>
            {archive.ownerName} · {archive.ownerEmail}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <span style={{
            ...mono, fontSize: '0.34rem', letterSpacing: '0.15em',
            color: '#C4A24A', background: 'rgba(196,162,74,0.08)',
            padding: '2px 8px', borderRadius: '2px',
          }}>
            {archive.tier.toUpperCase()}
          </span>
          {isPaused && (
            <span style={{ ...mono, fontSize: '0.32rem', letterSpacing: '0.12em', color: '#C4A24A', background: 'rgba(196,162,74,0.12)', padding: '2px 6px', borderRadius: '2px' }}>
              PAUSED {pausedDays}d AGO
            </span>
          )}
          {isTerminated && (
            <span style={{ ...mono, fontSize: '0.32rem', letterSpacing: '0.12em', color: '#C44A4A', background: 'rgba(196,74,74,0.1)', padding: '2px 6px', borderRadius: '2px' }}>
              TERMINATION {archive.scheduledDeletionAt ? `· DEL ${new Date(archive.scheduledDeletionAt).toLocaleDateString()}` : 'PENDING'}
            </span>
          )}
        </div>
      </div>

      <p style={{ ...mono, fontSize: '0.36rem', color: '#5C6166', margin: '0 0 0.75rem', letterSpacing: '0.1em' }}>
        DAY {archive.daysSinceCreated} SINCE FOUNDING
        {isPaused && <span style={{ color: '#C4A24A' }}> · STATUS: PAUSED</span>}
        {isTerminated && <span style={{ color: '#C44A4A' }}> · DELETION SCHEDULED</span>}
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', marginBottom: '0.75rem' }}>
        {[
          { icon: '📷', label: `${archive.photoCount} photos${unlabeled > 0 ? ` (${unlabeled} unlabelled)` : ''}` },
          { icon: '👥', label: `${archive.contributorCount} contributor${archive.contributorCount !== 1 ? 's' : ''}` },
          { icon: '💬', label: `${archive.entityConversations} entity conversation${archive.entityConversations !== 1 ? 's' : ''}` },
          { icon: '📊', label: `Entity depth: ${archive.entityDepth}%` },
          { icon: '💾', label: `${archive.depositCount} deposit${archive.depositCount !== 1 ? 's' : ''}` },
          { icon: '📧', label: `Last email: ${lastEmailLabel}` },
        ].map(({ icon, label }) => (
          <p key={label} style={{ ...mono, fontSize: '0.36rem', color: '#706C65', margin: 0, letterSpacing: '0.08em' }}>
            {icon} {label}
          </p>
        ))}
      </div>

      {/* Training data */}
      {archive.training && archive.training.total > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', marginBottom: '0.75rem' }}>
          <p style={{ ...mono, fontSize: '0.36rem', color: '#C4A24A', margin: '0 0 2px', letterSpacing: '0.12em' }}>
            TRAINING DATA
          </p>
          <p style={{ ...mono, fontSize: '0.36rem', color: archive.training.readyForFineTuning ? '#C4A24A' : '#5C6166', margin: '0 0 2px', letterSpacing: '0.08em' }}>
            {archive.training.included} pairs · {archive.training.estimatedAccuracy}
            {archive.training.readyForFineTuning ? ' ✓ READY' : ''}
          </p>
        </div>
      )}

      {/* Contributor photo coverage */}
      {photoStats && photoStats.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', marginBottom: '0.75rem' }}>
          <p style={{ ...mono, fontSize: '0.36rem', color: '#5C6166', margin: '0 0 4px', letterSpacing: '0.12em' }}>
            PHOTO COVERAGE
          </p>
          {photoStats.map(c => {
            const isExhausted = c.exhausted
            const isLow       = !isExhausted && c.remaining < 10
            const rowColor    = isExhausted ? '#E57373' : isLow ? '#C4A24A' : '#706C65'
            const icon        = isExhausted ? '🚨' : isLow ? '⚠' : null
            return (
              <div key={c.contributorId} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '3px' }}>
                {icon && <span style={{ fontSize: '0.6rem' }}>{icon}</span>}
                <p style={{ ...mono, fontSize: '0.34rem', letterSpacing: '0.08em', color: rowColor, margin: 0, flex: 1 }}>
                  {c.name} — {c.sent} sent · {c.responded} replied · {
                    isExhausted ? 'EXHAUSTED — owner notified'
                    : isLow     ? `${c.remaining} remaining — upload more`
                    : `${c.remaining} remaining`
                  }
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Archive alerts */}
      {archive.alerts.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.6rem', marginBottom: '0.75rem' }}>
          {archive.alerts.map((alert, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span style={{ ...mono, fontSize: '0.34rem', color: SEVERITY_COLORS[alert.severity], letterSpacing: '0.08em', flex: 1 }}>
                {alert.severity === 'critical' ? '●' : alert.severity === 'warning' ? '◐' : '○'} {alert.message}
              </span>
              <button
                onClick={() => handleAlertAction(alert.actionUrl, `${archive.id}-${i}`)}
                style={{
                  background:    'transparent',
                  border:        `1px solid ${SEVERITY_COLORS[alert.severity]}44`,
                  borderRadius:  '2px',
                  padding:       '2px 6px',
                  ...mono,
                  fontSize:      '0.32rem',
                  letterSpacing: '0.1em',
                  color:         SEVERITY_COLORS[alert.severity],
                  cursor:        'pointer',
                  whiteSpace:    'nowrap',
                }}
              >
                {alertStates[`${archive.id}-${i}`] || alert.action.toUpperCase()}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Magic link section */}
      {archive.magicLinkToken && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.6rem', marginBottom: '0.6rem' }}>
          <p style={{ ...mono, fontSize: '0.32rem', letterSpacing: '0.12em', color: '#5C6166', margin: '0 0 0.4rem' }}>
            MAGIC LINK
          </p>
          <p style={{ ...mono, fontSize: '0.32rem', color: '#3A3F44', margin: '0 0 0.4rem', wordBreak: 'break-all' as const }}>
            {`…magic-login?token=${archive.magicLinkToken.slice(0, 12)}…`}
          </p>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            <ActionBtn
              label={linkCopied ? 'COPIED' : 'COPY LINK'}
              onClick={handleCopyLink}
              small
            />
            <ActionBtn
              label={sendingLink ? '...' : linkEmailState === 'done' ? 'SENT' : linkEmailState === 'error' ? 'FAILED' : 'EMAIL TO OWNER'}
              onClick={handleEmailLink}
              small
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
        <ActionBtn label={impersonating ? '...' : 'VIEW ARCHIVE'} onClick={handleImpersonate} variant="gold" small />
        <button
          onClick={handleEmailOwner}
          disabled={emailStatus === 'sending'}
          style={{
            background:    'rgba(255,255,255,0.05)',
            border:        '1px solid rgba(255,255,255,0.08)',
            borderRadius:  '2px',
            padding:       '3px 8px',
            ...mono,
            fontSize:      '0.36rem',
            letterSpacing: '0.15em',
            color:         emailStatus === 'sent' ? '#4AC47C' : emailStatus === 'failed' ? '#C44A4A' : emailStatus === 'sending' ? '#5C6166' : '#9DA3A8',
            cursor:        emailStatus === 'sending' ? 'not-allowed' : 'pointer',
            whiteSpace:    'nowrap',
          }}
        >
          {emailStatus === 'sending' ? 'SENDING...' : emailStatus === 'sent' ? '✓ SENT' : emailStatus === 'failed' ? '✗ FAILED' : 'EMAIL OWNER'}
        </button>
        <ActionBtn
          label={emailState['no_photos'] === 'sending' ? '...' : emailState['no_photos'] === 'done' ? 'SENT' : 'NUDGE PHOTOS'}
          onClick={() => handleEmail('no_photos')}
          small
        />
        <ActionBtn
          label={emailState['entity_intro'] === 'sending' ? '...' : emailState['entity_intro'] === 'done' ? 'SENT' : 'ENTITY INTRO'}
          onClick={() => handleEmail('entity_intro')}
          small
        />
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function GodModeClient() {
  const [data,    setData]    = useState<GodData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const [triggerStates, setTriggerStates] = useState<Record<string, string>>({})

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/god/data')
      if (res.status === 401) { window.location.href = '/god/login'; return }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [fetchData])

  async function handleTrigger(route: string, archiveId?: string) {
    const key = archiveId ? `${route}-${archiveId}` : route
    setTriggerStates(prev => ({ ...prev, [key]: '...' }))
    try {
      const res = await fetch('/api/god/trigger', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ route, archiveId }),
      })
      const json = await res.json()
      setTriggerStates(prev => ({ ...prev, [key]: res.ok ? `${json.body?.sent ?? ''}✓` : '✗' }))
    } catch {
      setTriggerStates(prev => ({ ...prev, [key]: '✗' }))
    }
    setTimeout(() => setTriggerStates(prev => ({ ...prev, [key]: '' })), 4000)
  }

  const isHealthy = data?.system.apiHealth === 'healthy'
  const criticalCount = data?.alerts.filter(a => a.severity === 'critical').length ?? 0
  const warningCount  = data?.alerts.filter(a => a.severity === 'warning').length ?? 0

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: '#060605', minHeight: '100vh', color: '#F0EDE6' }}>

      {/* ── Header bar ──────────────────────────────────────────────────────── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '0.75rem 1.5rem',
        borderBottom:   '1px solid rgba(196,162,74,0.15)',
        background:     '#060605',
        position:       'sticky',
        top:            0,
        zIndex:         50,
      }}>
        <p style={{ ...mono, fontSize: '0.46rem', letterSpacing: '0.35em', color: '#C4A24A', margin: 0 }}>
          BASALITH · GOD MODE
        </p>
        <p style={{ ...mono, fontSize: '0.36rem', letterSpacing: '0.12em', color: '#3A3F44', margin: 0 }}>
          {data ? `UPDATED ${timeAgo(data.fetchedAt)} AGO` : 'LOADING...'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ ...mono, fontSize: '0.36rem', letterSpacing: '0.12em', color: isHealthy ? '#4AC47C' : '#C44A4A' }}>
            ● {isHealthy ? 'HEALTHY' : 'DEGRADED'}
          </span>
          <button
            onClick={fetchData}
            style={{
              background:    'transparent',
              border:        '1px solid rgba(196,162,74,0.2)',
              borderRadius:  '2px',
              padding:       '4px 10px',
              ...mono,
              fontSize:      '0.36rem',
              letterSpacing: '0.15em',
              color:         '#9DA3A8',
              cursor:        'pointer',
            }}
          >
            ↻ REFRESH
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem 1.5rem 3rem' }}>

        {loading && !data && (
          <p style={{ ...mono, fontSize: '0.38rem', color: '#3A3F44', letterSpacing: '0.15em', marginTop: '2rem', textAlign: 'center' }}>
            LOADING COMMAND CENTER...
          </p>
        )}

        {error && (
          <p style={{ ...mono, fontSize: '0.38rem', color: '#C44A4A', letterSpacing: '0.12em', marginTop: '1rem' }}>
            ERROR: {error}
          </p>
        )}

        {data && (
          <>
            {/* ── Status pills ────────────────────────────────────────────── */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <Pill>📧 {data.system.emailsSentToday} EMAILS TODAY</Pill>
              <Pill>🗄 {data.revenue.activeArchives} ACTIVE ARCHIVES</Pill>
              {data.revenue.pipelineCount > 0 && <Pill>⏳ {data.revenue.pipelineCount} IN PIPELINE</Pill>}
              <Pill>⏱ FETCHED {timeAgo(data.fetchedAt)} AGO</Pill>
              <Pill>● SUPABASE {data.system.apiHealth.toUpperCase()}</Pill>
            </div>

            {/* ── Revenue bar ─────────────────────────────────────────────── */}
            <div style={{
              display:      'flex',
              gap:          '2rem',
              padding:      '0.6rem 1rem',
              background:   'rgba(196,162,74,0.04)',
              border:       '1px solid rgba(196,162,74,0.1)',
              borderRadius: '2px',
              marginBottom: '0.75rem',
              flexWrap:     'wrap',
            }}>
              <span style={{ ...mono, fontSize: '0.38rem', color: '#5C6166', letterSpacing: '0.12em' }}>
                ACTIVE <span style={{ color: '#C4A24A', fontSize: '0.46rem' }}>{data.revenue.activeArchives}</span>
              </span>
              {Object.entries(data.revenue.byTier).map(([tier, count]) => (
                <span key={tier} style={{ ...mono, fontSize: '0.38rem', color: '#5C6166', letterSpacing: '0.12em' }}>
                  {tier.toUpperCase()} <span style={{ color: '#C4A24A', fontSize: '0.46rem' }}>{count}</span>
                </span>
              ))}
              <span style={{ ...mono, fontSize: '0.38rem', color: '#5C6166', letterSpacing: '0.12em' }}>
                PIPELINE <span style={{ color: '#C4A24A', fontSize: '0.46rem' }}>{data.revenue.pipelineCount}</span>
              </span>
            </div>

            {/* ── Alerts ──────────────────────────────────────────────────── */}
            {data.alerts.length > 0 && (
              <div style={{
                background:   'rgba(196,162,74,0.04)',
                border:       '1px solid rgba(196,162,74,0.2)',
                borderRadius: '2px',
                padding:      '0.75rem 1rem',
                marginBottom: '0.75rem',
              }}>
                <p style={{ ...mono, fontSize: '0.38rem', letterSpacing: '0.2em', color: '#C4A24A', margin: '0 0 0.6rem' }}>
                  ⚠ {data.alerts.length} ALERT{data.alerts.length !== 1 ? 'S' : ''} NEED ATTENTION
                  {criticalCount > 0 && <span style={{ color: '#C44A4A' }}> · {criticalCount} CRITICAL</span>}
                  {warningCount > 0  && <span style={{ color: '#C4A24A' }}> · {warningCount} WARNING</span>}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {data.alerts.map((alert, i) => (
                    <div key={i} style={{
                      display:    'flex',
                      alignItems: 'center',
                      gap:        '0.75rem',
                      borderLeft: `3px solid ${SEVERITY_COLORS[alert.severity]}`,
                      paddingLeft: '0.6rem',
                    }}>
                      <span style={{ ...mono, fontSize: '0.36rem', color: '#9DA3A8', letterSpacing: '0.1em', flex: 1 }}>
                        <span style={{ color: '#706C65' }}>{alert.archiveName.toUpperCase()} · </span>{alert.message}
                      </span>
                      <button
                        onClick={() => callAlert(alert.actionUrl)}
                        style={{
                          background:    'transparent',
                          border:        `1px solid ${SEVERITY_COLORS[alert.severity]}44`,
                          borderRadius:  '2px',
                          padding:       '2px 8px',
                          ...mono,
                          fontSize:      '0.32rem',
                          letterSpacing: '0.1em',
                          color:         SEVERITY_COLORS[alert.severity],
                          cursor:        'pointer',
                          whiteSpace:    'nowrap',
                        }}
                      >
                        {alert.action.toUpperCase()}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Main content: archives + activity ───────────────────────── */}
            <div style={{
              display:             'grid',
              gridTemplateColumns: 'minmax(0,1fr) 320px',
              gap:                 '1rem',
              alignItems:          'start',
            }}>

              {/* Archives grid */}
              <div>
                <p style={{ ...mono, fontSize: '0.38rem', letterSpacing: '0.25em', color: '#C4A24A', margin: '0 0 0.6rem' }}>
                  ARCHIVES ({data.archives.length})
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '0.75rem' }}>
                  {data.archives.map(archive => (
                    <ArchiveCard key={archive.id} archive={archive} onRefresh={fetchData} />
                  ))}
                  {data.archives.length === 0 && (
                    <p style={{ ...mono, fontSize: '0.38rem', color: '#3A3F44', letterSpacing: '0.1em' }}>
                      NO ACTIVE ARCHIVES
                    </p>
                  )}
                </div>
              </div>

              {/* Activity feed */}
              <div style={{
                background:   'rgba(240,237,230,0.018)',
                border:       '1px solid rgba(196,162,74,0.1)',
                borderRadius: '2px',
                padding:      '1rem',
              }}>
                <p style={{ ...mono, fontSize: '0.38rem', letterSpacing: '0.25em', color: '#C4A24A', margin: '0 0 0.75rem' }}>
                  RECENT ACTIVITY
                </p>
                {data.recentActivity.length === 0 ? (
                  <p style={{ ...mono, fontSize: '0.36rem', color: '#3A3F44', letterSpacing: '0.08em' }}>NO ACTIVITY YET</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {data.recentActivity.map((item, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                          <span style={{ ...mono, fontSize: '0.35rem', color: '#9DA3A8', letterSpacing: '0.06em' }}>
                            {ACTIVITY_ICONS[item.type] ?? '·'} {item.description}
                          </span>
                          <span style={{ ...mono, fontSize: '0.33rem', color: '#3A3F44', letterSpacing: '0.06em', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>
                            {timeAgo(item.timestamp)}
                          </span>
                        </div>
                        <p style={{ ...mono, fontSize: '0.33rem', color: '#5C6166', letterSpacing: '0.06em', margin: 0 }}>
                          {item.archiveName}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Cron control ────────────────────────────────────────────── */}
            <div style={{
              marginTop:    '1.25rem',
              background:   'rgba(240,237,230,0.018)',
              border:       '1px solid rgba(196,162,74,0.1)',
              borderRadius: '2px',
              padding:      '1rem',
            }}>
              <p style={{ ...mono, fontSize: '0.38rem', letterSpacing: '0.25em', color: '#C4A24A', margin: '0 0 0.75rem' }}>
                CRON CONTROL
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {CRON_BUTTONS.map(({ label, route }) => {
                  const state = triggerStates[route]
                  return (
                    <button
                      key={route}
                      onClick={() => handleTrigger(route)}
                      style={{
                        background:    state === '...' ? 'rgba(196,162,74,0.15)' : state?.includes('✓') ? 'rgba(74,196,124,0.1)' : state?.includes('✗') ? 'rgba(196,74,74,0.1)' : 'rgba(255,255,255,0.04)',
                        border:        '1px solid rgba(255,255,255,0.07)',
                        borderRadius:  '2px',
                        padding:       '5px 12px',
                        ...mono,
                        fontSize:      '0.36rem',
                        letterSpacing: '0.15em',
                        color:         state?.includes('✓') ? '#4AC47C' : state?.includes('✗') ? '#C44A4A' : '#9DA3A8',
                        cursor:        'pointer',
                      }}
                    >
                      {state || label}
                    </button>
                  )
                })}
              </div>

            {/* Scheduled deletion processing */}
            {(() => {
              const pending = (data?.archives ?? []).filter(a => a.scheduledDeletionAt && new Date(a.scheduledDeletionAt) <= new Date())
              if (pending.length === 0) return null
              return (
                <ScheduledDeletionsPanel archives={pending} onRefresh={fetchData} />
              )
            })()}

            {/* Training pipeline controls */}
            <div style={{
              marginTop:    '1rem',
              background:   'rgba(196,162,74,0.02)',
              border:       '1px solid rgba(196,162,74,0.1)',
              borderRadius: '2px',
              padding:      '1rem',
            }}>
              <p style={{ ...mono, fontSize: '0.38rem', letterSpacing: '0.25em', color: '#C4A24A', margin: '0 0 0.75rem' }}>
                TRAINING PIPELINE
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                <BackfillButton />
                <TrainingPipelineButton label="Score Unscored Pairs" url="/api/god/score-training-pairs" body={{ limit: 50 }} />
                <TrainingPipelineButton label="Rescore All (20)" url="/api/god/rescore-training-pairs" body={{ batchSize: 20 }} />
                <a
                  href="/api/god/export-training"
                  style={{
                    background:    'rgba(255,255,255,0.04)',
                    border:        '1px solid rgba(255,255,255,0.07)',
                    borderRadius:  '2px',
                    padding:       '5px 12px',
                    ...mono,
                    fontSize:      '0.36rem',
                    letterSpacing: '0.15em',
                    color:         '#9DA3A8',
                    textDecoration: 'none',
                    display:       'inline-block',
                  }}
                >
                  Export JSONL (all)
                </a>
              </div>
            </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
