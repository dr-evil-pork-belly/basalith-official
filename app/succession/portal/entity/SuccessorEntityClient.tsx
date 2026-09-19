'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

const MONO: React.CSSProperties  = { fontFamily: 'var(--portal-mono)' }
const SERIF: React.CSSProperties = { fontFamily: 'var(--portal-serif)' }

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
    <main className="portal-stone" style={{ minHeight: '100vh', background: 'var(--portal-bg)' }}>

      {/* Top bar. The spine: this portal has no sidebar, so the ink bar is the
          dark anchor. Colors inside it are --spine-* values. */}
      <div style={{ background: 'var(--portal-spine)', color: 'var(--spine-fg)', padding: '18px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Link href="/succession/portal" style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--spine-body)', textDecoration: 'none' }}>
            ← Portal
          </Link>
          <span style={{ ...MONO, fontSize: '11px', color: 'var(--spine-dim)', margin: '0 8px' }}>|</span>
          <span style={{ ...MONO, fontSize: '11px', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--spine-gold)' }}>
            Querying: {archiveName}
          </span>
        </div>
        <Link
          href="/succession/portal/context"
          style={{ ...MONO, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--spine-body)', textDecoration: 'none' }}
        >
          Add Context
        </Link>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 40px' }}>

        {/* Active context layer, collapsible */}
        <div style={{ marginBottom: '32px', border: '1px solid var(--portal-gold-line)', background: 'var(--portal-gold-line)' }}>
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
              fontSize: '11px',
              letterSpacing:  '0.2em',
              textTransform:  'uppercase',
              color:          'var(--portal-gold-ink)',
            }}
          >
            <span>Active Context Layer ({activeContexts.length})</span>
            <span style={{ fontSize: '14.5px', opacity: 0.6 }}>{contextOpen ? '▲' : '▼'}</span>
          </button>

          {contextOpen && (
            <div style={{ borderTop: '1px solid var(--portal-gold-line)', padding: '16px 20px' }}>
              {activeContexts.length === 0 ? (
                <p style={{ ...SERIF, fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--portal-secondary)', margin: 0 }}>
                  No context injected. The entity draws only from the frozen fingerprint.{' '}
                  <Link href="/succession/portal/context" style={{ color: 'var(--portal-gold-ink)' }}>Add context →</Link>
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {activeContexts.map(ctx => (
                    <div key={ctx.id}>
                      <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--portal-secondary)', margin: '0 0 4px' }}>
                        {contextTypeLabel(ctx.context_type)} · {formatDate(ctx.created_at)}
                      </p>
                      <p style={{ ...SERIF, fontSize: '0.85rem', fontWeight: 300, color: 'var(--portal-body)', margin: 0, lineHeight: 1.6 }}>
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
          background:   'var(--portal-inset)',
          border:       '1px solid var(--portal-gold-line)',
          padding:      '24px',
          minHeight:    '320px',
          maxHeight:    '520px',
          overflowY:    'auto',
          marginBottom: '0',
        }}>
          {messages.length === 0 && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '240px', gap: '12px', textAlign: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 36 36" fill="none" aria-hidden="true" style={{ opacity: 0.5 }}>
                <rect x="18" y="2"  width="11.31" height="11.31" transform="rotate(45 18 2)"  fill="none" stroke="var(--portal-gold-ink)" strokeWidth="1"/>
                <rect x="18" y="9"  width="7.07"  height="7.07"  transform="rotate(45 18 9)"  fill="none" stroke="var(--portal-gold-ink)" strokeWidth="0.75"/>
              </svg>
              <p style={{ ...SERIF, fontSize: '1rem', fontStyle: 'italic', color: 'var(--portal-body)', margin: 0 }}>
                Ask the entity anything.
              </p>
              {ownerName && (
                <p style={{ ...SERIF, fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--portal-secondary)', margin: 0 }}>
                  It will answer as {ownerName} would.
                </p>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: msg.role === 'user' ? 'var(--portal-secondary)' : 'var(--portal-gold-ink)', marginBottom: '6px' }}>
                  {msg.role === 'user' ? session.name.split(' ')[0] : archiveName}
                </p>
                {/* The founder's judgment, in the founder's words: the inverted
                    block. This is the moment the whole succession product exists
                    for, so it gets the same treatment as the proof card and the
                    owner's entity. Every color inside is an --invert-* value. */}
                <div style={{
                  background:   msg.role === 'user' ? 'var(--portal-gold-wash)' : 'var(--invert-bg)',
                  color:        msg.role === 'user' ? 'var(--portal-ink)' : 'var(--invert-fg)',
                  border:       msg.role === 'user' ? '1px solid var(--portal-gold-line)' : 'none',
                  borderLeft:   msg.role === 'entity' ? '3px solid var(--invert-gold)' : undefined,
                  borderRadius: '2px',
                  padding:      msg.role === 'user' ? '14px 18px' : '16px 20px 16px 22px',
                  maxWidth:     '85%',
                }}>
                  <p style={{
                    ...SERIF,
                    fontSize:   msg.role === 'entity' ? '18px' : '17px',
                    fontStyle:  msg.role === 'entity' ? 'italic' : 'normal',
                    fontWeight: 300,
                    color:      msg.role === 'entity' ? 'var(--invert-fg)' : 'var(--portal-ink)',
                    lineHeight: 1.7,
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
                <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--portal-gold-ink)', marginBottom: '6px' }}>
                  {archiveName}
                </p>
                <div style={{ borderLeft: '2px solid var(--portal-gold-line)', paddingLeft: '18px', paddingTop: '12px', paddingBottom: '12px' }}>
                  <p style={{ ...SERIF, fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--portal-body)', margin: 0 }}>
                    Drawing on the record
                    <span style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>…</span>
                  </p>
                </div>
              </div>
            )}
          </div>
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ borderTop: '1px solid var(--portal-gold-line)', paddingTop: '16px', marginTop: 0 }}>
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={activeContexts.length > 0
              ? 'Ask your question. The entity has your context.'
              : 'Ask your question, or add context first to inform the response.'}
            style={{
              ...SERIF,
              width:        '100%',
              background:   'transparent',
              border:       'none',
              borderBottom: input ? '1px solid var(--portal-gold-line)' : '1px solid var(--portal-gold-line)',
              color:        'var(--portal-ink)',
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
                background:    'var(--portal-btn)',
                border:        'none',
                padding:       '10px 28px',
                fontSize: '11px',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                color:         'var(--portal-btn-label)',
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
