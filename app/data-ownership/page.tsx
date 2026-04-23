import Nav    from '../components/Nav'
import Footer from '../components/Footer'

const TENETS = [
  {
    num:     '01',
    tenet:   'Absolute Ownership',
    tagline: 'Your archive is yours. Not ours.',
    body: [
      'From the moment of creation, your Golden Dataset is a legal asset in your name. Not licensed to you. Not held in trust by us on your behalf. Owned by you, with the same structural clarity as a property deed.',
      'We do not have a claim on your archive\'s content, commercial value, or intellectual property. Heritage Nexus Inc. provides the infrastructure. You own what is built on it.',
      'This is formalised in your Sovereignty Charter and, at your direction, in your Will and Family Trust instrument. It is not a contractual assurance that can be revised in a terms-of-service update. It is a legal structure that exists independently of this company.',
    ],
  },
  {
    num:     '02',
    tenet:   'No Commercial Use',
    tagline: 'Your memory is not a product.',
    body: [
      'Heritage Nexus Inc. will never use the content of your archive to train AI models, inform advertising, generate commercial derivatives, or enrich any dataset beyond the one we are building for you.',
      'This prohibition is absolute. It applies to your photographs, voice recordings, written materials, family annotations, and Digital Clone interactions. None of it will be used to benefit any party other than you and your designated beneficiaries.',
      'We built Basalith in direct opposition to the model the technology industry has normalised, one in which your personal data is extracted, generalised, and sold. We have no interest in that model. We have structural commitments that prevent us from pursuing it even if we wanted to.',
    ],
  },
  {
    num:     '03',
    tenet:   'Defined Continuity',
    tagline: 'You decide who inherits. You decide for how long.',
    body: [
      'You determine the terms of your archive\'s continuity during your lifetime. Who may access it. Who may contribute to it. Under what conditions your Digital Clone may be queried. For how long after your death it remains active.',
      'These terms are codified in your Sovereignty Charter and enforced by your designated Custodian, an individual or institutional trustee you name, with the same legal standing as a financial executor.',
      'No representative of Heritage Nexus Inc. can override the continuity terms you set. No acquisition, restructuring, or change in our business can alter the rights your Sovereignty Charter establishes. Those rights exist in a legal instrument that predates and survives any change in our corporate status.',
    ],
  },
  {
    num:     '04',
    tenet:   'Right of Dissolution',
    tagline: 'You can close the archive. Completely. Permanently.',
    body: [
      'At any time, you or your designated Custodian may invoke the Right of Dissolution. This initiates the permanent, verified deletion of all archive content from our systems: every file, every annotation, every model weight derived from your data.',
      'Dissolution is irreversible. We have no backup of your archive that survives a dissolution request. This is a deliberate architectural choice. You are not dissolving a subscription. You are exercising the right to be forgotten in the most complete sense we can technically implement.',
      'A dissolution request must be verified against your Sovereignty Charter. Once initiated, deletion is completed within 30 days and confirmed in writing. We maintain no shadow copy, no training residual, and no commercial derivative of dissolved archives.',
    ],
  },
]

