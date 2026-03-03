import Nav    from '../components/Nav'
import Footer from '../components/Footer'

const VALUES = [
  {
    num:   '01',
    title: 'Memory Is Wealth',
    body:  'Every civilisation has sought to preserve its most valuable people. We are the first generation with the tools to do it properly — with legal standing, emotional accuracy, and permanence measured in centuries, not server uptime.',
  },
  {
    num:   '02',
    title: 'Family Over Algorithm',
    body:  'The people who love you are the only accurate interpreters of your life. No amount of compute power replicates what your family simply knows. We built our entire model around this truth — and refused to compromise it.',
  },
  {
    num:   '03',
    title: 'Permanence By Design',
    body:  'We do not build for engagement metrics. We do not optimise for retention. Every architectural decision — legal, technical, organisational — is made with a single question: will this still work in a hundred years?',
  },
  {
    num:   '04',
    title: 'Ownership Without Compromise',
    body:  'Your data is yours. Not a licensing arrangement. Not subject to a terms-of-service revision. Structured as a legal asset from day one, portable on demand, and transferable to your heirs on your terms alone.',
  },
]

const VISION_ITEMS = [
  {
    horizon: 'Near Term',
    title:   'The Golden Standard',
    body:    'Establish Basalith as the definitive infrastructure for personal legacy preservation — the institution families turn to when they decide to take their memory as seriously as their estate.',
  },
  {
    horizon: 'Medium Term',
    title:   'The Legal Framework',
    body:    'Drive the recognition of Golden Datasets as formal estate assets across major legal jurisdictions. Build the case law, the precedent, and the institutional partnerships that make digital legacy inheritance as routine as a property transfer.',
  },
  {
    horizon: 'Long Term',
    title:   'The Living Archive',
    body:    'A world in which every family maintains a governed, evolving record of who they were — accessible to future generations not as static photographs or faded letters, but as an intelligent presence that continues to think, reason, and respond.',
  },
]

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main>

        {/* ── HERO ── */}
        <section
          className="relative min-h-[75vh] flex flex-col items-center justify-center text-center px-8 md:px-16 pt-40 pb-28 overflow-hidden bg-obsidian-void"
          aria-label="About hero"
        >
          {/* Grid */}
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
          {/* Amber radiance */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 55% 55% at 50% 60%,rgba(255,179,71,0.07) 0%,transparent 65%)' }}
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-4xl mx-auto">
            <p className="eyebrow mb-7">Why We Exist</p>
            <h1
              className="font-serif font-semibold text-text-primary leading-[0.9] tracking-[-0.04em] mb-10"
              style={{ fontSize: 'clamp(3rem,7.5vw,6.75rem)' }}
            >
              The Most Valuable Thing
              <br />
              You Own Is Not
              <br />
              <em className="italic font-medium text-amber" style={{ fontStyle: 'italic' }}>
                On Your Balance Sheet.
              </em>
            </h1>
            <p className="font-sans font-light text-body-lg text-text-secondary leading-[1.85] max-w-2xl mx-auto">
              It is the particular way you think. The reasoning behind your decisions.
              The things only your family knows about you — and what happens to all of
              that when you are no longer here to explain it.
            </p>
          </div>
        </section>

        {/* ── THE PROBLEM ── */}
        <section
          className="relative bg-obsidian-deep px-8 md:px-16 lg:px-24 py-36 overflow-hidden"
          aria-label="The problem"
        >
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border-amber to-transparent" />

          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-20 items-start">

            {/* Left — label + large number */}
            <div className="lg:sticky lg:top-32">
              <p className="eyebrow mb-6">The Problem</p>
              <p
                className="font-serif font-light text-amber/20 leading-none select-none"
                style={{ fontSize: 'clamp(6rem,14vw,12rem)', letterSpacing: '-0.05em' }}
                aria-hidden="true"
              >
                01
              </p>
            </div>

            {/* Right — copy */}
            <div className="flex flex-col gap-7">
              <h2
                className="font-serif font-semibold text-text-primary leading-[1.0] tracking-[-0.03em]"
                style={{ fontSize: 'clamp(2rem,4vw,3.25rem)' }}
              >
                We Have Never Had a Serious Infrastructure for Human Memory.
              </h2>
              <p className="font-sans font-light text-body-base text-text-secondary leading-[1.88]">
                Civilisations have always tried to preserve their most significant people.
                Portraits. Journals. Stone monuments. The instinct is ancient. But the
                execution has always been passive — a record of what someone looked like,
                not how they thought. A collection of moments, not a continuity of mind.
              </p>
              <p className="font-sans font-light text-body-base text-text-secondary leading-[1.88]">
                The technology industry promised to solve this. It did not. What it built
                instead was an infrastructure for extracting value from personal data —
                labeling it with anonymous contractors, feeding it to models that serve
                advertisers, and storing it on servers that will outlive their business
                model by, at best, a decade.
              </p>
              <p className="font-sans font-light text-body-base text-text-secondary leading-[1.88]">
                The result is a generation of people who have produced more personal data
                than any humans in history — and who have less control over it, less
                understanding of what it means, and no mechanism to pass it to the people
                who will one day want it most.
              </p>

              {/* Pull quote */}
              <div className="border-l-2 border-amber pl-6 mt-4">
                <p className="font-serif text-[1.3rem] italic text-text-secondary leading-[1.6] tracking-[-0.01em]">
                  "The problem is not that we lack the data.
                  The problem is that nobody built the institution."
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── THE MISSION ── */}
        <section
          className="relative bg-obsidian px-8 md:px-16 lg:px-24 py-36 overflow-hidden"
          aria-label="Mission"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 50%,rgba(255,179,71,0.045) 0%,transparent 65%)' }}
            aria-hidden="true"
          />

          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-20 items-start">

            <div className="lg:sticky lg:top-32">
              <p className="eyebrow mb-6">Our Mission</p>
              <p
                className="font-serif font-light text-amber/20 leading-none select-none"
                style={{ fontSize: 'clamp(6rem,14vw,12rem)', letterSpacing: '-0.05em' }}
                aria-hidden="true"
              >
                02
              </p>
            </div>

            <div className="flex flex-col gap-7">
              <h2
                className="font-serif font-semibold text-text-primary leading-[1.0] tracking-[-0.03em]"
                style={{ fontSize: 'clamp(2rem,4vw,3.25rem)' }}
              >
                To Make the Preservation of a Life as Serious as the Preservation of an Estate.
              </h2>
              <p className="font-sans font-light text-body-base text-text-secondary leading-[1.88]">
                Basalith exists to build the institution that was never built. Not a
                platform. Not an app. An institution — with the legal standing, the
                technical architecture, and the governance model that the permanence
                of human memory actually requires.
              </p>
              <p className="font-sans font-light text-body-base text-text-secondary leading-[1.88]">
                We do this by treating personal data the way serious institutions treat
                serious assets. With provenance. With chain of custody. With named
                beneficiaries, legal instruments, and a fiduciary obligation to the
                person whose life it represents — not to the shareholders of a
                platform that happens to store it.
              </p>
              <p className="font-sans font-light text-body-base text-text-secondary leading-[1.88]">
                The Golden Dataset is our name for the result: the highest-quality
                labeled record of a human life ever assembled. Built by family.
                Governed by law. Powered by whatever AI exists in the year
                your grandchildren decide they want to understand who you were.
              </p>

              {/* Values */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                {VALUES.map(({ num, title, body }) => (
                  <div
                    key={num}
                    className="group relative rounded-sm border border-border-subtle bg-white/[0.018] p-6 overflow-hidden transition-colors duration-300 hover:border-border-amber hover:bg-amber/[0.022]"
                  >
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-transparent to-transparent transition-all duration-300 group-hover:via-amber/38" />
                    <p className="font-serif text-[2rem] font-light text-amber/14 leading-none mb-2">{num}</p>
                    <p className="font-sans text-[0.75rem] font-bold tracking-[0.1em] uppercase text-text-primary mb-2">{title}</p>
                    <p className="font-sans font-light text-[0.82rem] text-text-secondary leading-[1.72]">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── THE VISION ── */}
        <section
          className="relative bg-obsidian-deep px-8 md:px-16 lg:px-24 py-36 overflow-hidden"
          aria-label="Long-term vision"
        >
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border-subtle to-transparent" />

          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-20 items-start">

            <div className="lg:sticky lg:top-32">
              <p className="eyebrow mb-6">The Vision</p>
              <p
                className="font-serif font-light text-amber/20 leading-none select-none"
                style={{ fontSize: 'clamp(6rem,14vw,12rem)', letterSpacing: '-0.05em' }}
                aria-hidden="true"
              >
                03
              </p>
            </div>

            <div className="flex flex-col gap-0">
              {VISION_ITEMS.map(({ horizon, title, body }, i) => (
                <div
                  key={i}
                  className="py-10 border-b border-border-subtle last:border-b-0"
                >
                  <p className="eyebrow !text-[0.6rem] mb-3">{horizon}</p>
                  <h3
                    className="font-serif font-semibold text-text-primary leading-[1.1] tracking-[-0.02em] mb-4"
                    style={{ fontSize: 'clamp(1.5rem,3vw,2.25rem)' }}
                  >
                    {title}
                  </h3>
                  <p className="font-sans font-light text-body-base text-text-secondary leading-[1.88]">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CLOSING ── */}
        <section
          className="relative bg-obsidian px-8 md:px-16 py-40 text-center overflow-hidden"
          aria-label="Closing statement"
        >
          <div
            className="absolute pointer-events-none"
            style={{
              width: 1000, height: 500,
              top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              background: 'radial-gradient(ellipse,rgba(255,179,71,0.07) 0%,transparent 60%)',
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-3xl mx-auto">
            <p
              className="font-serif font-medium text-text-secondary leading-[1.5] tracking-[-0.02em] mb-12"
              style={{ fontSize: 'clamp(1.5rem,3.5vw,2.5rem)' }}
            >
              "Every generation has left something behind.
              We are the first with the tools to leave something
              that thinks back."
            </p>

            <div className="flex items-center justify-center gap-4 mb-14">
              <div className="h-px w-16 bg-amber/25" />
              <span className="ai-dot" />
              <div className="h-px w-16 bg-amber/25" />
            </div>

            <p className="font-sans font-light text-body-base text-text-secondary leading-[1.82] mb-12 max-w-xl mx-auto">
              If you are ready to take your legacy as seriously as your estate,
              we are ready to help you build it.
            </p>

            <div className="flex items-center justify-center gap-5 flex-wrap">
              <a href="/pricing" className="btn-monolith-amber group">
                View Stewardship Plans
                <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              </a>
              <a href="/contact" className="btn-monolith-ghost">
                Schedule a Consultation
              </a>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}