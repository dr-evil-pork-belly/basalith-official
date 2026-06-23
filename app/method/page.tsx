import Nav    from '../components/Nav'
import Footer from '../components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'The Method · Basalith',
  description: 'We are not building memory. We are building cognition. Two sources of data that together capture not just what an operator decided, but how they reasoned.',
}

const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}
const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.28em',
}
const H2: React.CSSProperties = {
  ...SERIF,
  fontSize:     'clamp(1.4rem, 2.5vw, 1.9rem)',
  fontWeight:   500,
  color:        'var(--color-text-primary)',
  lineHeight:   1.2,
  marginBottom: '16px',
  marginTop:    '48px',
}
const BODY: React.CSSProperties = {
  ...SERIF,
  fontSize:     '1.1rem',
  fontWeight:   300,
  lineHeight:   1.9,
  color:        'var(--color-text-secondary)',
  marginBottom: '20px',
}
const RULE: React.CSSProperties = {
  width:      '40px',
  height:     '1px',
  background: 'var(--color-gold)',
  margin:     '48px 0',
}

const STEPS = [
  {
    n:     '01',
    title: 'What the operator deposits',
    body:  [
      'The model learns directly from the operator. Recorded sessions, decision frameworks, scenario responses, written deposits.',
      'First-person reasoning: how they work a problem, what they weigh, what they took from the calls that went wrong. The specific logic of how this particular mind decides.',
    ],
  },
  {
    n:     '02',
    title: 'What the people who worked alongside them observe',
    body:  [
      'The people who watched the operator decide see what the operator would never think to record. A co-founder remembers how a deal was reasoned through. A long-tenured exec remembers the hire everyone else doubted.',
      'The outside view captures patterns the operator takes for granted. In a family, this is a daughter noticing how her father handled pressure. Same mechanism.',
    ],
  },
  {
    n:     '03',
    title: 'The combination builds a cognitive model',
    body:  [
      'Inside data plus outside data equals something neither could produce alone.',
      'The archive becomes training data for the entity. The entity learns not just what they said but how they think. Not just their opinions but their reasoning patterns.',
      'This is the distinction between memory and cognition. Memory stores facts. The entity captures how a specific mind works.',
    ],
  },
  {
    n:     '04',
    title: 'How the archive accumulates',
    body:  [
      'Capture is ongoing, not a single interview. The operator works through 20 real business scenarios and a sequence of 29 decision questions across the 8 domains that built the company.',
      'Each response adds depth. The longer the active period runs before a transition, the more the model has to work with. Begin before the handoff is on the calendar, not after.',
    ],
  },
]

