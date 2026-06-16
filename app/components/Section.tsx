import type { CSSProperties, ReactNode } from 'react'

// Shared type styles, to replace the per-file re-declared MONO/SERIF consts.
// (Only PhilosophySection consumes these in stage 1; other files are left as-is.)
export const mono: CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  textTransform: 'uppercase',
  letterSpacing: 'var(--eyebrow-tracking)',
}

export const serif: CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}

type Tone  = 'dark' | 'light'
type Align = 'left' | 'center'

// The homepage section primitive: tone background + vertical rhythm on the
// <section>, with a centered content column (--content-max) and horizontal page
// gutters. Grids span this full column; prose constrains itself with `.measure`.
export default function Section({
  tone,
  align = 'left',
  reveal = false,
  ariaLabel,
  className,
  children,
}: {
  tone:       Tone
  align?:     Align
  reveal?:    boolean
  ariaLabel?: string
  className?: string
  children:   ReactNode
}) {
  return (
    <section
      aria-label={ariaLabel}
      data-reveal={reveal ? '' : undefined}
      className={className}
      style={{
        background:   tone === 'dark' ? 'var(--color-void)' : 'var(--color-bg)',
        paddingBlock: 'var(--section-y)',
      }}
    >
      <div
        style={{
          maxWidth:      'var(--content-max)',
          marginInline:  'auto',
          paddingInline: 'var(--page-x)',
          textAlign:     align,
        }}
      >
        {children}
      </div>
    </section>
  )
}
