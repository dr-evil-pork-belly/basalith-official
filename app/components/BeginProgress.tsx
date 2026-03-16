const STEPS = [
  { n: 1, label: 'Tier'    },
  { n: 2, label: 'Details' },
  { n: 3, label: 'Review'  },
]

export default function BeginProgress({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-0 mb-10" aria-label={`Step ${step} of 3`}>
      {STEPS.map(({ n, label }, i) => {
        const done    = n < step
        const active  = n === step
        const upcoming = n > step

        return (
          <div key={n} className="flex items-center">
            {/* Step node */}
            <div className="flex items-center gap-2">
              <div
                className={[
                  'w-[22px] h-[22px] rounded-full border flex items-center justify-center flex-shrink-0 transition-all duration-300',
                  active   ? 'border-amber bg-amber/15'           : '',
                  done     ? 'border-amber/50 bg-amber/08'        : '',
                  upcoming ? 'border-border-subtle bg-transparent': '',
                ].join(' ')}
              >
                {done ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="M2 5l2 2 4-4" stroke="#FFB347" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
                  </svg>
                ) : (
                  <span
                    className={[
                      'font-sans text-[0.55rem] font-bold tabular-nums leading-none',
                      active   ? 'text-amber'      : '',
                      upcoming ? 'text-text-muted'  : '',
                    ].join(' ')}
                  >
                    {n}
                  </span>
                )}
              </div>
              <span
                className={[
                  'font-sans text-[0.68rem] font-semibold tracking-[0.1em] uppercase transition-colors duration-300',
                  active   ? 'text-amber'           : '',
                  done     ? 'text-amber/50'         : '',
                  upcoming ? 'text-text-muted'        : '',
                ].join(' ')}
              >
                {label}
              </span>
            </div>

            {/* Connector line between steps */}
            {i < STEPS.length - 1 && (
              <div
                className={[
                  'h-px w-10 mx-3 transition-all duration-300',
                  done ? 'bg-amber/30' : 'bg-border-subtle',
                ].join(' ')}
                aria-hidden="true"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
