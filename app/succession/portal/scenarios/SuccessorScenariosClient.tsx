'use client'

import Link from 'next/link'
import { B2B_SCENARIOS } from '@/lib/b2bScenarios'

const MONO: React.CSSProperties  = { fontFamily: "'Courier New', monospace" }
const SERIF: React.CSSProperties = { fontFamily: 'Georgia, serif' }

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
    <main style={{ minHeight: '100vh', background: '#0A0908' }}>

      {/* Top bar */}
      <div style={{ borderBottom: '1px solid rgba(196,162,74,0.12)', padding: '18px 40px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/succession/portal" style={{ ...MONO, fontSize: '0.56rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5C6166', textDecoration: 'none' }}>
          ← Portal
        </Link>
        <span style={{ ...MONO, fontSize: '0.56rem', color: '#3A3F44' }}>|</span>
        <span style={{ ...MONO, fontSize: '0.62rem', letterSpacing: '3px', textTransform: 'uppercase', color: '#C4A24A' }}>
          Scenarios · {archiveName}
        </span>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '56px 40px' }}>

        {/* Header */}
        <div style={{ marginBottom: '48px' }}>
          <p style={{ ...MONO, fontSize: '0.56rem', letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(196,162,74,0.5)', marginBottom: '10px' }}>
            {ownerName ? `How ${ownerName} Would Handle It` : 'Scenario Responses'}
          </p>
          <h1 style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 300, color: '#F0EDE6', margin: '0 0 12px', lineHeight: 1.2 }}>
            The Founder's Playbook
          </h1>
          <p style={{ ...SERIF, fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 300, color: '#706C65', margin: '0 0 14px', lineHeight: 1.7 }}>
            These are the founder's responses to structured business scenarios.
            Each answer is part of the cognitive fingerprint.
          </p>
          <p style={{ ...MONO, fontSize: '0.48rem', letterSpacing: '0.14em', color: '#5C6166' }}>
            {completedCount} of 20 scenarios answered
          </p>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1px', background: 'rgba(196,162,74,0.08)' }}>
          {B2B_SCENARIOS.map(scenario => {
            const response  = responseMap[scenario.id]
            const completed = !!response

            return (
              <div key={scenario.id} style={{ background: '#0A0908', padding: '24px' }}>

                {/* Category */}
                <p style={{ ...MONO, fontSize: '0.44rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: completed ? '#C4A24A' : '#3A3F44', marginBottom: '8px' }}>
                  {scenario.category}
                </p>

                {/* Title */}
                <p style={{ ...SERIF, fontSize: '1.1rem', fontStyle: 'italic', fontWeight: 400, color: completed ? '#F0EDE6' : '#5C6166', margin: '0 0 10px', lineHeight: 1.3 }}>
                  {scenario.title}
                </p>

                {/* Setup */}
                <p style={{ ...SERIF, fontSize: '0.88rem', fontWeight: 300, color: '#706C65', margin: '0 0 6px', lineHeight: 1.5 }}>
                  {scenario.setup}
                </p>
                <p style={{ ...SERIF, fontSize: '0.88rem', fontStyle: 'italic', color: '#5C6166', margin: '0 0 16px', lineHeight: 1.5 }}>
                  {scenario.question}
                </p>

                {/* Response or placeholder */}
                {completed ? (
                  <div style={{ borderLeft: '2px solid rgba(196,162,74,0.35)', paddingLeft: '16px' }}>
                    <p style={{ ...SERIF, fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 300, color: '#E8E4DC', margin: 0, lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>
                      {response}
                    </p>
                  </div>
                ) : (
                  <p style={{ ...SERIF, fontSize: '0.85rem', fontStyle: 'italic', color: '#3A3F44', margin: 0 }}>
                    The founder has not responded to this scenario yet.
                  </p>
                )}
              </div>
            )
          })}
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
