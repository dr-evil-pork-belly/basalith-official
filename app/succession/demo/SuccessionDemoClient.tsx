'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { CATEGORY_LINE } from '@/lib/copy'
import {
  DEMO_PERSONAS,
  REFUSAL_EXPLAINER,
  COLLAPSED_INTRO,
  SESSION_CAP_CARD,
  MAX_USER_MESSAGES,
  type DemoPersonaId,
  type ContrastCard,
} from '@/lib/demoPersonas'

// Matches the live succession portal vocabulary and type system so the demo
// looks like the actual product a prospect will use.
const MONO: React.CSSProperties  = { fontFamily: "'Courier New', monospace" }
const SERIF: React.CSSProperties = { fontFamily: 'Georgia, serif' }

const C = {
  bg:         '#0A0908',
  panel:      '#0F0E0D',
  gold:       '#C4A24A',
  goldBright: '#D9C4A3',
  bone:       '#F0EDE6',
  muted:      '#B8B4AB',
  dim:        '#706C65',
  ghost:      '#3A3F44',
  line:       'rgba(196,162,74,0.12)',
}

const SUCCESSION_URL = 'https://basalith.ai/succession'

type Turn = {
  question: string
  reply:    string
  grounded: boolean
  pending:  boolean
  failed:   boolean
}

type CardState = { reveal: number; reply: string; grounded: boolean; pending: boolean; failed: boolean }

const TOGGLE: { id: DemoPersonaId; label: string }[] = [
  { id: 'margaret', label: 'Succession' },
  { id: 'joey',     label: 'Acquisition' },
]

