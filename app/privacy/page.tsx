import Nav    from '../components/Nav'
import Footer from '../components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Privacy Policy · Basalith',
  description: 'How Basalith collects, stores, and protects your personal information and archive content.',
  alternates:  { canonical: '/privacy' },
}

const EYEBROW: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  fontSize:      'var(--text-caption)',
  letterSpacing: '0.35em',
  textTransform: 'uppercase' as const,
  color:         'var(--color-gold)',
  marginBottom:  '20px',
  display:       'flex',
  alignItems:    'center',
  gap:           '12px',
}

const H2: React.CSSProperties = {
  fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
  fontWeight:   500,
  fontSize:     '1.35rem',
  color:        'var(--color-text-primary)',
  lineHeight:   1.3,
  marginBottom: '12px',
  marginTop:    '48px',
}

const BODY: React.CSSProperties = {
  fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
  fontWeight:   300,
  fontSize:     '1.05rem',
  color:        'var(--color-text-secondary)',
  lineHeight:   1.85,
  marginBottom: '12px',
}

const LI: React.CSSProperties = {
  fontFamily:    'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
  fontWeight:    300,
  fontSize:      '1.05rem',
  color:         'var(--color-text-secondary)',
  lineHeight:    1.85,
  listStyleType: 'none',
  paddingLeft:   '1rem',
  position:      'relative' as const,
}

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main style={{ background: 'var(--color-bg)' }}>
        <section aria-label="Privacy Policy" style={{ padding: 'clamp(140px,16vw,180px) clamp(24px,6vw,48px) clamp(80px,10vw,120px)' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>

            <p style={EYEBROW}>
              <span style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }} aria-hidden="true" />
              Legal
            </p>

            <h1 style={{
              fontFamily:    'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
              fontWeight:    300,
              fontSize:      'clamp(2.5rem, 5vw, 4rem)',
              color:         'var(--color-text-primary)',
              lineHeight:    1.1,
              letterSpacing: '-0.025em',
              marginBottom:  '16px',
            }}>
              Privacy Policy
            </h1>

            <p style={{
              fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
              fontSize:      '0.52rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color:         'var(--color-text-faint)',
              marginBottom:  '48px',
            }}>
              Last updated: August 2026
            </p>

            <div aria-hidden="true" style={{ height: '1px', background: 'var(--color-border)', marginBottom: '48px' }} />

            {/* 1 */}
            <h2 style={H2}>1. Who We Are</h2>
            <p style={BODY}>Basalith is a family archive and digital legacy platform operated by Heritage Nexus Inc. We build permanent archives of human memory for families and individuals.</p>
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
                'Archive application details submitted through our onboarding flow, including your name, email address, phone number where you provide one, and your selected tier',
                'Contact form messages, including your name, email address, the nature of your enquiry, and any message content you choose to provide',
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
                'Train your entity on your authorized archive content only',
                'Send photograph emails and digest notifications to contributors you have designated',
                'Process payments for your plan',
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
            <p style={{ ...BODY, fontStyle: 'italic' }}>We do not use your archive content to train general-purpose models. Your data trains only your entity.</p>

            {/* 4 */}
            <h2 style={H2}>4. How We Store and Protect Your Data</h2>
            <p style={BODY}>Your photographs and archive content are stored in encrypted private storage. Photographs are never publicly accessible. Access requires authenticated credentials specific to your archive.</p>
            <p style={BODY}>We use industry-standard encryption for data in transit and at rest.</p>

            {/* 5 */}
            <h2 style={H2}>5. Service Providers and Data Location</h2>
            <p style={BODY}>Basalith runs on a small number of named service providers. Each one receives only what it needs to perform its function. None of them may use your archive content for their own purposes, and we do not sell or license your data to any of them.</p>
            <div style={{ marginBottom: '16px' }}>
              {[
                { name: 'Supabase',  role: 'Database and file storage. Servers located in the United States.' },
                { name: 'Vercel',    role: 'Application hosting and scheduled jobs.' },
                { name: 'Anthropic', role: 'Entity responses.' },
                { name: 'OpenAI',    role: 'Transcription of voice and video deposits.' },
                { name: 'Stripe',    role: 'Payment processing. We never receive or store your card number.' },
                { name: 'Resend',    role: 'Email delivery.' },
                { name: 'Twilio',    role: 'Deposits left on the phone line.' },
                { name: 'Backblaze', role: 'Offsite backup copies of photographs, voice recordings, video, and documents.' },
              ].map(row => (
                <div key={row.name} style={{ display: 'flex', gap: '16px', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontFamily: 'var(--font-space-mono, "Space Mono", "Courier New", monospace)', fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', width: '110px', flexShrink: 0, paddingTop: '3px' }}>{row.name}</span>
                  <span style={{ fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)', fontSize: '1rem', fontWeight: 300, color: 'var(--color-text-secondary)' }}>{row.role}</span>
                </div>
              ))}
            </div>
            <p style={BODY}>Your archive content, meaning your photographs, voice recordings, video, and written deposits, is held in the United States.</p>
            <p style={BODY}>The Anthropic API, which powers entity responses, does not train on API submissions by default. Their data usage policy is available at <a href="https://anthropic.com/legal/privacy" style={{ color: '#C4A24A', textDecoration: 'none' }} target="_blank" rel="noopener noreferrer">anthropic.com/legal/privacy</a>.</p>
            <p style={BODY}>Voice and video deposits are sent to OpenAI for transcription. This covers voice recorded in the portal and the iOS app, deposits left on the phone line, and video you upload. Video is sent as a complete file and transcribed from its audio. The spoken language is detected automatically, in every language. Transcription is the only use. No other archive content is sent to OpenAI.</p>

            {/* 6 */}
            <h2 style={H2}>6. Who Can Access Your Data</h2>
            <p style={BODY}>Access is limited to Heritage Nexus Inc. staff and authorized contractors operating under confidentiality obligations, and only where access is necessary to operate or support your archive.</p>
            <p style={BODY}>We do not sell, license, rent, or otherwise transfer your personal data or archive content to third parties for any commercial purpose. We do not share it with data brokers, advertising networks, or research organizations.</p>
            <p style={BODY}>Law enforcement requests are handled in accordance with applicable law. We will notify affected individuals of such requests where we are legally permitted to do so.</p>

            {/* 7 */}
            <h2 style={H2}>7. Face Recognition</h2>
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

            {/* 8 */}
            <h2 style={H2}>8. Data Retention</h2>
            <p style={BODY}>Archive content and enquiry data are governed separately. The two commitments below are not interchangeable, and neither one extends to the other.</p>

            <h3 style={{ ...H2, fontSize: '1.1rem', marginTop: '24px' }}>Your archive</h3>
            <p style={BODY}>You own your archive, and you may request a complete export of it in open, portable formats. Export requests are fulfilled within 30 business days. If a payment is missed, your archive moves to Resting status. Your content is preserved and is never deleted for non-payment. Permanent deletion occurs only when you, or an executor with documented authority, make a verified written request. After that request is verified, we hold the archive for 12 months, then permanently delete it and confirm in writing.</p>
            <p style={BODY}>Because you keep ownership and can export, your archive does not depend on the continued existence of Basalith as a company. Basalith is the custodian, not the owner. <a href="/data-ownership" style={{ color: '#C4A24A', textDecoration: 'none' }}>Read our data ownership commitments →</a></p>

            <h3 style={{ ...H2, fontSize: '1.1rem', marginTop: '24px' }}>Enquiry data</h3>
            <p style={BODY}>Archive applications and contact form submissions are enquiry data. They are not archive content, and the archive commitments above do not apply to them.</p>
            <p style={BODY}>We retain enquiry data for as long as is necessary to manage your enquiry and keep a record of our correspondence. If an enquiry does not result in an active archive, we delete the submission within 24 months of your last interaction with us, or sooner on a verified deletion request. Send deletion requests to <a href="mailto:privacy@basalith.xyz" style={{ color: '#C4A24A', textDecoration: 'none' }}>privacy@basalith.xyz</a> from the address associated with your submission. We confirm receipt within 5 business days and complete the deletion within 30 days, unless we are legally required to retain the data for longer.</p>
            <p style={BODY}>Deleting enquiry data does not affect an active archive. The commitments above apply to archive content and are unchanged by it.</p>

            {/* 9 */}
            <h2 style={H2}>9. Your Rights</h2>
            <p style={BODY}>You have the right to:</p>
            <ul style={{ paddingLeft: 0, margin: '0 0 0.75rem' }}>
              {[
                'Access all data in your archive',
                'Request a complete export of your archive in open formats, fulfilled within 30 business days',
                'Delete specific content from your archive',
                'Designate or change your archive Custodian',
                'Opt out of face recognition',
                'Close your account and request an export of your data',
              ].map((item) => (
                <li key={item} style={LI}>
                  <span style={{ color: 'rgba(196,162,74,0.5)', marginRight: '0.5rem' }}>·</span>
                  {item}
                </li>
              ))}
            </ul>
            <p style={BODY}>To exercise any of these rights: <a href="mailto:privacy@basalith.xyz" style={{ color: '#C4A24A', textDecoration: 'none' }}>privacy@basalith.xyz</a></p>

            {/* 10 */}
            <h2 style={H2}>10. Cookies and Browser Storage</h2>
            <p style={BODY}>We use essential cookies only, to maintain your authenticated session. We do not use advertising cookies, tracking pixels, or third-party analytics scripts, and we do not share cookie data with third parties.</p>
            <p style={BODY}>Our onboarding flow holds your tier selection and the contact details you enter in your browser&rsquo;s localStorage, so the information carries across steps. That data stays on your device and is cleared when you complete the flow or abandon it.</p>

            {/* 11 */}
            <h2 style={H2}>11. Children</h2>
            <p style={BODY}>Basalith archives are managed by adults. We do not knowingly collect personal information from children under 13 as primary account holders. Family members of any age may appear in archive photographs as subjects.</p>

            {/* 12 */}
            <h2 style={H2}>12. Changes to This Policy</h2>
            <p style={BODY}>We will notify active account holders of material changes to this policy by email with 30 days notice.</p>

            {/* 13 */}
            <h2 style={H2}>13. Contact</h2>
            <p style={BODY}>Questions about this policy: <a href="mailto:privacy@basalith.xyz" style={{ color: '#C4A24A', textDecoration: 'none' }}>privacy@basalith.xyz</a></p>

            {/* Ownership section */}
            <div aria-hidden="true" style={{ height: '1px', background: 'var(--color-border)', margin: '48px 0' }} />

            <h2 style={{ ...H2, marginTop: 0 }}>Your Data. Your Archive. Your Heirs.</h2>

            <h3 style={{ ...H2, fontSize: '1.1rem', marginTop: '32px', color: 'var(--color-text-primary)' }}>Ownership After Death</h3>
            <p style={BODY}>Your archive is your property. It does not become ours when you die.</p>
            <p style={BODY}>Upon your death your archive transfers to your designated heirs or estate exactly as you would transfer any other private asset.</p>
            <p style={BODY}>Heritage Nexus Inc. does not acquire any rights to your archive data upon your death. Your cognitive reference model, meaning your deposits, voice recordings, and photographs, is a private digital asset that belongs to your estate.</p>
            <p style={{ ...BODY, fontStyle: 'italic' }}>We are the custodian. You are the owner. Your heirs are the beneficiaries. We are never the inheritor.</p>

            <h3 style={{ ...H2, fontSize: '1.1rem', marginTop: '32px', color: 'var(--color-text-primary)' }}>Company Dissolution</h3>
            <p style={BODY}>If Heritage Nexus Inc. ceases operations for any reason:</p>
            <ul style={{ paddingLeft: 0, margin: '0 0 12px' }}>
              {[
                'You will receive advance notice where circumstances permit.',
                'You can request a complete export of your archive, meaning all deposits, voice recordings, and photographs in standard open formats (JSON, MP3, JPEG), fulfilled within 30 business days.',
                'Your archive data will never be sold to a third party as part of any asset sale, acquisition, or bankruptcy proceeding.',
                'If we are acquired, the acquiring entity must honor these same commitments as a condition of the acquisition.',
              ].map(item => (
                <li key={item} style={LI}>
                  <span style={{ color: 'rgba(196,162,74,0.5)', marginRight: '0.5rem' }}>·</span>{item}
                </li>
              ))}
            </ul>

            <h3 style={{ ...H2, fontSize: '1.1rem', marginTop: '32px', color: 'var(--color-text-primary)' }}>Data Use for Training</h3>
            <p style={BODY}>Your archive data is never used to train models for other users. Not now. Not ever.</p>
            <p style={BODY}>Each archive is a closed system. What you deposit trains your entity. It does not train anyone else&rsquo;s entity. It does not train Basalith&rsquo;s general models. It does not leave your archive except to the service providers named in section 5, and only for the purposes stated there.</p>

            <p style={{ ...BODY, marginTop: '32px' }}>For security questions: <a href="mailto:security@basalith.ai" style={{ color: '#C4A24A', textDecoration: 'none' }}>security@basalith.ai</a></p>

          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
