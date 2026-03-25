// PART 1 — The Intelligence Layer section
// Inserted between AssetPillar and ContinuityPillar on the homepage.

const AGENTS = [
  {
    num:    '01',
    title:  'The Filter',
    job:    'Removes what doesn\'t belong.',
    body:   'Every uploaded image is classified instantly. Screenshots, receipts, food photographs, random objects — separated automatically from the photographs that matter. Your family never sees the noise.',
    result: '60–70% of noise eliminated',
  },
  {
    num:    '02',
    title:  'The Deduplication',
    job:    'Collapses twelve shots into one.',
    body:   'You took eight photographs of the same moment hoping one turned out. We identify every cluster of near-identical images and surface only the best one. The rest are stored but never shown unless you ask.',
    result: 'Duplicate clusters collapsed',
  },
  {
    num:    '03',
    title:  'The Classification',
    job:    'Understands what it is looking at.',
    body:   'Every photograph is analyzed for what it contains — faces, event type, setting, emotional register. When you open a photograph to label it, the form is already partially filled. You confirm. You correct. You add what only you would know.',
    result: 'Labels pre-suggested by AI',
  },
  {
    num:    '04',
    title:  'The Dating',
    job:    'Establishes when.',
    body:   'EXIF data where available. Visual analysis where it isn\'t — clothing, technology, film grain, and context all contribute to an era estimate. Photographs without timestamps are dated to within a decade, often within a few years.',
    result: 'Every photograph anchored in time',
  },
  {
    num:    '05',
    title:  'The Recognition',
    job:    'Finds the same face across decades.',
    body:   'When a family member identifies someone in one photograph, that face is matched across the entire archive. Every photograph containing that person surfaces — including ones taken forty years apart. The archive begins to see the family as the family sees itself.',
    result: 'One identification · Hundreds found',
  },
  {
    num:    '06',
    title:  'The Quality Assessment',
    job:    'Scores every photograph for archive value — not aesthetics.',
    body:   'A blurry photograph of your grandmother laughing has higher archive value than a technically perfect sunset. Our scoring weighs faces, uniqueness, rarity, and emotional register. The photographs that matter most surface first.',
    result: 'Highest value photographs prioritized',
  },
  {
    num:    '07',
    title:  'The Sequencing',
    job:    'Decides what you see first.',
    body:   'The first photograph you see when you open the labelling interface is the single most emotionally resonant image in your entire upload. Not the most recent. Not the first uploaded. The one most likely to make you stop and remember. Every session begins at the emotional peak.',
    result: 'Archive opens with maximum impact',
  },
]

function Connector() {
  return (
    <div className="flex flex-col items-center" aria-hidden="true">
      <div style={{ width: '2px', height: '20px', background: 'rgba(196,162,74,0.3)' }} />
      <div
        style={{
          width:     '8px',
          height:    '8px',
          background: 'rgba(196,162,74,0.55)',
          transform:  'rotate(45deg)',
          flexShrink: 0,
        }}
      />
      <div style={{ width: '2px', height: '20px', background: 'rgba(196,162,74,0.3)' }} />
    </div>
  )
}

export default function IntelligenceLayer() {
  return (
    <section
      id="intelligence"
      aria-label="The Intelligence Layer"
      className="relative bg-obsidian-void px-8 md:px-16 py-36 overflow-hidden"
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(196,162,74,0.04) 0%, transparent 65%)' }}
        aria-hidden="true"
      />

      {/* Header */}
      <div className="text-center max-w-[680px] mx-auto mb-20 reveal">
        <p className="eyebrow mb-6">The Intelligence Layer</p>
        <h2
          className="font-serif font-semibold text-text-primary leading-[0.96] tracking-[-0.034em] mb-8"
          style={{ fontSize: 'clamp(2.25rem,4.5vw,3.75rem)' }}
        >
          You have thousands of photographs.
          <br />
          <em className="italic font-medium text-amber" style={{ fontStyle: 'italic' }}>
            You don't have to sort a single one.
          </em>
        </h2>

        <div className="font-serif font-light text-text-secondary leading-[1.85]" style={{ fontSize: '1.1rem' }}>
          <p className="mb-4">
            The average family arrives at Basalith with 15,000 to 40,000 photographs scattered
            across iPhones, cloud storage, hard drives, and scanned albums.
          </p>
          <p className="mb-4">
            We built an AI pipeline specifically for this moment — the overwhelming handoff
            of a lifetime of visual memory.
          </p>
          <p>
            Upload everything. Our system handles what comes next.
          </p>
        </div>
      </div>

      {/* Pipeline */}
      <div className="max-w-[680px] mx-auto reveal reveal-delay-1">
        {AGENTS.map((agent, i) => (
          <div key={agent.num}>
            {/* Card */}
            <div
              className="relative rounded-sm px-8 py-7"
              style={{
                background:   'var(--obsidian-deep, #111112)',
                border:       '1px solid rgba(196,162,74,0.12)',
                borderLeft:   '3px solid rgba(196,162,74,0.4)',
              }}
            >
              {/* Step number */}
              <p
                style={{
                  fontFamily:    'monospace',
                  fontSize:      '0.44rem',
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase' as const,
                  color:         'rgba(196,162,74,0.7)',
                  marginBottom:  '0.6rem',
                }}
              >
                {agent.num}
              </p>

              {/* Title + job */}
              <p
                className="font-serif font-semibold leading-snug mb-1"
                style={{ fontSize: '1.1rem', color: '#F0F0EE' }}
              >
                {agent.title}
              </p>
              <p
                className="font-serif"
                style={{ fontSize: '0.9rem', fontStyle: 'italic', color: 'rgba(196,162,74,0.65)', marginBottom: '0.75rem', fontWeight: 300 }}
              >
                {agent.job}
              </p>

              {/* Body */}
              <p
                className="font-serif font-light leading-[1.8]"
                style={{ fontSize: '0.95rem', color: '#9DA3A8' }}
              >
                {agent.body}
              </p>

              {/* Result tag */}
              <p
                className="text-right mt-4"
                style={{
                  fontFamily:    'monospace',
                  fontSize:      '0.4rem',
                  fontStyle:     'italic',
                  letterSpacing: '0.12em',
                  color:         'rgba(196,162,74,0.6)',
                  textTransform: 'uppercase' as const,
                }}
              >
                {agent.result}
              </p>
            </div>

            {/* Connector (not after last card) */}
            {i < AGENTS.length - 1 && <Connector />}
          </div>
        ))}
      </div>

      {/* Closing statement */}
      <div className="max-w-[640px] mx-auto mt-20 text-center reveal reveal-delay-2">
        <div className="w-px h-12 bg-gradient-to-b from-transparent via-amber/20 to-transparent mx-auto mb-10" aria-hidden="true" />

        <p
          className="font-serif font-light leading-[1.8] mb-8"
          style={{ fontSize: '1.3rem', fontStyle: 'italic', color: '#9DA3A8' }}
        >
          Most families arrive with decades of visual memory in complete disorder.
          <br /><br />
          They leave The Founding with a curated, chronologically anchored, face-indexed
          archive — ready to label, ready to share, ready to pass on.
        </p>

        <p
          style={{
            fontFamily:    'monospace',
            fontSize:      '0.46rem',
            letterSpacing: '0.35em',
            textTransform: 'uppercase' as const,
            color:         'rgba(196,162,74,0.6)',
          }}
        >
          The Intelligence Layer Runs on Every Archive
        </p>
      </div>
    </section>
  )
}