export default function SuccessionDemoClient() {
  const [personaId, setPersonaId] = useState<DemoPersonaId>('margaret')
  const [introOpen, setIntroOpen] = useState(false)
  const [cards,     setCards]     = useState<Record<string, CardState>>({})
  const [turns,     setTurns]     = useState<Turn[]>([])
  const [draft,     setDraft]     = useState('')
  const [busy,      setBusy]      = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)

  const persona   = DEMO_PERSONAS[personaId]
  const capped    = turns.filter(t => !t.failed).length >= MAX_USER_MESSAGES
  const firstName = persona.metadata.name.split(' ')[0]

  // Transcript state dies with the tab. Switching persona starts a clean room:
  // one founder's answers must never sit under another founder's name.
  function switchPersona(id: DemoPersonaId) {
    if (id === personaId) return
    setPersonaId(id)
    setCards({})
    setTurns([])
    setDraft('')
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [turns.length])

  // grounded is true only when the verifier found a deposit that directly takes
  // the position (basis 'deposit'). A 'no_position' hedge keeps the entity's own
  // words but renders as a refusal: it is not grounded in anything.
  async function askEntity(question: string, history: Turn[]): Promise<{ reply: string; grounded: boolean; failed: boolean }> {
    const messages = history
      .filter(t => !t.failed)
      .flatMap(t => [
        { role: 'user' as const,      content: t.question },
        { role: 'assistant' as const, content: t.reply },
      ])

    try {
      const res  = await fetch('/api/demo/succession-entity', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ personaId, messages, question }),
      })
      const data = await res.json()
      if (!res.ok) return { reply: data?.error ?? 'The demo entity is unavailable right now.', grounded: false, failed: true }
      return { reply: data.reply, grounded: data.grounded === true, failed: false }
    } catch {
      return { reply: 'The demo entity is unavailable right now.', grounded: false, failed: true }
    }
  }

  // ── Zone 2: contrast card reveals ──────────────────────────────────────────
  async function advanceCard(card: ContrastCard) {
    const cur = cards[card.id] ?? { reveal: 0, reply: '', grounded: false, pending: false, failed: false }
    if (cur.pending || cur.reveal >= 3) return

    const next = cur.reveal + 1
    setCards(s => ({ ...s, [card.id]: { ...cur, reveal: next, pending: next === 3 } }))
    if (next < 3) return

    const out = await askEntity(card.question, [])
    setCards(s => ({
      ...s,
      [card.id]: { reveal: 3, reply: out.reply, grounded: out.grounded, pending: false, failed: out.failed },
    }))
  }

  // ── Zone 3: free form ──────────────────────────────────────────────────────
  async function ask(question: string) {
    const q = question.trim()
    if (!q || busy || capped) return

    setBusy(true)
    setDraft('')
    const history = turns
    setTurns(t => [...t, { question: q, reply: '', grounded: false, pending: true, failed: false }])

    const out = await askEntity(q, history)
    setTurns(t => t.map((turn, i) =>
      i === t.length - 1 ? { question: q, reply: out.reply, grounded: out.grounded, pending: false, failed: out.failed } : turn
    ))
    setBusy(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, overflowY: 'auto', background: `linear-gradient(180deg, #121110 0%, ${C.bg} 38%)`, color: C.bone }}>
      <style>{`
        @keyframes succBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes succFade  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .succ-fade { animation: succFade 0.6s cubic-bezier(0.16,1,0.3,1) both; }
        .succ-grid { display:grid; grid-template-columns: repeat(2, 1fr); gap: 1px; background: ${C.line}; }
        @media (max-width: 900px) { .succ-grid { grid-template-columns: 1fr; } }
        .succ-chip:hover { border-color: rgba(196,162,74,0.55) !important; color: ${C.bone} !important; }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{ borderBottom: `1px solid ${C.line}`, padding: '16px clamp(20px,4vw,48px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          <Link href="/succession" style={{ ...MONO, fontSize: '0.56rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: C.dim, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            &larr; Exit
          </Link>
          <span style={{ ...MONO, fontSize: '0.56rem', color: C.ghost }}>|</span>
          <span style={{ ...MONO, fontSize: '0.62rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: C.gold, whiteSpace: 'nowrap' }}>
            Basalith &middot; Succession
          </span>
        </div>
        <span style={{ ...MONO, fontSize: '0.56rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: C.dim, whiteSpace: 'nowrap' }}>
          Interactive Demonstration
        </span>
      </div>

      <div style={{ maxWidth: '1180px', margin: '0 auto', padding: 'clamp(28px,4vw,52px) clamp(20px,4vw,48px) 80px' }}>

        {/* ══ ZONE 1 — header ══ */}
        <div className="succ-fade">
          <p style={{ ...MONO, fontSize: '0.58rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)', marginBottom: '18px', lineHeight: 1.7 }}>
            {CATEGORY_LINE}
          </p>

          {/* Persona toggle */}
          <div role="group" aria-label="Choose a demonstration" style={{ display: 'inline-flex', border: `1px solid ${C.line}`, borderRadius: '2px', marginBottom: '26px' }}>
            {TOGGLE.map(t => {
              const active = t.id === personaId
              return (
                <button
                  key={t.id}
                  onClick={() => switchPersona(t.id)}
                  aria-pressed={active}
                  style={{
                    ...MONO,
                    fontSize:      '0.62rem',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    padding:       '11px 22px',
                    border:        'none',
                    cursor:        active ? 'default' : 'pointer',
                    background:    active ? C.gold : 'transparent',
                    color:         active ? C.bg : C.muted,
                    fontWeight:    active ? 700 : 400,
                  }}
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          <h1 style={{ ...SERIF, fontSize: 'clamp(2rem,4.5vw,3rem)', fontWeight: 300, color: C.bone, lineHeight: 1.1, marginBottom: '8px', letterSpacing: '-0.01em' }}>
            {persona.metadata.name}
          </h1>
          <p style={{ ...SERIF, fontSize: 'clamp(1rem,2vw,1.2rem)', fontStyle: 'italic', fontWeight: 300, color: C.gold, marginBottom: '14px' }}>
            {persona.metadata.role}
          </p>
          <p style={{ ...SERIF, fontSize: '0.95rem', fontWeight: 300, color: C.muted, lineHeight: 1.7, maxWidth: '640px', marginBottom: '18px' }}>
            {persona.metadata.bioLine}
          </p>

          {/* Fictional label. Always visible, both personas. */}
          <div style={{ border: '1px solid rgba(196,162,74,0.28)', background: 'rgba(196,162,74,0.05)', padding: '13px 16px', maxWidth: '640px', marginBottom: '22px' }}>
            <p style={{ ...MONO, fontSize: '0.5rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: C.gold, marginBottom: '7px' }}>
              Fictional Founder
            </p>
            <p style={{ ...SERIF, fontSize: '0.88rem', fontWeight: 300, color: C.muted, lineHeight: 1.75, margin: 0 }}>
              {persona.metadata.fictionalLabel}
            </p>
          </div>

          {/* Collapsed two-layer intro */}
          <div style={{ maxWidth: '640px', marginBottom: 'clamp(30px,4vw,44px)' }}>
            <button
              onClick={() => setIntroOpen(o => !o)}
              aria-expanded={introOpen}
              style={{ ...MONO, fontSize: '0.56rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.gold, background: 'transparent', border: 'none', padding: '6px 0', cursor: 'pointer' }}
            >
              {introOpen ? 'Hide how this works' : 'How this works'}
            </button>
            {introOpen && (
              <p className="succ-fade" style={{ ...SERIF, fontSize: '0.9rem', fontWeight: 300, color: C.muted, lineHeight: 1.85, marginTop: '10px' }}>
                {COLLAPSED_INTRO}
              </p>
            )}
          </div>
        </div>

        {/* ══ ZONE 2 — contrast cards ══ */}
        <SectionHeader
          label={`What ${persona.metadata.successorLabel} expects`}
          title="Assumption Against Archive"
        />
        <div className="succ-grid" style={{ marginBottom: 'clamp(40px,5vw,60px)' }}>
          {persona.contrastCards.map(card => {
            const st      = cards[card.id] ?? { reveal: 0, reply: '', grounded: false, pending: false, failed: false }
            const deposit = persona.pairs.find(p => p.id === card.groundedInPairId)
            return (
              <section key={card.id} style={{ background: C.panel, padding: 'clamp(20px,2.5vw,28px)' }}>
                <p style={{ ...SERIF, fontSize: '1.1rem', fontWeight: 300, color: C.bone, lineHeight: 1.5, marginBottom: '16px' }}>
                  {card.question}
                </p>

                {st.reveal === 0 ? (
                  <button
                    onClick={() => advanceCard(card)}
                    style={{ ...MONO, fontSize: '0.56rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.gold, background: 'transparent', border: `1px solid rgba(196,162,74,0.4)`, padding: '10px 16px', cursor: 'pointer', borderRadius: '2px' }}
                  >
                    Reveal
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Reveal 1 — the assumption */}
                    <div className="succ-fade">
                      <p style={{ ...MONO, fontSize: '0.5rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: C.dim, marginBottom: '7px' }}>
                        {persona.metadata.successorLabel} assumes
                      </p>
                      <p style={{ ...SERIF, fontSize: '0.92rem', fontWeight: 300, color: C.muted, lineHeight: 1.7, margin: 0, paddingLeft: '12px', borderLeft: `2px solid ${C.ghost}` }}>
                        {card.successorAssumes}
                      </p>
                    </div>

                    {/* Reveal 2 — the deposit */}
                    {st.reveal >= 2 && deposit && (
                      <div className="succ-fade" style={{ border: '1px solid rgba(196,162,74,0.16)', background: 'rgba(196,162,74,0.03)', padding: '14px 16px' }}>
                        <p style={{ ...MONO, fontSize: '0.5rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: C.gold, marginBottom: '9px' }}>
                          From the archive
                        </p>
                        <p style={{ ...SERIF, fontSize: '0.82rem', fontStyle: 'italic', color: C.dim, lineHeight: 1.6, margin: '0 0 8px' }}>
                          {deposit.prompt}
                        </p>
                        <p style={{ ...SERIF, fontSize: '0.9rem', fontWeight: 300, color: C.muted, lineHeight: 1.75, margin: 0 }}>
                          {deposit.completion}
                        </p>
                      </div>
                    )}

                    {/* Reveal 3 — the live entity answer */}
                    {st.reveal >= 3 && (
                      <div className="succ-fade">
                        <p style={{ ...MONO, fontSize: '0.5rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)', marginBottom: '9px' }}>
                          {persona.metadata.name}
                        </p>
                        {st.pending
                          ? <Thinking />
                          : <Answer text={st.reply} grounded={st.grounded} failed={st.failed} firstName={firstName} />}
                      </div>
                    )}

                    {st.reveal < 3 && (
                      <button
                        onClick={() => advanceCard(card)}
                        style={{ ...MONO, fontSize: '0.56rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.gold, background: 'transparent', border: `1px solid rgba(196,162,74,0.4)`, padding: '9px 15px', cursor: 'pointer', borderRadius: '2px', alignSelf: 'flex-start' }}
                      >
                        {st.reveal === 1 ? 'Show the archive' : `Ask ${firstName}`}
                      </button>
                    )}
                  </div>
                )}
              </section>
            )
          })}
        </div>

        {/* ══ ZONE 3 — ask anything ══ */}
        <SectionHeader label="Free form" title={`Ask ${firstName} anything`} />
        <section style={{ background: C.panel, padding: 'clamp(20px,2.5vw,30px)', marginBottom: '36px' }}>

          {turns.length === 0 && (
            <p style={{ ...SERIF, fontSize: '0.9rem', fontStyle: 'italic', fontWeight: 300, color: C.dim, lineHeight: 1.75, marginTop: 0, marginBottom: '20px' }}>
              The archive holds fifteen deposits. Ask something it covers, and something it does not.
            </p>
          )}

          {/* Transcript */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', marginBottom: turns.length ? '24px' : 0 }}>
            {turns.map((t, i) => (
              <div key={i} className="succ-fade">
                <div style={{ background: 'rgba(196,162,74,0.08)', border: '1px solid rgba(196,162,74,0.16)', borderRadius: '10px 10px 10px 2px', padding: '12px 16px', marginBottom: '12px' }}>
                  <p style={{ ...SERIF, fontSize: '0.95rem', fontWeight: 300, color: '#D4CFC7', lineHeight: 1.6, margin: 0 }}>
                    {t.question}
                  </p>
                </div>
                <p style={{ ...MONO, fontSize: '0.5rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)', marginBottom: '9px' }}>
                  {persona.metadata.name}
                </p>
                {t.pending
                  ? <Thinking />
                  : <Answer text={t.reply} grounded={t.grounded} failed={t.failed} firstName={firstName} />}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Session cap card */}
          {capped ? (
            <div className="succ-fade" style={{ border: `1px solid ${C.line}`, background: 'rgba(196,162,74,0.04)', padding: '20px 22px' }}>
              <p style={{ ...MONO, fontSize: '0.5rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: C.gold, marginBottom: '10px' }}>
                Session Complete
              </p>
              <p style={{ ...SERIF, fontSize: '0.95rem', fontWeight: 300, color: C.muted, lineHeight: 1.8, margin: 0 }}>
                {SESSION_CAP_CARD}
              </p>
            </div>
          ) : (
            <>
              {/* Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                {persona.chips.map(chip => (
                  <button
                    key={chip.label}
                    className="succ-chip"
                    onClick={() => ask(chip.label)}
                    disabled={busy}
                    style={{
                      ...SERIF,
                      fontSize:     '0.85rem',
                      fontWeight:   300,
                      color:        busy ? C.ghost : C.muted,
                      background:   'transparent',
                      border:       `1px solid ${C.ghost}`,
                      borderRadius: '999px',
                      padding:      '7px 15px',
                      cursor:       busy ? 'default' : 'pointer',
                      transition:   'all 0.15s',
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Composer */}
              <form
                onSubmit={e => { e.preventDefault(); ask(draft) }}
                style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}
              >
                <label htmlFor="demo-ask" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                  Ask {persona.metadata.name} a question
                </label>
                <input
                  id="demo-ask"
                  value={draft}
                  onChange={e => setDraft(e.target.value.slice(0, 500))}
                  maxLength={500}
                  disabled={busy}
                  placeholder={`Ask ${firstName} a question`}
                  style={{
                    ...SERIF,
                    flex:         1,
                    fontSize:     '0.95rem',
                    fontWeight:   300,
                    color:        C.bone,
                    background:   'rgba(240,237,230,0.04)',
                    border:       `1px solid ${C.line}`,
                    borderRadius: '2px',
                    padding:      '13px 15px',
                    outline:      'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={busy || !draft.trim()}
                  style={{
                    ...MONO,
                    fontSize:      '0.6rem',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color:         C.bg,
                    background:    busy || !draft.trim() ? 'rgba(196,162,74,0.35)' : C.gold,
                    border:        'none',
                    borderRadius:  '2px',
                    padding:       '0 24px',
                    fontWeight:    700,
                    cursor:        busy || !draft.trim() ? 'default' : 'pointer',
                  }}
                >
                  Ask
                </button>
              </form>
              <p style={{ ...MONO, fontSize: '0.58rem', letterSpacing: '0.12em', color: C.dim, marginTop: '10px', marginBottom: 0 }}>
                {turns.filter(t => !t.failed).length} of {MAX_USER_MESSAGES} questions used
              </p>
            </>
          )}
        </section>

        {/* ── CTA ── */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '60px', height: '1px', background: 'rgba(196,162,74,0.4)', margin: '0 auto 28px' }} />
          <a
            href={SUCCESSION_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...MONO, display: 'inline-block', fontSize: '0.66rem', letterSpacing: '0.26em', textTransform: 'uppercase', color: C.bg, background: C.gold, padding: '1.05rem 2.5rem', textDecoration: 'none', fontWeight: 700, borderRadius: '2px' }}
          >
            Build Your Succession Archive &rarr;
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Shared pieces ─────────────────────────────────────────────────────────────

function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <div style={{ borderBottom: `1px solid ${C.line}`, paddingBottom: '14px', marginBottom: '24px' }}>
      <p style={{ ...MONO, fontSize: '0.5rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)', marginBottom: '8px' }}>
        {label}
      </p>
      <h2 style={{ ...SERIF, fontSize: '1.35rem', fontWeight: 300, color: C.bone, margin: 0 }}>{title}</h2>
    </div>
  )
}

function Thinking() {
  return (
    <p style={{ ...MONO, fontSize: '0.56rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: C.dim, margin: 0 }}>
      Checking the archive
      <span style={{ animation: 'succBlink 1s step-end infinite', color: C.gold, marginLeft: '4px' }}>&#9613;</span>
    </p>
  )
}

/**
 * One entity answer.
 *
 * The gold state means the verifier found a deposit that directly takes this
 * position (basis 'deposit'). The badge says "checked", never "verified" or
 * "grounded in", because checking against the archive is exactly what the
 * verifier does and no more. No deposit is named: the pipeline produces no
 * per-pair attribution for a live answer.
 *
 * Everything else renders the refusal state, including the entity's own
 * in-character hedge (basis 'no_position'). A hedge is not grounding, so it
 * must never wear the gold. The refusal is styled deliberately flat: it should
 * read as discipline rather than as a failure.
 */
function Answer({ text, grounded, failed, firstName }: { text: string; grounded: boolean; failed: boolean; firstName: string }) {
  if (failed) {
    return (
      <div style={{ borderLeft: `2px solid ${C.ghost}`, background: 'rgba(240,237,230,0.02)', borderRadius: '0 8px 8px 8px', padding: '14px 16px 14px 18px' }}>
        <p style={{ ...SERIF, fontSize: '0.95rem', fontWeight: 300, color: C.dim, lineHeight: 1.8, margin: 0 }}>{text}</p>
      </div>
    )
  }

  if (!grounded) {
    return (
      <div style={{ borderLeft: `2px solid ${C.ghost}`, background: 'rgba(240,237,230,0.02)', borderRadius: '0 8px 8px 8px', padding: '14px 16px 14px 18px' }}>
        <p style={{ ...SERIF, fontSize: '0.96rem', fontWeight: 300, color: C.muted, lineHeight: 1.85, margin: 0, whiteSpace: 'pre-wrap' }}>
          {text}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', paddingTop: '12px', borderTop: `1px solid rgba(240,237,230,0.06)` }}>
          <span style={{ ...MONO, fontSize: '0.5rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: C.dim, border: `1px solid ${C.ghost}`, padding: '3px 7px', borderRadius: '2px', whiteSpace: 'nowrap' }}>
            No Deposit
          </span>
          <span style={{ ...SERIF, fontSize: '0.85rem', fontStyle: 'italic', color: C.dim, lineHeight: 1.6 }}>
            {REFUSAL_EXPLAINER}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ borderLeft: '2px solid rgba(196,162,74,0.45)', background: 'rgba(240,237,230,0.03)', borderRadius: '0 8px 8px 8px', padding: '14px 16px 14px 18px' }}>
      <p style={{ ...SERIF, fontSize: '0.98rem', fontStyle: 'italic', fontWeight: 300, color: C.goldBright, lineHeight: 1.85, margin: 0, whiteSpace: 'pre-wrap' }}>
        {text}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(196,162,74,0.12)' }}>
        <span style={{ ...MONO, fontSize: '0.5rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: C.bg, background: 'rgba(196,162,74,0.85)', padding: '3px 7px', borderRadius: '2px', whiteSpace: 'nowrap' }}>
          Checked
        </span>
        <span style={{ ...SERIF, fontSize: '0.85rem', fontStyle: 'italic', color: C.dim }}>
          Checked against {firstName}&rsquo;s archive.
        </span>
      </div>
    </div>
  )
}
