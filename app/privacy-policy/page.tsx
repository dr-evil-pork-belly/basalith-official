import Nav    from '../components/Nav'
import Footer from '../components/Footer'

const SECTIONS = [
  {
    num:   '01',
    title: 'What We Collect',
    body: [
      'When you submit an archive application through our onboarding flow, we collect your full name, email address, phone number (optional), and your selected service tier.',
      'When you submit a message through our contact form, we collect your name, email address, the nature of your enquiry, and any message content you choose to provide.',
      'We do not collect payment card data directly. All payment processing is handled by Stripe, who operates under their own privacy and security frameworks.',
      'We do not use tracking pixels, third-party analytics scripts, or behavioural advertising tools on this site.',
    ],
  },
  {
    num:   '02',
    title: 'How It Is Stored',
    body: [
      'All data submitted through this site is stored in Supabase, a managed database platform operating on servers located in the United States. Data is encrypted at rest and in transit using industry-standard protocols.',
      'Archive and subscriber data held in connection with active service agreements is stored in accordance with the terms of your Sovereignty Charter, which governs retention, access, and portability independently of this policy.',
      'We do not store data on personal devices or unmanaged infrastructure.',
    ],
  },
  {
    num:   '03',
    title: 'Who Can Access It',
    body: [
      'Data submitted through this site is accessible only to Heritage Nexus Inc. staff and authorized contractors operating under confidentiality obligations.',
      'We do not sell, license, rent, or otherwise transfer your personal data to third parties for any commercial purpose.',
      'We do not share your data with AI model providers, data brokers, advertising networks, or research organisations.',
      'Law enforcement requests are handled in accordance with applicable law. We will notify affected individuals of such requests where legally permitted to do so.',
    ],
  },
  {
    num:   '04',
    title: 'Data Retention',
    body: [
      'Pre-signup enquiry data, including archive applications and contact form submissions, is retained for as long as is necessary to manage your enquiry and maintain a record of our correspondence.',
      'If your enquiry does not result in an active service agreement, we will delete your submission data within 24 months of your last interaction with us, or immediately upon a verified deletion request.',
      'Data associated with active Basalith archives is governed by your Sovereignty Charter and the terms of your service agreement, which take precedence over this policy in respect of archive content.',
    ],
  },
  {
    num:   '05',
    title: 'Requesting Deletion',
    body: [
      'You may request the deletion of any personal data we hold about you at any time by sending an email to privacy@basalith.xyz from the address associated with your submission.',
      'We will confirm receipt within 5 business days and complete the deletion within 30 days, unless we are legally required to retain the data for a longer period.',
      'Deletion of enquiry data does not affect active service agreements, which are governed by your Sovereignty Charter.',
    ],
  },
  {
    num:   '06',
    title: 'Cookies',
    body: [
      'This site does not use advertising cookies, tracking cookies, or third-party analytics cookies.',
      'We use only essential session cookies required for the operation of our onboarding flow. These temporarily preserve your tier selection and contact details across steps. This data is stored in your browser\'s localStorage and is cleared upon completion or abandonment of the flow.',
      'By using this site, you consent to this limited, functional use of browser storage.',
    ],
  },
]

export default function PrivacyPolicyPage() {
  return (
    <>
      <Nav />
      <main>

        {/* ── HERO ── */}
        <section
          className="relative min-h-[55vh] flex flex-col items-center justify-center text-center px-8 md:px-16 pt-40 pb-24 overflow-hidden bg-obsidian-void"
          aria-label="Privacy policy hero"
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
              Privacy{' '}
              <em className="italic font-medium text-amber" style={{ fontStyle: 'italic' }}>
                Policy.
              </em>
            </h1>
            <p className="font-sans font-light text-body-base text-text-secondary leading-[1.82] max-w-xl mx-auto">
              Heritage Nexus Inc. operates Basalith. This policy explains what personal data we collect,
              how it is held, and your rights in respect of it.
            </p>
            <p className="font-sans text-[0.75rem] text-text-muted mt-6">
              Last updated: March 2026
            </p>
          </div>
        </section>

        {/* ── SECTIONS ── */}
        {SECTIONS.map(({ num, title, body }, i) => (
          <section
            key={num}
            className={[
              'relative px-8 md:px-16 lg:px-24 py-24 overflow-hidden',
              i % 2 === 0 ? 'bg-obsidian-deep' : 'bg-obsidian',
            ].join(' ')}
            aria-label={title}
          >
            {i === 0 && (
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border-amber to-transparent" />
            )}

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
          aria-label="Privacy policy closing"
        >
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border-subtle to-transparent" />
          <div className="relative z-10 max-w-xl mx-auto">
            <p className="font-sans font-light text-body-base text-text-secondary leading-[1.82] mb-8">
              Questions about this policy or requests relating to your data should be directed to{' '}
              <a href="mailto:privacy@basalith.xyz" className="text-amber-dim hover:text-amber transition-colors duration-200">
                privacy@basalith.xyz
              </a>
              . We take every request seriously and respond personally.
            </p>
            <div className="flex items-center justify-center gap-5 flex-wrap">
              <a href="/terms" className="btn-monolith-ghost">Terms of Service</a>
              <a href="/data-ownership" className="btn-monolith-ghost">Data Ownership Charter</a>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
