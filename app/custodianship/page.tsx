import Nav    from '../components/Nav'
import Footer from '../components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Custodianship',
  description: 'Your archive does not depend on Basalith\'s continued existence. It depends on the Reserve.',
}

const BODY: React.CSSProperties = {
  fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
  fontWeight:   300,
  fontSize:     '1.1rem',
  color:        'var(--color-text-secondary)',
  lineHeight:   1.85,
  marginBottom: '1.5rem',
}

const H2: React.CSSProperties = {
  fontFamily:    'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
  fontWeight:    500,
  fontSize:      'clamp(1.6rem, 3vw, 2.2rem)',
  color:         'var(--color-text-primary)',
  lineHeight:    1.2,
  letterSpacing: '-0.02em',
  marginBottom:  '1.75rem',
}

const EYEBROW: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  fontSize:      '0.52rem',
  letterSpacing: '0.28em',
  textTransform: 'uppercase' as const,
  color:         'var(--color-gold)',
  display:       'block',
  marginBottom:  '1.5rem',
}

const GOLD_RULE: React.CSSProperties = {
  height:     '1px',
  margin:     '3.5rem 0',
  background: 'linear-gradient(90deg, transparent, rgba(196,162,74,0.35), transparent)',
}

const GUARANTEES = [
  {
    n:    '01',
    title: 'Minimum 10-Year Continuation',
    body:  'If Basalith ceases operations, the Reserve funds a minimum of 10 years of continued archive storage and access under an independent custodian institution.',
  },
  {
    n:    '02',
    title: 'Family Notification',
    body:  'Your designated Custodian and all active contributors receive direct notification of any material change to archive management with minimum 90 days advance notice.',
  },
  {
    n:    '03',
    title: 'Complete Data Portability',
    body:  'Your archive, every photograph, every label, every story, every voice recording, is exportable in full at any time. You are never locked in.',
  },
  {
    n:    '04',
    title: 'Custodian Designation',
    body:  'Your archive has a legally designated Custodian documented in your estate plan. If you are no longer able to manage your archive, your Custodian has formal standing to govern it.',
  },
]

