import Nav        from '../components/Nav'
import Footer     from '../components/Footer'
import PricingFAQ from '../components/PricingFAQ'

const TIERS = [
  {
    name:     'The Archive',
    tagline:  'For individuals beginning their legacy.',
    price:    '$1,200',
    period:   'per year',
    monthly:  '$100 / month equivalent',
    featured: false,
    badge:    null as string | null,
    features: [
      'Secure archive infrastructure',
      'Up to 5 family contributors',
      'Unlimited photograph deposits',
      'Voice, photo & journal labeling',
      'Nightly photograph email to contributors',
      'Basic Digital Clone access',
      'Annual AI model updates',
      'Data portability guarantee',
      'Data Custodianship Reserve coverage',
    ],
    cta: 'BEGIN WITH THE ARCHIVE',
  },
  {
    name:     'The Estate',
    tagline:  'For families building a generational asset.',
    price:    '$3,600',
    period:   'per year',
    monthly:  '$300 / month equivalent',
    featured: true,
    badge:    'MOST POPULAR' as string | null,
    features: [
      'Everything in The Archive',
      'Up to 15 family contributors',
      'Full Digital Clone with conversational access',
      'Will & Trust integration — bequest language prepared',
      'Dedicated Custodian designation',
      'Annual estate compatibility review',
      'Priority curation support',
      'basalith.ai entity priority access',
      'Quarterly Provenance report',
      'Family access tiers — control who sees what',
      '48-hour response on all support requests',
    ],
    cta: 'BEGIN WITH THE ESTATE',
  },
  {
    name:     'The Dynasty',
    tagline:  'For legacies that must outlast generations.',
    price:    '$9,600',
    period:   'per year',
    monthly:  '$800 / month equivalent',
    featured: false,
    badge:    'SOVEREIGN' as string | null,
    features: [
      'Everything in The Estate',
      'Unlimited contributors across generations',
      'Full Family Trust legal instrument',
      'Multi-generational access tiers',
      'Dedicated Archive Manager — named professional, not a ticket queue',
      'White-glove onboarding — we come to you',
      'Annual in-person estate review',
      'First access to new AI model generations',
      'Custom Digital Clone interaction boundaries',
      'Sovereign Archivist permanently assigned',
      'Custom bequest language prepared',
      '200-year perpetual storage guarantee',
    ],
    cta: 'BEGIN WITH THE DYNASTY',
  },
]

const DELIVERABLES = [
  { num: '01', title: 'Archive Architecture Build',      desc: 'Your permanent digital estate structure, configured for generational transfer and legal standing.' },
  { num: '02', title: 'Legal Instrument Review',          desc: 'Compatibility assessment with your existing will, trust, and estate documents. Attorney-ready output.' },
  { num: '03', title: 'Family Network Initialization',    desc: 'Contributor onboarding for up to 15 family members. Roles assigned. Access levels configured. Documented.' },
  { num: '04', title: 'Founding Essence Session',         desc: 'Your first live family labeling session, guided by a Senior Archivist. 90 minutes. This is where it becomes real.' },
  { num: '05', title: 'AI-Processed Data Migration',       desc: 'Import from existing photo libraries, documents, and digital archives. Every photograph filtered, deduplicated, dated, and sequenced by our AI pipeline before it reaches the labeling interface.' },
  { num: '06', title: 'Custodian Designation',            desc: "Your archive's legal custodian assigned and documented with formal estate standing." },
]

const FOUNDING_ESTABLISHES = [
  'Your archive exists as a legal asset documented in your estate plan.',
  'Your family has authenticated access with roles, permissions, and continuity.',
  'Your Custodian is designated and has formal standing to govern the archive.',
  'Your first Essence data is indexed, attributed, and stored with legal provenance.',
]


const tierSepStyle: React.CSSProperties = {
  fontFamily:    'monospace',
  fontSize:      '0.38rem',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color:         'rgba(240,237,230,0.2)',
  writingMode:   'vertical-rl',
  transform:     'rotate(180deg)',
}

