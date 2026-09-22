import Nav    from '../components/Nav'
import Footer from '../components/Footer'
import type { Metadata } from 'next'
import { faqSchema, ld, type FaqEntry } from '@/lib/structuredData'

// Why this page exists.
//
// Google resolves the query "Basalith" to this site. It resolves the query
// "what is Basalith" to basalt, the volcanic rock, with no result from us on
// the page at all. Google AI Mode answers the branded query by citing
// basalith.ai next to Wikipedia's Basilisk and Basalt entries, then asks the
// reader whether they meant a rock or a lizard.
//
// A person who hears the name in a room and does not catch the spelling types
// exactly that query. This page gives the name a textual anchor of its own so
// the token can separate from basalt. That is the whole job. It is written to
// be read by a person and extracted by a machine, in that order.
//
// Every claim below already appears on /faq or /method. Nothing new is
// asserted here. If a claim changes there, change it here in the same pass.

export const metadata: Metadata = {
  title:       'What is Basalith?',
  description: 'Basalith builds a cognitive reference model of the operator of a business, so the way they reason transfers when the company changes hands. Not basalt. Not a basilisk.',
  alternates:  { canonical: '/what-is-basalith' },
}

const LINK: React.CSSProperties = { color: 'var(--color-gold)', textDecoration: 'none' }

const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}
const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.28em',
}

// The plain text that backs the FAQPage block. Each string here is rendered
// verbatim on the page below. Schema that does not match what a reader sees is
// the same failure as copy that does not match the code.
const ENTRIES: readonly FaqEntry[] = [
  {
    question: 'What is Basalith?',
    answer:
      'Basalith builds a cognitive reference model of the operator of a business, so the way they reason transfers when the company changes hands. It is built while they are still running the company, from their own words.',
  },
  {
    question: 'What does the name Basalith mean?',
    answer:
      'Basalith joins basalt and monolith. It is not basalt, the volcanic rock, and it is not the basilisk. Basalith is a company, operating under Heritage Nexus Inc.',
  },
  {
    question: 'What problem does Basalith solve?',
    answer:
      'What built a company is rarely written down. It sits in which deals the operator walked away from, which hires they trusted against the resume, and when they held the line. At an acquisition or a succession, that reasoning leaves with the person, and the buyer or the successor inherits the assets without the judgment that produced them.',
  },
  {
    question: 'Is Basalith a chatbot trained on someone’s old emails?',
    answer:
      'No. Nothing is reconstructed after the fact. A Basalith is built while the person is here and taking part. Every model is trained only on that one person’s deposits. No general AI speaks for the record.',
  },
  {
    question: 'What is the difference between the record and the entity?',
    answer:
      'The record is everything deposited: the answers, the recordings, the labeled photographs, the observations from others. The entity is the model trained on it. The record is the permanent asset. The entity is the instrument. If the technology changes, the record is what carries forward.',
  },
  {
    question: 'What does Basalith refuse to do?',
    answer:
      'When the person never took a position on something, the entity is built to say so instead of guessing. Where the record is silent, it says so. That refusal is not a limitation worked around later. It is the part that makes the rest worth trusting.',
  },
  {
    question: 'Who is Basalith for?',
    answer:
      'Primarily a business changing hands, by acquisition or by succession. It is also available for one person or a family, where the model stays with the people who relied on that judgment.',
  },
  {
    question: 'Who makes Basalith?',
    answer:
      'Heritage Nexus Inc., registered in Delaware, founded by David Ha, a Visiting Scholar at the Fisher School of Accounting at the University of Florida. The method is published, and the measurement behind it is filed publicly rather than described in marketing.',
  },
]

export default function WhatIsBasalithPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ld(faqSchema(ENTRIES)) }}
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
            Plainly
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
            What is Basalith?
          </h1>

          {/* The answer, first thing on the page. Studies of AI Overview
              citations put the majority of quoted snippets in the opening
              third of a source page. If this paragraph is right, it is the
              paragraph that gets quoted back to a buyer. */}
          <p
            style={{
              ...SERIF,
              fontSize:     'clamp(1.25rem, 2.2vw, 1.5rem)',
              fontWeight:   300,
              lineHeight:   1.7,
              color:        'var(--color-text-primary)',
              marginBottom: '32px',
            }}
          >
            Basalith builds a cognitive reference model of the operator of a
            business, so the way they reason transfers when the company changes
            hands. It is built while they are still running the company, from
            their own words.
          </p>

          <div
            style={{
              borderLeft:   '2px solid rgba(184,150,62,0.25)',
              paddingLeft:  '24px',
              marginBottom: '72px',
            }}
          >
            <p
              style={{
                ...SERIF,
                fontSize:   '1.05rem',
                fontWeight: 300,
                lineHeight: 1.9,
                color:      'var(--color-text-secondary)',
                margin:     0,
              }}
            >
              The name joins basalt and monolith. It is said BAS-uh-lith.
              Basalith is not basalt, the volcanic rock, and it is not the
              basilisk. It is a company, operating under Heritage Nexus Inc.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            {ENTRIES.slice(2).map(({ question, answer }) => (
              <div key={question}>
                <h2
                  style={{
                    ...MONO,
                    fontSize:     '0.48rem',
                    color:        'var(--color-gold)',
                    marginBottom: '16px',
                    fontWeight:   400,
                  }}
                >
                  {question}
                </h2>
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
                    {answer}
                  </p>
                </div>
              </div>
            ))}
          </div>

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
                fontSize:     '1.1rem',
                fontWeight:   300,
                lineHeight:   1.9,
                color:        'var(--color-text-secondary)',
                marginBottom: '28px',
              }}
            >
              The fastest way to understand it is to try to break it. The demo
              runs on a fictional founder and the same pipeline as production.
              Ask it something he answered. Then ask it something he never did.
              {' '}<a href="/succession/demo" style={LINK}>Open the demo &rarr;</a>
              {' '}<a href="/method" style={LINK}>Read the method &rarr;</a>
              {' '}<a href="/faq" style={LINK}>More questions &rarr;</a>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
