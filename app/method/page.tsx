import Nav    from '../components/Nav'
import Footer from '../components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'The Method',
  description: 'How the Basalith archive is built. Two directions simultaneously, from the inside out and the outside in.',
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
    title: 'Inside looking out',
    body:  [
      'The archive subject deposits their own memories, wisdom, decisions, and beliefs directly. Through guided wisdom sessions, entity conversations, and structured deposits across ten dimensions of their life and thinking.',
      'This is the data only they can provide. Their first-person account of who they are, what they learned, what they believe, and what they want their descendants to know.',
    ],
  },
  {
    n:     '02',
    title: 'Outside looking in',
    body:  [
      'The people who know them contribute what they observed. Family members label photographs. Contributors answer witness session questions designed for their specific relationship to the subject.',
      'A daughter sees things her father never knew were visible. A colleague remembers decisions that shaped a team. A childhood friend carries who someone was before they became who they think they are.',
    ],
  },
  {
    n:     '03',
    title: 'The combination',
    body:  [
      'When inside and outside data are combined (the deposits, the witness observations, the family memories, the entity conversations) the result is the most accurate possible representation of a human life.',
      'Not a curated version. Not a highlight reel. The actual person, as they saw themselves and as the people who loved them saw them.',
    ],
  },
  {
    n:     '04',
    title: 'The nightly photograph email',
    body:  [
      'Every evening at 9pm one photograph from the archive is sent to every active contributor. No login required. No app to open.',
      'Contributors reply with what they remember. Their replies are parsed by AI and saved to the archive permanently. The archive builds itself around the family, without anyone having to organize a session or schedule a call.',
    ],
  },
  {
    n:     '05',
    title: 'The Intelligence Layer',
    body:  [
      'Before a single photograph reaches the labeling interface our seven-layer AI pipeline has already processed every upload. Screenshots removed. Duplicates collapsed. Photographs scored by archive value. The most emotionally resonant image in a collection of thousands surfaces first.',
      'The family never sees the noise. They only see what matters.',
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
            How the archive is built.
          </h1>
          <p
            style={{
              ...SERIF,
              fontSize:  '1.2rem',
              fontStyle: 'italic',
              fontWeight: 300,
              lineHeight: 1.7,
              color:     'var(--color-text-muted)',
            }}
          >
            Two directions. Simultaneously. From the inside out and the outside in.
          </p>
        </section>

        {/* Steps */}
        <section style={{ padding: '0 clamp(24px,6vw,80px) clamp(80px,10vw,120px)', maxWidth: 'calc(var(--max-width-text) + 160px)', margin: '0 auto' }}>
          {STEPS.map(({ n, title, body }, i) => (
            <div key={n} data-reveal style={{ display: 'grid', gridTemplateColumns: '3rem 1fr', gap: '32px', marginBottom: '56px' }}>
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

      </main>
      <Footer />
    </>
  )
}
