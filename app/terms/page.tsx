import Nav    from '../components/Nav'
import Footer from '../components/Footer'

// [STATE OF INCORPORATION — CONFIRM IF NOT DELAWARE]
const GOVERNING_STATE = 'Delaware'

const SECTIONS = [
  {
    num:   '01',
    title: 'The Service',
    body: [
      'Basalith is a personal legacy preservation service operated by Heritage Nexus Inc. ("we", "us", "the Company"). By creating an archive or submitting an application, you ("the Subscriber") agree to be bound by these Terms of Service in their entirety.',
      'Basalith provides a governed digital archive infrastructure, including secure storage, family contributor tools, AI-assisted Essence Mapping, and Digital Clone access, as described in the service tier documentation current at the time of your Founding.',
      'These Terms govern the commercial relationship between you and Heritage Nexus Inc. The separate Sovereignty Charter, executed at the time of your Founding, governs the ownership, governance, and continuity of your archive as a legal asset. In any conflict between these Terms and your Sovereignty Charter, the Sovereignty Charter takes precedence in respect of archive content and ownership rights.',
      'We reserve the right to update these Terms. Material changes will be communicated by email no fewer than 30 days before taking effect. Continued use of the service after that date constitutes acceptance.',
    ],
  },
  {
    num:   '02',
    title: 'Payment Terms',
    body: [
      'All Basalith archives require a one-time Founding fee, currently $2,500, due at the commencement of your archive. The Founding fee covers initial archive architecture, legal framework configuration, and your first Essence Mapping session. It is non-refundable once The Founding process has commenced.',
      'Following The Founding, archives are maintained on an annual subscription basis at the rate applicable to your chosen tier: The Archive ($1,200/year), The Estate ($3,600/year), or The Dynasty ($9,600/year). Prices are denominated in US dollars and are exclusive of any taxes, duties, or levies that may apply in your jurisdiction.',
      'Annual subscriptions are billed on the anniversary of your Founding date. Payment is processed by Stripe. Your Family Trust, estate entity, or personal account may be designated as the billing party at any time.',
      'Invoices are issued 14 days before each renewal date. Failure to pay within 14 days of the due date will result in your archive entering a paused state. Content is preserved during this period. A 30-day cure period follows, after which Heritage Nexus Inc. reserves the right to initiate the archive dissolution process as described in your Sovereignty Charter.',
    ],
  },
  {
    num:   '03',
    title: 'Cancellation',
    body: [
      'You may cancel your annual subscription at any time by providing written notice to legacy@basalith.xyz. Cancellation takes effect at the end of the current billing period. No partial refunds are issued for unused subscription time.',
      'Upon cancellation, you retain full rights to a complete export of your archive in open, portable formats. This export right is unconditional and does not require a reason. Export requests are fulfilled within 30 business days.',
      'Cancellation of a subscription is distinct from dissolution of your archive. Dissolution, meaning the permanent deletion of all archive content from our systems, is a separate, deliberate act governed by your Sovereignty Charter and requires a verified written request from the designated Custodian.',
      'If Basalith ceases operations for any reason, the Data Custodianship Reserve, an independent legal structure funded by subscription revenue, ensures that all archives are transferred to a successor custodian or returned to subscribers in full. The terms of this arrangement are specified in your Sovereignty Charter.',
    ],
  },
  {
    num:   '04',
    title: 'Limitation of Liability',
    body: [
      'To the maximum extent permitted by applicable law, Heritage Nexus Inc. shall not be liable for any indirect, incidental, consequential, punitive, or special damages arising from or related to your use of the Basalith service, including but not limited to loss of data, loss of business, or loss of anticipated savings, even if we have been advised of the possibility of such damages.',
      'Our total aggregate liability to you for any claim arising out of or in connection with these Terms or the service shall not exceed the total fees paid by you to Heritage Nexus Inc. in the twelve months preceding the event giving rise to the claim.',
      'Nothing in these Terms excludes or limits our liability for death or personal injury caused by our negligence, fraud, or any other liability that cannot be excluded or limited by law.',
      'Basalith is a data preservation and archival service. We make no representation that the Digital Clone or AI Presence features constitute a legally recognized representation of any person for the purposes of any legal proceeding, estate administration, or contractual obligation.',
    ],
  },
  {
    num:   '05',
    title: 'Governing Law',
    body: [
      `These Terms of Service are governed by and construed in accordance with the laws of the State of ${GOVERNING_STATE}, United States of America, without regard to its conflict of law provisions.`,
      `Any dispute arising out of or relating to these Terms, your Sovereignty Charter, or the Basalith service shall be subject to the exclusive jurisdiction of the courts of the State of ${GOVERNING_STATE} and the federal courts located therein, and you consent to personal jurisdiction in those courts.`,
      'If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.',
      'These Terms, together with your Sovereignty Charter and the Data Custodianship Reserve instrument, constitute the entire agreement between you and Heritage Nexus Inc. in respect of the Basalith service, and supersede all prior agreements, representations, and understandings.',
    ],
  },
]