function TierSeparator({ top, bottom }: { top: string; bottom: string }) {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center gap-2 self-stretch py-12" aria-hidden="true">
      <span style={tierSepStyle}>{top}</span>
      <div style={{ flex: 1, width: '1px', background: 'rgba(255,255,255,0.05)' }} />
      <span style={tierSepStyle}>{bottom}</span>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-0.5">
      <circle cx="7" cy="7" r="6.5" stroke="rgba(255,179,71,0.3)" />
      <path d="M4 7l2 2 4-4" stroke="#FFB347" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main>

        {/* ── HERO ── */}
        <section className="relative bg-obsidian-void px-8 md:px-16 pt-40 pb-24 text-center overflow-hidden" aria-label="Pricing hero">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)', backgroundSize: '80px 80px', maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%,black 20%,transparent 100%)' }} aria-hidden="true" />
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 60%,rgba(255,179,71,0.07) 0%,transparent 65%)' }} aria-hidden="true" />
          <div className="relative z-10 max-w-3xl mx-auto">
            <p className="eyebrow mb-6">Stewardship Pricing</p>
            <h1 className="font-serif font-semibold text-text-primary leading-[0.92] tracking-[-0.038em] mb-6" style={{ fontSize: 'clamp(3rem,6vw,5.5rem)' }}>
              An Investment In{' '}
              <em className="italic font-medium text-amber" style={{ fontStyle: 'italic' }}>Permanence.</em>
            </h1>
            <p className="font-sans font-light text-body-base text-text-secondary leading-[1.82] max-w-xl mx-auto">
              Basalith is priced as what it is — a generational asset under professional stewardship.
              Not a software subscription. Not a storage plan. A governed legacy infrastructure with legal standing.
            </p>
          </div>
        </section>

        {/* ── THE FOUNDING ── */}
        <section className="relative bg-obsidian-deep px-8 md:px-16 lg:px-24 py-24 overflow-hidden" aria-label="The Founding fee">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border-amber to-transparent" />
          <div className="max-w-[860px] mx-auto rounded-sm overflow-hidden" style={{ background: '#0F0E0C', borderTop: '3px solid rgba(196,162,74,0.6)', border: '1px solid rgba(196,162,74,0.2)', borderTopColor: 'rgba(196,162,74,0.6)' }}>
            <div className="p-10 md:p-14">

              {/* Card header */}
              <div className="flex items-start justify-between gap-4 mb-7">
                <span className="font-sans text-[0.58rem] font-bold tracking-[0.22em] uppercase" style={{ color: '#C4A24A' }}>
                  One-Time Engagement
                </span>
                <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true" className="flex-shrink-0 opacity-60">
                  <polygon points="17,1 33,17 17,33 1,17" fill="none" stroke="#C4A24A" strokeWidth="1.4"/>
                  <polygon points="17,7 27,17 17,27 7,17" fill="none" stroke="#C4A24A" strokeWidth="1.1"/>
                  <polygon points="17,13 21,17 17,21 13,17" fill="#C4A24A"/>
                </svg>
              </div>

              {/* Headline + sub */}
              <h2 className="font-serif font-bold text-text-primary tracking-[-0.025em] mb-4" style={{ fontSize: '2.2rem' }}>
                The Founding
              </h2>
              <p className="font-serif italic text-text-secondary leading-[1.75] mb-8" style={{ fontSize: '1rem' }}>
                Every Basalith archive begins with The Founding —
                a comprehensive legal and technical engagement that establishes
                your archive&rsquo;s permanent infrastructure.
                Executed once. Built to last centuries.
              </p>

              {/* Divider */}
              <div className="h-px mb-10" style={{ background: 'rgba(196,162,74,0.18)' }} />

              {/* Two columns */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-12">

                {/* LEFT — deliverables */}
                <div className="flex flex-col gap-7">
                  {DELIVERABLES.map(({ num, title, desc }) => (
                    <div key={num} className="flex gap-5 items-start">
                      <span className="font-sans text-[0.62rem] font-bold tracking-[0.12em] flex-shrink-0 mt-1 w-7" style={{ color: '#C4A24A' }}>
                        {num}
                      </span>
                      <div>
                        <p className="font-sans text-[0.88rem] font-semibold text-text-primary mb-1">{title}</p>
                        <p className="font-serif italic text-[0.9rem] text-text-secondary leading-[1.65]">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* RIGHT — establishes + price */}
                <div className="flex flex-col">
                  <p className="font-serif italic text-text-secondary mb-6" style={{ fontSize: '1rem' }}>
                    Upon completion of The Founding,
                  </p>
                  <div className="flex flex-col gap-4 mb-8">
                    {FOUNDING_ESTABLISHES.map((item) => (
                      <div key={item} className="flex items-start gap-3">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5" aria-hidden="true">
                          <path d="M3 8l3.5 3.5L13 5" stroke="#C4A24A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <p className="font-sans text-[0.83rem] text-text-secondary leading-[1.65]">{item}</p>
                      </div>
                    ))}
                  </div>

                  {/* Price block */}
                  <div className="pt-6 mt-auto" style={{ borderTop: '1px solid rgba(196,162,74,0.12)' }}>
                    <p className="font-serif font-bold text-text-primary leading-none mb-2" style={{ fontSize: '3rem', letterSpacing: '-0.03em' }}>
                      $2,500
                    </p>
                    <p className="font-sans font-bold tracking-[0.2em] uppercase mb-3" style={{ fontSize: '0.6rem', color: '#C4A24A' }}>
                      One-Time Engagement Fee
                    </p>
                    <p className="font-serif italic text-text-muted leading-[1.65] mb-3" style={{ fontSize: '0.85rem' }}>
                      Required for all new archives. Annual stewardship is selected and billed separately below.
                    </p>
                    <p className="font-serif italic text-text-muted leading-[1.7]" style={{ fontSize: '0.8rem' }}>
                      The Founding is executed by a Senior Archivist assigned to your family.
                      Completion typically takes 2–3 weeks from engagement.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* ── FOUNDING LINKS ── */}
        <div className="bg-obsidian-deep px-8 md:px-16 lg:px-24 pb-12 flex flex-col sm:flex-row items-center justify-center gap-6">
          <a href="/founding-session" className="font-serif italic text-text-muted hover:text-amber transition-colors duration-200" style={{ fontSize: '0.95rem' }}>
            What happens in your Founding session →
          </a>
          <span className="hidden sm:block text-border-subtle select-none" aria-hidden="true">·</span>
          <a href="/custodianship" className="font-serif italic text-text-muted hover:text-amber transition-colors duration-200" style={{ fontSize: '0.95rem' }}>
            Learn about the Data Custodianship Reserve →
          </a>
        </div>

        {/* ── TIERS ── */}
        <section className="relative bg-obsidian px-8 md:px-16 lg:px-24 py-24 overflow-hidden" aria-label="Pricing tiers">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 50%,rgba(255,179,71,0.04) 0%,transparent 65%)' }} aria-hidden="true" />
          <div className="text-center max-w-xl mx-auto mb-16">
            <p className="eyebrow mb-4">Annual Stewardship</p>
            <h2 className="font-serif font-semibold text-text-primary leading-[1.0] tracking-[-0.03em]" style={{ fontSize: 'clamp(2rem,4vw,3.25rem)' }}>Choose Your Level of Stewardship.</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_48px_1fr_48px_1fr] gap-y-6 max-w-6xl mx-auto items-start">
            {TIERS.map(({ name, tagline, price, period, monthly, featured, badge, features, cta }, i) => {
              const sep = i === 1
                ? <TierSeparator key="sep-1" top="↑ Core archive" bottom="↓ Full estate integration" />
                : i === 2
                  ? <TierSeparator key="sep-2" top="↑ Family archive" bottom="↓ Generational institution" />
                  : null
              return [
                sep,
                <div key={name} className={['relative rounded-sm overflow-hidden flex flex-col', featured ? 'border border-border-amber' : 'border border-border-subtle'].join(' ')} style={{ background: featured ? 'linear-gradient(160deg,#221F14,#1D1B11)' : 'linear-gradient(160deg,#1D1D20,#17171A)' }}>
                  {featured && <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-amber/50 to-transparent" />}
                  {badge && (
                    <div className="absolute top-4 right-4">
                      <div className="ai-badge !text-[0.55rem]">{badge}</div>
                    </div>
                  )}
                  <div className="p-8 flex flex-col flex-1">
                    <div className="mb-7">
                      <h3 className={['font-serif text-[1.625rem] font-semibold leading-tight mb-2', featured ? 'text-text-primary' : 'text-text-secondary'].join(' ')}>{name}</h3>
                      <p className="font-sans text-body-sm text-text-muted leading-[1.6]">{tagline}</p>
                    </div>
                    <div className="mb-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-serif font-semibold text-text-primary" style={{ fontSize: 'clamp(2rem,4vw,2.75rem)', letterSpacing: '-0.03em' }}>{price}</span>
                        <span className="font-sans text-[0.75rem] text-text-muted tracking-[0.06em] uppercase">{period}</span>
                      </div>
                      <p className="font-sans text-[0.7rem] text-text-muted mt-1">{monthly}</p>
                    </div>
                    <div className={['h-px my-6', featured ? 'bg-amber/15' : 'bg-white/[0.06]'].join(' ')} />
                    <div className="flex flex-col gap-3 flex-1 mb-8">
                      {features.map((f) => (
                        <div key={f} className="flex items-start gap-3">
                          <CheckIcon />
                          <span className="font-sans text-[0.825rem] text-text-secondary leading-[1.6]">{f}</span>
                        </div>
                      ))}
                    </div>
                    <a href="/contact" className={featured ? 'btn-monolith-amber text-center' : 'btn-monolith text-center'}>{cta}</a>
                  </div>
                </div>,
              ]
            })}
          </div>
          <p className="text-center font-sans text-[0.75rem] text-text-muted mt-8">All plans require The Founding — a one-time setup investment of $2,500.</p>
          <p className="text-center font-serif italic text-text-muted mt-2" style={{ fontSize: '0.9rem' }}>
            The Founding includes archive initialization, legal framework review, your first Essence Mapping session, and Custodian designation.
          </p>
        </section>

        {/* ── LEGAL FRAMING BLOCK ── */}
        <section className="relative bg-obsidian px-8 md:px-16 lg:px-24 py-16 overflow-hidden" aria-label="Legal framing">
          <div className="max-w-[680px] mx-auto rounded-sm px-10 py-12 text-center" style={{ background: 'rgba(196,162,74,0.04)', border: '1px solid rgba(196,162,74,0.10)' }}>
            <p className="font-serif italic text-text-secondary leading-[1.85]" style={{ fontSize: '1.3rem' }}>
              &ldquo;The Founding is not a setup fee.
              It is a legal and technical engagement
              executed by a Senior Archivist &mdash; the same
              way an estate attorney executes a trust.
              <br /><br />
              You leave The Founding with six deliverables,
              a designated Custodian, and an archive that
              exists in your estate plan.&rdquo;
            </p>
            <p className="font-sans font-bold tracking-[0.22em] uppercase mt-8" style={{ fontSize: '0.44rem', color: '#C4A24A' }}>
              All Archives Carry Legal Standing From Day One
            </p>
          </div>
        </section>

        {/* ── FAQ ── */}
        <PricingFAQ />

        {/* ── CTA ── */}
        <section className="relative bg-obsidian-deep px-8 md:px-16 py-36 text-center overflow-hidden" aria-label="Pricing CTA">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border-amber to-transparent" />
          <div className="absolute pointer-events-none" style={{ width: 900, height: 420, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'radial-gradient(ellipse,rgba(255,179,71,0.08) 0%,transparent 65%)' }} aria-hidden="true" />
          <div className="relative z-10 max-w-2xl mx-auto">
            <p className="eyebrow mb-6">By Invitation of Intent</p>
            <h2 className="font-serif font-semibold text-text-primary leading-[0.92] tracking-[-0.04em] mb-6" style={{ fontSize: 'clamp(2.5rem,5vw,4.5rem)' }}>
              Basalith Is Not{' '}
              <em className="italic font-medium text-amber" style={{ fontStyle: 'italic' }}>For Everyone.</em>
            </h2>
            <p className="font-sans font-light text-body-base text-text-secondary leading-[1.82] mb-12">
              It is for the rare few who understand that memory is an asset —
              and that leaving it unarchived is a choice with consequences
              their family will live with long after they are gone.
            </p>
            <a href="/contact" className="btn-monolith-amber group">Apply for Access <span className="transition-transform duration-200 group-hover:translate-x-1">→</span></a>
            <p className="font-sans text-[0.75rem] text-text-muted mt-8">Archives are accepted on a rolling basis.&nbsp;&middot;&nbsp;<a href="mailto:legacy@basalith.xyz" className="text-amber-dim hover:text-amber transition-colors">legacy@basalith.xyz</a></p>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}