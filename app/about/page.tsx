import Nav    from '../components/Nav'
import Footer from '../components/Footer'

// ── Silhouette SVG placeholders ───────────────────────────────────────────
function SilhouetteAdult() {
  return (
    <svg viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <circle cx="100" cy="72" r="40" fill="rgba(255,179,71,0.08)" />
      <ellipse cx="100" cy="200" rx="68" ry="60" fill="rgba(255,179,71,0.06)" />
      <circle cx="100" cy="72" r="34" fill="rgba(255,179,71,0.10)" />
      <ellipse cx="100" cy="196" rx="58" ry="52" fill="rgba(255,179,71,0.08)" />
    </svg>
  )
}

function SilhouetteChild() {
  return (
    <svg viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <circle cx="100" cy="78" r="34" fill="rgba(255,179,71,0.08)" />
      <ellipse cx="100" cy="196" rx="56" ry="50" fill="rgba(255,179,71,0.06)" />
      <circle cx="100" cy="78" r="28" fill="rgba(255,179,71,0.10)" />
      <ellipse cx="100" cy="192" rx="48" ry="44" fill="rgba(255,179,71,0.08)" />
    </svg>
  )
}

// ── Values ────────────────────────────────────────────────────────────────
const VALUES = [
  {
    num: '01',
    title: 'Memory Is Wealth',
    body: 'Every civilisation has sought to preserve its most valuable people. We are the first to build the infrastructure to do it properly — with legal standing, emotional accuracy, and generational permanence.',
  },
  {
    num: '02',
    title: 'Family Over Algorithm',
    body: 'The people who love you are the most accurate interpreters of your life. No amount of compute power replicates what your family simply knows. We built our entire model around this truth.',
  },
  {
    num: '03',
    title: 'Permanence By Design',
    body: 'We do not build for engagement metrics or monthly active users. We build for centuries. Every architectural decision — legal, technical, organisational — is made with that timeframe in mind.',
  },
  {
    num: '04',
    title: 'Ownership Without Compromise',
    body: 'Your data is yours. Not a licensing arrangement. Not a terms-of-service clause. Yours — structured as a legal asset from day one, portable on demand, and transferable to your heirs on your terms.',
  },
]

