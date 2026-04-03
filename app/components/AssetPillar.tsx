const STEPS = [
  {
    num: '01',
    title: 'Name It In Your Will',
    desc: 'Your attorney designates your Golden Dataset as a formal estate asset using our standardized bequest language. Compatible with US and international frameworks.',
  },
  {
    num: '02',
    title: 'Appoint a Custodian',
    desc: 'Designate a trusted individual or institution as archive Custodian, analogous to a financial executor. They govern access and contribute on your behalf.',
  },
  {
    num: '03',
    title: 'Hold It In Trust',
    desc: 'Your Family Trust becomes the legal holder of the archive and subscription, ensuring generational continuity with no single point of failure.',
  },
  {
    num: '04',
    title: 'Set the Terms of Continuity',
    desc: 'You specify who may interact with your Digital Clone, under what conditions, and for how long. Determined by you, during your lifetime. Legally binding.',
  },
]

const FIELDS = [
  { label: 'Archive Subject',  value: 'Robert James Whitfield',               style: 'primary' as const },
  { label: 'Legal Custodian',  value: 'Margaret A. Whitfield (Spouse)',        style: 'default' as const },
  { label: 'Trust Instrument', value: 'Whitfield Family Revocable Trust, 2019',style: 'default' as const },
  { label: 'Beneficiaries',    value: 'Sarah E. Whitfield · Thomas R. Whitfield',style: 'default' as const },
  { label: 'Archive Status',   value: 'Active · Generation I',                style: 'amber'   as const },
  { label: 'Continuity Term',  value: '200 years from date of creation',       style: 'default' as const },
]

