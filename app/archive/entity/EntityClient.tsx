'use client'

import { useState, useEffect, useRef } from 'react'
import VoiceRecorder from '@/app/components/VoiceRecorder'

// ── Types ──────────────────────────────────────────────────────────────────
type Message = {
  id:         string
  role:       'user' | 'entity' | 'deposit'
  content:    string
  dbId?:      string
  rating?:    'accurate' | 'partial' | 'inaccurate'
  corrected?: boolean
}

function isStatement(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed.endsWith('?')) return false
  const questionStarters = [
    'what','how','why','when','where','who',
    'can','could','would','should',
    'do','does','is','are','will',
  ]
  const firstWord = trimmed.split(' ')[0].toLowerCase()
  if (questionStarters.includes(firstWord)) return false
  return trimmed.length > 30
}

type ArchiveStats = {
  depositCount:  number
  labelCount:    number
  peopleCount:   number
  decadeCount:   number
}


// ── Prompts ────────────────────────────────────────────────────────────────
const SUGGESTED_PROMPTS = [
  'What do I believe about hard work?',
  'How do I think about money?',
  'What would I tell my younger self?',
  'What have I learned from failure?',
  'How do I think about family?',
  'What am I most proud of?',
  'What do I regret?',
  'What do I want my grandchildren to know?',
]

// ── Sigil ──────────────────────────────────────────────────────────────────
function Sigil({ size = 24, pulse = false }: { size?: number; pulse?: boolean }) {
  const half = size / 2
  const d    = size * 0.28
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      style={{ flexShrink: 0, opacity: pulse ? undefined : 0.7 }}
      className={pulse ? 'animate-pulse' : ''}
    >
      <rect x={half - d} y={half - d} width={d * 2} height={d * 2}
        stroke="var(--portal-gold-ink)" strokeWidth="1" transform={`rotate(45 ${half} ${half})`} />
      <rect x={half - d * 0.55} y={half - d * 0.55} width={d * 1.1} height={d * 1.1}
        stroke="var(--portal-gold-ink)" strokeWidth="0.75" transform={`rotate(45 ${half} ${half})`} />
    </svg>
  )
}

