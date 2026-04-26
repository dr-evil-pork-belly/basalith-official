import Nav    from '../components/Nav'
import Footer from '../components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'The Method · Basalith',
  description: 'We are not building memory. We are building cognition. Two sources of data that together capture how a specific person actually thinks.',
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
    title: 'What you deposit',
    body:  [
      'The entity learns directly from you. Your voice recordings, your wisdom sessions, your entity conversations, your written deposits.',
      'This is first-person training data. How you reason through problems. What you believe. What you learned from failure. The specific logic of how your mind works.',
      'Every session adds depth. Every deposit teaches the entity something the people who love you could never tell it.',
    ],
  },
  {
    n:     '02',
    title: 'What the people who know you observe',
    body:  [
      'The people who know you see things you do not see about yourself. A daughter notices how her father handled pressure. A colleague remembers the specific way a decision was reasoned through.',
      'Family members label photographs. Contributors answer witness questions designed for their exact relationship to you. This outside view captures cognitive patterns you would never think to deposit.',
    ],
  },
  {
    n:     '03',
    title: 'The combination builds a cognitive model',
    body:  [
      'Inside data plus outside data equals something neither could produce alone.',
      'The archive becomes training data for your entity. The entity learns not just what you said but how you think. Not just your opinions but your reasoning patterns.',
      'This is the distinction between memory and cognition. Memory stores facts. The entity understands how a specific mind works.',
    ],
  },
  {
    n:     '04',
    title: 'The archive builds itself',
    body:  [
      'Every evening one photograph goes to every family member by email. No login. No app. They reply with what they remember. Their words go into the archive.',
      'The archive builds itself around the family. The entity deepens without anyone organizing a session or scheduling a call.',
      'The longer it runs the more accurate it becomes. Start early. Give it years.',
    ],
  },
  {
    n:     '05',
    title: 'The Intelligence Layer',
    body:  [
      'Before a single photograph reaches the labeling interface our AI pipeline has already processed every upload. Screenshots removed. Duplicates collapsed. Photographs ranked by cognitive value.',
      'The system surfaces the photographs most likely to unlock real memory. The family never sees the noise. They only see what builds the entity.',
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
            Two sources of data. Together they capture not just what a person did,
            but how they actually thought.
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

      </main>
      <Footer />
    </>
  )
}
