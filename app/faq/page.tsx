import Nav    from '../components/Nav'
import Footer from '../components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'FAQ · Basalith',
  description: 'Answers to the most common questions about Basalith and the archive.',
}

const QA = [
  {
    q: 'What is Basalith?',
    a: 'Basalith builds a living AI entity trained on how you specifically think. While you are alive it learns from you. Long after you are gone it continues.',
  },
  {
    q: 'How does it work?',
    a: 'Your Legacy Guide conducts a 90-minute Founding Session to establish the foundation of your entity. From there your archive builds daily through photographs, voice recordings, and contributions from your family.',
  },
  {
    q: 'What is the difference between the archive and the entity?',
    a: 'The archive is the training ground. Every photograph labeled, every voice recorded, every story captured teaches your entity something specific about how you think. The entity is the product. The archive makes it possible.',
  },
  {
    q: 'How long does it take?',
    a: 'The entity begins learning immediately. It becomes meaningfully accurate within the first year. The longer it learns the more distinctly it speaks in your voice and reasoning.',
  },
  {
    q: 'What happens when I am gone?',
    a: 'Your entity continues. Your family can talk to it. Ask it questions. Seek its counsel. The entity answers the way you would. Not from memory. From learned cognitive patterns built over time.',
  },
  {
    q: 'What does it cost?',
    a: 'The Archive begins at $1,800 per year. The Estate is $3,600 per year. The Dynasty is $9,600 per year. A one-time founding fee of $2,500 applies to all tiers.',
  },
  {
    q: 'How do my family members contribute?',
    a: 'Each contributor receives a personal portal link. No account needed. They can upload photographs, record voice memories, and answer questions about you. Every contribution makes your entity more accurate.',
  },
  {
    q: 'What languages does Basalith support?',
    a: 'Basalith supports English, Cantonese, Mandarin, Japanese, Spanish, Vietnamese, Tagalog, and Korean. Your entity speaks in the language of your family.',
  },
  {
    q: 'Is my data secure?',
    a: 'Your archive is encrypted and governed with the same seriousness as an estate. Your data belongs to you and your designated heirs. It is never sold or shared.',
  },
  {
    q: 'How do I begin?',
    a: 'Submit an application. A Legacy Guide will be in touch within 48 hours to schedule your Founding Session.',
  },
]

const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}
const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.28em',
}

export default function FAQPage() {
  return (
    <>
      <Nav />
      <main style={{ background: 'var(--color-bg)' }}>
        <section
          style={{
            maxWidth: '720px',
            margin:   '0 auto',
            padding:  'clamp(140px,16vw,180px) clamp(24px,6vw,48px) clamp(80px,10vw,120px)',
          }}
        >
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
            Frequently Asked Questions
          </p>

          <h1
            style={{
              ...SERIF,
              fontSize:      'clamp(2rem, 4vw, 3rem)',
              fontWeight:    300,
              lineHeight:    1.15,
              letterSpacing: '-0.02em',
              color:         'var(--color-text-primary)',
              marginBottom:  '64px',
            }}
          >
            Questions about
            <br />
            Basalith and the archive.
          </h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            {QA.map(({ q, a }) => (
              <div key={q}>
                <p
                  style={{
                    ...MONO,
                    fontSize:     '0.48rem',
                    color:        'var(--color-gold)',
                    marginBottom: '16px',
                  }}
                >
                  {q}
                </p>
                <div
                  style={{
                    borderLeft:  '2px solid rgba(184,150,62,0.25)',
                    paddingLeft: '24px',
                  }}
                >
                  <p
                    style={{
                      ...SERIF,
                      fontSize:   '1.1rem',
                      fontWeight: 300,
                      lineHeight: 1.9,
                      color:      'var(--color-text-secondary)',
                      margin:     0,
                    }}
                  >
                    {a}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div
            style={{
              marginTop:    '80px',
              paddingTop:   '48px',
              borderTop:    '1px solid var(--color-border)',
              textAlign:    'center',
            }}
          >
            <p
              style={{
                ...SERIF,
                fontSize:     '1.1rem',
                fontStyle:    'italic',
                fontWeight:   300,
                color:        'var(--color-text-secondary)',
                lineHeight:   1.85,
                marginBottom: '28px',
              }}
            >
              Still have questions? Your Legacy Guide will answer them
              <br />
              before your Founding Session.
            </p>
            <a
              href="/apply"
              style={{
                ...MONO,
                fontSize:       'var(--text-caption)',
                display:        'inline-block',
                background:     'var(--color-gold)',
                color:          'var(--color-bg)',
                textDecoration: 'none',
                padding:        '14px 32px',
                borderRadius:   'var(--radius-sm)',
              }}
            >
              Begin
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
