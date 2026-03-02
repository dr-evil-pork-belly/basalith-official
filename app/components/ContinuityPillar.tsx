const PHASES = [
  {
    phase:  'Phase One',
    title:  'Archive\nCreation',
    desc:   'You and your family begin contributing. Photographs, voice, journals, and written memory are uploaded and labeled with emotional context.',
    year:   'Year 0–2',
    active: false,
  },
  {
    phase:  'Phase Two',
    title:  'Essence\nMapping',
    desc:   'Your Golden Dataset reaches sufficient depth. The first model is trained. Your Digital Clone becomes queryable — by you, for you, during your lifetime.',
    year:   'Year 2–5',
    active: true,
  },
  {
    phase:  'Phase Three',
    title:  'Trust\nTransition',
    desc:   'Governance passes to your Custodian. The Clone continues to evolve as family members add testimony. Your perspective remains accessible.',
    year:   'Perpetual',
    active: false,
  },
  {
    phase:  'Phase Four',
    title:  'Generational\nEvolution',
    desc:   'Future generations inherit the archive and the Clone. New contributors deepen the dataset. The intelligence sharpens. The legacy lives.',
    year:   'Centuries',
    active: false,
  },
]

const CARDS = [
  {
    num: '01',
    title: 'Dataset Depth',
    desc: 'As more contributors annotate and more data is added, the model\'s training material becomes richer. A Clone trained on five years of Basalith data is more nuanced than one trained on one — because the input improves, not just the AI.',
  },
  {
    num: '02',
    title: 'Family Curation',
    desc: 'Your family can interact with the Clone and flag responses that don\'t feel accurate. These flags refine the model. Your family becomes the ongoing quality assurance team for your representation — for as long as they choose.',
  },
  {
    num: '03',
    title: 'Model Agnosticism',
    desc: 'Your Golden Dataset is not locked to any AI model. As the field advances, your archive powers whatever AI exists in 2050, 2075, or 2100. You are building the source material. The tools will keep improving.',
  },
]

export default function ContinuityPillar() {
  return (
    <section
      id="continuity"
      aria-label="Continuity pillar"
      className="relative bg-obsidian-deep px-8 md:px-16 lg:px-24 py-36 overflow-hidden"
    >
      {/* Bottom radiance */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 65% 50% at 50% 100%,rgba(255,179,71,0.055) 0%,transparent 60%)' }}
        aria-hidden="true"
      />

      {/* Header */}
      <div className="text-center max-w-[760px] mx-auto mb-24 reveal">
        <p className="eyebrow mb-5">The Continuity Pillar</p>
        <h2
          className="font-serif font-semibold text-text-primary leading-[0.97] tracking-[-0.032em] mb-5"
          style={{ fontSize: 'clamp(2.25rem,5vw,4rem)' }}
        >
          From{' '}
          <span className="text-amber">Static Archive</span>
          <br />
          to Living Intelligence.
        </h2>
        <p className="font-sans font-light text-body-base text-text-secondary leading-[1.82]">
          The Golden Dataset does not sit still. It evolves — trained on new contributions,
          refined by your family's testimony, powered by whatever AI exists in the year
          your grandchildren ask it a question.
        </p>
      </div>

      {/* Timeline */}
      <div className="relative max-w-[1100px] mx-auto mb-16 reveal">
        {/* Horizontal connecting line */}
        <div
          className="hidden lg:block absolute h-px"
          style={{
            top: '1.5rem',
            left: '12.5%', right: '12.5%',
            background: 'linear-gradient(90deg,transparent,rgba(255,179,71,0.32) 10%,rgba(255,179,71,0.32) 90%,transparent)',
          }}
          aria-hidden="true"
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
          {PHASES.map(({ phase, title, desc, year, active }) => (
            <div key={phase} className="flex flex-col items-center text-center">

              {/* Node */}
              <div className="relative w-12 h-12 mb-7 flex-shrink-0">
                <div className={[
                  'absolute inset-0 rounded-full border flex items-center justify-center',
                  active ? 'border-amber/45 animate-spark' : 'border-border-amber',
                ].join(' ')}>
                  <div className={[
                    'w-[18px] h-[18px] rounded-full border',
                    active
                      ? 'bg-amber border-amber shadow-amber-sm animate-spark'
                      : 'bg-obsidian-deep border-amber/60',
                  ].join(' ')} />
                </div>
              </div>

              <p className={[
                'font-sans text-[0.6rem] font-bold tracking-[0.18em] uppercase mb-2',
                active ? 'text-amber-dim' : 'text-text-muted',
              ].join(' ')}>
                {phase}
              </p>

              <h3 className={[
                'font-serif text-[1.2rem] font-semibold leading-[1.2] mb-2.5 whitespace-pre-line',
                active ? 'text-text-primary' : 'text-text-secondary',
              ].join(' ')}>
                {title}
              </h3>

              <p className={[
                'font-sans font-light text-[0.8rem] leading-[1.72]',
                active ? 'text-text-secondary' : 'text-text-muted',
              ].join(' ')}>
                {desc}
              </p>

              <span className={[
                'inline-block font-sans text-[0.6rem] font-semibold tracking-[0.14em] px-2.5 py-1 mt-4 rounded-sm border',
                active
                  ? 'bg-amber/[0.07] border-amber/18 text-amber-dim'
                  : 'bg-white/[0.025] border-border-subtle text-text-muted',
              ].join(' ')}>
                {year}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Evolution cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[1100px] mx-auto reveal">
        {CARDS.map(({ num, title, desc }) => (
          <div
            key={num}
            className="group relative rounded-sm border border-border-subtle bg-white/[0.018] p-7 overflow-hidden
                       transition-colors duration-300 hover:border-border-amber hover:bg-amber/[0.022]"
          >
            {/* Hover top line */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-transparent to-transparent
                            transition-all duration-400 group-hover:via-amber/38" />

            <p className="font-serif text-[2.75rem] font-light text-amber/14 leading-none mb-3">{num}</p>
            <p className="font-sans text-[0.78rem] font-bold tracking-[0.1em] uppercase text-text-primary mb-3">{title}</p>
            <p className="font-sans font-light text-body-sm text-text-secondary leading-[1.72]">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}