function LegalDoc() {
  return (
    <div className="relative max-w-[400px] w-full">
      {/* Shadow doc */}
      <div
        className="absolute top-3 left-3 -right-3 -bottom-3 rounded-sm border border-amber/[0.07]"
        style={{ background: 'rgba(255,179,71,0.03)' }}
      />
      {/* Document */}
      <div
        className="relative z-10 rounded-sm border border-amber/[0.15] p-9"
        style={{
          background: 'linear-gradient(168deg,#252420,#1F1D18)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.75)',
        }}
      >
        {/* Top edge gloss */}
        <div className="absolute top-0 left-[14%] right-[14%] h-px bg-gradient-to-r from-transparent via-amber/38 to-transparent" />

        <div className="flex justify-between items-start mb-6">
          <span className="eyebrow !text-[0.6rem]">Basalith Legacy Instrument</span>
          <span className="font-sans text-[0.6rem] text-text-muted tabular-nums">#BSL-2026-00419</span>
        </div>

        <p className="font-serif text-[1.8rem] font-semibold text-text-primary leading-[1.12] tracking-[-0.022em] mb-1.5">
          Whitfield<br />Family Archive
        </p>
        <p className="font-sans text-[0.72rem] text-text-muted mb-7">
          Established March 2026 · Updated Annually
        </p>

        <div className="divider-amber mb-6" />

        <div className="flex flex-col gap-4">
          {FIELDS.map(({ label, value, style }) => (
            <div key={label}>
              <span className="font-sans text-[0.58rem] font-bold tracking-[0.18em] uppercase text-text-muted block mb-0.5">
                {label}
              </span>
              <span className={[
                'font-sans text-[0.85rem]',
                style === 'primary' ? 'font-medium text-text-primary'   :
                style === 'amber'   ? 'font-medium text-amber'           :
                                      'font-regular text-text-secondary',
              ].join(' ')}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Seal */}
        <div className="flex justify-center mt-7 pt-5 border-t border-border-subtle">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full border border-amber/30 flex items-center justify-center animate-spark">
              <div
                className="w-6 h-6 rounded-full border border-amber/50"
                style={{ background: 'radial-gradient(rgba(255,179,71,0.14),transparent)' }}
              />
            </div>
            <span className="font-sans text-[0.55rem] font-bold tracking-[0.18em] uppercase text-text-muted">
              Basalith Verified Asset
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AssetPillar() {
  return (
    <section
      id="asset"
      aria-label="The Asset pillar"
      className="relative bg-obsidian px-8 md:px-16 lg:px-24 py-36 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center overflow-hidden"
    >
      {/* Ambient left glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 55% 80% at 0% 50%,rgba(255,179,71,0.045) 0%,transparent 60%)' }}
        aria-hidden="true"
      />

      {/* LEFT */}
      <div className="reveal">
        <p className="eyebrow mb-5">The Asset Pillar</p>
        <h2
          className="font-serif font-semibold text-text-primary leading-[0.98] tracking-[-0.03em] mb-6"
          style={{ fontSize: 'clamp(2.25rem,4.5vw,3.75rem)' }}
        >
          Your Memory.<br />
          A{' '}
          <em className="italic font-medium text-amber" style={{ fontStyle: 'italic' }}>Legal</em>
          <br />Inheritance.
        </h2>
        <p className="font-sans font-light text-body-base text-text-secondary leading-[1.82] mb-4">
          A Basalith Golden Dataset is not a subscription service that evaporates when
          you stop paying. It is a structured digital asset — classified, documented,
          and governed from the moment of creation.
        </p>
        <p className="font-sans font-light text-body-base text-text-secondary leading-[1.82] mb-4">
          We designed our architecture to be compatible with existing estate and trust
          frameworks. Your archive is named in your Will, held in your Family Trust,
          and passes to your heirs with the same legal formality as a property deed.
        </p>
        <p className="font-sans font-light text-body-base text-text-secondary leading-[1.82]">
          The people who built this company have children.
          We built this for them first.
        </p>

        {/* Generational intelligence copy */}
        <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid rgba(196,162,74,0.2)' }}>
          <p
            className="font-serif"
            style={{
              fontWeight:    700,
              fontSize:      'clamp(1.4rem,3vw,2rem)',
              color:         '#E8E4DC',
              lineHeight:    1.4,
              marginBottom:  '2rem',
            }}
          >
            Every generation inherits the money.<br />
            None of them inherit the mind that made it.
          </p>
          <p
            className="font-serif font-light"
            style={{
              fontSize:      '1.05rem',
              color:         '#9DA3A8',
              lineHeight:    1.9,
              marginBottom:  '1.25rem',
            }}
          >
            The Basalith archive changes that. Every deposit you make, every story
            your family labels, every decision you record. The system learns how
            you think. The entity it builds is not a memorial. It is a thinking
            partner trained on your actual judgment across your actual life.
          </p>
          <p
            className="font-serif font-light"
            style={{
              fontSize:      '1.05rem',
              color:         '#9DA3A8',
              lineHeight:    1.9,
              marginBottom:  '1.25rem',
            }}
          >
            Your grandchildren will be able to ask it questions. It will answer
            from forty years of documented wisdom.
          </p>
          <p
            className="font-serif"
            style={{
              fontStyle:     'italic',
              fontSize:      '1.1rem',
              color:         '#9DA3A8',
              lineHeight:    1.9,
            }}
          >
            Not what you looked like.<br />
            Not what you did.<br />
            How you thought.
          </p>
        </div>

        {/* Steps */}
        <div className="mt-10 flex flex-col">
          {STEPS.map(({ num, title, desc }, i) => (
            <div
              key={num}
              className={`reveal reveal-delay-${i + 1} flex gap-5 items-start py-5 border-b border-border-subtle last:border-b-0`}
            >
              <span className="font-serif text-[2.25rem] font-light text-amber/22 leading-none flex-shrink-0 w-9 text-right">
                {num}
              </span>
              <div>
                <p className="font-sans text-[0.78rem] font-bold tracking-[0.1em] uppercase text-text-primary mb-1">
                  {title}
                </p>
                <p className="font-sans font-light text-body-sm text-text-secondary leading-[1.72]">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT */}
      <div className="hidden lg:flex items-center justify-center reveal reveal-delay-2">
        <LegalDoc />
      </div>
    </section>
  )
}