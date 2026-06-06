'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// Match the live succession portal vocabulary and type system so the demo looks
// like the actual product a prospect will use.
const MONO: React.CSSProperties  = { fontFamily: "'Courier New', monospace" }
const SERIF: React.CSSProperties = { fontFamily: 'Georgia, serif' }

const C = {
  bg:    '#0A0908',
  panel: '#0F0E0D',
  gold:  '#C4A24A',
  goldBright: '#D9C4A3',
  text:  '#F0EDE6',
  muted: '#B8B4AB',
  dim:   '#706C65',
  ghost: '#3A3F44',
  line:  'rgba(196,162,74,0.12)',
}

const SUCCESSION_URL = 'https://basalith.ai/succession'

const QUESTION =
  'One of our key LPs is reconsidering their allocation. How would you approach this conversation?'

// ── Panel 1: the frozen cognitive fingerprint ────────────────────────────────
type Dimension = { name: string; score: number; excerpt: string }
const DIMENSIONS: Dimension[] = [
  { name: 'Decision-Making', score: 94, excerpt: 'I make the call at seventy percent of the information. The last thirty never arrives in time to matter.' },
  { name: 'Risk',            score: 89, excerpt: "I have never made a bet I couldn't afford to lose twice." },
  { name: 'People',          score: 91, excerpt: 'I hire for judgment under pressure. Everything else can be taught.' },
  { name: 'Strategy',        score: 87, excerpt: 'We do not chase the market. We decide what we are, and wait for the market to need it.' },
  { name: 'Adversity',       score: 96, excerpt: 'In a bad quarter, the first person who has to stay calm is me. The room takes its temperature from the founder.' },
  { name: 'Culture',         score: 83, excerpt: 'Culture is what people do when a deal is going badly and no one is watching.' },
]

// ── Panel 2: context injected by the successor ───────────────────────────────
type Context = { type: string; date: string; content: string }
const CONTEXTS: Context[] = [
  { type: 'Business Update',   date: 'May 28, 2026', content: 'Q2 portfolio review showed two positions underperforming by 18%.' },
  { type: 'Market Condition',  date: 'Jun 2, 2026',  content: 'Key LP is reconsidering allocation due to market conditions.' },
  { type: 'Strategic Decision',date: 'May 20, 2026', content: 'New regulatory guidance on carried interest expected Q3.' },
]

// ── Panel 3: the pre-written entity response ─────────────────────────────────
const RESPONSE = `First, I would pick up the phone. Not an email, not a deck. A reconsidered allocation is rarely about the numbers on the page. It is about whether they still trust the hand on the wheel, so I would ask to see them in person within the week.

Then I would lead with the thing they expect me to avoid. Two positions are down eighteen percent. I would say that myself, before they do, and tell them exactly why and exactly what we are doing about it. People do not leave you for being wrong. They leave you for being evasive about it.

I have known most of our anchor LPs for nearly twenty years. That relationship is the asset, not this quarter. So I would remind them, plainly, of the cycles we have already walked through together, and what holding through them returned.

Then one direct question: what would you need to see to stay confident? I would listen, and promise only what I can deliver twice over. I have never kept a relationship by managing the message. I kept them by being the person who called first.`

