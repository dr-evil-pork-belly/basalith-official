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

type MiniDimension = {
  id:    string
  label: string
  score: number
}

type MiniAccuracy = {
  overallScore: number
  depthLabel:   string
  bottom5:      MiniDimension[]
  cacheTime:    number
}

type WisdomNudge = {
  dimension:        string
  title:            string
  estimatedMinutes: number
} | null

const ACCURACY_CACHE_KEY = 'entity-accuracy-cache'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

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
        stroke="rgba(196,162,74,0.8)" strokeWidth="1" transform={`rotate(45 ${half} ${half})`} />
      <rect x={half - d * 0.55} y={half - d * 0.55} width={d * 1.1} height={d * 1.1}
        stroke="rgba(196,162,74,0.45)" strokeWidth="0.75" transform={`rotate(45 ${half} ${half})`} />
    </svg>
  )
}

// ── Dots loader ────────────────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div style={{ borderLeft: '2px solid rgba(196,162,74,0.4)', paddingLeft: '1rem', paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
      <p style={{ fontFamily: 'monospace', fontSize: '0.38rem', letterSpacing: '0.12em', color: 'rgba(196,162,74,0.6)', marginBottom: '0.4rem' }}>
        YOUR ENTITY
      </p>
      <span className="font-serif italic" style={{ fontSize: '0.95rem', color: '#9DA3A8' }}>
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
  const [miniAccuracy,         setMiniAccuracy]         = useState<MiniAccuracy | null>(null)
  const [accuracyAnimated,     setAccuracyAnimated]     = useState(false)
  const [nudgeDismissed,       setNudgeDismissed]       = useState(false)
  const [wisdomNudge,          setWisdomNudge]          = useState<WisdomNudge>(null)
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

  // Load mini accuracy (with 5-minute client cache)
  useEffect(() => {
    try {
      const cached = JSON.parse(sessionStorage.getItem(ACCURACY_CACHE_KEY) || 'null')
      if (cached && Date.now() - cached.cacheTime < CACHE_TTL_MS) {
        setMiniAccuracy(cached)
        setTimeout(() => setAccuracyAnimated(true), 100)
        return
      }
    } catch {}

    fetch(`/api/archive/entity-accuracy?archiveId=${archiveId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        const sorted = [...data.dimensions].sort((a: any, b: any) => a.score - b.score)
        const result: MiniAccuracy = {
          overallScore: data.overallScore,
          depthLabel:   data.depthLabel,
          bottom5:      sorted.slice(0, 5).map((d: any) => ({ id: d.id, label: d.label, score: d.score })),
          cacheTime:    Date.now(),
        }
        sessionStorage.setItem(ACCURACY_CACHE_KEY, JSON.stringify(result))
        setMiniAccuracy(result)
        setTimeout(() => setAccuracyAnimated(true), 100)
      })
      .catch(() => {})
  }, [archiveId])

  // Load wisdom session nudge
  useEffect(() => {
    fetch(`/api/archive/wisdom-session?archiveId=${archiveId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        if (!data.inProgress && data.recommended) {
          setWisdomNudge({
            dimension:        data.recommended.dimension,
            title:            data.recommended.title,
            estimatedMinutes: data.recommended.estimatedMinutes,
          })
        }
      })
      .catch(() => {})
  }, [archiveId])

  // Refresh accuracy data and re-animate bars
  async function refreshAccuracy() {
    try {
      const res  = await fetch(`/api/archive/entity-accuracy?archiveId=${archiveId}`)
      const data = await res.json()
      if (!data) return
      const sorted = [...data.dimensions].sort((a: any, b: any) => a.score - b.score)
      const result: MiniAccuracy = {
        overallScore: data.overallScore,
        depthLabel:   data.depthLabel,
        bottom5:      sorted.slice(0, 5).map((d: any) => ({ id: d.id, label: d.label, score: d.score })),
        cacheTime:    Date.now(),
      }
      sessionStorage.setItem(ACCURACY_CACHE_KEY, JSON.stringify(result))
      setAccuracyAnimated(false)
      setMiniAccuracy(result)
      setTimeout(() => setAccuracyAnimated(true), 80)
    } catch {}
  }

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
    archiveState === 'rich'   ? 'rgba(196,162,74,1)'   :
    archiveState === 'medium' ? 'rgba(196,162,74,0.6)' : '#5C6166'

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
      // If the server detected a deposit, refresh accuracy bars
      if (data.wasDeposit) {
        refreshAccuracy()
      }
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

  // Deposit directly — no entity response
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
      refreshAccuracy()
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
      // Post immediately — no correction needed
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
        <p style={{ fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)', marginBottom: '0.5rem' }}>
          Archive Portal
        </p>
        <h1 className="font-serif font-semibold tracking-[-0.025em]" style={{ fontSize: 'clamp(1.8rem,3vw,2.6rem)', color: '#F0EDE6' }}>
          Talk to Your Entity
        </h1>
      </div>

      {/* ── Zero-state banner (shown above conversation when archive is thin and no messages yet) ── */}
      {archiveState === 'thin' && messages.length === 0 && (
        <div className="mb-8" style={{ maxWidth: '520px', margin: '0 auto 2.5rem' }}>
          <div className="flex justify-center mb-5">
            <Sigil size={44} pulse />
          </div>
          <p className="font-serif text-center" style={{ fontWeight: 700, fontSize: '1.8rem', color: '#F0EDE6', marginBottom: '0.75rem' }}>
            Your entity is waiting.
          </p>
          <p className="font-serif italic font-light text-center" style={{ fontSize: '0.95rem', color: '#9DA3A8', lineHeight: 1.85, marginBottom: '2rem' }}>
            Your entity learns from your deposits, family memories, and conversations.
            Start by answering one question below.
          </p>
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="flex flex-col lg:flex-row gap-8">

        {/* ── LEFT: context + prompts (35%) ── */}
        <div style={{ width: '100%', maxWidth: '320px', flexShrink: 0 }}>

          {/* Mini accuracy panel */}
          <div className="mb-6">
            <p style={{ fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)', marginBottom: '0.75rem' }}>
              Your Entity
            </p>

            {miniAccuracy ? (
              <>
                {/* Overall score */}
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span className="font-serif" style={{ fontWeight: 700, fontSize: '2.8rem', color: 'rgba(196,162,74,1)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                    {miniAccuracy.overallScore}
                  </span>
                  <span className="font-serif font-light" style={{ fontSize: '1rem', color: '#5C6166' }}>/100</span>
                </div>
                <p style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: stateLabelColor, marginBottom: '1.25rem' }}>
                  {miniAccuracy.depthLabel}
                </p>

                {/* 5 lowest dimensions */}
                <div className="flex flex-col gap-3 mb-3">
                  {miniAccuracy.bottom5.map((dim, i) => (
                    <div key={dim.id}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-serif font-light" style={{ fontSize: '0.82rem', color: '#9DA3A8' }}>{dim.label}</p>
                        <p style={{ fontFamily: 'monospace', fontSize: '0.38rem', color: '#5C6166' }}>{dim.score}%</p>
                      </div>
                      <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(240,237,230,0.07)', overflow: 'hidden' }}>
                        <div style={{
                          height:     '100%',
                          borderRadius: '2px',
                          background: 'linear-gradient(90deg,rgba(196,162,74,0.5),rgba(196,162,74,0.85))',
                          width:      accuracyAnimated ? `${dim.score}%` : '0%',
                          transition: `width 0.7s ease-out ${i * 80}ms`,
                        }} />
                      </div>
                    </div>
                  ))}
                </div>

                <a
                  href="/archive/dashboard"
                  style={{ fontFamily: 'monospace', fontSize: '0.38rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.5)', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(196,162,74,0.9)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(196,162,74,0.5)')}
                >
                  See full accuracy →
                </a>

                {/* Wisdom session nudge */}
                {wisdomNudge && (
                  <div style={{
                    marginTop:    '1.5rem',
                    background:   'rgba(196,162,74,0.04)',
                    border:       '1px solid rgba(196,162,74,0.15)',
                    borderTop:    '2px solid rgba(196,162,74,0.45)',
                    borderRadius: '2px',
                    padding:      '0.85rem 1rem',
                  }}>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.4rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)', marginBottom: '0.4rem' }}>
                      This Month&rsquo;s Session
                    </p>
                    <p className="font-serif" style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F0EDE6', lineHeight: 1.3, marginBottom: '0.35rem' }}>
                      {wisdomNudge.title}
                    </p>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.38rem', color: '#5C6166', marginBottom: '0.75rem' }}>
                      5 questions · ~{wisdomNudge.estimatedMinutes} min
                    </p>
                    <a
                      href="/archive/wisdom"
                      style={{ fontFamily: 'monospace', fontSize: '0.4rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.9)', textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      Begin →
                    </a>
                  </div>
                )}
              </>
            ) : (
              <div>
                <div style={{ height: '44px', width: '80px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', marginBottom: '0.75rem', animation: 'mysteryGlowPulse 1.8s ease-in-out infinite' }} />
                <p style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: stateLabelColor }}>
                  {stateLabel}
                </p>
              </div>
            )}
          </div>

          {/* Rule */}
          <div style={{ height: '1px', background: 'rgba(196,162,74,0.15)', marginBottom: '1.5rem' }} />

          {/* Suggested prompts */}
          <div className="mb-5">
            <p style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#5C6166', marginBottom: '0.75rem' }}>
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
                    border:       '1px solid rgba(196,162,74,0.2)',
                    borderRadius: '2px',
                    padding:      '0.5rem 1rem',
                    fontFamily:   'var(--font-cormorant, Georgia, serif)',
                    fontStyle:    'italic',
                    fontSize:     '0.9rem',
                    color:        '#9DA3A8',
                    cursor:       'pointer',
                    lineHeight:   1.4,
                  }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(196,162,74,0.5)'
                    ;(e.currentTarget as HTMLButtonElement).style.color = '#E8E4DC'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(196,162,74,0.2)'
                    ;(e.currentTarget as HTMLButtonElement).style.color = '#9DA3A8'
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <p className="font-serif italic font-light" style={{ fontSize: '0.8rem', color: '#5C6166', lineHeight: 1.7 }}>
            These prompts are designed to build your entity's depth. The more you deposit,
            the more accurately it represents how you think.
          </p>
        </div>

        {/* ── RIGHT: conversation (65%) ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Conversation header */}
          <div className="mb-4">
            <h2 className="font-serif" style={{ fontWeight: 700, fontSize: '1.3rem', color: '#F0EDE6', marginBottom: '0.25rem' }}>
              Your Entity
            </h2>
            <p className="font-serif italic" style={{ fontSize: '0.85rem', color: '#9DA3A8' }}>
              {subtitleText}
            </p>
          </div>

          {/* Session nudge banner */}
          {showNudge && (
            <div
              className="flex items-center justify-between mb-4"
              style={{
                background: 'rgba(196,162,74,0.06)',
                border:     '1px solid rgba(196,162,74,0.15)',
                borderRadius: '2px',
                padding:    '0.75rem 1rem',
              }}
            >
              <p className="font-serif italic" style={{ fontSize: '0.9rem', color: '#9DA3A8' }}>
                Your entity spoke {entityResponseCount} times in this session. Rate its responses to improve its accuracy.
              </p>
              <button
                onClick={() => setNudgeDismissed(true)}
                style={{ background: 'none', border: 'none', color: '#5C6166', cursor: 'pointer', fontSize: '1rem', paddingLeft: '1rem', flexShrink: 0 }}
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}

          {/* Conversation area */}
          <div
            style={{
              background:   'rgba(240,237,230,0.02)',
              border:       '1px solid rgba(196,162,74,0.1)',
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
                <p className="font-serif italic" style={{ fontSize: '1rem', color: '#9DA3A8' }}>
                  Ask your entity anything.
                </p>
                <p className="font-serif italic" style={{ fontSize: '0.85rem', color: '#5C6166' }}>
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
                        background:  'rgba(196,162,74,0.06)',
                        borderLeft:  '2px solid rgba(196,162,74,0.7)',
                        padding:     '0.75rem 1rem',
                        borderRadius: '0 2px 2px 0',
                      }}>
                        <p className="font-serif italic" style={{ fontSize: '0.9rem', color: 'rgba(196,162,74,0.9)', marginBottom: '0.3rem' }}>
                          Deposited to your archive.
                        </p>
                        <p className="font-serif font-light" style={{ fontSize: '0.85rem', color: '#9DA3A8', lineHeight: 1.5 }}>
                          {msg.content.length > 60 ? msg.content.slice(0, 60) + '…' : msg.content}
                        </p>
                      </div>
                      <p className="font-serif italic" style={{ fontSize: '0.8rem', color: '#5C6166', marginTop: '0.4rem', paddingLeft: '1rem' }}>
                        Ask your entity about this now to see how it responds.
                      </p>
                    </div>
                  ) : msg.role === 'user' ? (
                    /* User message — right aligned */
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.38rem', letterSpacing: '0.14em', color: 'rgba(112,108,101,0.5)', marginBottom: '6px', textTransform: 'uppercase' }}>
                        You
                      </p>
                      <div style={{
                        background:   'rgba(196,162,74,0.1)',
                        border:       '1px solid rgba(196,162,74,0.18)',
                        borderRadius: '12px 12px 2px 12px',
                        padding:      '12px 16px',
                        maxWidth:     '80%',
                      }}>
                        <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontSize: '1rem', fontWeight: 300, color: '#D4CFC7', lineHeight: 1.75 }}>
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Entity message — left aligned */
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.38rem', letterSpacing: '0.14em', color: 'rgba(196,162,74,0.6)', marginBottom: '6px', textTransform: 'uppercase' }}>
                        Your Entity
                      </p>
                      <div style={{
                        borderLeft:   '2px solid rgba(196,162,74,0.35)',
                        background:   'rgba(240,237,230,0.03)',
                        borderRadius: '0 12px 12px 12px',
                        padding:      '12px 16px 12px 18px',
                        maxWidth:     '90%',
                      }}>
                        <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontSize: '1.05rem', fontStyle: 'italic', fontWeight: 300, color: '#E8E4DC', lineHeight: 1.85 }}>
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
                                  fontFamily: 'monospace',
                                  fontSize:   '0.36rem',
                                  letterSpacing: '0.1em',
                                  textTransform: 'uppercase',
                                  color:
                                    msg.rating === r
                                      ? r === 'accurate'   ? 'rgba(196,162,74,1)'
                                      : r === 'partial'    ? '#B8B4AB'
                                      :                       '#8B5555'
                                      : '#5C6166',
                                  transition: 'color 0.15s',
                                }}
                                onMouseEnter={e => { if (!msg.rating) (e.currentTarget as HTMLButtonElement).style.color = '#9DA3A8' }}
                                onMouseLeave={e => { if (!msg.rating) (e.currentTarget as HTMLButtonElement).style.color = '#5C6166' }}
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
                                  borderBottom: '1px solid rgba(196,162,74,0.3)',
                                  color:        '#9DA3A8',
                                  fontSize:     '0.9rem',
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
                                  fontFamily:   'monospace',
                                  fontSize:     '0.4rem',
                                  letterSpacing: '0.18em',
                                  textTransform: 'uppercase',
                                  color:        'rgba(196,162,74,0.8)',
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
                        <p style={{ paddingLeft: '1rem', marginTop: '0.25rem', fontFamily: 'monospace', fontSize: '0.36rem', letterSpacing: '0.1em', color: 'rgba(196,162,74,0.6)', textTransform: 'uppercase' }}>
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
                <p className="font-serif italic text-center" style={{ fontSize: '0.8rem', color: '#5C6166' }}>
                  Each correction you make becomes a deposit in your archive.
                </p>
              )}
            </div>
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div style={{ borderTop: '1px solid rgba(196,162,74,0.1)', paddingTop: '1rem', marginTop: 0 }}>

            {/* Voice panel — slides in above textarea */}
            {showVoicePanel && (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.8rem', color: '#5C6166', marginBottom: '0.75rem', lineHeight: 1.6 }}>
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
                borderBottom: inputValue ? '1px solid rgba(196,162,74,0.5)' : '1px solid rgba(196,162,74,0.2)',
                color:        '#F0EDE6',
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
                    width:        '40px',
                    height:       '40px',
                    borderRadius: '50%',
                    background:   showVoicePanel ? 'rgba(196,162,74,0.12)' : 'transparent',
                    border:       showVoicePanel ? '1px solid #C4A24A' : '1px solid rgba(196,162,74,0.2)',
                    cursor:       'pointer',
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'center',
                    transition:   'all 0.15s',
                    flexShrink:   0,
                  }}
                  onMouseEnter={e => {
                    if (!showVoicePanel) {
                      e.currentTarget.style.borderColor = '#C4A24A'
                      e.currentTarget.style.background  = 'rgba(196,162,74,0.08)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!showVoicePanel) {
                      e.currentTarget.style.borderColor = 'rgba(196,162,74,0.2)'
                      e.currentTarget.style.background  = 'transparent'
                    }
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={showVoicePanel ? '#C4A24A' : 'rgba(196,162,74,0.7)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8"  y1="23" x2="16" y2="23"/>
                  </svg>
                </button>
                <span style={{ fontFamily: 'monospace', fontSize: '0.38rem', color: '#5C6166' }}>
                  {inputValue.length > 200 ? `${inputValue.length} chars` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={depositOnly}
                  disabled={!inputValue.trim() || isLoading}
                  style={{
                    background:    'transparent',
                    border:        '1px solid rgba(196,162,74,0.3)',
                    borderRadius:  '2px',
                    padding:       '0.5rem 1.5rem',
                    minHeight:     '44px',
                    fontFamily:    'monospace',
                    fontSize:      '0.44rem',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    color:         '#B8B4AB',
                    cursor:        'pointer',
                    opacity:       !inputValue.trim() || isLoading ? 0.4 : 1,
                    transition:    'opacity 0.15s, border-color 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (inputValue.trim() && !isLoading) {
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(196,162,74,0.8)'
                      ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(196,162,74,1)'
                    }
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(196,162,74,0.3)'
                    ;(e.currentTarget as HTMLButtonElement).style.color = '#B8B4AB'
                  }}
                >
                  Deposit
                </button>
                <button
                  onClick={send}
                  disabled={!inputValue.trim() || isLoading}
                  style={{
                    background:    'rgba(196,162,74,1)',
                    border:        'none',
                    borderRadius:  '2px',
                    padding:       '0.5rem 1.5rem',
                    minHeight:     '44px',
                    fontFamily:    'monospace',
                    fontSize:      '0.44rem',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    color:         '#0A0A0B',
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
        <div style={{ width: '80px', height: '1px', background: 'rgba(196,162,74,0.35)', margin: '0 auto 2rem' }} />
        <p className="font-serif italic" style={{ fontSize: '0.9rem', color: '#5C6166', maxWidth: '500px', margin: '0 auto', lineHeight: 1.85 }}>
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
