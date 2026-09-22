import Nav    from '../components/Nav'
import Footer from '../components/Footer'
import type { Metadata } from 'next'
import { faqSchema, ld, type FaqEntry } from '@/lib/structuredData'

export const metadata: Metadata = {
  title:       'FAQ · Basalith',
  description: 'Plain answers to the questions people ask before they begin a Basalith. What it is, what it costs, who owns the data, and what it will not do.',
}

const LINK: React.CSSProperties = { color: 'var(--color-gold)', textDecoration: 'none' }

// Every answer here states only what is live. Prices come from the pricing
// page, milestones from the four-stage system, languages from
// lib/emailTranslations.ts. If any of those change, change this too.
//
// `plain` carries the same answer as plain text, for the FAQPage structured
// data emitted below. It is required on every entry whose `a` is JSX, and it
// must say the same thing the reader sees. Answer engines quote this block
// directly, and schema that does not match the rendered page is the same
// failure as copy that does not match the code. The trailing navigation links
// are left out of `plain` on purpose; they are navigation, not answer.
const QA: { q: string; a: React.ReactNode; plain?: string }[] = [
  {
    q: 'What is Basalith?',
    a: 'Basalith builds a cognitive reference model of one person, from what they deposit and from what the people around them observe. For a business, that person is the operator, and the model transfers with the company through an acquisition or a succession. For a family, it is a parent or a grandparent, and the model stays with the people who relied on their judgment.',
  },
  {
    q: 'Is this a chatbot trained on someone’s old emails?',
    a: 'No. Nothing is reconstructed after the fact. A Basalith is built while the person is here and taking part. Every model is trained only on that one person’s deposits. No general AI speaks for the record. And when the person never took a position on something, the entity is built to say so instead of guessing.',
  },
  {
    q: 'How does it work?',
    a: <>
      It starts with The Founding: three of the hardest calls you ever made, in your own words, by voice or typed, in your own time, then a first read with the founder of Basalith by video. From there your Basalith grows through guided questions, real scenarios, voice recordings, photographs, and contributions from the people around them. Every deposit is scored before it can shape the model.
      {' '}<a href="/method" style={LINK}>Read the method &rarr;</a>
    </>,
    plain: 'It starts with The Founding: three of the hardest calls you ever made, in your own words, by voice or typed, in your own time, then a first read with the founder of Basalith by video. From there your Basalith grows through guided questions, real scenarios, voice recordings, photographs, and contributions from the people around them. Every deposit is scored before it can shape the model.',
  },
  {
    q: 'What is the difference between the record and the entity?',
    a: 'The record is everything deposited: the answers, the recordings, the labeled photographs, the observations from others. The entity is the model trained on it. The record is the permanent asset. The entity is the instrument. If the technology changes, the record is what carries forward.',
  },
  {
    q: 'How long does it take?',
    a: 'Your Basalith starts with the first deposit and there is no finish line. Milestones mark depth: 10 deposits, then 50, then 200, then 500. The longer someone deposits, the more the model has to work with. That is why the best time to start is before a transition is on the calendar.',
  },
  {
    q: 'What happens when a business changes hands?',
    a: <>
      The operator’s cognitive fingerprint is frozen at transition. The successor or acquirer gets portal access and can add today’s context, but nobody can rewrite what the operator said.
      {' '}<a href="/succession" style={LINK}>How the handoff works &rarr;</a>
    </>,
    plain: 'The operator’s cognitive fingerprint is frozen at transition. The successor or acquirer gets portal access and can add today’s context, but nobody can rewrite what the operator said.',
  },
  {
    q: 'What happens when I am gone?',
    a: 'Under the Legacy plan, your entity continues and your family can keep asking it questions. Your cognitive fingerprint is frozen at that point, so what you said stays exactly as you said it. Heirs can add context. Nobody can change what you built.',
  },
  {
    q: 'What does it cost?',
    a: <>
      For a business succession, $12,000 a year plus a one-time $5,000 Founding fee. Acquisition engagements start at $50,000, scaled to the transaction. For individuals and families, a one-time $2,500 founding fee, then Active at $3,600 a year, Resting at $600 a year, or Legacy at $1,200 a year.
      {' '}<a href="/pricing" style={LINK}>See pricing in full &rarr;</a>
    </>,
    plain: 'For a business succession, $12,000 a year plus a one-time $5,000 Founding fee. Acquisition engagements start at $50,000, scaled to the transaction. For individuals and families, a one-time $2,500 founding fee, then Active at $3,600 a year, Resting at $600 a year, or Legacy at $1,200 a year.',
  },
  {
    q: 'How do family members or colleagues contribute?',
    a: 'Each contributor gets a personal link. No account, no password. They get an email and hit reply. Or they hold a button in the app and talk for two minutes. Every contribution adds something the person would never have thought to say about themselves.',
  },
  {
    q: 'What languages does Basalith support?',
    a: 'English, Cantonese, Mandarin, Japanese, Spanish, Vietnamese, Tagalog, and Korean.',
  },
  {
    q: 'Who owns the data, and is it secure?',
    a: <>
      You own it. We are the custodian, not the owner. Your Basalith is encrypted at rest and in transit, kept in private storage, and never shared, sold, or used to train another company’s model. You can export all of it in open formats any time you ask, so nothing is stranded if we ever close.
      {' '}<a href="/data-ownership" style={LINK}>Data ownership &rarr;</a>
      {' '}<a href="/security" style={LINK}>Security &rarr;</a>
    </>,
    plain: 'You own it. We are the custodian, not the owner. Your Basalith is encrypted at rest and in transit, kept in private storage, and never shared, sold, or used to train another company’s model. You can export all of it in open formats any time you ask, so nothing is stranded if we ever close.',
  },
  {
    q: 'Can I try it before I commit?',
    a: <>
      Yes. The demo runs on a fictional founder and the same pipeline as production. Ask it something. Then ask it something the founder never answered, and watch what it does.
      {' '}<a href="/succession/demo" style={LINK}>Open the demo &rarr;</a>
    </>,
    plain: 'Yes. The demo runs on a fictional founder and the same pipeline as production. Ask it something. Then ask it something the founder never answered, and watch what it does.',
  },
  {
    q: 'How do I begin?',
    a: 'For a person or a family, begin directly. Your name, your email, and the first call: fifteen to thirty minutes, by voice or typed, on your own time. There is no application and no approval. When the call is in, your Basalith answers one question in your own words and declines one it has no grounds for. For a business succession or an acquisition, it starts with a conversation instead, and we reply within 48 hours.',
  },
]

// Only entries whose answer resolves to plain text are published as schema. A
// JSX answer with no `plain` is skipped rather than guessed at.
const FAQ_ENTRIES: FaqEntry[] = QA.flatMap(({ q, a, plain }) => {
  const answer = plain ?? (typeof a === 'string' ? a : null)
  return answer ? [{ question: q, answer }] : []
})

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ld(faqSchema(FAQ_ENTRIES)) }}
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
            The questions people ask
            <br />
            before they begin.
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
              Still have a question? <a href="/contact" style={LINK}>Write to us</a> and a real person answers within 48 hours.
              <br />
              You do not have to ask before you begin.
            </p>
            <a
              href="/begin"
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
              Begin your Basalith
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