export default function SuccessionDemoClient() {
  const [animated, setAnimated] = useState(false)
  const [typed,    setTyped]    = useState('')
  const [done,     setDone]     = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Animate the fingerprint score bars on load.
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 150)
    return () => clearTimeout(t)
  }, [])

  // Stream the entity response in with a typewriter effect.
  useEffect(() => {
    let i = 0
    const start = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        i++
        setTyped(RESPONSE.slice(0, i))
        if (i >= RESPONSE.length) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          setDone(true)
        }
      }, 11)
    }, 800)
    return () => {
      clearTimeout(start)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  function revealFull() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setTyped(RESPONSE)
    setDone(true)
  }

  return (
    <div
      style={{
        position:   'fixed',
        inset:      0,
        zIndex:     60,
        overflowY:  'auto',
        background: `linear-gradient(180deg, #121110 0%, ${C.bg} 38%)`,
        color:      C.text,
      }}
    >
      <style>{`
        @keyframes succBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes succFade  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .succ-fade { animation: succFade 0.8s cubic-bezier(0.16,1,0.3,1) both; }
        .succ-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: ${C.line}; }
        @media (max-width: 980px) { .succ-grid { grid-template-columns: 1fr; } }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{ borderBottom: `1px solid ${C.line}`, padding: '16px clamp(20px,4vw,48px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          <Link href="/archivist/dashboard" style={{ ...MONO, fontSize: '0.56rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: C.dim, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            ← Exit
          </Link>
          <span style={{ ...MONO, fontSize: '0.56rem', color: C.ghost }}>|</span>
          <span style={{ ...MONO, fontSize: '0.62rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: C.gold, whiteSpace: 'nowrap' }}>
            Basalith · Succession
          </span>
        </div>
        <span style={{ ...MONO, fontSize: '0.56rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: C.ghost, whiteSpace: 'nowrap' }}>
          Read-Only Demonstration
        </span>
      </div>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: 'clamp(28px,4vw,52px) clamp(20px,4vw,48px) 64px' }}>

        {/* ── Founder header ── */}
        <div className="succ-fade" style={{ marginBottom: 'clamp(28px,4vw,44px)' }}>
          <p style={{ ...MONO, fontSize: '0.58rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)', marginBottom: '12px' }}>
            The Founder Entity
          </p>
          <h1 style={{ ...SERIF, fontSize: 'clamp(2rem,4.5vw,3rem)', fontWeight: 300, color: C.text, lineHeight: 1.1, marginBottom: '8px', letterSpacing: '-0.01em' }}>
            Margaret Chen
          </h1>
          <p style={{ ...SERIF, fontSize: 'clamp(1rem,2vw,1.2rem)', fontStyle: 'italic', fontWeight: 300, color: C.gold, marginBottom: '14px' }}>
            Founder of Meridian Capital
          </p>
          <p style={{ ...SERIF, fontSize: '0.95rem', fontWeight: 300, color: C.dim, lineHeight: 1.7, maxWidth: '640px' }}>
            29 years building a mid-market investment firm. Succession recently
            announced to her chief operating officer.
          </p>
        </div>

        {/* ── Three panels ── */}
        <div className="succ-grid" style={{ marginBottom: 'clamp(36px,5vw,56px)' }}>

          {/* PANEL 1 — Cognitive fingerprint */}
          <section style={{ background: C.panel, padding: 'clamp(20px,2.5vw,28px)' }}>
            <PanelHeader label="Frozen Layer · Built Over 29 Years" title="Cognitive Fingerprint" tag="Immutable" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '24px' }}>
              {DIMENSIONS.map((d, i) => (
                <div key={d.name}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ ...SERIF, fontSize: '1rem', fontWeight: 300, color: C.text }}>{d.name}</span>
                    <span style={{ ...SERIF, fontSize: '1.15rem', fontWeight: 300, color: C.gold }}>{d.score}%</span>
                  </div>
                  <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(240,237,230,0.07)', overflow: 'hidden', marginBottom: '8px' }}>
                    <div style={{
                      height:     '100%',
                      borderRadius:'2px',
                      width:       animated ? `${d.score}%` : '0%',
                      background:  'linear-gradient(90deg,rgba(196,162,74,0.5),rgba(196,162,74,0.9))',
                      transition:  `width 0.9s cubic-bezier(0.16,1,0.3,1) ${i * 90}ms`,
                    }} />
                  </div>
                  <p style={{ ...SERIF, fontSize: '0.82rem', fontStyle: 'italic', fontWeight: 300, color: C.dim, lineHeight: 1.6, margin: 0 }}>
                    &ldquo;{d.excerpt}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* PANEL 2 — Contextual layer */}
          <section style={{ background: C.panel, padding: 'clamp(20px,2.5vw,28px)' }}>
            <PanelHeader label="Active Context · Injected By Successor" title="Contextual Layer" tag="Updates Quarterly" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '24px' }}>
              {CONTEXTS.map((ctx, i) => (
                <div key={i} style={{ border: '1px solid rgba(196,162,74,0.16)', background: 'rgba(196,162,74,0.03)', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ ...MONO, fontSize: '0.5rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: C.bg, background: 'rgba(196,162,74,0.85)', padding: '3px 7px', borderRadius: '2px', whiteSpace: 'nowrap' }}>
                      {ctx.type}
                    </span>
                    <span style={{ ...MONO, fontSize: '0.54rem', letterSpacing: '0.06em', color: C.ghost }}>{ctx.date}</span>
                  </div>
                  <p style={{ ...SERIF, fontSize: '0.92rem', fontWeight: 300, color: C.muted, lineHeight: 1.65, margin: 0 }}>
                    {ctx.content}
                  </p>
                </div>
              ))}
            </div>
            <p style={{ ...SERIF, fontSize: '0.82rem', fontStyle: 'italic', color: C.ghost, lineHeight: 1.7, marginTop: '20px' }}>
              Context sits above the frozen fingerprint. It shapes how the founder&rsquo;s
              judgment is applied, without ever altering it.
            </p>
          </section>

          {/* PANEL 3 — Entity response */}
          <section style={{ background: C.panel, padding: 'clamp(20px,2.5vw,28px)' }}>
            <PanelHeader label="Querying Margaret Chen" title="Entity Response" tag="Live" />

            {/* Successor question */}
            <div style={{ marginTop: '24px', marginBottom: '20px' }}>
              <p style={{ ...MONO, fontSize: '0.5rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: C.dim, marginBottom: '8px' }}>
                Successor Asks
              </p>
              <div style={{ background: 'rgba(196,162,74,0.08)', border: '1px solid rgba(196,162,74,0.16)', borderRadius: '10px 10px 10px 2px', padding: '12px 16px' }}>
                <p style={{ ...SERIF, fontSize: '0.95rem', fontWeight: 300, color: '#D4CFC7', lineHeight: 1.6, margin: 0 }}>
                  {QUESTION}
                </p>
              </div>
            </div>

            {/* Entity reply */}
            <p style={{ ...MONO, fontSize: '0.5rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)', marginBottom: '10px' }}>
              Margaret Chen
            </p>
            <div
              onClick={revealFull}
              title={done ? undefined : 'Click to reveal the full response'}
              style={{
                borderLeft:  '2px solid rgba(196,162,74,0.45)',
                background:  'rgba(240,237,230,0.03)',
                borderRadius:'0 8px 8px 8px',
                padding:     '14px 16px 14px 18px',
                cursor:      done ? 'default' : 'pointer',
              }}
            >
              <p style={{ ...SERIF, fontSize: '0.98rem', fontStyle: 'italic', fontWeight: 300, color: C.goldBright, lineHeight: 1.85, margin: 0, whiteSpace: 'pre-wrap' }}>
                {typed}
                {!done && <span style={{ animation: 'succBlink 1s step-end infinite', color: C.gold }}>▍</span>}
              </p>
            </div>
          </section>
        </div>

        {/* ── Closing explainer ── */}
        <div className="succ-fade" style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ width: '60px', height: '1px', background: 'rgba(196,162,74,0.4)', margin: '0 auto 28px' }} />
          <p style={{ ...SERIF, fontSize: 'clamp(1.05rem,2.2vw,1.4rem)', fontWeight: 300, color: C.text, lineHeight: 1.9, maxWidth: '620px', margin: '0 auto' }}>
            The cognitive fingerprint layer cannot be altered.<br />
            The contextual layer updates quarterly.<br />
            Every response draws on both.
          </p>
        </div>

        {/* ── CTA ── */}
        <div style={{ textAlign: 'center' }}>
          <a
            href={SUCCESSION_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...MONO,
              display:       'inline-block',
              fontSize:      '0.66rem',
              letterSpacing: '0.26em',
              textTransform: 'uppercase',
              color:         C.bg,
              background:    C.gold,
              padding:       '1.05rem 2.5rem',
              textDecoration:'none',
              fontWeight:    700,
              borderRadius:  '2px',
            }}
          >
            Build Your Succession Archive →
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Shared panel header ───────────────────────────────────────────────────────
function PanelHeader({ label, title, tag }: { label: string; title: string; tag: string }) {
  return (
    <div style={{ borderBottom: '1px solid rgba(196,162,74,0.12)', paddingBottom: '14px' }}>
      <p style={{ ...MONO, fontSize: '0.5rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)', marginBottom: '8px', lineHeight: 1.5 }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <h2 style={{ ...SERIF, fontSize: '1.25rem', fontWeight: 300, color: C.text, margin: 0 }}>{title}</h2>
        <span style={{ ...MONO, fontSize: '0.46rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: C.dim, border: `1px solid ${C.ghost}`, padding: '3px 7px', borderRadius: '2px', whiteSpace: 'nowrap' }}>
          {tag}
        </span>
      </div>
    </div>
  )
}
