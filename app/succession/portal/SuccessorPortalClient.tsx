'use client'

import Link from 'next/link'

const MONO: React.CSSProperties  = { fontFamily: "'Courier New', monospace" }
const SERIF: React.CSSProperties = { fontFamily: 'Georgia, serif' }

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
  await fetch('/api/succession/logout', { method: 'POST' })
  window.location.href = '/succession/login'
}

export default function SuccessorPortalClient({
  session, archiveName, ownerName, trainingPairCount, contextCount, recentContexts,
}: Props) {
  return (
    <main style={{ minHeight: '100vh', background: '#0A0908', padding: '0' }}>

      {/* Top bar */}
      <div style={{
        borderBottom: '1px solid rgba(196,162,74,0.12)',
        padding:      '20px 40px',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <svg width="20" height="20" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <rect x="18" y="2"  width="11.31" height="11.31" transform="rotate(45 18 2)"  fill="none" stroke="rgba(196,162,74,0.4)" strokeWidth="1"/>
            <rect x="18" y="9"  width="7.07"  height="7.07"  transform="rotate(45 18 9)"  fill="none" stroke="rgba(196,162,74,0.7)" strokeWidth="1"/>
            <rect x="18" y="14" width="4"     height="4"     transform="rotate(45 18 14)" fill="rgba(196,162,74,0.85)"/>
          </svg>
          <span style={{ ...MONO, fontSize: '0.62rem', letterSpacing: '3px', color: '#C4A24A', textTransform: 'uppercase' }}>
            Successor Portal
          </span>
        </div>
        <button
          onClick={handleLogout}
          style={{ ...MONO, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5C6166' }}
        >
          Sign out
        </button>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '56px 40px' }}>

        {/* Header */}
        <div style={{ marginBottom: '48px' }}>
          <p style={{ ...MONO, fontSize: '0.6rem', letterSpacing: '3px', color: '#C4A24A', textTransform: 'uppercase', margin: '0 0 8px' }}>
            {session.organization ?? 'Succession Access'}
          </p>
          <h1 style={{ ...SERIF, fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 300, color: '#F0EDE6', margin: '0 0 8px', lineHeight: 1.2 }}>
            {archiveName}
          </h1>
          {ownerName && (
            <p style={{ ...SERIF, fontSize: '1rem', fontStyle: 'italic', color: '#706C65', margin: 0 }}>
              Founder: {ownerName}
            </p>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'rgba(196,162,74,0.1)', marginBottom: '48px' }}>
          {[
            { label: 'Frozen Cognitive Layer', value: trainingPairCount.toLocaleString(), sub: 'training pairs' },
            { label: 'Context Injections', value: contextCount.toLocaleString(), sub: 'added by you' },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ background: '#0A0908', padding: '28px 32px' }}>
              <p style={{ ...MONO, fontSize: '0.58rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5C6166', margin: '0 0 10px' }}>
                {label}
              </p>
              <p style={{ ...SERIF, fontSize: '2.4rem', fontWeight: 300, color: '#C4A24A', margin: '0 0 4px', lineHeight: 1 }}>
                {value}
              </p>
              <p style={{ ...MONO, fontSize: '0.56rem', letterSpacing: '0.12em', color: '#3A3F44', textTransform: 'uppercase', margin: 0 }}>
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
              background:    '#C4A24A',
              color:         '#0A0908',
              padding:       '20px 28px',
              textDecoration: 'none',
              border:        'none',
            }}
          >
            <p style={{ ...MONO, fontSize: '0.62rem', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 6px' }}>
              Query the Entity
            </p>
            <p style={{ ...SERIF, fontSize: '0.85rem', fontStyle: 'italic', fontWeight: 300, color: 'rgba(10,9,8,0.7)', margin: 0, lineHeight: 1.5 }}>
              Apply the founder's judgment to current questions.
            </p>
          </Link>
          <Link
            href="/succession/portal/context"
            style={{
              display:       'block',
              background:    'transparent',
              color:         '#F0EDE6',
              padding:       '20px 28px',
              textDecoration: 'none',
              border:        '1px solid rgba(196,162,74,0.3)',
            }}
          >
            <p style={{ ...MONO, fontSize: '0.62rem', letterSpacing: '3px', textTransform: 'uppercase', color: '#C4A24A', margin: '0 0 6px' }}>
              Add Context
            </p>
            <p style={{ ...SERIF, fontSize: '0.85rem', fontStyle: 'italic', fontWeight: 300, color: '#706C65', margin: 0, lineHeight: 1.5 }}>
              Inject current business reality into the conversation.
            </p>
          </Link>
        </div>

        {/* Recent context injections */}
        <div>
          <p style={{ ...MONO, fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#5C6166', margin: '0 0 20px' }}>
            Recent Context Injections
          </p>

          {recentContexts.length === 0 ? (
            <p style={{ ...SERIF, fontSize: '0.9rem', fontStyle: 'italic', color: '#3A3F44', margin: 0 }}>
              No context added yet. The entity draws only from the frozen fingerprint until you inject context.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(196,162,74,0.08)' }}>
              {recentContexts.map(ctx => (
                <div key={ctx.id} style={{ background: '#0A0908', padding: '18px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ ...MONO, fontSize: '0.56rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4A24A' }}>
                      {contextTypeLabel(ctx.context_type)}
                    </span>
                    <span style={{ ...MONO, fontSize: '0.54rem', color: '#3A3F44' }}>
                      {formatDate(ctx.created_at)}
                    </span>
                  </div>
                  <p style={{ ...SERIF, fontSize: '0.9rem', fontWeight: 300, color: '#B8B4AB', margin: 0, lineHeight: 1.6 }}>
                    {ctx.content.length > 180 ? ctx.content.slice(0, 180) + '…' : ctx.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '64px', paddingTop: '32px', borderTop: '1px solid rgba(240,237,230,0.05)' }}>
          <p style={{ ...MONO, fontSize: '0.56rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3A3F44', margin: 0 }}>
            Basalith · Heritage Nexus Inc. · Authorized access only
          </p>
        </div>
      </div>
    </main>
  )
}
