const COLD = [
  { key: 'Who Labels',          value: 'Low-wage contractors, often overseas, with no connection to the subject.', sub: 'Averaged across millions of strangers.' },
  { key: 'Context Depth',       value: 'None. Statistical probability is mistaken for understanding.',              sub: 'The algorithm knows what a face looks like. Not whose.' },
  { key: 'Emotional Accuracy',  value: 'Near zero. Emotion is inferred — never remembered.' },
  { key: 'Ownership',           value: 'The platform. Your data enriches their model, not your legacy.' },
  { key: 'Lifespan',            value: 'Until the company shuts down, pivots, or is acquired.' },
  { key: 'Inheritability',      value: 'None. There is no mechanism for legal transfer.' },
]

const WARM: { key: string; lead: string; rest: string; sub?: string }[] = [
  { key: 'Who Labels',         lead: 'Your family and chosen circle —', rest: ' the only people in the world who know what your data actually means.', sub: 'Testimony, not statistics.' },
  { key: 'Context Depth',      lead: 'Full biographical provenance.', rest: ' Every item carries the story of what it was, who was there, and why it mattered.' },
  { key: 'Emotional Accuracy', lead: 'High.', rest: ' Emotion is contributed by those who felt it — not inferred by those who never knew you.' },
  { key: 'Ownership',          lead: 'You — legally and structurally.', rest: ' Your Golden Dataset is a portable, transferable estate asset from day one.' },
  { key: 'Lifespan',           lead: 'Generational.', rest: ' Governed by your Family Trust. Not subject to platform decisions.' },
  { key: 'Inheritability',     lead: 'Full legal transfer.', rest: ' Named in your Will or Trust as a formal estate bequest.' },
]

export default function Comparison() {
  return (
    <section
      id="comparison"
      aria-label="Method comparison"
      className="relative bg-obsidian-deep px-8 md:px-16 lg:px-24 py-36 overflow-hidden"
    >
      {/* Top amber rule */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border-amber to-transparent" />

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-20 reveal">
        <p className="eyebrow mb-5">The Method</p>
        <h2 className="font-serif font-semibold text-text-primary leading-[1.0] tracking-[-0.03em] mb-5"
          style={{ fontSize: 'clamp(2.25rem,5vw,4rem)' }}>
          Not All Data<br />Is Created Equal.
        </h2>
        <p className="font-sans font-light text-body-base text-text-secondary leading-[1.8]">
          The AI industry built infrastructure for labeling data at scale.
          We built ours for labeling data with{' '}
          <em className="font-serif italic">meaning</em> — one life at a time.
        </p>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_48px_1fr] max-w-5xl mx-auto reveal">

        {/* COLD */}
        <div
          className="rounded-sm border border-white/[0.06] overflow-hidden"
          style={{ background: 'linear-gradient(160deg,#1D1D20,#17171A)' }}
        >
          <div className="px-8 pt-7 pb-6 border-b border-white/[0.05]">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-sm border border-white/[0.07] bg-white/[0.025] mb-4">
              <span className="font-sans text-[0.6rem] font-bold tracking-[0.18em] uppercase text-text-muted">
                Standard AI Labeling
              </span>
            </div>
            <h3 className="font-serif text-[1.5rem] font-medium text-text-secondary leading-snug mb-2">
              The Industry Model
            </h3>
            <p className="font-sans text-body-sm text-text-muted leading-[1.65]">
              Outsourced to anonymous contract workers.<br />
              Optimised for throughput, not truth.
            </p>
          </div>
          {COLD.map(({ key, value, sub }) => (
            <div key={key} className="flex flex-col gap-1.5 px-8 py-5 border-b border-white/[0.04] last:border-b-0">
              <span className="font-sans text-[0.58rem] font-bold tracking-[0.18em] uppercase text-text-muted">{key}</span>
              <span className="font-sans text-body-sm text-text-muted leading-[1.6]">{value}</span>
              {sub && <span className="font-serif text-[0.85rem] italic text-text-muted/60">{sub}</span>}
            </div>
          ))}
        </div>

        {/* VS divider */}
        <div className="hidden lg:flex flex-col items-center py-8">
          <div className="flex-1 w-px bg-gradient-to-b from-transparent via-border-subtle to-transparent" />
          <span className="font-sans text-[0.65rem] font-bold tracking-[0.16em] uppercase text-basalt-mid py-3">vs</span>
          <div className="flex-1 w-px bg-gradient-to-b from-transparent via-border-subtle to-transparent" />
        </div>

        {/* WARM */}
        <div
          className="rounded-sm border border-border-amber overflow-hidden relative"
          style={{ background: 'linear-gradient(160deg,#221F14,#1D1B11)' }}
        >
          {/* Top amber gloss */}
          <div className="absolute top-0 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-amber/55 to-transparent" />

          <div className="px-8 pt-7 pb-6 border-b border-amber/[0.10]">
            <div className="ai-badge mb-4">
              <span className="ai-dot" />
              Basalith Essence Mapping
            </div>
            <h3 className="font-serif text-[1.5rem] font-semibold text-text-primary leading-snug mb-2">
              The Basalith Method
            </h3>
            <p className="font-sans text-body-sm text-text-secondary leading-[1.65]">
              Curated by the people who love you.<br />
              Built for permanence, governed like an estate.
            </p>
          </div>

          {WARM.map(({ key, lead, rest, sub }) => (
            <div key={key} className="flex flex-col gap-1.5 px-8 py-5 border-b border-amber/[0.06] last:border-b-0">
              <span className="font-sans text-[0.58rem] font-bold tracking-[0.18em] uppercase text-text-muted">{key}</span>
              <span className="font-sans text-body-sm text-text-secondary leading-[1.6]">
                <strong className="font-semibold text-amber-light">{lead}</strong>{rest}
              </span>
              {sub && <span className="font-serif text-[0.85rem] italic text-text-muted">{sub}</span>}
            </div>
          ))}

          {/* Pull quote */}
          <div className="px-8 py-6">
            <blockquote className="font-serif text-[1.05rem] italic leading-[1.65] text-amber-dim border-l-2 border-amber pl-4">
              "The only data that will matter in a hundred years
              is the data that meant something today."
            </blockquote>
          </div>
        </div>

      </div>
    </section>
  )
}