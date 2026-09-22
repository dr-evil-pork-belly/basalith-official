import Nav    from '../components/Nav'
import Footer from '../components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Security · Basalith',
  description: 'How we protect your Basalith. Encryption, access control, and infrastructure transparency.',
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
const CODE: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  fontSize:      '0.85rem',
  letterSpacing: '0.05em',
  color:         'var(--color-gold)',
  background:    'rgba(184,150,62,0.08)',
  padding:       '2px 6px',
  borderRadius:  '3px',
}

const INFRA = [
  { label: 'Database',      value: 'Supabase (PostgreSQL on AWS)' },
  { label: 'File storage',  value: 'Supabase Storage (AWS S3)' },
  { label: 'Offsite backup', value: 'Backblaze B2' },
  { label: 'Application',   value: 'Vercel (AWS/GCP edge network)' },
  { label: 'AI processing', value: 'Anthropic API' },
  { label: 'Transcription', value: 'OpenAI Whisper API' },
]

export default function SecurityPage() {
  return (
    <>
      <Nav />
      <main style={{ background: 'var(--color-bg)' }}>
        <section aria-label="Security" style={{ padding: 'clamp(140px,16vw,180px) clamp(24px,6vw,48px) clamp(80px,10vw,120px)' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>

            <p style={EYEBROW}>
              <span style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }} aria-hidden="true" />
              Security
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
              How We Protect Your Basalith
            </h1>

            <p style={{
              fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
              fontSize:      '0.52rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase' as const,
              color:         'var(--color-text-faint)',
              marginBottom:  '48px',
            }}>
              Last updated: September 2026
            </p>

            <div aria-hidden="true" style={{ height: '1px', background: 'var(--color-border)', marginBottom: '48px' }} />

            {/* 1 — Encryption */}
            <h2 style={H2}>1. Encryption</h2>
            <p style={BODY}>Your data is encrypted at rest and in transit.</p>
            <p style={BODY}><strong>At rest:</strong> Supabase encrypts all data at rest using <span style={CODE}>AES-256</span> encryption. Your voice recordings, photographs, and deposits are stored in private storage buckets, not publicly accessible under any circumstances.</p>
            <p style={BODY}><strong>In transit:</strong> All data transmitted between your devices and Basalith uses <span style={CODE}>TLS 1.3</span> encryption. No data travels unencrypted.</p>

            {/* 2 — Access Control */}
            <h2 style={H2}>2. Access Control</h2>
            <p style={BODY}>Only designated people can access your Basalith.</p>
            <ul style={{ paddingLeft: 0, margin: '0 0 12px' }}>
              {[
                'Owners and successors: Sign-in is passwordless. You enter your email address and we send a one-time link. No password is stored anywhere, so there is none to guess, none reused from a site that was breached, and none to steal from us.',
                'Contributors: Authenticated via a 64-character token drawn from a cryptographically secure random source, not guessable by brute force.',
                'iOS app: Authenticated with a token issued by Supabase Auth and verified server-side on every request. A forged or expired token is refused exactly like a missing one.',
                'Database isolation: Row Level Security is enforced on every table at the database level, not just the application level. Even a misconfigured application cannot access data across the boundary of one Basalith.',
                'Route enforcement: Every signed-in address is checked for a valid session before the page is resolved, not inside it.',
                'No shared access: Your data is never visible to other owners, to contributors of another Basalith, or to Basalith employees in the normal course of operations.',
              ].map(item => (
                <li key={item} style={LI}>
                  <span style={{ color: 'rgba(196,162,74,0.5)', marginRight: '0.5rem' }}>·</span>{item}
                </li>
              ))}
            </ul>

            {/* 3 — Infrastructure */}
            <h2 style={H2}>3. Cloud Infrastructure</h2>
            <p style={BODY}>Basalith processes data on cloud infrastructure. Here is exactly where.</p>
            <p style={{ ...BODY, marginBottom: '8px' }}>Where your data lives:</p>
            <div style={{ marginBottom: '16px' }}>
              {INFRA.map(row => (
                <div key={row.label} style={{ display: 'flex', gap: '16px', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontFamily: 'var(--font-space-mono)', fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', width: '130px', flexShrink: 0, paddingTop: '3px' }}>{row.label}</span>
                  <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1rem', fontWeight: 300, color: 'var(--color-text-secondary)' }}>{row.value}</span>
                </div>
              ))}
            </div>
            <p style={BODY}>Each platform has its own security certifications (SOC 2, ISO 27001).</p>
            <p style={BODY}>Anthropic does not train on API data by default. Your deposits and entity conversations do not improve Anthropic&rsquo;s general models.</p>
            <p style={BODY}>Voice and video recordings are sent to OpenAI for transcription. This covers voice recorded in the portal and the iOS app, deposits left on the phone line, and video you upload. Video is sent as a complete file and transcribed from its audio. The spoken language is detected automatically. Transcription is the only use. Nothing else on your record is sent to OpenAI.</p>
            <p style={BODY}>For enterprise clients with specific data residency requirements contact <a href="mailto:enterprise@basalith.ai" style={{ color: '#C4A24A', textDecoration: 'none' }}>enterprise@basalith.ai</a></p>

            {/* 4 - Passwords and MFA */}
            <h2 style={H2}>4. Passwords and Multi-Factor Authentication</h2>
            <p style={{ ...BODY, color: 'var(--color-gold)', fontStyle: 'italic' }}>Basalith has no passwords.</p>
            <p style={BODY}>Sign-in works by sending a one-time link to your email address. Whoever holds that inbox can sign in, and nobody else can. That removes the most common way accounts are lost, which is a password reused on a site that was later breached, and it means there is no credential of ours for an attacker to steal.</p>
            <p style={BODY}>It also means your Basalith is as protected as the email account it is registered to. So the advice that matters is about that account, not about us:</p>
            <ul style={{ paddingLeft: 0, margin: '0 0 12px' }}>
              {[
                'Turn on two-factor authentication with your email provider.',
                'Use a password there that you use nowhere else.',
                'Tell us immediately if you think someone else can read that inbox.',
              ].map(item => (
                <li key={item} style={LI}>
                  <span style={{ color: 'rgba(196,162,74,0.5)', marginRight: '0.5rem' }}>·</span>{item}
                </li>
              ))}
            </ul>
            <p style={BODY}>A second factor at sign-in is something we intend to add. Doing it without locking out a family who is entitled to reach an archive, at the moment they most need to, is the part that takes care.</p>

            {/* Contact */}
            <div aria-hidden="true" style={{ height: '1px', background: 'var(--color-border)', margin: '48px 0 32px' }} />
            <p style={BODY}>Security concerns: <a href="mailto:security@basalith.ai" style={{ color: '#C4A24A', textDecoration: 'none' }}>security@basalith.ai</a></p>
            <p style={BODY}>General privacy questions: <a href="mailto:privacy@basalith.ai" style={{ color: '#C4A24A', textDecoration: 'none' }}>privacy@basalith.ai</a></p>

          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
