'use client'

import { useState } from 'react'

interface Item {
  q: string
  a: React.ReactNode
}

const ITEMS: Item[] = [
  {
    q: 'What exactly is The Founding?',
    a: <>
      The Founding is the one-time fee that opens your archive. It covers the Founding Sequence, three of
      the hardest calls you ever made, in your own words and your own time, plus your contributors invited,
      your records brought in, and a first read with the founder of Basalith by video. You pay it once, at
      the start. Your annual plan begins after The Founding is complete.
      {' '}<a href="/founding-session" style={{ color: '#C4A24A', textDecoration: 'none' }}>
        What happens in The Founding →
      </a>
    </>,
  },
  {
    q: 'What happens to my archive if Basalith ceases to exist?',
    a: <>
      You keep everything. You own the archive and Basalith is the custodian, not the owner. You can
      export the complete archive in open formats any time you ask, so a closure cannot strand your data.
      {' '}<a href="/data-ownership" style={{ color: '#C4A24A', textDecoration: 'none' }}>
        Read our data ownership commitments →
      </a>
    </>,
  },
  {
    q: 'Who owns my archive content?',
    a: `You do. Basalith holds a limited license to store and process your content so we can provide the
      service to you, and nothing more. We make no claim on your photographs, stories, or memories. You
      can export the complete archive at any time.`,
  },
  {
    q: 'Can my family access the archive after I am gone?',
    a: `Yes. That is much of the point. The Custodian you name carries out your directions for the archive.
      Their legal authority comes from your own will or trust, so name them there as well. Contributors
      keep their access. The archive continues. Under the Legacy plan, your entity stays available to your
      family and your cognitive fingerprint is frozen, so nobody can change what you said.`,
  },
  {
    q: 'What is the entity and how does it work?',
    a: `Your entity is a cognitive reference model trained only on your archive: your labeled photographs,
      voice recordings, written deposits, and the stories your family has contributed over time. It
      answers in the patterns of your expression, carries the opinions and values you recorded, and
      points back to your specific memories. It is not a simulation of you and it is not a general
      chatbot. It is a record of how you reason, built from what you chose to deposit. The richer the
      archive, the richer the entity.`,
  },
]

export default function PricingFAQ() {
  const [open, setOpen] = useState<number>(0)

  return (
    <section
      className="relative bg-obsidian px-8 md:px-16 lg:px-24 py-24 overflow-hidden"
      aria-label="Pricing FAQ"
    >
      <div className="max-w-3xl mx-auto">
        <p className="eyebrow mb-5 text-center">Common Questions</p>
        <h2
          className="font-serif font-semibold text-text-primary leading-[1.0] tracking-[-0.03em] mb-16 text-center"
          style={{ fontSize: 'clamp(2rem,4vw,3.25rem)' }}
        >
          What You Should Know.
        </h2>

        <div className="flex flex-col">
          {ITEMS.map(({ q, a }, i) => (
            <div
              key={i}
              style={{ borderBottom: '1px solid rgba(240,237,230,0.06)' }}
            >
              <button
                onClick={() => setOpen(open === i ? -1 : i)}
                aria-expanded={open === i}
                className="w-full text-left py-7 flex items-start justify-between gap-6 group"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1.75rem 0' }}
              >
                <span
                  className="font-serif"
                  style={{
                    fontWeight:  700,
                    fontSize:    '1.05rem',
                    color:       open === i ? '#F0EDE6' : '#B8B4AB',
                    lineHeight:  1.35,
                    transition:  'color 0.2s',
                  }}
                >
                  {q}
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    fontFamily:    "'Space Mono', monospace",
                    fontSize:      '0.8rem',
                    color:         '#C4A24A',
                    flexShrink:    0,
                    transition:    'transform 0.2s',
                    transform:     open === i ? 'rotate(45deg)' : 'none',
                    display:       'block',
                    marginTop:     '0.1rem',
                  }}
                >
                  +
                </span>
              </button>

              {open === i && (
                <div style={{ paddingBottom: '1.75rem' }}>
                  <p
                    className="font-serif"
                    style={{
                      fontWeight:  300,
                      fontSize:    '1rem',
                      color:       '#9DA3A8',
                      lineHeight:  1.85,
                    }}
                  >
                    {a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
