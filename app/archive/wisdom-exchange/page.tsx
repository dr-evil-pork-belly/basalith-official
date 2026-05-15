'use client'

import { useState, useEffect } from 'react'

const MONO: React.CSSProperties = { fontFamily: '"Space Mono","Courier New",monospace', textTransform: 'uppercase' as const, letterSpacing: '0.2em' }

interface Exchange {
  id:               string
  question:         string
  question_context: string | null
  entity_response:  string | null
  owner_correction: string | null
  owner_reviewed:   boolean
  status:           string
  created_at:       string
  contributors:     { name: string; role: string } | null
}

export default function WisdomExchangePage() {
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [loading,   setLoading]   = useState(true)
  const [action,    setAction]    = useState<Record<string, 'idle'|'approving'|'done'|'correcting'>>({})
  const [corrections, setCorrections] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/archive/wisdom-exchange')
      .then(r => r.json())
      .then(d => { setExchanges(d.exchanges ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleAction(id: string, act: 'approve' | 'correct' | 'ignore') {
    setAction(p => ({ ...p, [id]: act === 'correct' ? 'correcting' : 'approving' }))
    const correction = act === 'correct' ? corrections[id] : undefined
    await fetch('/api/archive/wisdom-exchange', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ exchangeId: id, action: act, correction }),
    })
    setExchanges(p => p.map(e => e.id === id ? { ...e, status: act === 'approve' ? 'approved' : act === 'ignore' ? 'ignored' : 'reviewed', owner_reviewed: true } : e))
    setAction(p => ({ ...p, [id]: 'done' }))
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}><p style={{ ...MONO, fontSize: '0.42rem', color: 'rgba(196,162,74,0.4)' }}>Loading...</p></div>

  const pending  = exchanges.filter(e => e.status === 'answered')
  const reviewed = exchanges.filter(e => e.status !== 'answered' && e.status !== 'ignored')

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div style={{ marginBottom: '40px' }}>
        <p style={{ ...MONO, fontSize: '0.42rem', color: '#C4A24A', marginBottom: '8px' }}>Wisdom Exchange</p>
        <h1 style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontSize: 'clamp(1.5rem,3vw,2.5rem)', fontWeight: 300, color: '#F0EDE6', margin: '0 0 12px' }}>
          What your family asked.
        </h1>
        <p style={{ fontFamily: 'Georgia,serif', fontSize: '1rem', fontStyle: 'italic', color: '#706C65', lineHeight: 1.7, maxWidth: '480px', margin: 0 }}>
          Your contributors asked your entity real questions they are wrestling with.
          Correct what is wrong. Approve what sounds right. Every correction makes the entity more accurate.
        </p>
      </div>

      {pending.length === 0 && reviewed.length === 0 && (
        <div style={{ textAlign: 'center', paddingTop: '60px' }}>
          <p style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', color: '#706C65', fontSize: '1rem' }}>
            No exchanges yet. Your contributors can ask questions from their portal.
          </p>
        </div>
      )}

      {pending.length > 0 && (
        <div style={{ marginBottom: '48px' }}>
          <p style={{ ...MONO, fontSize: '0.38rem', color: '#C4A24A', marginBottom: '20px' }}>Needs Your Review ({pending.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {pending.map(ex => (
              <ExchangeCard key={ex.id} exchange={ex} actionState={action[ex.id] ?? 'idle'} correction={corrections[ex.id] ?? ''} onCorrectionChange={v => setCorrections(p => ({ ...p, [ex.id]: v }))} onAction={handleAction} />
            ))}
          </div>
        </div>
      )}

      {reviewed.length > 0 && (
        <div>
          <p style={{ ...MONO, fontSize: '0.38rem', color: '#5C6166', marginBottom: '20px' }}>Previously Reviewed ({reviewed.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reviewed.map(ex => (
              <div key={ex.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '20px' }}>
                <p style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: '0.95rem', color: '#9DA3A8', lineHeight: 1.6, margin: '0 0 8px' }}>{ex.question}</p>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ ...MONO, fontSize: '0.34rem', color: ex.status === 'approved' ? '#4AC47C' : ex.status === 'reviewed' ? '#C4A24A' : '#706C65' }}>
                    {ex.status === 'approved' ? '✓ Approved' : ex.status === 'reviewed' ? '✓ Corrected' : ex.status}
                  </span>
                  {ex.contributors?.name && <span style={{ fontFamily: 'Georgia,serif', fontSize: '0.85rem', fontStyle: 'italic', color: '#5C6166' }}>— {ex.contributors.name}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ExchangeCard({ exchange: ex, actionState, correction, onCorrectionChange, onAction }: {
  exchange: Exchange
  actionState: 'idle' | 'approving' | 'done' | 'correcting'
  correction: string
  onCorrectionChange: (v: string) => void
  onAction: (id: string, act: 'approve' | 'correct' | 'ignore') => void
}) {
  const [showCorrect, setShowCorrect] = useState(false)

  return (
    <div style={{ background: 'rgba(196,162,74,0.03)', border: '1px solid rgba(196,162,74,0.15)', borderRadius: '4px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' }}>
        <p style={{ fontFamily: '"Space Mono",monospace', fontSize: '0.38rem', letterSpacing: '0.15em', color: '#C4A24A', margin: 0 }}>
          {ex.contributors?.name ?? 'A contributor'}{ex.contributors?.role ? ` · ${ex.contributors.role}` : ''}
        </p>
        <p style={{ fontFamily: '"Space Mono",monospace', fontSize: '0.34rem', color: '#5C6166', margin: 0, whiteSpace: 'nowrap' }}>
          {new Date(ex.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
      </div>

      <div style={{ borderLeft: '3px solid rgba(196,162,74,0.4)', padding: '16px 20px', background: 'rgba(196,162,74,0.04)', marginBottom: '16px' }}>
        <p style={{ fontFamily: 'Georgia,serif', fontSize: '17px', fontStyle: 'italic', color: '#F0EDE6', lineHeight: 1.7, margin: 0 }}>{ex.question}</p>
        {ex.question_context && <p style={{ fontFamily: 'Georgia,serif', fontSize: '13px', color: '#706C65', lineHeight: 1.6, margin: '10px 0 0', fontStyle: 'italic' }}>{ex.question_context}</p>}
      </div>

      {ex.entity_response && (
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontFamily: '"Space Mono",monospace', fontSize: '0.36rem', letterSpacing: '0.18em', color: '#5C6166', marginBottom: '10px' }}>ENTITY RESPONSE</p>
          <p style={{ fontFamily: 'Georgia,serif', fontSize: '15px', fontWeight: 300, color: '#B8B4AB', lineHeight: 1.8, margin: 0 }}>{ex.entity_response}</p>
        </div>
      )}

      {showCorrect && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontFamily: '"Space Mono",monospace', fontSize: '0.36rem', letterSpacing: '0.15em', color: '#C4A24A', marginBottom: '8px' }}>What would you actually say?</p>
          <textarea
            value={correction}
            onChange={e => onCorrectionChange(e.target.value)}
            placeholder="Write what you would actually say..."
            rows={4}
            style={{ width: '100%', background: 'rgba(196,162,74,0.04)', border: '1px solid rgba(196,162,74,0.2)', borderRadius: '2px', padding: '12px 16px', fontFamily: 'Georgia,serif', fontSize: '1rem', color: '#F0EDE6', lineHeight: 1.7, resize: 'vertical' as const, outline: 'none', boxSizing: 'border-box' as const }}
          />
        </div>
      )}

      {actionState === 'done' ? (
        <p style={{ fontFamily: '"Space Mono",monospace', fontSize: '0.4rem', color: '#4AC47C', letterSpacing: '0.15em' }}>✓ SAVED</p>
      ) : (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => onAction(ex.id, 'approve')} disabled={actionState !== 'idle'} style={{ fontFamily: '"Space Mono",monospace', fontSize: '0.38rem', letterSpacing: '0.2em', background: '#C4A24A', color: '#0A0908', border: 'none', padding: '10px 18px', borderRadius: '2px', cursor: 'pointer' }}>
            Approve
          </button>
          {!showCorrect ? (
            <button onClick={() => setShowCorrect(true)} style={{ fontFamily: '"Space Mono",monospace', fontSize: '0.38rem', letterSpacing: '0.2em', background: 'transparent', color: '#C4A24A', border: '1px solid rgba(196,162,74,0.35)', padding: '10px 18px', borderRadius: '2px', cursor: 'pointer' }}>
              Correct
            </button>
          ) : (
            <button onClick={() => onAction(ex.id, 'correct')} disabled={!correction.trim() || actionState !== 'idle'} style={{ fontFamily: '"Space Mono",monospace', fontSize: '0.38rem', letterSpacing: '0.2em', background: 'transparent', color: '#C4A24A', border: '1px solid rgba(196,162,74,0.35)', padding: '10px 18px', borderRadius: '2px', cursor: 'pointer', opacity: !correction.trim() ? 0.5 : 1 }}>
              Save Correction
            </button>
          )}
          <button onClick={() => onAction(ex.id, 'ignore')} style={{ fontFamily: '"Space Mono",monospace', fontSize: '0.38rem', letterSpacing: '0.2em', background: 'transparent', color: '#706C65', border: '1px solid rgba(240,237,230,0.08)', padding: '10px 18px', borderRadius: '2px', cursor: 'pointer' }}>
            Ignore
          </button>
        </div>
      )}
    </div>
  )
}
