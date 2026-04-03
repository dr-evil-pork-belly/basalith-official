'use client'

import { useEffect, useRef } from 'react'

// ── Data ──────────────────────────────────────────────────────────────────
const bars = [
  { label: 'Voice',   pct: 87, delay: '0.1s'  },
  { label: 'Memory',  pct: 74, delay: '0.25s' },
  { label: 'Context', pct: 91, delay: '0.4s'  },
  { label: 'Values',  pct: 63, delay: '0.55s' },
]

const metrics = [
  { label: 'Fidelity Source', value: 'Family'  },
  { label: 'Data Ownership',  value: 'Yours'   },
  { label: 'Inheritance',     value: 'Legal'   },
]

// ── Monolith Slab ─────────────────────────────────────────────────────────
function MonolithSlab() {
  return (
    <div className="relative w-[320px] xl:w-[360px] animate-slow-drift">

      {/* Pulse ring behind slab */}
      <div className="absolute inset-0 flex items-center justify-center -z-10">
        <div className="w-40 h-40 rounded-full border border-amber/15">
          <div className="absolute inset-0 rounded-full border border-amber/10 animate-pulse-ring" />
        </div>
      </div>

      {/* Float card — left */}
      <div className="glass-obsidian absolute -left-20 top-[14%] z-10 rounded p-3 animate-[counter-drift_11s_ease-in-out_infinite]">
        <p className="eyebrow !text-[0.58rem] mb-1">Contributor</p>
        <p className="font-serif text-[1.05rem] font-semibold text-text-primary leading-tight">Sarah H.</p>
        <p className="font-sans text-[0.62rem] text-text-muted mt-0.5">Daughter · 47 annotations</p>
      </div>

      {/* Slab */}
      <div
        className="relative w-full rounded-sm overflow-hidden border border-white/[0.08]"
        style={{
          aspectRatio: '3/4',
          background: 'linear-gradient(148deg,#2B2B2F 0%,#1E1E22 45%,#17171B 75%,#222226 100%)',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 40px 80px rgba(0,0,0,0.85), 0 0 60px rgba(255,179,71,0.05), inset 0 1px 0 rgba(255,255,255,0.07)',
        }}
      >
        {/* Top edge gloss */}
        <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />

        {/* Ambient amber glow */}
        <div
          className="absolute inset-0 animate-spark"
          style={{ background: 'radial-gradient(ellipse 55% 45% at 50% 55%, rgba(255,179,71,0.10) 0%, transparent 70%)' }}
        />

        {/* Content */}
        <div className="absolute inset-7 flex flex-col justify-between">

          {/* AI badge */}
          <div className="ai-badge self-start">
            <span className="ai-dot" />
            Essence Active
          </div>

          {/* Identity */}
          <div className="flex flex-col gap-3">
            <p className="eyebrow !text-[0.6rem]">Archive Subject</p>
            <p className="font-serif text-[1.65rem] font-semibold text-text-primary leading-[1.15] tracking-[-0.02em]">
              Robert James<br />Whitfield
            </p>

            {/* Bars */}
            <div className="flex flex-col gap-[7px] mt-1">
              {bars.map(({ label, pct, delay }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="font-sans text-[0.58rem] font-semibold tracking-[0.12em] uppercase text-text-muted w-12 flex-shrink-0">
                    {label}
                  </span>
                  <div className="flex-1 h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full origin-left animate-reveal-line"
                      style={{
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg,#C47D1A,#FFB347)',
                        animationDelay: delay,
                      }}
                    />
                  </div>
                  <span className="font-sans text-[0.6rem] font-semibold text-text-muted w-7 text-right tabular-nums">
                    {pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-3.5 border-t border-white/[0.07]">
            <span className="font-sans text-[0.6rem] tracking-[0.08em] text-text-muted">
              Est. 2026 · 3 Contributors
            </span>
            <span className="font-serif text-[0.9rem] italic text-amber-dim">Gen I</span>
          </div>
        </div>
      </div>

      {/* Float card — right */}
      <div className="glass-obsidian absolute -right-16 bottom-[20%] z-10 rounded p-3 animate-[counter-drift_15s_ease-in-out_infinite_reverse]">
        <p className="eyebrow !text-[0.58rem] mb-1">Trust Status</p>
        <p className="font-serif text-[1.05rem] font-semibold text-text-primary leading-tight">Secured</p>
        <p className="font-sans text-[0.62rem] text-text-muted mt-0.5">Whitfield Trust · Active</p>
      </div>

    </div>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────
export default function Hero() {
  // Staggered mount reveals on the left column
  const els = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    els.current.forEach((el, i) => {
      if (!el) return
      setTimeout(() => el.classList.add('in-view'), 180 + i * 160)
    })
  }, [])

  const ref = (i: number) => (node: HTMLElement | null) => { els.current[i] = node }

  return (
    <section
      id="hero"
      aria-label="Hero"
      className="relative min-h-screen grid grid-cols-1 lg:grid-cols-2 items-center overflow-hidden bg-obsidian-void"
    >
      {/* Architectural grid lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),' +
            'linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)',
          backgroundSize: '80px 80px',
          maskImage: 'radial-gradient(ellipse 75% 75% at 50% 50%,black 20%,transparent 100%)',
        }}
        aria-hidden="true"
      />
      {/* Right amber radiance */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 90% 65% at 90% 50%,rgba(255,179,71,0.065) 0%,transparent 65%)' }}
        aria-hidden="true"
      />

      {/* ── LEFT: copy ── */}
      <div className="relative z-10 flex flex-col gap-8 px-8 md:px-16 pt-40 pb-20">

        {/* Overline */}
        <div ref={ref(0)} className="reveal flex items-center gap-3.5">
          <span className="ai-dot" />
          <span className="eyebrow">Identity Preservation · Legacy AI</span>
        </div>

        {/* Headline */}
        <div ref={ref(1)} className="reveal reveal-delay-1">
          <h1
            className="font-serif font-semibold text-text-primary leading-[0.91] tracking-[-0.036em]"
            style={{ fontSize: 'clamp(3.25rem,7.5vw,6.5rem)' }}
          >
            The System That
            <em className="block italic font-medium text-amber not-italic" style={{ fontStyle: 'italic' }}>
              Learns How
            </em>
            You Think.
          </h1>
        </div>

        {/* Body */}
        <div ref={ref(2)} className="reveal reveal-delay-2 max-w-[440px]">
          <p className="font-sans font-light text-body-base leading-[1.82] text-text-secondary">
            While you are alive it studies you. It learns your judgment, your values,
            your hard-won understanding of how the world works. When you are gone
            it carries that knowledge forward.
          </p>
          <p className="font-sans font-light text-body-base leading-[1.82] text-text-secondary mt-3">
            Your descendants inherit not just what you built.
            They inherit how you built it.
          </p>
          <p
            className="font-serif font-light"
            style={{
              marginTop:  '1.25rem',
              fontSize:   '0.95rem',
              fontStyle:  'italic',
              color:      '#5C6166',
              lineHeight: 1.7,
            }}
          >
            For everyone who has ever wished they could ask their grandmother
            one more question.
          </p>
        </div>

        {/* Actions */}
        <div ref={ref(3)} className="reveal reveal-delay-3 flex items-center gap-5 flex-wrap">
          <a href="/begin/tier" className="btn-monolith-amber group">
            Begin Your Archive
            <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </a>
          <a href="#comparison" className="btn-monolith-ghost">
            See the method ↓
          </a>
        </div>

        {/* Metrics */}
        <div ref={ref(4)} className="reveal reveal-delay-4 pt-6 border-t border-border-subtle">
          <div className="flex gap-10 mb-5">
            {metrics.map(({ label, value }) => (
              <div key={label}>
                <span className="eyebrow !text-[0.62rem] block mb-1.5">{label}</span>
                <span className="font-serif text-[1.9rem] font-semibold text-text-primary leading-none">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT: artifact ── */}
      <div className="hidden lg:flex items-center justify-center h-screen relative z-10 pr-16">
        <MonolithSlab />
      </div>
    </section>
  )
}