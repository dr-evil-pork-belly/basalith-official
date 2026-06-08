import Nav    from '../components/Nav'
import Footer from '../components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Security · Basalith',
  description: 'How Basalith protects your archive. Encryption, access control, voice clone security, and infrastructure transparency.',
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
  { label: 'Application',   value: 'Vercel (AWS/GCP edge network)' },
  { label: 'AI processing', value: 'Anthropic API' },
  { label: 'Voice synthesis', value: 'ElevenLabs API' },
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
              How We Protect Your Archive
            </h1>

            <p style={{
              fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
              fontSize:      '0.52rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase' as const,
              color:         'var(--color-text-faint)',
              marginBottom:  '48px',
            }}>
              Last updated: May 2026
            </p>

            <div aria-hidden="true" style={{ height: '1px', background: 'var(--color-border)', marginBottom: '48px' }} />

            {/* 1 — Encryption */}
            <h2 style={H2}>1. Encryption</h2>
            <p style={BODY}>Your data is encrypted at rest and in transit.</p>
            <p style={BODY}><strong>At rest:</strong> Supabase encrypts all data at rest using <span style={CODE}>AES-256</span> encryption. Your voice recordings, photographs, and deposits are stored in private storage buckets, not publicly accessible under any circumstances.</p>
            <p style={BODY}><strong>In transit:</strong> All data transmitted between your devices and Basalith uses <span style={CODE}>TLS 1.3</span> encryption. No data travels unencrypted.</p>
            <p style={BODY}><strong>Voice clone data:</strong> Your ElevenLabs voice clone is stored under your archive&rsquo;s private identifier. The voice ID is never publicly accessible. Voice portraits are served through time-limited signed URLs that expire after 1 hour.</p>

            {/* 2 — Access Control */}
            <h2 style={H2}>2. Access Control</h2>
            <p style={BODY}>Only designated people can access your archive.</p>
            <ul style={{ paddingLeft: 0, margin: '0 0 12px' }}>
              {[
                'Archive owners: Authenticated via bcrypt-hashed passwords with 12 salt rounds, the same standard used by banks.',
                'Contributors: Authenticated via 64-character cryptographically random tokens generated using crypto.getRandomValues, not guessable by brute force.',
                'Database isolation: Row Level Security is enforced on every table at the database level, not just the application level. Even a misconfigured application cannot access data across archive boundaries.',
                'No shared access: Your archive data is never visible to other archive owners, contributors of other archives, or Basalith employees in the normal course of operations.',
              ].map(item => (
                <li key={item} style={LI}>
                  <span style={{ color: 'rgba(196,162,74,0.5)', marginRight: '0.5rem' }}>·</span>{item}
                </li>
              ))}
            </ul>

            {/* 3 — Voice Clone */}
            <h2 style={H2}>3. Voice Clone Security</h2>
            <p style={BODY}>Voice clone data is one of the most sensitive assets in your archive. We treat it accordingly.</p>
            <p style={BODY}>Your voice clone is created from recordings you provide. The clone is stored under a private identifier associated only with your archive.</p>
            <p style={BODY}>Voice portraits are delivered via time-limited signed URLs. They cannot be forwarded or accessed after expiry.</p>
            <p style={BODY}>We do not use your voice clone for any purpose other than generating your voice portraits. It is not accessible to other archives, other users, or third parties.</p>
            <p style={BODY}>If you suspect your voice data has been compromised contact us immediately: <a href="mailto:security@basalith.ai" style={{ color: '#C4A24A', textDecoration: 'none' }}>security@basalith.ai</a></p>

            {/* 4 — Infrastructure */}
            <h2 style={H2}>4. Cloud Infrastructure</h2>
            <p style={BODY}>Basalith processes data on cloud infrastructure. We are transparent about this.</p>
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
            <p style={BODY}>For enterprise clients with specific data residency requirements contact <a href="mailto:enterprise@basalith.ai" style={{ color: '#C4A24A', textDecoration: 'none' }}>enterprise@basalith.ai</a></p>

            {/* 5 — MFA */}
            <h2 style={H2}>5. Multi-Factor Authentication</h2>
            <p style={{ ...BODY, color: 'var(--color-gold)', fontStyle: 'italic' }}>Coming Q3 2026.</p>
            <p style={BODY}>Multi-factor authentication for archive login is on our roadmap. Until MFA is available:</p>
            <ul style={{ paddingLeft: 0, margin: '0 0 12px' }}>
              {[
                'Use a unique, strong password for your Basalith archive.',
                'Do not share your password with anyone except designated Legacy Guide contacts.',
                'Contact us immediately if you suspect unauthorized access.',
              ].map(item => (
                <li key={item} style={LI}>
                  <span style={{ color: 'rgba(196,162,74,0.5)', marginRight: '0.5rem' }}>·</span>{item}
                </li>
              ))}
            </ul>

            {/* Contact */}
            <div aria-hidden="true" style={{ height: '1px', background: 'var(--color-border)', margin: '48px 0 32px' }} />
            <p style={BODY}>Security concerns: <a href="mailto:security@basalith.ai" style={{ color: '#C4A24A', textDecoration: 'none' }}>security@basalith.ai</a></p>
            <p style={BODY}>General privacy questions: <a href="mailto:privacy@basalith.xyz" style={{ color: '#C4A24A', textDecoration: 'none' }}>privacy@basalith.xyz</a></p>

          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
