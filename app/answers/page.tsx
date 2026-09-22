import Nav    from '../components/Nav'
import Footer from '../components/Footer'
import type { Metadata } from 'next'
import { ANSWERS, answerPath } from '@/lib/answers'

// The index for the answer library. Every page listed here answers one question
// a buyer actually types, with the answer in the opening lines rather than the
// payoff at the bottom. See docs/ANSWERS_SLICE_1_2026-09-22.md.

export const metadata: Metadata = {
  title:       'Answers',
  description: 'Plain answers to the questions people ask about what happens to an operator’s judgment when a business changes hands.',
  alternates:  { canonical: '/answers' },
}

const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}
const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.28em',
}

export default function AnswersIndexPage() {
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
            <span
              style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }}
              aria-hidden="true"
            />
            Answers
          </p>

          <h1
            style={{
              ...SERIF,
              fontSize:      'clamp(2rem, 4vw, 3rem)',
              fontWeight:    300,
              lineHeight:    1.15,
              letterSpacing: '-0.02em',
              color:         'var(--color-text-primary)',
              marginBottom:  '32px',
            }}
          >
            One question at a time.
          </h1>

          <p
            style={{
              ...SERIF,
              fontSize:     '1.15rem',
              fontWeight:   300,
              lineHeight:   1.85,
              color:        'var(--color-text-secondary)',
              marginBottom: '64px',
            }}
          >
            Each of these answers one thing, in plain words, at the top. No
            preamble and nothing to sign up for. If a question you have is not
            here, <a href="/contact" style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>ask it</a> and
            a real person answers.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {ANSWERS.map(({ slug, question, summary }) => (
              <a
                key={slug}
                href={answerPath(slug)}
                className="bsl-answer-link"
                style={{ display: 'block', textDecoration: 'none' }}
              >
                <p
                  style={{
                    ...SERIF,
                    fontSize:      '1.35rem',
                    fontWeight:    300,
                    lineHeight:    1.4,
                    letterSpacing: '-0.01em',
                    color:         'var(--color-text-primary)',
                    margin:        '0 0 10px',
                  }}
                >
                  {question}
                </p>
                <p
                  style={{
                    ...SERIF,
                    fontSize:   '1.05rem',
                    fontWeight: 300,
                    lineHeight: 1.8,
                    color:      'var(--color-text-secondary)',
                    margin:     0,
                  }}
                >
                  {summary}
                </p>
              </a>
            ))}
          </div>
        </section>
      </main>
      <Footer />

      <style>{`
        .bsl-answer-link { transition: opacity 200ms ease; }
        .bsl-answer-link:hover { opacity: 0.72; }
        .bsl-answer-link:focus-visible {
          outline: 2px solid var(--color-gold);
          outline-offset: 6px;
        }
        @media (prefers-reduced-motion: reduce) {
          .bsl-answer-link { transition: none; }
        }
      `}</style>
    </>
  )
}
