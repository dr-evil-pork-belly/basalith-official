export default function CtaSection() {
  return (
    <section
      id="cta"
      aria-label="Call to action"
      className="relative bg-obsidian px-8 md:px-16 py-36 text-center overflow-hidden"
    >
      {/* Centred amber radiance */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 900, height: 420,
          top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          background: 'radial-gradient(ellipse,rgba(255,179,71,0.08) 0%,transparent 65%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-2xl mx-auto">
        <p className="eyebrow mb-6 reveal">Begin Today</p>

        <h2
          className="font-serif font-semibold text-text-primary leading-[0.9] tracking-[-0.04em] mb-6 reveal reveal-delay-1"
          style={{ fontSize: 'clamp(2.75rem,6vw,5.5rem)' }}
        >
          The Only Regret<br />
          Is Starting{' '}
          <em className="italic font-medium text-amber" style={{ fontStyle: 'italic' }}>Later.</em>
        </h2>

        <p className="font-sans font-light text-body-base text-text-secondary leading-[1.82] mb-12 reveal reveal-delay-2">
          Every day you wait is a day your family has not yet contributed what they know.
          The archive you build in year one is the foundation everything else rests on.
        </p>

        <div className="flex items-center justify-center gap-5 flex-wrap reveal reveal-delay-3">
          <a href="#" className="btn-monolith-amber group">
            Schedule a Private Consultation
            <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </a>
        </div>

        <p className="font-sans text-[0.75rem] text-text-muted tracking-[0.04em] mt-10 reveal reveal-delay-4">
          Consultations are private and carry no obligation.{' '}
          <a
            href="mailto:legacy@basalith.com"
            className="text-amber-dim hover:text-amber transition-colors duration-200"
          >
            legacy@basalith.com
          </a>
        </p>
      </div>
    </section>
  )
}