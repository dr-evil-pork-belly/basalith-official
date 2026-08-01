import type { CSSProperties, ReactNode } from 'react'

// The four block types direction 1d actually defines, extracted so every
// homepage section is built from them rather than from new shapes.
//
//   StoneBlock   padded light block, centered to the measure
//   StoneRow     hairline row, the numbered-list primitive (class in globals.css)
//   StoneInvert  inverted ink block
//   StoneCard    bordered card with a mono header strip
//
// Type family comes from the existing stack, not from 1d. Sizes and spacing
// come from 1d. Gold is retained per CLAUDE.md section 9.

export const mono: CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  fontSize:      '10.5px',
  lineHeight:    1.5,
}

export const serif: CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}

export function StoneBlock({
  children,
  gap = '16px',
  style,
}: {
  children: ReactNode
  gap?:     string
  style?:   CSSProperties
}) {
  return (
    <div
      style={{
        maxWidth:      'var(--stone-measure)',
        marginInline:  'auto',
        padding:       'var(--stone-gutter)',
        display:       'flex',
        flexDirection: 'column',
        gap,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function StoneInvert({
  children,
  style,
}: {
  children: ReactNode
  style?:   CSSProperties
}) {
  return (
    <div className="stone-invert" style={{ background: 'var(--stone-invert-bg)', ...style }}>
      <div
        style={{
          maxWidth:      'var(--stone-measure)',
          marginInline:  'auto',
          padding:       '30px var(--stone-gutter)',
          display:       'flex',
          flexDirection: 'column',
          gap:           '20px',
          color:         'var(--stone-invert-fg)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

// Numbered hairline row. `n` is the mono index, gold per section 9.
export function StoneRow({
  n,
  title,
  body,
}: {
  n:     string
  title: string
  body:  string
}) {
  return (
    <div className="stone-row">
      <span style={{ ...mono, color: 'var(--color-gold)', paddingTop: '4px', width: '22px', flex: 'none' }}>
        {n}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <span style={{ ...serif, fontWeight: 600, fontSize: '15.5px', lineHeight: 1.25, color: 'var(--stone-ink)' }}>
          {title}
        </span>
        <span style={{ ...serif, fontWeight: 300, fontSize: '14px', lineHeight: 1.45, color: 'var(--stone-secondary)' }}>
          {body}
        </span>
      </div>
    </div>
  )
}

// Same hairline row, number column omitted, mono gold label stacked above the
// line. Carries the Acquisition / Succession pair, which live renders as a mono
// gold label over an italic line and which 1d has no two-column slot for.
export function StoneLabelRow({
  label,
  body,
}: {
  label: string
  body:  string
}) {
  return (
    <div className="stone-row" style={{ flexDirection: 'column', gap: '8px' }}>
      <span style={{ ...mono, color: 'var(--color-gold)' }}>{label}</span>
      <span
        style={{
          ...serif,
          fontSize:   '16px',
          fontStyle:  'italic',
          fontWeight: 300,
          lineHeight: 1.5,
          color:      'var(--stone-body)',
        }}
      >
        {body}
      </span>
    </div>
  )
}

export function StoneCard({
  label,
  meta,
  children,
}: {
  label:     string
  meta?:     string
  children:  ReactNode
}) {
  return (
    <div
      style={{
        border:        '1px solid var(--stone-card-line)',
        background:    'var(--stone-card)',
        display:       'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          ...mono,
          display:        'flex',
          justifyContent: 'space-between',
          gap:            '12px',
          padding:        '10px 13px',
          borderBottom:   '1px solid var(--stone-rule-soft)',
          fontSize:       '9.5px',
          color:          'var(--stone-label)',
        }}
      >
        <span>{label}</span>
        {meta ? <span>{meta}</span> : null}
      </div>
      <div style={{ padding: '14px 13px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {children}
      </div>
    </div>
  )
}
