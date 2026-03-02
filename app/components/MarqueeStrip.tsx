const ITEMS = [
  'Golden Dataset', 'Emotional Fidelity', 'Family-Labeled',
  'Legacy AI', 'Digital Clone', 'Family Trust',
  'Identity Preservation', 'The Asset That Never Leaves',
]

// Triplicate for a seamless infinite loop at any screen width
const ALL = [...ITEMS, ...ITEMS, ...ITEMS]

export default function MarqueeStrip() {
  return (
    <div className="bg-amber overflow-hidden py-[0.6rem]" aria-hidden="true">
      <div
        className="flex whitespace-nowrap w-max animate-marquee"
        /* 28s defined in tailwind.config animation */
      >
        {ALL.map((text, i) => (
          <span key={i} className="inline-flex items-center gap-5 px-7">
            <span className="font-sans text-[0.67rem] font-bold tracking-[0.18em] uppercase text-obsidian">
              {text}
            </span>
            <span className="w-[3px] h-[3px] rounded-full bg-obsidian/35 inline-block flex-shrink-0" />
          </span>
        ))}
      </div>
    </div>
  )
}