// ── Page ──────────────────────────────────────────────────────────────────
export default function AboutPage() {
  return (
    <>
      <Nav />

      <main>

        {/* ── HERO ── */}
        <section
          className="relative min-h-[70vh] flex flex-col items-center justify-center text-center px-8 md:px-16 pt-40 pb-24 overflow-hidden bg-obsidian-void"
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
            style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 60%,rgba(255,179,71,0.07) 0%,transparent 65%)' }}
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-3xl mx-auto">
            <p className="eyebrow mb-6">Our Story</p>
            <h1
              className="font-serif font-semibold text-text-primary leading-[0.92] tracking-[-0.038em] mb-8"
              style={{ fontSize: 'clamp(3rem,7vw,6rem)' }}
            >
              Built By a Father.<br />
              <em className="italic font-medium text-amber" style={{ fontStyle: 'italic' }}>
                Coded By His Son.
              </em>
            </h1>
            <p className="font-sans font-light text-body-lg text-text-secondary leading-[1.82] max-w-2xl mx-auto">
              Basalith began with a simple question: if the people we love are the only ones
              who truly understand our lives, why are we letting strangers label our memories?
            </p>
          </div>
        </section>

        {/* ── ORIGIN STORY ── */}
        <section
          className="relative bg-obsidian-deep px-8 md:px-16 lg:px-24 py-36 overflow-hidden"
          aria-label="Origin story"
        >
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border-amber to-transparent" />

          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">

            {/* Copy */}
            <div>
              <p className="eyebrow mb-6">The Origin</p>
              <h2
                className="font-serif font-semibold text-text-primary leading-[1.0] tracking-[-0.03em] mb-8"
                style={{ fontSize: 'clamp(2rem,4vw,3.5rem)' }}
              >
                The First Father &amp; Son to Bootstrap
                {' '}<em className="italic font-medium text-amber" style={{ fontStyle: 'italic' }}>a Unicorn.</em>
              </h2>

              <div className="flex flex-col gap-5">
                <p className="font-sans font-light text-body-base text-text-secondary leading-[1.85]">
                  David started Basalith the way most important companies start — not with a pitch deck,
                  but with a problem he couldn't stop thinking about. As a father, he understood that the
                  most irreplaceable thing he could leave his son wasn't money. It was memory. Context.
                  The particular quality of his thinking, his values, his way of seeing the world.
                </p>
                <p className="font-sans font-light text-body-base text-text-secondary leading-[1.85]">
                  Blake, his son, was ten years old when he wrote the first line of Basalith code.
                  Not as a curiosity project. As a mission. He understood, with the clarity that children
                  sometimes have about things adults complicate, that his father was building something
                  that mattered — and that he wanted to be the one who built it with him.
                </p>
                <p className="font-sans font-light text-body-base text-text-secondary leading-[1.85]">
                  There has never been a father and son who bootstrapped a company of this ambition together.
                  We think that's exactly the point. Basalith is about what families can build when they
                  take their legacy seriously. We are proof of our own product.
                </p>
              </div>
            </div>

            {/* Team cards */}
            <div className="flex flex-col gap-6">

              {/* David */}
              <div
                className="rounded-sm border border-border-amber p-8 relative overflow-hidden"
                style={{ background: 'linear-gradient(160deg,#221F14,#1D1B11)' }}
              >
                <div className="absolute top-0 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-amber/40 to-transparent" />
                <div className="flex items-center gap-6 mb-5">
                  <div
                    className="w-20 h-20 rounded-sm flex-shrink-0 overflow-hidden border border-amber/20"
                    style={{ background: 'linear-gradient(145deg,#2A2820,#1E1C14)' }}
                  >
                    <SilhouetteAdult />
                  </div>
                  <div>
                    <p className="font-serif text-[1.5rem] font-semibold text-text-primary leading-tight mb-1">
                      David
                    </p>
                    <p className="eyebrow !text-[0.6rem]">Founder &amp; CEO</p>
                  </div>
                </div>
                <p className="font-sans font-light text-body-sm text-text-secondary leading-[1.75]">
                  David built Basalith because he wanted his son to know him — not just remember him.
                  His background spans estate law, data architecture, and fifteen years building
                  companies that take the long view. Basalith is the first one he built for centuries.
                </p>
              </div>

              {/* Blake */}
              <div
                className="rounded-sm border border-border-subtle p-8 relative overflow-hidden"
                style={{ background: 'linear-gradient(160deg,#1D1D20,#17171A)' }}
              >
                <div className="flex items-center gap-6 mb-5">
                  <div
                    className="w-20 h-20 rounded-sm flex-shrink-0 overflow-hidden border border-white/[0.08]"
                    style={{ background: 'linear-gradient(145deg,#222226,#1A1A1D)' }}
                  >
                    <SilhouetteChild />
                  </div>
                  <div>
                    <p className="font-serif text-[1.5rem] font-semibold text-text-primary leading-tight mb-1">
                      Blake
                    </p>
                    <p className="eyebrow !text-[0.6rem]">Lead Developer</p>
                  </div>
                </div>
                <p className="font-sans font-light text-body-sm text-text-secondary leading-[1.75]">
                  Blake is ten years old and the lead developer of Basalith. He wrote his first
                  line of production code before most of his classmates had read-only internet access.
                  He is building the technology that will one day preserve his father's voice,
                  his father's reasoning, his father's legacy — for Blake's own children.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="ai-dot" />
                  <span className="font-sans text-[0.65rem] font-semibold tracking-[0.14em] uppercase text-amber-dim">
                    Age 10 · Lead Developer
                  </span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── MISSION STATEMENT ── */}
        <section
          className="relative bg-obsidian px-8 md:px-16 lg:px-24 py-36 overflow-hidden"
          aria-label="Mission"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 55% 60% at 50% 50%,rgba(255,179,71,0.045) 0%,transparent 65%)' }}
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-3xl mx-auto text-center mb-24">
            <p className="eyebrow mb-6">Our Mission</p>
            <h2
              className="font-serif font-semibold text-text-primary leading-[0.95] tracking-[-0.035em] mb-8"
              style={{ fontSize: 'clamp(2.25rem,5vw,4.25rem)' }}
            >
              To make the preservation of a human life as serious as the
              {' '}<em className="italic font-medium text-amber" style={{ fontStyle: 'italic' }}>preservation of their estate.</em>
            </h2>
            <p className="font-sans font-light text-body-base text-text-secondary leading-[1.85]">
              Every generation has left something behind. Journals. Portraits. Letters.
              Property. We are the first generation with the tools to leave something more:
              a living, evolving, legally governed record of a mind. Basalith exists to make
              that a right, not a privilege — and to build the infrastructure that makes it permanent.
            </p>
          </div>

          {/* Values grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl mx-auto">
            {VALUES.map(({ num, title, body }) => (
              <div
                key={num}
                className="group relative rounded-sm border border-border-subtle bg-white/[0.018] p-8 overflow-hidden transition-colors duration-300 hover:border-border-amber hover:bg-amber/[0.022]"
              >
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-transparent to-transparent transition-all duration-300 group-hover:via-amber/38" />
                <p className="font-serif text-[2.5rem] font-light text-amber/14 leading-none mb-3">{num}</p>
                <p className="font-sans text-[0.78rem] font-bold tracking-[0.1em] uppercase text-text-primary mb-3">{title}</p>
                <p className="font-sans font-light text-body-sm text-text-secondary leading-[1.75]">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CLOSING STATEMENT ── */}
        <section
          className="relative bg-obsidian-deep px-8 md:px-16 py-36 text-center overflow-hidden"
          aria-label="Closing"
        >
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border-amber to-transparent" />

          <div className="max-w-2xl mx-auto">
            <p className="font-serif text-[1.75rem] md:text-[2.25rem] font-medium italic text-text-secondary leading-[1.45] tracking-[-0.02em] mb-10">
              "We are not building a product.<br />
              We are building proof that a family<br />
              can take their legacy seriously —<br />
              and that the technology now exists<br />
              to honour that intention."
            </p>
            <div className="flex items-center justify-center gap-3 mb-10">
              <div className="h-px w-12 bg-amber/30" />
              <span className="font-sans text-[0.72rem] font-semibold tracking-[0.16em] uppercase text-amber-dim">
                David &amp; Blake — Basalith
              </span>
              <div className="h-px w-12 bg-amber/30" />
            </div>

            <a href="#cta" className="btn-monolith-amber group">
              Begin Your Archive
              <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
            </a>
          </div>
        </section>

      </main>

      <Footer />
    </>
  )
}