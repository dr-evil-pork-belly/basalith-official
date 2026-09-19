'use client'

import Link from 'next/link'
import { B2B_SCENARIOS } from '@/lib/b2bScenarios'

const MONO: React.CSSProperties  = { fontFamily: 'var(--portal-mono)' }
const SERIF: React.CSSProperties = { fontFamily: 'var(--portal-serif)' }

interface ScenarioResponse {
  scenario_id: string
  response:    string
  created_at:  string
}

interface Props {
  archiveName: string
  ownerName:   string
  responses:   ScenarioResponse[]
}

export default function SuccessorScenariosClient({ archiveName, ownerName, responses }: Props) {
  // Keep most-recent response per scenario
  const responseMap: Record<string, string> = {}
  for (const r of responses) {
    if (!responseMap[r.scenario_id]) responseMap[r.scenario_id] = r.response
  }

  const completedCount = Object.keys(responseMap).length

  return (
    <main className="portal-stone" style={{ minHeight: '100vh', background: 'var(--portal-bg)' }}>

      {/* Top bar. The spine: this portal has no sidebar, so the ink bar is the
          dark anchor. Colors inside it are --spine-* values. */}
      <div style={{ background: 'var(--portal-spine)', color: 'var(--spine-fg)', padding: '18px 40px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/succession/portal" style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--spine-body)', textDecoration: 'none' }}>
          ← Portal
        </Link>
        <span style={{ ...MONO, fontSize: '11px', color: 'var(--spine-dim)' }}>|</span>
        <span style={{ ...MONO, fontSize: '11px', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--spine-gold)' }}>
          Scenarios · {archiveName}
        </span>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '56px 40px' }}>

        {/* Header */}
        <div style={{ marginBottom: '48px' }}>
          <p style={{ ...MONO, fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--portal-gold-ink)', marginBottom: '10px' }}>
            {ownerName ? `How ${ownerName} Would Handle It` : 'Scenario Responses'}
          </p>
          <h1 style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 300, color: 'var(--portal-ink)', margin: '0 0 12px', lineHeight: 1.2 }}>
            The Founder's Playbook
          </h1>
          <p style={{ ...SERIF, fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 300, color: 'var(--portal-secondary)', margin: '0 0 14px', lineHeight: 1.7 }}>
            These are the founder's responses to structured business scenarios.
            Each answer is part of the cognitive fingerprint.
          </p>
          <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', color: 'var(--portal-secondary)' }}>
            {completedCount} of 20 scenarios answered
          </p>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1px', background: 'var(--portal-gold-wash)' }}>
          {B2B_SCENARIOS.map(scenario => {
            const response  = responseMap[scenario.id]
            const completed = !!response

            return (
              <div key={scenario.id} style={{ background: 'var(--portal-card)', padding: '24px' }}>

                {/* Category */}
                <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: completed ? 'var(--portal-gold-ink)' : 'var(--portal-label)', marginBottom: '8px' }}>
                  {scenario.category}
                </p>

                {/* Title */}
                <p style={{ ...SERIF, fontSize: '1.1rem', fontStyle: 'italic', fontWeight: 400, color: completed ? 'var(--portal-ink)' : 'var(--portal-secondary)', margin: '0 0 10px', lineHeight: 1.3 }}>
                  {scenario.title}
                </p>

                {/* Setup */}
                <p style={{ ...SERIF, fontSize: '0.88rem', fontWeight: 300, color: 'var(--portal-secondary)', margin: '0 0 6px', lineHeight: 1.5 }}>
                  {scenario.setup}
                </p>
                <p style={{ ...SERIF, fontSize: '0.88rem', fontStyle: 'italic', color: 'var(--portal-secondary)', margin: '0 0 16px', lineHeight: 1.5 }}>
                  {scenario.question}
                </p>

                {/* Response or placeholder */}
                {completed ? (
                  <div style={{ borderLeft: '2px solid var(--portal-gold-line)', paddingLeft: '16px' }}>
                    <p style={{ ...SERIF, fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 300, color: 'var(--portal-ink)', margin: 0, lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>
                      {response}
                    </p>
                  </div>
                ) : (
                  <p style={{ ...SERIF, fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--portal-label)', margin: 0 }}>
                    The founder has not responded to this scenario yet.
                  </p>
                )}
              </div>
            )
          })}
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
