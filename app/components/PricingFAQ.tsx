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
      The Founding is a one-time setup investment covering the full onboarding process — archive architecture,
      legal framework review, and your initial Essence Mapping session. It is paid once at the start of your
      relationship with Basalith. Your annual stewardship plan begins after The Founding is complete.
      {' '}<a href="/founding-session" style={{ color: '#C4A24A', textDecoration: 'none' }}>
        Learn more about what happens in your Founding session →
      </a>
    </>,
  },
  {
    q: 'What happens to my archive if Basalith ceases to exist?',
    a: <>
      Every active archive is covered by the Data Custodianship Reserve — a dedicated fund maintained
      separately from our operating finances. If Basalith were to cease operations, the Reserve funds a
      minimum of 10 years of continued archive storage and access under an independent custodian institution.
      Your archive does not depend on our continued existence.
      {' '}<a href="/custodianship" style={{ color: '#C4A24A', textDecoration: 'none' }}>
        Learn more about the Reserve →
      </a>
    </>,
  },
  {
    q: 'Who owns my archive content?',
    a: `You do. Completely. Basalith holds a limited license to store and process your content for the
      purpose of providing the service to you. We make no claim of ownership over your photographs,
      stories, or memories. You can export your complete archive at any time.`,
  },
  {
    q: 'Can my family access the archive after I am gone?',
    a: `Yes. This is one of the core purposes of the archive. Your designated Custodian has formal estate
      standing to govern the archive after your passing. Contributors retain their access. The archive
      continues. Your AI entity — if initialized — remains available to your family indefinitely.
      The Estate and Dynasty tiers include specific provisions for multi-generational access and inheritance.`,
  },
  {
    q: 'What is the Digital Clone and how does it work?',
    a: `The Digital Clone is an AI entity trained exclusively on your archive content: your labeled
      photographs, voice recordings, written deposits, and the stories your family has contributed over
      time. It speaks in the patterns of your voice, carries your known opinions and values, and references
      your specific memories. It is not a simulation. It is not a chatbot. It is the most faithful
      preservation of who you were, built from everything you chose to deposit. The richer the archive,
      the richer the entity.`,
  },
  {
    q: 'Is this the same as Character.ai or other AI chat products?',
    a: `No. Character.ai creates fictional entertainment personas. Basalith builds verified, legally
      documented archives of real human lives with estate standing, generational access, and professional
      stewardship. The comparison is like calling a family trust the same as a piggy bank because they
      both hold value. The surface similarity is real. Everything underneath is different.`,
  },
  {
    q: 'Can I upgrade my stewardship tier?',
    a: `Yes, at any time. Upgrades take effect at your next renewal date. Your archive content, contributors,
      and entity are fully preserved across all tiers — upgrading unlocks additional features and
      stewardship services, it does not require any re-initialization.`,
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