export default function MethodPage() {
  return (
    <>
      <Nav />
      <main style={{ background: 'var(--color-bg)' }}>

        {/* Hero */}
        <section style={{ padding: 'clamp(140px,16vw,180px) clamp(24px,6vw,80px) clamp(60px,8vw,80px)', maxWidth: 'calc(var(--max-width-text) + 160px)', margin: '0 auto' }}>
          <p
            style={{
              ...MONO,
              fontSize:     'var(--text-caption)',
              color:        'var(--color-gold)',
              display:      'flex',
              alignItems:   'center',
              gap:          '12px',
              marginBottom: '24px',
            }}
          >
            <span style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }} aria-hidden="true" />
            The Method
          </p>
          <h1
            style={{
              ...SERIF,
              fontSize:      'var(--text-h1)',
              fontWeight:    300,
              lineHeight:    1.15,
              color:         'var(--color-text-primary)',
              letterSpacing: '-0.025em',
              marginBottom:  '20px',
            }}
          >
            We are not building memory.
            <br />
            We are building cognition.
          </h1>
          <p
            style={{
              ...SERIF,
              fontSize:  '1.2rem',
              fontStyle: 'italic',
              fontWeight: 300,
              lineHeight: 1.8,
              color:     'var(--color-text-muted)',
              maxWidth:  '520px',
            }}
          >
            Two sources of data. Together they capture not just what an operator
            decided, but how they reasoned.
          </p>
        </section>

        {/* Steps */}
        <section style={{ padding: '0 clamp(24px,6vw,80px) clamp(80px,10vw,120px)', maxWidth: 'calc(var(--max-width-text) + 160px)', margin: '0 auto' }}>
          {STEPS.map(({ n, title, body }, i) => (
            <div key={n} style={{ display: 'grid', gridTemplateColumns: '3rem 1fr', gap: '32px', marginBottom: '56px' }}>
              <div>
                <p style={{ ...MONO, fontSize: '0.52rem', color: 'var(--color-gold)', paddingTop: '4px' }}>{n}</p>
              </div>
              <div>
                <h2 style={{ ...H2, marginTop: 0 }}>{title}</h2>
                {body.map((para, j) => <p key={j} style={BODY}>{para}</p>)}
                {i < STEPS.length - 1 && <div style={RULE} aria-hidden="true" />}
              </div>
            </div>
          ))}

          {/* CTA */}
          <div style={{ textAlign: 'center', paddingTop: '32px', borderTop: '1px solid var(--color-border)' }}>
            <p style={{ ...BODY, fontStyle: 'italic', textAlign: 'center' }}>
              The archive begins with The Founding, a 90-minute guided session with a Senior Legacy Guide.
            </p>
            <a
              href="/founding-session"
              style={{
                ...MONO,
                fontSize:       'var(--text-caption)',
                color:          'var(--color-gold)',
                textDecoration: 'none',
                display:        'inline-flex',
                alignItems:     'center',
                gap:            '8px',
              }}
            >
              What happens in The Founding <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>

        {/* Two-tier quality system */}
        <section style={{ padding: 'clamp(80px,10vw,120px) clamp(24px,6vw,80px)', background: 'var(--color-void)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ maxWidth: 'calc(var(--max-width-text) + 160px)', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              How We Evaluate What You Share
            </p>
            <h2 style={{ ...H2, color: 'rgba(250,248,244,0.9)', fontSize: 'clamp(1.6rem,3vw,2.4rem)', marginTop: 0, marginBottom: '28px' }}>
              Not everything you deposit is equally valuable.
            </h2>
            <p style={{ ...BODY, color: 'rgba(250,248,244,0.5)', maxWidth: '580px', marginBottom: '48px' }}>
              A specific story about a specific morning in 1974 is worth more than a general
              statement about hard work. Every deposit is evaluated to reflect that distinction.
            </p>

            <div className="quality-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', maxWidth: '680px', marginBottom: '32px' }}>
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: 'clamp(28px,3vw,40px)' }}>
                <p style={{ ...MONO, fontSize: '0.44rem', color: 'var(--color-gold-on-light)', marginBottom: '20px' }}>First Review</p>
                {[
                  'Volume scoring',
                  'Speed and coverage',
                  'Every deposit',
                ].map(item => (
                  <p key={item} style={{ ...SERIF, fontSize: '0.9rem', fontWeight: 300, color: 'var(--color-text-secondary)', lineHeight: 1.7, marginBottom: '8px' }}>{item}</p>
                ))}
              </div>
              <div style={{ background: 'rgba(196,162,74,0.04)', border: '1px solid rgba(196,162,74,0.25)', padding: 'clamp(28px,3vw,40px)' }}>
                <p style={{ ...MONO, fontSize: '0.44rem', color: 'var(--color-gold)', marginBottom: '20px' }}>Second Review</p>
                {[
                  'Deep evaluation',
                  'Ambiguous cases',
                  'High-stakes decisions',
                ].map(item => (
                  <p key={item} style={{ ...SERIF, fontSize: '0.9rem', fontWeight: 300, color: 'rgba(250,248,244,0.5)', lineHeight: 1.7, marginBottom: '8px' }}>{item}</p>
                ))}
              </div>
            </div>

            <div style={{ maxWidth: '680px', textAlign: 'center', padding: '16px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ ...MONO, fontSize: '0.44rem', color: 'rgba(250,248,244,0.35)', letterSpacing: '0.2em' }}>
                Only after both systems agree does a deposit influence your entity
              </p>
            </div>

            <p style={{ ...BODY, color: 'rgba(250,248,244,0.5)', maxWidth: '580px', marginTop: '40px' }}>
              Your archive is not scored by the cheapest available model.
              It is scored by the right model for each decision.
            </p>
          </div>
        </section>

        {/* 06 — Bridge to the flagship architecture */}
        <section style={{ padding: 'clamp(64px,8vw,96px) clamp(24px,6vw,80px)' }}>
          <div style={{ maxWidth: 'calc(var(--max-width-text) + 160px)', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '3rem 1fr', gap: '32px' }}>
              <p style={{ ...MONO, fontSize: '0.52rem', color: 'var(--color-gold)', paddingTop: '4px' }}>06</p>
              <div>
                <h2 style={{ ...H2, marginTop: 0 }}>Two layers, one handoff</h2>
                <p style={BODY}>
                  The fingerprint is frozen at transition, fixed from the operator&rsquo;s own deposits. It does not drift.
                </p>
                <p style={{ ...BODY, marginBottom: '28px' }}>
                  A living layer lets the successor add today&rsquo;s context, while the judgment stays the operator&rsquo;s.
                </p>
                <a
                  href="/succession"
                  style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  See the full architecture <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Second door — families */}
        <section style={{ padding: 'clamp(80px,12vw,140px) clamp(24px,6vw,80px)', background: 'var(--color-void)' }}>
          <div style={{ maxWidth: '700px' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
              The second door
            </p>
            <h2 style={{ ...H2, color: 'rgba(250,250,248,0.9)', marginTop: 0 }}>
              Where this began: families.
            </h2>
            <p style={{ ...BODY, color: 'rgba(250,248,244,0.5)', marginBottom: '24px' }}>
              Basalith started as a way for families to preserve how someone thinks while they are still here to get it right.
              The method is identical. The operator becomes a parent. The colleagues become the family. The scenario library becomes everyday memory.
            </p>
            <p style={{ ...BODY, color: 'rgba(250,248,244,0.5)', marginBottom: '36px' }}>
              For family archives, an upload pipeline filters and ranks photographs before labeling, so the family only sees what is worth their time.
            </p>
            <a
              href="/apply"
              style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(184,150,62,0.4)', padding: '12px 24px' }}
            >
              Begin a family archive <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
