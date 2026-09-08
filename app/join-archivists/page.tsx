import Link   from 'next/link'
import Nav    from '../components/Nav'
import Footer from '../components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Become a Legacy Guide · Basalith',
  description: 'Legacy Guides open Basalith archives for founders and families. Read what the work is, how it pays, and how to tell us about yourself.',
}

// The interest form that used to live here posted to /api/archivist-interest,
// which persisted nothing and notified nobody while still reporting success.
// Rather than show a form that goes nowhere, this page now routes prospective
// Guides to /contact (topic: Becoming a Legacy Guide), which does reach us.
// Restore a form here only once a handler exists that actually stores and
// notifies.

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)' }
const MONO: React.CSSProperties  = { fontFamily: 'var(--font-space-mono, "Space Mono", "Courier New", monospace)', textTransform: 'uppercase' as const, letterSpacing: '0.28em' }

const P: React.CSSProperties = {
  ...SERIF,
  fontWeight:   300,
  fontSize:     '1.1rem',
  lineHeight:   1.9,
  color:        'var(--color-text-secondary)',
  marginBottom: '20px',
}

export default function JoinArchivistsPage() {
  return (
    <>
      <Nav />
      <main style={{ background: 'var(--color-bg)' }}>
        <section style={{ padding: 'clamp(140px,16vw,180px) clamp(24px,6vw,80px) clamp(80px,10vw,120px)' }} aria-label="Become a Legacy Guide">
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>

            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '28px' }}>
              Legacy Guides
            </p>

            <h1
              style={{
                ...SERIF,
                fontWeight:    300,
                fontSize:      'clamp(2rem,5vw,3.5rem)',
                color:         'var(--color-text-primary)',
                lineHeight:    1.15,
                letterSpacing: '-0.025em',
                marginBottom:  '56px',
              }}
            >
              You will be the reason
              <br />
              someone never has to wonder.
            </h1>

            <p style={P}>
              The hardest conversation
              <br />
              is the one that starts with:
            </p>

            <p
              style={{
                ...SERIF,
                fontWeight:   300,
                fontSize:     '1.2rem',
                fontStyle:    'italic',
                lineHeight:   1.9,
                color:        'var(--color-gold)',
                marginBottom: '28px',
              }}
            >
              &ldquo;I should have done this sooner.&rdquo;
            </p>

            <p style={P}>
              A Legacy Guide starts that conversation
              <br />
              before it becomes regret.
            </p>

            <p style={P}>
              You find the people who understand what is at stake.
              <br />
              A founder a year from stepping back.
              <br />
              A family whose parent still has the sharpest mind in the room.
              <br />
              You sit with them. You help them begin.
            </p>

            <div
              aria-hidden="true"
              style={{ width: '40px', height: '1px', background: 'var(--color-gold)', margin: '40px 0' }}
            />

            <p style={P}>
              The pay reflects the work.
              <br />
              A share of every Founding Session you run.
              <br />
              A residual on every archive you open.
              <br />
              The numbers are shared during onboarding.
            </p>

            <div
              aria-hidden="true"
              style={{ width: '40px', height: '1px', background: 'var(--color-border)', margin: '40px 0' }}
            />

            <p style={P}>
              But the work is something else.
            </p>

            <p style={{ ...P, marginBottom: '48px' }}>
              You give people something
              <br />
              they did not know was possible.
              <br />
              The chance to never have to wonder.
            </p>

            <Link
              href="/contact"
              style={{
                ...MONO,
                fontSize:       'var(--text-caption)',
                display:        'inline-block',
                background:     'var(--color-gold)',
                color:          '#0A0908',
                textDecoration: 'none',
                padding:        '14px 32px',
                borderRadius:   'var(--radius-sm)',
              }}
            >
              Tell us about yourself
            </Link>
            <p style={{ ...SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '0.95rem', color: 'var(--color-text-muted)', lineHeight: 1.8, marginTop: '20px' }}>
              Choose &ldquo;Becoming a Legacy Guide,&rdquo; and tell us your background and why. We read every one ourselves, and we reply if there is a fit.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
