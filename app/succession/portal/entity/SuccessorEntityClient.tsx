'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

const MONO: React.CSSProperties  = { fontFamily: "'Courier New', monospace" }
const SERIF: React.CSSProperties = { fontFamily: 'Georgia, serif' }

type Message = { id: string; role: 'user' | 'entity'; content: string }

interface Context {
  id:           string
  content:      string
  context_type: string
  created_at:   string
}

interface Props {
  session:        { successorId: string; archiveId: string; name: string; organization: string | null }
  archiveName:    string
  ownerName:      string
  activeContexts: Context[]
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

export default function SuccessorEntityClient({ session, archiveName, ownerName, activeContexts }: Props) {
  const [messages,      setMessages]      = useState<Message[]>([])
  const [history,       setHistory]       = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [input,         setInput]         = useState('')
  const [loading,       setLoading]       = useState(false)
  const [contextOpen,   setContextOpen]   = useState(false)
  const bottomRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const nextHistory: { role: 'user' | 'assistant'; content: string }[] = [
      ...history,
      { role: 'user', content: text },
    ]

    try {
      const res = await fetch('/api/succession/entity/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          messages:    nextHistory,
          successorId: session.successorId,
          archiveId:   session.archiveId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Request failed')

      const entityMsg: Message = { id: crypto.randomUUID(), role: 'entity', content: data.reply }
      setMessages(prev => [...prev, entityMsg])
      setHistory([...nextHistory, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'entity', content: 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0A0908' }}>

      {/* Top bar */}
      <div style={{ borderBottom: '1px solid rgba(196,162,74,0.12)', padding: '18px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Link href="/succession/portal" style={{ ...MONO, fontSize: '0.56rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5C6166', textDecoration: 'none' }}>
            ← Portal
          </Link>
          <span style={{ ...MONO, fontSize: '0.56rem', color: '#3A3F44', margin: '0 8px' }}>|</span>
          <span style={{ ...MONO, fontSize: '0.62rem', letterSpacing: '3px', textTransform: 'uppercase', color: '#C4A24A' }}>
            Querying: {archiveName}
          </span>
        </div>
        <Link
          href="/succession/portal/context"
          style={{ ...MONO, fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#706C65', textDecoration: 'none' }}
        >
          Add Context
        </Link>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 40px' }}>

        {/* Active context layer — collapsible */}
        <div style={{ marginBottom: '32px', border: '1px solid rgba(196,162,74,0.18)', background: 'rgba(196,162,74,0.03)' }}>
          <button
            onClick={() => setContextOpen(v => !v)}
            style={{
              ...MONO,
              width:          '100%',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              padding:        '14px 20px',
              background:     'none',
              border:         'none',
              cursor:         'pointer',
              fontSize:       '0.6rem',
              letterSpacing:  '0.2em',
              textTransform:  'uppercase',
              color:          '#C4A24A',
            }}
          >
            <span>Active Context Layer ({activeContexts.length})</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{contextOpen ? '▲' : '▼'}</span>
          </button>

          {contextOpen && (
            <div style={{ borderTop: '1px solid rgba(196,162,74,0.12)', padding: '16px 20px' }}>
              {activeContexts.length === 0 ? (
                <p style={{ ...SERIF, fontSize: '0.85rem', fontStyle: 'italic', color: '#5C6166', margin: 0 }}>
                  No context injected. The entity draws only from the frozen fingerprint.{' '}
                  <Link href="/succession/portal/context" style={{ color: '#C4A24A' }}>Add context →</Link>
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {activeContexts.map(ctx => (
                    <div key={ctx.id}>
                      <p style={{ ...MONO, fontSize: '0.56rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#706C65', margin: '0 0 4px' }}>
                        {contextTypeLabel(ctx.context_type)} · {formatDate(ctx.created_at)}
                      </p>
                      <p style={{ ...SERIF, fontSize: '0.85rem', fontWeight: 300, color: '#B8B4AB', margin: 0, lineHeight: 1.6 }}>
                        {ctx.content.length > 200 ? ctx.content.slice(0, 200) + '…' : ctx.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Conversation area */}
        <div style={{
          background:   'rgba(240,237,230,0.02)',
          border:       '1px solid rgba(196,162,74,0.08)',
          padding:      '24px',
          minHeight:    '320px',
          maxHeight:    '520px',
          overflowY:    'auto',
          marginBottom: '0',
        }}>
          {messages.length === 0 && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '240px', gap: '12px', textAlign: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 36 36" fill="none" aria-hidden="true" style={{ opacity: 0.5 }}>
                <rect x="18" y="2"  width="11.31" height="11.31" transform="rotate(45 18 2)"  fill="none" stroke="rgba(196,162,74,0.8)" strokeWidth="1"/>
                <rect x="18" y="9"  width="7.07"  height="7.07"  transform="rotate(45 18 9)"  fill="none" stroke="rgba(196,162,74,0.5)" strokeWidth="0.75"/>
              </svg>
              <p style={{ ...SERIF, fontSize: '1rem', fontStyle: 'italic', color: '#9DA3A8', margin: 0 }}>
                Ask the entity anything.
              </p>
              {ownerName && (
                <p style={{ ...SERIF, fontSize: '0.85rem', fontStyle: 'italic', color: '#5C6166', margin: 0 }}>
                  It will answer as {ownerName} would.
                </p>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <p style={{ ...MONO, fontSize: '0.36rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: msg.role === 'user' ? 'rgba(112,108,101,0.5)' : 'rgba(196,162,74,0.6)', marginBottom: '6px' }}>
                  {msg.role === 'user' ? session.name.split(' ')[0] : archiveName}
                </p>
                <div style={{
                  background:   msg.role === 'user' ? 'rgba(196,162,74,0.1)' : 'rgba(240,237,230,0.03)',
                  border:       msg.role === 'user' ? '1px solid rgba(196,162,74,0.18)' : 'none',
                  borderLeft:   msg.role === 'entity' ? '2px solid rgba(196,162,74,0.35)' : undefined,
                  borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '0 12px 12px 12px',
                  padding:      msg.role === 'user' ? '12px 16px' : '12px 16px 12px 18px',
                  maxWidth:     '85%',
                }}>
                  <p style={{
                    ...SERIF,
                    fontSize:   msg.role === 'entity' ? '1.05rem' : '1rem',
                    fontStyle:  msg.role === 'entity' ? 'italic' : 'normal',
                    fontWeight: 300,
                    color:      msg.role === 'entity' ? '#E8E4DC' : '#D4CFC7',
                    lineHeight: 1.85,
                    margin:     0,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <p style={{ ...MONO, fontSize: '0.36rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.6)', marginBottom: '6px' }}>
                  {archiveName}
                </p>
                <div style={{ borderLeft: '2px solid rgba(196,162,74,0.35)', paddingLeft: '18px', paddingTop: '12px', paddingBottom: '12px' }}>
                  <p style={{ ...SERIF, fontSize: '0.95rem', fontStyle: 'italic', color: '#9DA3A8', margin: 0 }}>
                    Drawing from the archive
                    <span style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>…</span>
                  </p>
                </div>
              </div>
            )}
          </div>
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ borderTop: '1px solid rgba(196,162,74,0.1)', paddingTop: '16px', marginTop: 0 }}>
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={activeContexts.length > 0
              ? 'Ask your question — the entity has your context…'
              : 'Ask your question — or add context first to inform the response…'}
            style={{
              ...SERIF,
              width:        '100%',
              background:   'transparent',
              border:       'none',
              borderBottom: input ? '1px solid rgba(196,162,74,0.5)' : '1px solid rgba(196,162,74,0.15)',
              color:        '#F0EDE6',
              fontSize:     '1rem',
              fontWeight:   300,
              padding:      '0 0 8px',
              resize:       'none',
              outline:      'none',
              display:      'block',
              transition:   'border-color 0.2s',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              style={{
                ...MONO,
                background:    '#C4A24A',
                border:        'none',
                padding:       '10px 28px',
                fontSize:      '0.6rem',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                color:         '#0A0908',
                cursor:        !input.trim() || loading ? 'not-allowed' : 'pointer',
                opacity:       !input.trim() || loading ? 0.4 : 1,
                transition:    'opacity 0.15s',
              }}
            >
              Ask
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
