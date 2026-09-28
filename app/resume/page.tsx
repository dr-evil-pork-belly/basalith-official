import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Resume your Basalith · Basalith',
  description: 'Your Basalith has been waiting. Resume where you left off.',
}

const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono)',
  letterSpacing: '0.2em',
  textTransform: 'uppercase' as const,
}

export default function ResumePage() {
  return (
    <main className="section-dark" style={{
      background:     'var(--color-void)',
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
          background:   'var(--color-gold)',
          margin:       '0 auto 48px',
        }} />

        <h1 style={{
          fontFamily:    'var(--font-newsreader), Georgia, serif',
          fontSize:      'clamp(2rem, 5vw, 3rem)',
          fontWeight: 400,
          lineHeight:    1.2,
          letterSpacing: '-0.02em',
          color:         'var(--on-dark)',
          marginBottom:  '32px',
        }}>
          Welcome back.
        </h1>

        <p style={{
          fontFamily:   'var(--font-newsreader), Georgia, serif',
          fontSize:     '1.15rem',
          fontStyle:    'italic',
          fontWeight: 400,
          lineHeight:   1.85,
          color:        'var(--on-dark-3)',
          marginBottom: '16px',
        }}>
          Your Basalith has been waiting.
        </p>

        <p style={{
          fontFamily:   'var(--font-newsreader), Georgia, serif',
          fontSize:     '1.15rem',
          fontStyle:    'italic',
          fontWeight: 400,
          lineHeight:   1.85,
          color:        'var(--on-dark-3)',
          marginBottom: '48px',
        }}>
          Everything is exactly as you left it.
        </p>

        {/* Gold rule */}
        <div aria-hidden="true" style={{
          width:        '40px',
          height:       '1px',
          background:   'var(--color-gold)',
          margin:       '0 auto 48px',
        }} />

        <Link
          href="/apply"
          style={{
            ...MONO,
            display:        'inline-block',
            fontSize:       '0.78rem',
            color: 'var(--color-void)',
            textDecoration: 'none',
            background:     'var(--on-dark)',
            padding:        '16px 40px',
            borderRadius:   '2px',
            marginBottom:   '32px',
          }}
        >
          Resume your Basalith →
        </Link>

        <p style={{
          ...MONO,
          display:    'block',
          fontSize:   '0.72rem',
          color:      'var(--on-dark-3)',
          marginTop:  '16px',
        }}>
          Questions? Reply to any email from Basalith.
        </p>

      </div>
    </main>
  )
}
