function EcosystemBridge() {
  return (
    <div className="bg-obsidian border-t border-border-subtle px-8 md:px-16 py-14 text-center">
      <p className="font-serif italic text-[1.15rem] font-light text-text-secondary leading-[1.6] mb-8">
        Already building your archive?
      </p>
      <div className="flex items-center justify-center gap-8 flex-wrap">
        <a
          href="https://basalith.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="font-sans text-[0.7rem] tracking-[0.12em] text-text-muted no-underline transition-colors duration-200 hover:text-text-secondary"
          style={{ fontFamily: "'Space Mono', 'DM Mono', monospace" }}
        >
          See your Entity → basalith.ai
        </a>
        <span className="text-border-subtle select-none" aria-hidden="true">·</span>
        <a
          href="https://basalith.life"
          target="_blank"
          rel="noopener noreferrer"
          className="font-sans text-[0.7rem] tracking-[0.12em] text-text-muted no-underline transition-colors duration-200 hover:text-text-secondary"
          style={{ fontFamily: "'Space Mono', 'DM Mono', monospace" }}
        >
          Claim your Deed → basalith.life
        </a>
      </div>
    </div>
  )
}

export default function CtaSection() {
  return (
    <>
      <section id="cta" aria-label="Call to action" className="relative bg-obsidian px-8 md:px-16 py-36 text-center overflow-hidden">
        <div className="absolute pointer-events-none" style={{ width: 900, height: 420, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'radial-gradient(ellipse,rgba(255,179,71,0.08) 0%,transparent 65%)' }} aria-hidden="true" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <p className="eyebrow mb-6">By Invitation of Intent</p>
          <h2 className="font-serif font-semibold text-text-primary leading-[0.9] tracking-[-0.04em] mb-6" style={{ fontSize: 'clamp(2.75rem,6vw,5.5rem)' }}>Basalith Is Not <em className="italic font-medium text-amber" style={{ fontStyle: 'italic' }}>For Everyone.</em></h2>
          <p className="font-sans font-light text-body-base text-text-secondary leading-[1.82] mb-12">It is for the rare few who understand that memory is an asset — and that leaving it unarchived is a choice with consequences their family will live with long after they are gone.</p>
          <div className="flex items-center justify-center gap-5 flex-wrap">
            <a href="/contact" className="btn-monolith-amber group">Apply for Access <span className="transition-transform duration-200 group-hover:translate-x-1">→</span></a>
          </div>
          <p className="font-sans text-[0.75rem] text-text-muted tracking-[0.04em] mt-10">Archives are accepted on a rolling basis.&nbsp;&middot;&nbsp;<a href="mailto:legacy@basalith.xyz" className="text-amber-dim hover:text-amber transition-colors duration-200">legacy@basalith.xyz</a></p>
        </div>
      </section>
      <EcosystemBridge />
    </>
  )
}