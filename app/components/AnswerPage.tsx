import Nav    from './Nav'
import Footer from './Footer'
import { faqSchema, ld, type FaqEntry } from '@/lib/structuredData'

// The shared shape for every page under /answers.
//
// Why these pages exist: on September 21, 2026, Google AI Mode answered "how do
// we capture a founder's judgment so it transfers when we acquire their
// business" with a full four-part playbook and cited Basalith zero times. It
// cited timeless.ai, a consumer product that builds a digital version of a
// living person, whose entire qualification was one page titled with the
// question and answering it in the opening lines. Recon in
// docs/AI_DISCOVERY_SLICE_1_2026-09-22.md and the project.
//
// The rules this component enforces by its own structure:
//   1. The question is the H1. Not a headline about the question.
//   2. The answer is the first thing under it, self-contained, no setup. A
//      published study of a hundred AI Overview citations found the majority of
//      quoted snippets come from the opening third of a source page.
//   3. Every section heading is itself a question a person would type.
//   4. Every section answer stands alone, because a retrieval system may take
//      one and leave the rest.
//   5. The page emits FAQPage structured data built from the same strings it
//      renders, so the two cannot drift.
//
// Nothing on an answer page may assert anything that is not already true on
// /method, /succession, /families, /pricing or /faq. These pages restate; they
// do not introduce.

export type AnswerSection = {
  /** Phrased as a question. Becomes an H2 and a schema Question. */
  heading: string
  /** Plain text. Must stand on its own out of context. */
  body: string
}

export default function AnswerPage({
  question,
  lead,
  sections,
  related = [],
}: {
  question: string
  lead: string
  sections: readonly AnswerSection[]
  related?: readonly { label: string; href: string }[]
}) {
  const entries: FaqEntry[] = [
    { question, answer: lead },
    ...sections.map(s => ({ question: s.heading, answer: s.body })),
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ld(faqSchema(entries)) }}
      />
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
            <a href="/answers" style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>Answers</a>
          </p>

          <h1
            style={{
              ...SERIF,
              fontSize:      'clamp(1.9rem, 3.6vw, 2.7rem)',
              fontWeight:    300,
              lineHeight:    1.2,
              letterSpacing: '-0.02em',
              color:         'var(--color-text-primary)',
              marginBottom:  '32px',
            }}
          >
            {question}
          </h1>

          <p
            style={{
              ...SERIF,
              fontSize:     'clamp(1.2rem, 2.1vw, 1.45rem)',
              fontWeight:   300,
              lineHeight:   1.7,
              color:        'var(--color-text-primary)',
              marginBottom: '72px',
            }}
          >
            {lead}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            {sections.map(({ heading, body }) => (
              <div key={heading}>
                <h2
                  style={{
                    ...MONO,
                    fontSize:     '0.48rem',
                    color:        'var(--color-gold)',
                    marginBottom: '16px',
                    fontWeight:   400,
                  }}
                >
                  {heading}
                </h2>
                <div style={{ borderLeft: '2px solid rgba(184,150,62,0.25)', paddingLeft: '24px' }}>
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
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {related.length > 0 && (
            <div
              style={{
                marginTop:  '72px',
                paddingTop: '48px',
                borderTop:  '1px solid var(--color-border)',
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
                {related.map(({ label, href }, i) => (
                  <span key={href}>
                    {i > 0 && ' '}
                    <a href={href} style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>
                      {label} &rarr;
                    </a>
                  </span>
                ))}
              </p>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}

const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}
const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.28em',
}
