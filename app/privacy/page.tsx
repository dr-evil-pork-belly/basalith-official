import Nav    from '../components/Nav'
import Footer from '../components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Privacy Policy · Basalith',
  description: 'How Basalith collects, stores, and protects your personal information and archive content.',
}

const EYEBROW: React.CSSProperties = {
  fontFamily:    "'Space Mono', 'DM Mono', monospace",
  fontSize:      '0.58rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase' as const,
  color:         '#C4A24A',
  marginBottom:  '1rem',
  display:       'block',
}

const H2: React.CSSProperties = {
  fontFamily:    "'Cormorant Garamond', Georgia, serif",
  fontWeight:    700,
  fontSize:      '1.35rem',
  color:         '#F0EDE6',
  lineHeight:    1.3,
  marginBottom:  '1rem',
  marginTop:     '3rem',
}

const BODY: React.CSSProperties = {
  fontFamily:  "'Cormorant Garamond', Georgia, serif",
  fontWeight:  300,
  fontSize:    '1rem',
  color:       '#9DA3A8',
  lineHeight:  1.85,
  marginBottom: '0.75rem',
}

const LI: React.CSSProperties = {
  ...{
    fontFamily:  "'Cormorant Garamond', Georgia, serif",
    fontWeight:  300,
    fontSize:    '1rem',
    color:       '#9DA3A8',
    lineHeight:  1.85,
  },
  listStyleType: 'none',
  paddingLeft:   '1rem',
  position:      'relative' as const,
}

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main style={{ background: '#0A0908' }}>
        <section aria-label="Privacy Policy" style={{ padding: '10rem 2rem 8rem' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>

            <span style={EYEBROW}>Legal</span>

            <h1 style={{
              fontFamily:    "'Cormorant Garamond', Georgia, serif",
              fontWeight:    700,
              fontSize:      'clamp(2.5rem, 5vw, 4rem)',
              color:         '#F0EDE6',
              lineHeight:    1.1,
              letterSpacing: '-0.02em',
              marginBottom:  '1rem',
            }}>
              Privacy Policy
            </h1>

            <p style={{
              fontFamily:    "'Space Mono', 'DM Mono', monospace",
              fontSize:      '0.6rem',
              letterSpacing: '0.1em',
              color:         '#5C6166',
              marginBottom:  '3rem',
            }}>
              Last updated: March 2026
            </p>

            <div aria-hidden="true" style={{ height: '1px', background: 'linear-gradient(90deg, rgba(196,162,74,0.4), transparent)', marginBottom: '3rem' }} />

            {/* 1 */}
            <h2 style={H2}>1. Who We Are</h2>
            <p style={BODY}>Basalith is a family archive and digital legacy platform operated by Basalith Inc. We build permanent archives of human memory for families and individuals.</p>
            <p style={BODY}>Contact: <a href="mailto:privacy@basalith.xyz" style={{ color: '#C4A24A', textDecoration: 'none' }}>privacy@basalith.xyz</a></p>

            {/* 2 */}
            <h2 style={H2}>2. What We Collect</h2>
            <p style={BODY}>We collect information you provide directly, including:</p>
            <ul style={{ paddingLeft: 0, margin: '0 0 0.75rem' }}>
              {[
                'Photographs and visual media you upload to your archive',
                'Written stories, labels, and memories you submit',
                'Voice recordings and video you deposit',
                'Personal information including names, relationships, dates, and locations associated with archive content',
                'Contact information for contributors you invite',
                'Payment information processed through our payment provider',
                'Communications between you and Basalith',
              ].map((item) => (
                <li key={item} style={LI}>
                  <span style={{ color: 'rgba(196,162,74,0.5)', marginRight: '0.5rem' }}>·</span>
                  {item}
                </li>
              ))}
            </ul>

            {/* 3 */}
            <h2 style={H2}>3. How We Use Your Information</h2>
            <p style={BODY}>We use the information we collect to:</p>
            <ul style={{ paddingLeft: 0, margin: '0 0 0.75rem' }}>
              {[
                'Build and maintain your family archive',
                'Train your personal AI entity on your authorized archive content only',
                'Send photograph emails and digest notifications to contributors you have designated',
                'Process payments for your stewardship plan',
                'Communicate with you about your archive',
                'Improve our services',
              ].map((item) => (
                <li key={item} style={LI}>
                  <span style={{ color: 'rgba(196,162,74,0.5)', marginRight: '0.5rem' }}>·</span>
                  {item}
                </li>
              ))}
            </ul>
            <p style={{ ...BODY, color: '#E8E4DC', fontStyle: 'italic' }}>We do not sell your personal information or archive content to any third party. Ever.</p>
            <p style={{ ...BODY, fontStyle: 'italic' }}>We do not use your archive content to train general AI models. Your data trains only your entity.</p>

            {/* 4 */}
            <h2 style={H2}>4. How We Store and Protect Your Data</h2>
            <p style={BODY}>Your photographs and archive content are stored in encrypted private storage. Photographs are never publicly accessible. Access requires authenticated credentials specific to your archive.</p>
            <p style={BODY}>We use industry-standard encryption for data in transit and at rest.</p>

            {/* 5 */}
            <h2 style={H2}>5. Face Recognition</h2>
            <p style={BODY}>With your consent, we use face recognition technology to identify individuals across your archive. This technology:</p>
            <ul style={{ paddingLeft: 0, margin: '0 0 0.75rem' }}>
              {[
                'Operates only within your archive',
                'Is never used to identify individuals outside your family\'s photographs',
                'Can be disabled at any time in your archive preferences',
                'Face data is stored only within your archive and never shared',
              ].map((item) => (
                <li key={item} style={LI}>
                  <span style={{ color: 'rgba(196,162,74,0.5)', marginRight: '0.5rem' }}>·</span>
                  {item}
                </li>
              ))}
            </ul>

            {/* 6 */}
            <h2 style={H2}>6. Data Retention</h2>
            <p style={BODY}>Your archive is retained for the duration of your stewardship plan plus a minimum of 24 months following any cancellation to allow for data export.</p>
            <p style={BODY}>The Data Custodianship Reserve ensures archive continuity beyond the life of Basalith as a company. <a href="/custodianship" style={{ color: '#C4A24A', textDecoration: 'none' }}>Learn more about the Reserve →</a></p>

            {/* 7 */}
            <h2 style={H2}>7. Your Rights</h2>
            <p style={BODY}>You have the right to:</p>
            <ul style={{ paddingLeft: 0, margin: '0 0 0.75rem' }}>
              {[
                'Access all data in your archive',
                'Export your complete archive at any time',
                'Delete specific content from your archive',
                'Designate or change your archive Custodian',
                'Opt out of face recognition',
                'Close your account and export your data',
              ].map((item) => (
                <li key={item} style={LI}>
                  <span style={{ color: 'rgba(196,162,74,0.5)', marginRight: '0.5rem' }}>·</span>
                  {item}
                </li>
              ))}
            </ul>
            <p style={BODY}>To exercise any of these rights: <a href="mailto:privacy@basalith.xyz" style={{ color: '#C4A24A', textDecoration: 'none' }}>privacy@basalith.xyz</a></p>

            {/* 8 */}
            <h2 style={H2}>8. Cookies</h2>
            <p style={BODY}>We use essential cookies only, to maintain your authenticated session. We do not use advertising cookies, tracking pixels, or share cookie data with third parties.</p>

            {/* 9 */}
            <h2 style={H2}>9. Children</h2>
            <p style={BODY}>Basalith archives are managed by adults. We do not knowingly collect personal information from children under 13 as primary account holders. Family members of any age may appear in archive photographs as subjects.</p>

            {/* 10 */}
            <h2 style={H2}>10. Changes to This Policy</h2>
            <p style={BODY}>We will notify active account holders of material changes to this policy by email with 30 days notice.</p>

            {/* 11 */}
            <h2 style={H2}>11. Contact</h2>
            <p style={BODY}>Questions about this policy: <a href="mailto:privacy@basalith.xyz" style={{ color: '#C4A24A', textDecoration: 'none' }}>privacy@basalith.xyz</a></p>

          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