// ── Dots loader ────────────────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div style={{ borderLeft: '2px solid var(--portal-gold-line)', paddingLeft: '1rem', paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
      <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.12em', color: 'var(--portal-gold-ink)', marginBottom: '0.4rem' }}>
        YOUR ENTITY
      </p>
      <span className="font-serif italic" style={{ fontSize: '0.95rem', color: 'var(--portal-body)' }}>
        Your entity is thinking
        <span className="animate-pulse">...</span>
      </span>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function EntityClient({ archiveId }: { archiveId: string }) {
  const [messages,             setMessages]             = useState<Message[]>([])
  const [inputValue,           setInputValue]           = useState('')
  const [isLoading,            setIsLoading]            = useState(false)
  const [sessionId,            setSessionId]            = useState<string | null>(null)
  const [conversationHistory,  setConversationHistory]  = useState<{ role: string; content: string }[]>([])
  const [stats,                setStats]                = useState<ArchiveStats | null>(null)
  const [nudgeDismissed,       setNudgeDismissed]       = useState(false)
  const [correctionOpen,       setCorrectionOpen]       = useState<Record<string, boolean>>({})
  const [correctionText,       setCorrectionText]       = useState<Record<string, string>>({})
  const [correctionSaved,      setCorrectionSaved]      = useState<Record<string, boolean>>({})
  const [showVoicePanel,       setShowVoicePanel]       = useState(false)

  const bottomRef    = useRef<HTMLDivElement>(null)
  const textareaRef  = useRef<HTMLTextAreaElement>(null)

  // Mark that entity page was visited so dashboard can auto-refresh
  useEffect(() => {
    sessionStorage.setItem('visited-entity', 'true')
  }, [])

  // Load archive stats
  useEffect(() => {
    fetch(`/api/archive/dashboard?archiveId=${archiveId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        const ownerDeposits = data.ownerDeposits ?? []
        const labels        = (data.recentLabels ?? []).filter((l: any) => !l.is_primary_label)
        const decades       = (data.decades ?? []).filter((d: any) => d.photo_count > 0)
        setStats({
          depositCount: ownerDeposits.length,
          labelCount:   labels.length,
          peopleCount:  0,
          decadeCount:  decades.length,
        })
      })
  }, [archiveId])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const entityResponseCount = messages.filter(m => m.role === 'entity').length
  const depositCount        = stats?.depositCount ?? 0
  const labelCount          = stats?.labelCount   ?? 0

  const archiveState =
    depositCount >= 30 ? 'rich' :
    depositCount >= 10 ? 'medium' : 'thin'

  const stateLabel =
    archiveState === 'rich'   ? 'Speaking with depth' :
    archiveState === 'medium' ? 'Taking shape'        : 'Still learning'

  const stateLabelColor =
    archiveState === 'rich'   ? 'var(--portal-gold-ink)'   :
    archiveState === 'medium' ? 'var(--portal-gold-line)' : 'var(--portal-label)'

  const subtitleText =
    archiveState === 'thin'
      ? 'Your entity is still learning. Talk to it. Correct it. Every exchange makes it more accurate.'
      : 'Your entity speaks from your archive. Rate each response. Corrections become deposits.'

  // Send message
  async function send() {
    const text = inputValue.trim()
    if (!text || isLoading) return

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setIsLoading(true)

    const nextHistory = [
      ...conversationHistory,
      { role: 'user', content: text },
    ]

    try {
      const res = await fetch('/api/archive/entity-chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          archiveId,
          message:             text,
          sessionId,
          conversationHistory: conversationHistory.slice(-20), // last 10 exchanges
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const entityMsg: Message = {
        id:      crypto.randomUUID(),
        role:    'entity',
        content: data.response,
      }
      setMessages(prev => [...prev, entityMsg])
      setSessionId(data.sessionId)
      setConversationHistory([
        ...nextHistory,
        { role: 'assistant', content: data.response },
      ])
    } catch (err) {
      setMessages(prev => [...prev, {
        id:      crypto.randomUUID(),
        role:    'entity',
        content: 'Something went wrong. Please try again.',
      }])
    } finally {
      setIsLoading(false)
    }
  }

  // Deposit directly: no entity response
  async function depositOnly() {
    const text = inputValue.trim()
    if (!text || isLoading) return
    setInputValue('')

    const depositMsg: Message = {
      id:      crypto.randomUUID(),
      role:    'deposit',
      content: text,
    }
    setMessages(prev => [...prev, depositMsg])

    try {
      await fetch('/api/archive/owner-deposit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ archiveId, prompt: 'Direct deposit', response: text }),
      })
    } catch {}
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  // Rate a message
  async function rate(msg: Message, rating: 'accurate' | 'partial' | 'inaccurate') {
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, rating } : m))
    if (rating === 'accurate') {
      // Post immediately: no correction needed
      await fetch('/api/archive/entity-feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ archiveId, conversationId: msg.dbId ?? msg.id, rating }),
      })
    } else {
      setCorrectionOpen(prev => ({ ...prev, [msg.id]: true }))
    }
  }

  // Save correction
  async function saveCorrection(msg: Message) {
    const correction = correctionText[msg.id] ?? ''
    await fetch('/api/archive/entity-feedback', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        archiveId,
        conversationId: msg.dbId ?? msg.id,
        rating:         msg.rating,
        correction:     correction.trim() || undefined,
      }),
    })
    setCorrectionSaved(prev => ({ ...prev, [msg.id]: true }))
    setCorrectionOpen(prev => ({ ...prev, [msg.id]: false }))
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, corrected: true } : m))
  }

  // Chip click
  function usePrompt(prompt: string) {
    setInputValue(prompt)
    textareaRef.current?.focus()
  }

  const showNudge = entityResponseCount >= 5 && !nudgeDismissed

  return (
    <div style={{ maxWidth: '1100px' }}>

      {/* ── Page header ── */}
      <div className="mb-8">
        <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--portal-gold-ink)', marginBottom: '0.5rem' }}>
          Archive Portal
        </p>
        <h1 className="font-serif font-semibold tracking-[-0.025em]" style={{ fontSize: 'clamp(1.8rem,3vw,2.6rem)', color: 'var(--portal-ink)' }}>
          Talk to Your Entity
        </h1>
      </div>

      {/* ── Zero-state banner (shown above conversation when archive is thin and no messages yet) ── */}
      {archiveState === 'thin' && messages.length === 0 && (
        <div className="mb-8" style={{ maxWidth: '520px', margin: '0 auto 2.5rem' }}>
          <div className="flex justify-center mb-5">
            <Sigil size={44} pulse />
          </div>
          <p className="font-serif text-center" style={{ fontWeight: 700, fontSize: '1.8rem', color: 'var(--portal-ink)', marginBottom: '0.75rem' }}>
            Your entity is waiting.
          </p>
          <p className="font-serif italic font-light text-center" style={{ fontSize: '0.95rem', color: 'var(--portal-body)', lineHeight: 1.85, marginBottom: '2rem' }}>
            Your entity learns from your deposits, family memories, and conversations.
            Start by answering one question below.
          </p>
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .entity-left-col  { order: 2; }
          .entity-right-col { order: 1; }
        }
        @media (max-width: 768px) {
          .entity-input-area {
            position: sticky;
            bottom: 0;
            background: var(--portal-card);
            z-index: 10;
            padding-bottom: max(0.5rem, env(safe-area-inset-bottom, 0px)) !important;
            border-top: 1px solid var(--portal-rule) !important;
            padding-top: 0.75rem !important;
          }
        }
      `}</style>

      {/* ── Two-column layout ── */}
      <div className="flex flex-col lg:flex-row gap-8">

        {/* ── LEFT: context + prompts (35%) ── */}
        <div className="entity-left-col" style={{ width: '100%', maxWidth: '320px', flexShrink: 0 }}>

          {/* Entity state */}
          <div className="mb-6">
            <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--portal-gold-ink)', marginBottom: '0.75rem' }}>
              Your Entity
            </p>

            {/* The score out of 100 and the five lowest dimension bars that sat
                here until September 15, 2026 were a deposit-count reading shown
                as accuracy. The coverage map on the dashboard replaces them. */}
            <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: stateLabelColor, marginBottom: '1rem' }}>
              {stateLabel}
            </p>

            <a
              href="/archive/dashboard"
              style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--portal-gold-ink)', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--portal-gold-ink)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--portal-gold-ink)')}
            >
              See where your archive is thin →
            </a>

          </div>

          {/* Rule */}
          <div style={{ height: '1px', background: 'var(--portal-tint)', marginBottom: '1.5rem' }} />

          {/* Suggested prompts */}
          <div className="mb-5">
            <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--portal-secondary)', marginBottom: '0.75rem' }}>
              Start Here
            </p>
            <div className="flex flex-col gap-2">
              {SUGGESTED_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => usePrompt(prompt)}
                  className="text-left transition-colors duration-150"
                  style={{
                    background:   'transparent',
                    border:       '1px solid var(--portal-gold-line)',
                    borderRadius: '2px',
                    padding:      '0.5rem 1rem',
                    fontFamily: 'var(--portal-serif)',
                    fontStyle:    'italic',
                    fontSize:     '0.9rem',
                    color:        'var(--portal-body)',
                    cursor:       'pointer',
                    lineHeight:   1.4,
                  }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--portal-gold-line)'
                    ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--portal-ink)'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--portal-gold-line)'
                    ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--portal-body)'
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <p className="font-serif italic font-light" style={{ fontSize: '14.5px', color: 'var(--portal-secondary)', lineHeight: 1.7 }}>
            These prompts are designed to build your entity's depth. The more you deposit,
            the more accurately it represents how you think.
          </p>
        </div>

        {/* ── RIGHT: conversation (65%) ── */}
        <div className="entity-right-col" style={{ flex: 1, minWidth: 0 }}>

          {/* Conversation header */}
          <div className="mb-4">
            <h2 className="font-serif" style={{ fontWeight: 700, fontSize: '1.3rem', color: 'var(--portal-ink)', marginBottom: '0.25rem' }}>
              Your Entity
            </h2>
            <p className="font-serif italic" style={{ fontSize: '0.85rem', color: 'var(--portal-body)', marginBottom: '0.5rem' }}>
              {subtitleText}
            </p>
            <p className="font-serif italic" style={{ fontSize: '14.5px', color: 'var(--portal-secondary)', lineHeight: 1.85 }}>
              Your archive runs on two permanent layers: one that holds every fact and memory you have deposited, and one that learns how you express, reason, and decide. Neither replaces the other.
            </p>
          </div>

          {/* Session nudge banner */}
          {showNudge && (
            <div
              className="flex items-center justify-between mb-4"
              style={{
                background: 'var(--portal-gold-wash)',
                border:     '1px solid var(--portal-gold-line)',
                borderRadius: '2px',
                padding:    '0.75rem 1rem',
              }}
            >
              <p className="font-serif italic" style={{ fontSize: '0.9rem', color: 'var(--portal-body)' }}>
                Your entity spoke {entityResponseCount} times in this session. Rate its responses to improve its accuracy.
              </p>
              <button
                onClick={() => setNudgeDismissed(true)}
                style={{ background: 'none', border: 'none', color: 'var(--portal-secondary)', cursor: 'pointer', fontSize: '1rem', paddingLeft: '1rem', flexShrink: 0 }}
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}

          {/* Conversation area */}
          <div
            style={{
              background:   'var(--portal-inset)',
              border:       '1px solid var(--portal-gold-line)',
              borderRadius: '2px',
              padding:      '1.5rem',
              maxHeight:    '500px',
              overflowY:    'auto',
              marginBottom: '0',
            }}
          >
            {/* Empty state */}
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: '200px', gap: '0.75rem' }}>
                <Sigil size={24} />
                <p className="font-serif italic" style={{ fontSize: '1rem', color: 'var(--portal-body)' }}>
                  Ask your entity anything.
                </p>
                <p className="font-serif italic" style={{ fontSize: '0.85rem', color: 'var(--portal-secondary)' }}>
                  It will answer from your archive.
                </p>
              </div>
            )}

            {/* Messages */}
            <div className="flex flex-col gap-5">
              {messages.map((msg, idx) => (
                <div key={msg.id}>
                  {msg.role === 'deposit' ? (
                    /* Deposit confirmation */
                    <div>
                      <div style={{
                        background:  'var(--portal-gold-wash)',
                        borderLeft:  '2px solid var(--portal-gold-ink)',
                        padding:     '0.75rem 1rem',
                        borderRadius: '0 2px 2px 0',
                      }}>
                        <p className="font-serif italic" style={{ fontSize: '0.9rem', color: 'var(--portal-gold-ink)', marginBottom: '0.3rem' }}>
                          Deposited to your archive.
                        </p>
                        <p className="font-serif font-light" style={{ fontSize: '0.85rem', color: 'var(--portal-body)', lineHeight: 1.5 }}>
                          {msg.content.length > 60 ? msg.content.slice(0, 60) + '…' : msg.content}
                        </p>
                      </div>
                      <p className="font-serif italic" style={{ fontSize: '14.5px', color: 'var(--portal-secondary)', marginTop: '0.4rem', paddingLeft: '1rem' }}>
                        Ask your entity about this now to see how it responds.
                      </p>
                    </div>
                  ) : msg.role === 'user' ? (
                    /* User message: right aligned */
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.14em', color: 'var(--portal-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                        You
                      </p>
                      <div style={{
                        background:   'var(--portal-gold-wash)',
                        border:       '1px solid var(--portal-gold-line)',
                        borderRadius: '2px',
                        padding:      '12px 16px',
                        maxWidth:     '80%',
                      }}>
                        <p style={{ fontFamily: 'var(--portal-serif)', fontSize: '1rem', fontWeight: 300, color: 'var(--portal-ink)', lineHeight: 1.75 }}>
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Entity message: left aligned */
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.14em', color: 'var(--portal-gold-ink)', marginBottom: '6px', textTransform: 'uppercase' }}>
                        Your Entity
                      </p>
                      {/* The archive speaks: the inverted block. Every color inside is an --invert-* value. */}
                      <div style={{
                        borderLeft:   '3px solid var(--invert-gold)',
                        background:   'var(--invert-bg)',
                        color:        'var(--invert-fg)',
                        borderRadius: '0 2px 2px 0',
                        padding:      '16px 20px 16px 22px',
                        maxWidth:     '90%',
                      }}>
                        <p style={{ fontFamily: 'var(--portal-serif)', fontSize: '18px', fontStyle: 'italic', fontWeight: 300, color: 'var(--invert-fg)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                          {msg.content}
                        </p>
                      </div>

                      {/* Accuracy rating */}
                      {!msg.corrected && (
                        <div style={{ paddingLeft: '1rem', marginTop: '0.5rem' }}>
                          <div className="flex items-center gap-3">
                            {(['accurate', 'partial', 'inaccurate'] as const).map(r => (
                              <button
                                key={r}
                                onClick={() => rate(msg, r)}
                                style={{
                                  background: 'none',
                                  border:     'none',
                                  padding:    0,
                                  cursor:     'pointer',
                                  fontFamily: 'var(--portal-mono)',
                                  fontSize: '11px',
                                  letterSpacing: '0.1em',
                                  textTransform: 'uppercase',
                                  color:
                                    msg.rating === r
                                      ? r === 'accurate'   ? 'var(--portal-gold-ink)'
                                      : r === 'partial'    ? 'var(--portal-body)'
                                      :                       'var(--portal-error)'
                                      : 'var(--portal-secondary)',
                                  transition: 'color 0.15s',
                                }}
                                onMouseEnter={e => { if (!msg.rating) (e.currentTarget as HTMLButtonElement).style.color = 'var(--portal-body)' }}
                                onMouseLeave={e => { if (!msg.rating) (e.currentTarget as HTMLButtonElement).style.color = 'var(--portal-secondary)' }}
                              >
                                {r === 'accurate' ? '✓ Accurate' : r === 'partial' ? '~ Partial' : '✗ Inaccurate'}
                              </button>
                            ))}
                          </div>

                          {/* Correction input */}
                          {correctionOpen[msg.id] && (
                            <div style={{ marginTop: '0.5rem' }}>
                              <input
                                type="text"
                                placeholder="What would be more accurate?"
                                value={correctionText[msg.id] ?? ''}
                                onChange={e => setCorrectionText(prev => ({ ...prev, [msg.id]: e.target.value }))}
                                className="font-serif italic"
                                style={{
                                  width:        '100%',
                                  background:   'transparent',
                                  border:       'none',
                                  borderBottom: '1px solid var(--portal-gold-line)',
                                  color:        'var(--portal-body)',
                                  fontSize:     '1rem',
                                  padding:      '0.25rem 0',
                                  outline:      'none',
                                  fontStyle:    'italic',
                                }}
                              />
                              <button
                                onClick={() => saveCorrection(msg)}
                                style={{
                                  marginTop:    '0.4rem',
                                  background:   'none',
                                  border:       'none',
                                  cursor:       'pointer',
                                  fontFamily: 'var(--portal-mono)',
                                  fontSize: '11px',
                                  letterSpacing: '0.18em',
                                  textTransform: 'uppercase',
                                  color:        'var(--portal-gold-ink)',
                                  textDecoration: 'none',
                                  padding:      0,
                                }}
                                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                              >
                                Save Correction
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Saved confirmation */}
                      {correctionSaved[msg.id] && (
                        <p style={{ paddingLeft: '1rem', marginTop: '0.25rem', fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.1em', color: 'var(--portal-gold-ink)', textTransform: 'uppercase' }}>
                          Saved to your archive
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Loading */}
              {isLoading && <ThinkingDots />}

              {/* Gentle nudge after 3 entity responses */}
              {entityResponseCount === 3 && !isLoading && (
                <p className="font-serif italic text-center" style={{ fontSize: '14.5px', color: 'var(--portal-secondary)' }}>
                  Each correction you make becomes a deposit in your archive.
                </p>
              )}
            </div>
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="entity-input-area" style={{ borderTop: '1px solid var(--portal-gold-line)', paddingTop: '1rem', marginTop: 0, paddingBottom: 'max(0px, env(safe-area-inset-bottom, 0px))' }}>

            {/* Voice panel: slides in above textarea */}
            {showVoicePanel && (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontFamily: 'var(--portal-serif)', fontStyle: 'italic', fontSize: '14.5px', color: 'var(--portal-secondary)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
                  Your recording will be saved to your archive. The transcript will appear in the chat input.
                </p>
                <VoiceRecorder
                  archiveId={archiveId}
                  onComplete={(transcript) => {
                    setInputValue(transcript)
                    setShowVoicePanel(false)
                    setTimeout(() => textareaRef.current?.focus(), 100)
                  }}
                  onClose={() => setShowVoicePanel(false)}
                />
              </div>
            )}

            <textarea
              ref={textareaRef}
              rows={2}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask your entity anything..."
              className="font-serif w-full resize-none focus:outline-none"
              style={{
                background:   'transparent',
                border:       'none',
                borderBottom: inputValue ? '1px solid var(--portal-gold-line)' : '1px solid var(--portal-gold-line)',
                color:        'var(--portal-ink)',
                fontSize:     '1rem',
                padding:      '0 0 0.5rem',
                display:      'block',
                width:        '100%',
                transition:   'border-color 0.2s',
              }}
            />
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                {/* Microphone button */}
                <button
                  onClick={() => setShowVoicePanel(v => !v)}
                  title="Record voice"
                  style={{
                    width:        '44px',
                    height:       '44px',
                    borderRadius: '50%',
                    background:   showVoicePanel ? 'var(--portal-tint)' : 'transparent',
                    border:       showVoicePanel ? '1px solid var(--portal-gold-ink)' : '1px solid var(--portal-gold-line)',
                    cursor:       'pointer',
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'center',
                    transition:   'all 0.15s',
                    flexShrink:   0,
                  }}
                  onMouseEnter={e => {
                    if (!showVoicePanel) {
                      e.currentTarget.style.borderColor = 'var(--portal-gold-ink)'
                      e.currentTarget.style.background = 'var(--portal-gold-wash)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!showVoicePanel) {
                      e.currentTarget.style.borderColor = 'var(--portal-gold-line)'
                      e.currentTarget.style.background  = 'transparent'
                    }
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={showVoicePanel ? 'var(--portal-gold-ink)' : 'var(--portal-gold-ink)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8"  y1="23" x2="16" y2="23"/>
                  </svg>
                </button>
                <span style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', color: 'var(--portal-secondary)' }}>
                  {inputValue.length > 200 ? `${inputValue.length} chars` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={depositOnly}
                  disabled={!inputValue.trim() || isLoading}
                  style={{
                    background:    'transparent',
                    border:        '1px solid var(--portal-gold-line)',
                    borderRadius:  '2px',
                    padding:       '0.5rem 1.5rem',
                    minHeight:     '44px',
                    fontFamily: 'var(--portal-mono)',
                    fontSize: '11px',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    color:         'var(--portal-body)',
                    cursor:        'pointer',
                    opacity:       !inputValue.trim() || isLoading ? 0.4 : 1,
                    transition:    'opacity 0.15s, border-color 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (inputValue.trim() && !isLoading) {
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--portal-gold-ink)'
                      ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--portal-gold-ink)'
                    }
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--portal-gold-line)'
                    ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--portal-body)'
                  }}
                >
                  Deposit
                </button>
                <button
                  onClick={send}
                  disabled={!inputValue.trim() || isLoading}
                  style={{
                    background:    'var(--portal-btn)',
                    border:        'none',
                    borderRadius:  '2px',
                    padding:       '0.5rem 1.5rem',
                    minHeight:     '44px',
                    fontFamily: 'var(--portal-mono)',
                    fontSize: '11px',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    color:         'var(--portal-btn-label)',
                    cursor:        'pointer',
                    opacity:       !inputValue.trim() || isLoading ? 0.4 : 1,
                    transition:    'opacity 0.15s',
                  }}
                >
                  Ask
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer copy ── */}
      <div className="mt-20 text-center">
        <div style={{ width: '80px', height: '1px', background: 'var(--portal-tint)', margin: '0 auto 2rem' }} />
        <p className="font-serif italic" style={{ fontSize: '0.9rem', color: 'var(--portal-secondary)', maxWidth: '500px', margin: '0 auto', lineHeight: 1.85 }}>
          Every conversation is saved to your archive.<br />
          Every correction becomes a deposit.<br />
          Every session makes your entity more accurately you.<br />
          <br />
          In twenty years this entity will know how you think better than most people who know you.
        </p>
      </div>

    </div>
  )
}