export default function TermsPage() {
  return (
    <>
      <style>{`
        [data-theme-terms] { background: var(--color-bg); }
        [data-theme-terms] .bg-obsidian-void { background-color: var(--color-bg) !important; }
        [data-theme-terms] .bg-obsidian-deep { background-color: var(--color-surface-alt) !important; }
        [data-theme-terms] .bg-obsidian      { background-color: var(--color-surface) !important; }
        [data-theme-terms] .text-text-primary   { color: var(--color-text-primary) !important; }
        [data-theme-terms] .text-text-secondary { color: var(--color-text-secondary) !important; }
        [data-theme-terms] .text-text-muted     { color: var(--color-text-muted) !important; }
        [data-theme-terms] .text-amber { color: var(--color-gold) !important; }
        [data-theme-terms] .text-amber-dim { color: var(--color-gold) !important; }
        [data-theme-terms] .text-amber\\/20 { color: rgba(184,150,62,0.15) !important; }
        [data-theme-terms] .border-border-amber { border-color: var(--color-gold-border) !important; }
        [data-theme-terms] .via-border-amber { --tw-gradient-stops: transparent, var(--color-gold-border), transparent !important; }
        [data-theme-terms] .via-amber\\/45 { --tw-gradient-stops: transparent, rgba(184,150,62,0.3), transparent !important; }
        [data-theme-terms] div[style*="linear-gradient(160deg,#221F14"] {
          background: var(--color-surface) !important;
          border-color: var(--color-gold-border) !important;
        }
        [data-theme-terms] .eyebrow { color: var(--color-gold); }
        [data-theme-terms] .btn-monolith-ghost {
          color: var(--color-text-secondary) !important;
          border-color: var(--color-border-medium) !important;
        }
      `}</style>
      <Nav />
      <main data-theme-terms>

        {/* ── HERO ── */}
        <section
          className="relative min-h-[55vh] flex flex-col items-center justify-center text-center px-8 md:px-16 pt-40 pb-24 overflow-hidden bg-obsidian-void"
          aria-label="Terms of service hero"
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
            style={{ background: 'radial-gradient(ellipse 55% 55% at 50% 60%,rgba(255,179,71,0.06) 0%,transparent 65%)' }}
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-3xl mx-auto">
            <p className="eyebrow mb-7">Legal</p>
            <h1
              className="font-serif font-semibold text-text-primary leading-[0.92] tracking-[-0.038em] mb-8"
              style={{ fontSize: 'clamp(3rem,6vw,5rem)' }}
            >
              Terms of{' '}
              <em className="italic font-medium text-amber" style={{ fontStyle: 'italic' }}>
                Service.
              </em>
            </h1>
            <p className="font-sans font-light text-body-base text-text-secondary leading-[1.82] max-w-xl mx-auto">
              These terms govern the commercial relationship between you and Heritage Nexus Inc.
              Your Sovereignty Charter, a separate binding document, governs your archive as a legal asset.
            </p>
            <p className="font-sans text-[0.75rem] text-text-muted mt-6">
              Last updated: March 2026 &nbsp;·&nbsp; Governing law: {GOVERNING_STATE}
            </p>
          </div>
        </section>

        {/* ── SOVEREIGNTY CHARTER NOTICE ── */}
        <section className="relative bg-obsidian-deep px-8 md:px-16 lg:px-24 py-16 overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border-amber to-transparent" />
          <div className="max-w-5xl mx-auto">
            <div
              className="rounded-sm border border-border-amber p-8 md:p-10 relative overflow-hidden"
              style={{ background: 'linear-gradient(160deg,#221F14,#1D1B11)' }}
            >
              <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-amber/45 to-transparent" />
              <div className="ai-badge mb-5"><span className="ai-dot" />Separate Binding Instrument</div>
              <h2
                className="font-serif font-semibold text-text-primary leading-tight tracking-[-0.025em] mb-4"
                style={{ fontSize: 'clamp(1.5rem,2.5vw,2rem)' }}
              >
                The Sovereignty Charter
              </h2>
              <p className="font-sans font-light text-body-base text-text-secondary leading-[1.85]">
                Every Basalith archive is governed by a Sovereignty Charter, a separate legal instrument executed at The Founding.
                The Charter establishes your absolute ownership of the archive, the terms of its inheritance, the rights of your designated Custodian,
                and the conditions under which dissolution may occur. These Terms of Service govern the commercial subscription.
                The Sovereignty Charter governs the archive as a legal asset. Where they conflict, the Sovereignty Charter prevails.
              </p>
            </div>
          </div>
        </section>

        {/* ── SECTIONS ── */}
        {SECTIONS.map(({ num, title, body }, i) => (
          <section
            key={num}
            className={[
              'relative px-8 md:px-16 lg:px-24 py-24 overflow-hidden',
              i % 2 === 0 ? 'bg-obsidian' : 'bg-obsidian-deep',
            ].join(' ')}
            aria-label={title}
          >
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-16 items-start">

              <div className="lg:sticky lg:top-32">
                <p className="eyebrow mb-6">{`Section ${num}`}</p>
                <p
                  className="font-serif font-light text-amber/20 leading-none select-none"
                  style={{ fontSize: 'clamp(5rem,10vw,9rem)', letterSpacing: '-0.05em' }}
                  aria-hidden="true"
                >
                  {num}
                </p>
              </div>

              <div className="flex flex-col gap-0">
                <h2
                  className="font-serif font-semibold text-text-primary leading-[1.05] tracking-[-0.025em] mb-8"
                  style={{ fontSize: 'clamp(1.75rem,3vw,2.5rem)' }}
                >
                  {title}
                </h2>
                <div className="flex flex-col gap-5">
                  {body.map((para, j) => (
                    <p key={j} className="font-sans font-light text-body-base text-text-secondary leading-[1.88]">
                      {para}
                    </p>
                  ))}
                </div>
              </div>

            </div>
          </section>
        ))}

        {/* ── CLOSING ── */}
        <section
          className="relative bg-obsidian-deep px-8 md:px-16 py-24 text-center overflow-hidden"
          aria-label="Terms closing"
        >
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border-subtle to-transparent" />
          <div className="relative z-10 max-w-xl mx-auto">
            <p className="font-sans font-light text-body-base text-text-secondary leading-[1.82] mb-8">
              Questions about these terms should be directed to{' '}
              <a href="mailto:legacy@basalith.xyz" className="text-amber-dim hover:text-amber transition-colors duration-200">
                legacy@basalith.xyz
              </a>
              . Questions about your Sovereignty Charter should reference your archive number.
            </p>
            <div className="flex items-center justify-center gap-5 flex-wrap">
              <a href="/privacy-policy" className="btn-monolith-ghost">Privacy Policy</a>
              <a href="/data-ownership" className="btn-monolith-ghost">Data Ownership Charter</a>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
