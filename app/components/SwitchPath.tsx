'use client'

import { scrollToAudience } from '@/lib/scrollToAudience'
import type { Audience } from '@/lib/useAudience'

const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  fontSize:      '0.52rem',
  letterSpacing: '0.28em',
  textTransform: 'uppercase' as const,
}

const NAME: Record<Audience, string> = {
  founder: 'Founders & Successors',
  family:  'Individuals & Families',
}

// Keeps the audience choice switchable from the lower sections. Returns the
// visitor to the selector (#audience). Styled for the dark lower sections and
// rendered only when a path is set.
export default function SwitchPath({
  audience,
  align = 'flex-start',
}: {
  audience: Audience
  align?: 'flex-start' | 'center'
}) {
  return (
    <div style={{ display: 'flex', justifyContent: align, alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '40px' }}>
      <span style={{ ...MONO, color: 'var(--color-gold)' }}>{NAME[audience]}</span>
      <span aria-hidden="true" style={{ color: 'rgba(250,248,244,0.25)' }}>&middot;</span>
      <button
        type="button"
        onClick={scrollToAudience}
        style={{ ...MONO, background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(250,248,244,0.55)', padding: '4px 0' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-gold)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(250,248,244,0.55)' }}
      >
        Switch path
      </button>
    </div>
  )
}