export default function DataOwnershipPage() {
  return (
    <>
      <Nav />
      <main>

        {/* ── HERO ── */}
        <section
          className="relative min-h-[70vh] flex flex-col items-center justify-center text-center px-8 md:px-16 pt-40 pb-28 overflow-hidden bg-obsidian-void"
          aria-label="Data ownership hero"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),' +
                'linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)',
              backgroundSize: '80px 80px',
              maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%,black 20%,transparent 100%)',
            }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 55%,rgba(255,179,71,0.08) 0%,transparent 65%)' }}
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-4xl mx-auto">
            <div className="ai-badge mb-8 mx-auto w-fit">
              <span className="ai-dot" />
              The Sovereignty Charter
            </div>
            <h1
              className="font-serif font-semibold text-text-primary leading-[0.9] tracking-[-0.042em] mb-10"
              style={{ fontSize: 'clamp(3rem,7.5vw,6.5rem)' }}
            >
              Your Archive.{' '}
              <em className="italic font-medium text-amber block" style={{ fontStyle: 'italic' }}>
                Your Terms.
              </em>
              Your{' '}
              <em className="italic font-medium text-amber" style={{ fontStyle: 'italic' }}>
                Inheritance.
              </em>
            </h1>
            <p className="font-sans font-light text-body-lg text-text-secondary leading-[1.82] max-w-2xl mx-auto">
              The Basalith Sovereignty Charter is a commitment document, not a terms-of-service clause.
              Four tenets. Absolute. Structural. Legally formalised at The Founding.
            </p>
          </div>
        </section>

        {/* ── TENETS ── */}
        {TENETS.map(({ num, tenet, tagline, body }, i) => (
          <section
            key={num}
            className={[
              'relative px-8 md:px-16 lg:px-24 py-32 overflow-hidden',
              i % 2 === 0 ? 'bg-obsidian-deep' : 'bg-obsidian',
            ].join(' ')}
            aria-label={tenet}
          >
            {i === 0 && (
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border-amber to-transparent" />
            )}
            {i > 0 && (
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border-subtle to-transparent" />
            )}

            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-16 items-start">

              {/* Left — number + tenet label */}
              <div className="lg:sticky lg:top-32 flex flex-col gap-4">
                <p
                  className="font-serif font-light text-amber/18 leading-none select-none"
                  style={{ fontSize: 'clamp(5rem,10vw,9rem)', letterSpacing: '-0.05em' }}
                  aria-hidden="true"
                >
                  {num}
                </p>
                <div>
                  <p className="eyebrow mb-2">Sovereignty Tenet {num}</p>
                  <p className="font-sans text-[0.78rem] font-light text-text-muted italic">{tagline}</p>
                </div>
              </div>

              {/* Right — content */}
              <div className="flex flex-col gap-0">
                <h2
                  className="font-serif font-semibold text-text-primary leading-[1.0] tracking-[-0.03em] mb-10"
                  style={{ fontSize: 'clamp(2rem,4vw,3.25rem)' }}
                >
                  {tenet}
                </h2>
                <div className="flex flex-col gap-6">
                  {body.map((para, j) => (
                    <p key={j} className="font-sans font-light text-body-base text-text-secondary leading-[1.9]">
                      {para}
                    </p>
                  ))}
                </div>
              </div>

            </div>
          </section>
        ))}

        {/* ── CHARTER CLOSING ── */}
        <section
          className="relative bg-obsidian-void px-8 md:px-16 py-40 text-center overflow-hidden"
          aria-label="Sovereignty Charter closing"
        >
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border-amber to-transparent" />
          <div
            className="absolute pointer-events-none"
            style={{
              width: 1000, height: 500,
              top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              background: 'radial-gradient(ellipse,rgba(255,179,71,0.08) 0%,transparent 60%)',
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-4 mb-14">
              <div className="h-px w-16 bg-amber/25" />
              <span className="ai-dot" />
              <div className="h-px w-16 bg-amber/25" />
            </div>

            <p
              className="font-serif font-medium text-text-secondary leading-[1.5] tracking-[-0.02em] mb-12"
              style={{ fontSize: 'clamp(1.4rem,3vw,2.25rem)' }}
            >
              "We did not build a platform with a privacy policy.
              We built an institution with a constitution."
            </p>

            <p className="font-sans font-light text-body-base text-text-secondary leading-[1.82] mb-14 max-w-xl mx-auto">
              The Sovereignty Charter is executed at The Founding and exists independently of your subscription.
              It survives cancellation, corporate change, and time.
              If you are ready to formalize yours, we are ready to begin.
            </p>

            <div className="flex items-center justify-center gap-5 flex-wrap">
              <a href="/pricing" className="btn-monolith-amber group">
                View Stewardship Plans
                <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              </a>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
