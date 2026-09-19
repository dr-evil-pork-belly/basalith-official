'use client'

import Link from 'next/link'

const MONO: React.CSSProperties  = { fontFamily: 'var(--portal-mono)' }
const SERIF: React.CSSProperties = { fontFamily: 'var(--portal-serif)' }

interface Context {
  id:           string
  content:      string
  context_type: string
  created_at:   string
}

interface Props {
  session:          { successorId: string; archiveId: string; name: string; organization: string | null }
  archiveName:      string
  ownerName:        string
  trainingPairCount: number
  contextCount:     number
  recentContexts:   Context[]
}

function contextTypeLabel(raw: string): string {
  const map: Record<string, string> = {
    business_update:       'Business Update',
    market_condition:      'Market Condition',
    organizational_change: 'Organizational Change',
    strategic_decision:    'Strategic Decision',
    other:                 'Other',
  }
  return map[raw] ?? raw
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

async function handleLogout() {
  await fetch('/api/auth/logout', { method: 'POST' })
  window.location.href = '/succession/login'
}

export default function SuccessorPortalClient({
  session, archiveName, ownerName, trainingPairCount, contextCount, recentContexts,
}: Props) {
  return (
    <main className="portal-stone" style={{ minHeight: '100vh', background: 'var(--portal-bg)' }}>

      {/* Top bar. This is the spine: the successor portal has no sidebar, so the
          ink bar is the dark anchor every other portal page gets from its
          sidebar. Colors inside it are --spine-* values. */}
      <div style={{
        background:   'var(--portal-spine)',
        color:        'var(--spine-fg)',
        padding:      '18px 40px',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <svg width="20" height="20" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <rect x="18" y="2"  width="11.31" height="11.31" transform="rotate(45 18 2)"  fill="none" stroke="var(--spine-gold)" strokeWidth="1"/>
            <rect x="18" y="9"  width="7.07"  height="7.07"  transform="rotate(45 18 9)"  fill="none" stroke="var(--spine-gold)" strokeWidth="1"/>
            <rect x="18" y="14" width="4"     height="4"     transform="rotate(45 18 14)" fill="var(--spine-gold)"/>
          </svg>
          <span style={{ ...MONO, fontSize: '11.5px', letterSpacing: '0.24em', color: 'var(--spine-gold)', textTransform: 'uppercase' }}>
            Successor portal
          </span>
        </div>
        <button
          onClick={handleLogout}
          style={{ ...MONO, background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--spine-dim)', minHeight: '44px' }}
        >
          Sign out
        </button>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '56px 40px' }}>

        {/* Header */}
        <div style={{ marginBottom: '48px' }}>
          <p style={{ ...MONO, fontSize: '11px', letterSpacing: '3px', color: 'var(--portal-gold-ink)', textTransform: 'uppercase', margin: '0 0 8px' }}>
            {session.organization ?? 'Succession Access'}
          </p>
          <h1 style={{ ...SERIF, fontSize: 'clamp(34px,4.2vw,50px)', fontWeight: 400, letterSpacing: '-0.015em', color: 'var(--portal-ink)', margin: '0 0 8px', lineHeight: 1.2 }}>
            {archiveName}
          </h1>
          {ownerName && (
            <p style={{ ...SERIF, fontSize: '1rem', fontStyle: 'italic', color: 'var(--portal-secondary)', margin: 0 }}>
              Founder: {ownerName}
            </p>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--portal-card-line)', marginBottom: '48px' }}>
          {[
            { label: 'Frozen Cognitive Layer', value: trainingPairCount.toLocaleString(), sub: 'training pairs' },
            { label: 'Context Injections', value: contextCount.toLocaleString(), sub: 'added by you' },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ background: 'var(--portal-card)', padding: '28px 32px' }}>
              <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--portal-secondary)', margin: '0 0 10px' }}>
                {label}
              </p>
              <p style={{ ...SERIF, fontSize: '2.4rem', fontWeight: 300, color: 'var(--portal-ink)', margin: '0 0 4px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {value}
              </p>
              <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.12em', color: 'var(--portal-label)', textTransform: 'uppercase', margin: 0 }}>
                {sub}
              </p>
            </div>
          ))}
        </div>

        {/* Primary actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '56px' }}>
          <Link
            href="/succession/portal/entity"
            style={{
              display:       'block',
              background:    'var(--portal-btn)',
              color:         'var(--portal-btn-label)',
              padding:       '20px 28px',
              textDecoration: 'none',
              border:        'none',
            }}
          >
            <p style={{ ...MONO, fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 6px' }}>
              Query the Entity
            </p>
            <p style={{ ...SERIF, fontSize: '0.85rem', fontStyle: 'italic', fontWeight: 300, color: 'var(--portal-btn-label)', margin: 0, lineHeight: 1.5 }}>
              Apply the founder's judgment to current questions.
            </p>
          </Link>
          <Link
            href="/succession/portal/context"
            style={{
              display:       'block',
              background:    'transparent',
              color:         'var(--portal-ink)',
              padding:       '20px 28px',
              textDecoration: 'none',
              border:        '1px solid var(--portal-gold-line)',
            }}
          >
            <p style={{ ...MONO, fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--portal-gold-ink)', margin: '0 0 6px' }}>
              Add Context
            </p>
            <p style={{ ...SERIF, fontSize: '0.85rem', fontStyle: 'italic', fontWeight: 300, color: 'var(--portal-secondary)', margin: 0, lineHeight: 1.5 }}>
              Inject current business reality into the conversation.
            </p>
          </Link>
        </div>

        {/* Scenarios */}
        <Link
          href="/succession/portal/scenarios"
          style={{
            display:        'block',
            background:     'transparent',
            color:          'var(--portal-ink)',
            padding:        '20px 28px',
            textDecoration: 'none',
            border:         '1px solid var(--portal-gold-line)',
            marginBottom:   '56px',
          }}
        >
          <p style={{ ...MONO, fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--portal-gold-ink)', margin: '0 0 6px' }}>
            Scenario Responses
          </p>
          <p style={{ ...SERIF, fontSize: '0.85rem', fontStyle: 'italic', fontWeight: 300, color: 'var(--portal-secondary)', margin: 0, lineHeight: 1.5 }}>
            How the founder would handle twenty structured business situations.
          </p>
        </Link>

        {/* Recent context injections */}
        <div>
          <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--portal-secondary)', margin: '0 0 20px' }}>
            Recent Context Injections
          </p>

          {recentContexts.length === 0 ? (
            <p style={{ ...SERIF, fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--portal-label)', margin: 0 }}>
              No context added yet. The entity draws only from the frozen fingerprint until you inject context.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--portal-card-line)' }}>
              {recentContexts.map(ctx => (
                <div key={ctx.id} style={{ background: 'var(--portal-card)', padding: '18px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--portal-gold-ink)' }}>
                      {contextTypeLabel(ctx.context_type)}
                    </span>
                    <span style={{ ...MONO, fontSize: '14.5px', color: 'var(--portal-label)' }}>
                      {formatDate(ctx.created_at)}
                    </span>
                  </div>
                  <p style={{ ...SERIF, fontSize: '0.9rem', fontWeight: 300, color: 'var(--portal-body)', margin: 0, lineHeight: 1.6 }}>
                    {ctx.content.length > 180 ? ctx.content.slice(0, 180) + '…' : ctx.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '64px', paddingTop: '32px', borderTop: '1px solid var(--portal-card-line)' }}>
          <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--portal-label)', margin: 0 }}>
            Basalith · Heritage Nexus Inc. · Authorized access only
          </p>
        </div>
      </div>
    </main>
  )
}
