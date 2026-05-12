import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Resume Your Archive · Basalith',
  description: 'Your archive has been waiting. Resume where you left off.',
}

const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  letterSpacing: '0.2em',
  textTransform: 'uppercase' as const,
}

export default function ResumePage() {
  return (
    <main style={{
      background:     'var(--color-void, #0A0908)',
      minHeight:      '100vh',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        '48px 24px',
    }}>
      <div style={{ maxWidth: '540px', width: '100%', textAlign: 'center' }}>

        {/* Gold rule */}
        <div aria-hidden="true" style={{
          width:        '40px',
          height:       '1px',
          background:   '#C4A24A',
          margin:       '0 auto 48px',
        }} />

        <h1 style={{
          fontFamily:    '"Cormorant Garamond", Georgia, serif',
          fontSize:      'clamp(2rem, 5vw, 3rem)',
          fontWeight:    300,
          lineHeight:    1.2,
          letterSpacing: '-0.02em',
          color:         'rgba(250,250,248,0.9)',
          marginBottom:  '32px',
        }}>
          Welcome back.
        </h1>

        <p style={{
          fontFamily:   '"Cormorant Garamond", Georgia, serif',
          fontSize:     '1.15rem',
          fontStyle:    'italic',
          fontWeight:   300,
          lineHeight:   1.85,
          color:        'rgba(250,250,248,0.5)',
          marginBottom: '16px',
        }}>
          Your archive has been waiting.
        </p>

        <p style={{
          fontFamily:   '"Cormorant Garamond", Georgia, serif',
          fontSize:     '1.15rem',
          fontStyle:    'italic',
          fontWeight:   300,
          lineHeight:   1.85,
          color:        'rgba(250,250,248,0.5)',
          marginBottom: '48px',
        }}>
          Everything is exactly as you left it.
        </p>

        {/* Gold rule */}
        <div aria-hidden="true" style={{
          width:        '40px',
          height:       '1px',
          background:   '#C4A24A',
          margin:       '0 auto 48px',
        }} />

        <Link
          href="/apply"
          style={{
            ...MONO,
            display:        'inline-block',
            fontSize:       '0.52rem',
            color:          '#0A0908',
            textDecoration: 'none',
            background:     '#C4A24A',
            padding:        '16px 40px',
            borderRadius:   '2px',
            marginBottom:   '32px',
          }}
        >
          Resume Your Archive →
        </Link>

        <p style={{
          ...MONO,
          display:    'block',
          fontSize:   '0.42rem',
          color:      'rgba(250,250,248,0.2)',
          marginTop:  '16px',
        }}>
          Questions? Reply to any email from Basalith.
        </p>

      </div>
    </main>
  )
}
