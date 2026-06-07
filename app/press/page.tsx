import type { Metadata } from 'next'
import Nav    from '../components/Nav'
import Footer from '../components/Footer'

export const metadata: Metadata = {
  title: 'Press & Media · Basalith',
  description: 'Press and media resources for Basalith and Heritage Nexus Inc.',
}

const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.28em',
}

const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}

export default function PressPage() {
  return (
    <>
      <Nav />
      <main style={{ background: 'var(--color-bg)', minHeight: '70vh' }}>
        <section style={{ padding: 'clamp(140px,18vw,200px) clamp(24px,6vw,80px) clamp(96px,12vw,140px)' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>

            <p style={{ ...MONO, fontSize: '0.6rem', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
              <span style={{ width: '24px', height: '1px', background: 'var(--color-gold)', display: 'block', flexShrink: 0 }} aria-hidden="true" />
              Press & Media
            </p>

            <h1 style={{ ...SERIF, fontSize: 'clamp(2.2rem,5vw,3.4rem)', fontWeight: 300, lineHeight: 1.1, letterSpacing: '-0.025em', color: 'var(--color-text-primary)', marginBottom: '48px' }}>
              Press and media.
            </h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
              <div style={{ borderLeft: '3px solid rgba(196,162,74,0.5)', paddingLeft: '24px' }}>
                <p style={{ ...MONO, fontSize: '0.5rem', color: 'var(--color-gold)', marginBottom: '10px' }}>For press inquiries</p>
                <a href="mailto:hello@basalith.xyz" style={{ ...SERIF, fontSize: '1.3rem', fontWeight: 300, color: 'var(--color-text-primary)', textDecoration: 'none' }}>
                  hello@basalith.xyz
                </a>
              </div>

              <div style={{ borderLeft: '3px solid rgba(196,162,74,0.5)', paddingLeft: '24px' }}>
                <p style={{ ...MONO, fontSize: '0.5rem', color: 'var(--color-gold)', marginBottom: '10px' }}>The technical foundation</p>
                <a href="https://basalith.xyz" target="_blank" rel="noopener noreferrer" style={{ ...SERIF, fontSize: '1.3rem', fontWeight: 300, color: 'var(--color-text-primary)', textDecoration: 'none' }}>
                  basalith.xyz
                </a>
              </div>
            </div>

            <div style={{ marginTop: '56px', paddingTop: '32px', borderTop: '1px solid rgba(250,250,248,0.08)' }}>
              <span style={{ ...MONO, fontSize: '0.55rem', color: 'var(--color-text-muted)' }}>
                Download press kit &rarr;
              </span>
              <p style={{ ...SERIF, fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 300, color: 'var(--color-text-faint)', marginTop: '8px' }}>
                Coming soon.
              </p>
            </div>

            <p style={{ ...SERIF, fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.8, color: 'var(--color-text-muted)', marginTop: '56px' }}>
              Basalith is operated by Heritage Nexus Inc., registered in Delaware, United States.
            </p>

          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