export default function CustodianshipPage() {
  return (
    <>
      <Nav />
      <main style={{ background: 'var(--color-bg)' }}>

        {/* Opening */}
        <section aria-label="The Reserve" style={{ padding: '10rem 2rem 5rem', background: 'var(--color-bg)' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>

            <span style={EYEBROW}>Permanence</span>

            <h1 style={{
              fontFamily:    "'Cormorant Garamond', Georgia, serif",
              fontWeight:    700,
              fontSize:      'clamp(2.2rem, 5vw, 3.5rem)',
              color:         'var(--color-text-primary)',
              lineHeight:    1.15,
              letterSpacing: '-0.02em',
              marginBottom:  '1.25rem',
            }}>
              Your archive does not depend on<br />Basalith&rsquo;s continued existence.
            </h1>

            <p style={{
              fontFamily:  "'Cormorant Garamond', Georgia, serif",
              fontWeight:  300,
              fontSize:    '1.1rem',
              fontStyle:   'italic',
              color:       'var(--color-text-secondary)',
              marginBottom: '0',
            }}>
              It depends on the Reserve.
            </p>

            <div aria-hidden="true" style={GOLD_RULE} />

            {/* Section 1 */}
            <span style={EYEBROW}>What the Reserve Is</span>
            <h2 style={H2}>What the Reserve Is</h2>

            <p style={BODY}>Every active Basalith archive contributes to the Data Custodianship Reserve, a dedicated fund maintained separately from Basalith&rsquo;s operating finances.</p>
            <p style={BODY}>The Reserve has one purpose: to ensure that every family archive survives regardless of what happens to the company that built it.</p>
            <p style={{ ...BODY, color: '#E8E4DC', fontStyle: 'italic' }}>This is what we mean when we say permanent. Not permanent while we are here. Permanent.</p>

          </div>
        </section>

        {/* Section 2 — Guarantees */}
        <section aria-label="What the Reserve Guarantees" style={{ padding: '5rem 2rem', background: 'var(--color-surface-alt)' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>

            <span style={EYEBROW}>What the Reserve Guarantees</span>
            <h2 style={H2}>What the Reserve Guarantees</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginTop: '2rem' }}>
              {GUARANTEES.map(({ n, title, body }) => (
                <div
                  key={n}
                  style={{
                    background:  'linear-gradient(160deg, #1D1D20, #17171A)',
                    border:      '1px solid rgba(255,255,255,0.07)',
                    padding:     '2rem',
                  }}
                >
                  <p style={{
                    fontFamily:    "'Space Mono', 'DM Mono', monospace",
                    fontSize:      '0.58rem',
                    letterSpacing: '0.15em',
                    color:         'rgba(196,162,74,0.5)',
                    marginBottom:  '0.75rem',
                  }}>
                    {n}
                  </p>
                  <p style={{
                    fontFamily:    "'Space Mono', 'DM Mono', monospace",
                    fontSize:      '0.6rem',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase' as const,
                    color:         '#C4A24A',
                    marginBottom:  '0.75rem',
                  }}>
                    {title}
                  </p>
                  <p style={{
                    fontFamily:  "'Cormorant Garamond', Georgia, serif",
                    fontWeight:  300,
                    fontSize:    '1rem',
                    color:       'var(--color-text-secondary)',
                    lineHeight:  1.75,
                  }}>
                    {body}
                  </p>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* Section 3 — Why This Matters */}
        <section aria-label="Why This Matters" style={{ padding: '5rem 2rem', background: 'var(--color-bg)' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>

            <span style={EYEBROW}>Why This Matters</span>
            <h2 style={H2}>Why This Matters</h2>

            <p style={{ ...BODY, fontStyle: 'italic' }}>Most digital services end.</p>
            <p style={{ ...BODY, fontStyle: 'italic' }}>Companies are acquired, pivoted, shut down. The average lifespan of a technology company is measured in years, not decades.</p>
            <p style={{ ...BODY, fontStyle: 'italic' }}>Basalith is building something that is supposed to last centuries.</p>
            <p style={{ ...BODY, fontStyle: 'italic' }}>Those two facts require a serious answer, not a terms of service clause, but an actual structural mechanism that functions independently of our survival.</p>
            <p style={{ ...BODY, fontStyle: 'italic' }}>The Reserve is that mechanism.</p>
            <p style={{ ...BODY, fontStyle: 'italic', marginBottom: 0 }}>It is the reason we can use the word permanent and mean it.</p>

          </div>
        </section>

        {/* Section 4 — Pull quote */}
        <section aria-label="The promise" style={{ padding: '6rem 2rem 8rem', background: 'var(--color-surface-alt)', textAlign: 'center' }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>

            <div aria-hidden="true" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(196,162,74,0.3), transparent)', marginBottom: '3.5rem' }} />

            <p style={{
              fontFamily:  "'Cormorant Garamond', Georgia, serif",
              fontWeight:  300,
              fontSize:    '1.3rem',
              fontStyle:   'italic',
              color:       '#C4A24A',
              lineHeight:  1.7,
              marginBottom: '3rem',
            }}>
              &ldquo;Your great-grandchildren should be able to access this archive.
              <br /><br />
              Not if we&rsquo;re still around.
              Not if the technology still exists in its current form.
              <br /><br />
              Simply, they should be able to access it.
              <br /><br />
              The Reserve exists to make that sentence true.&rdquo;
            </p>

            <a
              href="/pricing"
              style={{
                display:        'inline-block',
                fontFamily:     "'Space Mono', 'DM Mono', monospace",
                fontSize:       '0.6rem',
                letterSpacing:  '0.22em',
                textTransform:  'uppercase' as const,
                color:          '#9DA3A8',
                textDecoration: 'none',
                border:         '1px solid rgba(196,162,74,0.25)',
                padding:        '0.85rem 1.75rem',
              }}
            >
              View stewardship plans →
            </a>

          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
