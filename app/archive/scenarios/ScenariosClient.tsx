'use client'

import { useState } from 'react'
import { B2B_SCENARIOS } from '@/lib/b2bScenarios'

const MONO: React.CSSProperties  = { fontFamily: '"Space Mono", "Courier New", monospace' }
const SERIF: React.CSSProperties = { fontFamily: '"Cormorant Garamond", Georgia, serif' }

interface ScenarioResponse {
  scenario_id: string
  response:    string
  created_at:  string
}

interface Props {
  archiveId:         string
  existingResponses: ScenarioResponse[]
}

export default function ScenariosClient({ archiveId: _archiveId, existingResponses }: Props) {
  // Keep most-recent response per scenario (server orders by created_at desc)
  const initialMap: Record<string, string> = {}
  for (const r of existingResponses) {
    if (!initialMap[r.scenario_id]) initialMap[r.scenario_id] = r.response
  }

  const [responseMap, setResponseMap] = useState<Record<string, string>>(initialMap)
  const [openId,      setOpenId]      = useState<string | null>(null)
  const [input,       setInput]       = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  function openScenario(id: string) {
    setOpenId(id)
    setInput(responseMap[id] ?? '')
    setError('')
  }

  function closeScenario() {
    setOpenId(null)
    setInput('')
    setError('')
  }

  async function handleSubmit(scenarioId: string) {
    if (input.trim().length < 20) { setError('Please write at least a sentence.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/archive/scenarios/respond', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ scenarioId, response: input.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to save.'); return }
      setResponseMap(prev => ({ ...prev, [scenarioId]: input.trim() }))
      closeScenario()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const completedCount = Object.keys(responseMap).length

  const inputStyle: React.CSSProperties = {
    width:      '100%',
    background: 'rgba(240,237,230,0.03)',
    border:     '1px solid rgba(196,162,74,0.18)',
    color:      '#F0EDE6',
    outline:    'none',
    padding:    '12px 14px',
    ...SERIF,
    fontSize:   '0.95rem',
    fontWeight: 300,
    lineHeight: 1.7,
    resize:     'vertical',
    boxSizing:  'border-box',
  }

  return (
    <div style={{ maxWidth: '900px' }}>

      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <p style={{ ...MONO, fontSize: '0.44rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.5)', marginBottom: '8px' }}>
          Business Scenarios
        </p>
        <h1 style={{ ...SERIF, fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 300, color: '#F0EDE6', margin: '0 0 10px', lineHeight: 1.2 }}>
          How Would You Handle It?
        </h1>
        <p style={{ ...SERIF, fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 300, color: '#706C65', margin: '0 0 12px', lineHeight: 1.7 }}>
          Twenty business scenarios. Your responses become part of your cognitive fingerprint and are available
          to your successors when they need to apply your judgment.
        </p>
        <p style={{ ...MONO, fontSize: '0.48rem', letterSpacing: '0.14em', color: completedCount === 20 ? '#C4A24A' : '#5C6166' }}>
          {completedCount} of 20 completed
        </p>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1px', background: 'rgba(196,162,74,0.08)' }}>
        {B2B_SCENARIOS.map(scenario => {
          const savedResponse = responseMap[scenario.id]
          const completed     = !!savedResponse
          const isOpen        = openId === scenario.id

          return (
            <div key={scenario.id} style={{ background: '#0C0B09', padding: '24px' }}>

              {/* Category */}
              <p style={{ ...MONO, fontSize: '0.44rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C4A24A', marginBottom: '8px' }}>
                {scenario.category}
              </p>

              {/* Title */}
              <p style={{ ...SERIF, fontSize: '1.1rem', fontStyle: 'italic', fontWeight: 400, color: '#F0EDE6', margin: '0 0 10px', lineHeight: 1.3 }}>
                {scenario.title}
              </p>

              {/* Setup — clamped to 2 lines when card is closed */}
              {!isOpen && (
                <>
                  <p style={{
                    ...SERIF,
                    fontSize:               '0.88rem',
                    fontWeight:             300,
                    color:                  '#706C65',
                    margin:                 '0 0 6px',
                    lineHeight:             1.5,
                    display:                '-webkit-box',
                    WebkitLineClamp:        2,
                    WebkitBoxOrient:        'vertical' as const,
                    overflow:               'hidden',
                  }}>
                    {scenario.setup}
                  </p>
                  <p style={{ ...SERIF, fontSize: '0.88rem', fontStyle: 'italic', color: '#5C6166', margin: '0 0 16px', lineHeight: 1.5 }}>
                    {scenario.question}
                  </p>
                </>
              )}

              {/* Closed state */}
              {!isOpen && (
                completed ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4CAF50', flexShrink: 0 }} />
                      <span style={{ ...MONO, fontSize: '0.44rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4CAF50' }}>
                        Completed
                      </span>
                    </div>
                    <p style={{ ...SERIF, fontSize: '0.85rem', fontStyle: 'italic', fontWeight: 300, color: '#706C65', margin: '0 0 12px', lineHeight: 1.6 }}>
                      {savedResponse.length > 120 ? savedResponse.slice(0, 120) + '…' : savedResponse}
                    </p>
                    <button
                      onClick={() => openScenario(scenario.id)}
                      style={{ ...MONO, fontSize: '0.44rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5C6166', background: 'none', border: '1px solid rgba(255,255,255,0.06)', padding: '6px 14px', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => openScenario(scenario.id)}
                    style={{
                      ...MONO,
                      fontSize:      '0.5rem',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color:         '#C4A24A',
                      background:    'transparent',
                      border:        '1px solid rgba(196,162,74,0.3)',
                      padding:       '8px 18px',
                      cursor:        'pointer',
                    }}
                  >
                    Respond
                  </button>
                )
              )}

              {/* Inline response form */}
              {isOpen && (
                <div>
                  <div style={{ borderLeft: '2px solid rgba(196,162,74,0.3)', paddingLeft: '14px', marginBottom: '16px' }}>
                    <p style={{ ...SERIF, fontSize: '0.88rem', fontWeight: 300, color: '#B8B4AB', margin: '0 0 6px', lineHeight: 1.6 }}>
                      {scenario.setup}
                    </p>
                    <p style={{ ...SERIF, fontSize: '0.88rem', fontStyle: 'italic', color: '#C4A24A', margin: 0, lineHeight: 1.6 }}>
                      {scenario.question}
                    </p>
                  </div>

                  <textarea
                    autoFocus
                    rows={6}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Write your answer. Be specific — your successors will use this to apply your judgment."
                    style={inputStyle}
                  />

                  {error && (
                    <p style={{ ...MONO, fontSize: '0.46rem', color: 'rgba(196,162,74,0.7)', marginTop: '6px' }}>{error}</p>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <button
                      onClick={() => handleSubmit(scenario.id)}
                      disabled={saving || input.trim().length < 20}
                      style={{
                        ...MONO,
                        fontSize:      '0.5rem',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        background:    saving || input.trim().length < 20 ? 'rgba(196,162,74,0.15)' : '#C4A24A',
                        color:         saving || input.trim().length < 20 ? '#C4A24A' : '#0A0908',
                        border:        '1px solid rgba(196,162,74,0.3)',
                        padding:       '10px 20px',
                        cursor:        saving || input.trim().length < 20 ? 'not-allowed' : 'pointer',
                        transition:    'background 0.2s, color 0.2s',
                      }}
                    >
                      {saving ? 'Saving...' : 'Save Response'}
                    </button>
                    <button
                      onClick={closeScenario}
                      style={{ ...MONO, fontSize: '0.48rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5C6166', background: 'none', border: '1px solid rgba(255,255,255,0.06)', padding: '10px 20px', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
