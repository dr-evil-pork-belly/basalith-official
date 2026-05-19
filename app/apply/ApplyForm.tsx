'use client'

import { useState } from 'react'
import Nav    from '../components/Nav'
import Footer from '../components/Footer'

const LABEL: React.CSSProperties = {
  display:       'block',
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  fontSize:      '0.52rem',
  letterSpacing: '0.3em',
  textTransform: 'uppercase' as const,
  color:         'var(--color-text-muted)',
  marginBottom:  '8px',
}
const INPUT: React.CSSProperties = {
  width:        '100%',
  background:   'var(--color-surface)',
  border:       '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  outline:      'none',
  fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
  fontSize:     '1.1rem',
  fontWeight:   300,
  color:        'var(--color-text-primary)',
  padding:      '14px 16px',
  lineHeight:   1.5,
  boxSizing:    'border-box' as const,
  transition:   'border-color 200ms ease, box-shadow 200ms ease',
}
const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}
const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.28em',
}

type ApplyType = 'legacy' | 'succession'

export default function ApplyForm({ initialType = 'legacy' }: { initialType?: string }) {
  const [applyType, setApplyType] = useState<ApplyType>(
    initialType === 'succession' ? 'succession' : 'legacy'
  )
  const [form, setForm] = useState({
    name:              '',
    email:             '',
    companyName:       '',
    industry:          '',
    employees:         '',
    successionTimeline:'',
    subject:           '',
    reason:            '',
    referralSource:    '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/apply', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, applyType }),
      })
      if (!res.ok) throw new Error('Submission failed')
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please email legacy@basalith.xyz directly.')
    } finally {
      setSubmitting(false)
    }
  }

  const isBusiness = applyType === 'succession'

  return (
    <>
      <style>{`
        .apply-input:focus { border-color: var(--color-gold) !important; box-shadow: var(--shadow-gold) !important; }
        .apply-input::placeholder { color: var(--color-text-faint); font-style: italic; }
        .apply-input option { background: #fff; color: var(--color-text-primary); }
        .type-btn { transition: all 200ms ease; }
      `}</style>
      <Nav />
      <main style={{ background: 'var(--color-bg)', minHeight: '100svh' }}>
        <section style={{ maxWidth: '600px', margin: '0 auto', padding: 'clamp(140px,16vw,180px) clamp(24px,6vw,48px) clamp(80px,10vw,120px)' }}>

          {submitted ? (
            <div style={{ textAlign: 'center' }}>
              <div aria-hidden="true" style={{ width: '40px', height: '1px', background: 'var(--color-gold)', margin: '0 auto 40px' }} />
              <h1 style={{ ...SERIF, fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '20px', lineHeight: 1.2 }}>
                {isBusiness ? 'Your succession inquiry has been received.' : 'Your application has been received.'}
              </h1>
              <p style={{ ...SERIF, fontSize: '1.1rem', fontStyle: 'italic', fontWeight: 300, color: 'var(--color-text-secondary)', lineHeight: 1.9, maxWidth: '420px', margin: '0 auto 32px' }}>
                {isBusiness
                  ? 'A Legacy Guide will be in touch within 48 hours to discuss your succession requirements.'
                  : <>We review every application personally. If your archive is a good fit you will hear from us within 48 hours with your next steps and Legacy Guide assignment.<br /><br />We will not follow up with rejections.</>}
              </p>
              <p style={{ ...MONO, fontSize: '0.48rem', color: 'var(--color-gold)' }}>Basalith · Heritage Nexus Inc.</p>
            </div>
          ) : (
            <>
              <h1 style={{ ...SERIF, fontSize: 'var(--text-h1)', fontWeight: 300, lineHeight: 1.15, color: 'var(--color-text-primary)', letterSpacing: '-0.025em', marginBottom: '32px' }}>
                Begin.
              </h1>

              {/* Type selector */}
              <div style={{ marginBottom: '40px' }}>
                <p style={{ ...LABEL, marginBottom: '12px' }}>I am applying for</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {(['legacy', 'succession'] as ApplyType[]).map(type => (
                    <button key={type} type="button" className="type-btn"
                      onClick={() => setApplyType(type)}
                      style={{
                        ...MONO, fontSize: '0.52rem', flex: 1, height: '48px',
                        border:     `1px solid ${applyType === type ? 'var(--color-gold)' : 'var(--color-border)'}`,
                        background: applyType === type ? 'var(--color-gold)' : 'transparent',
                        color:      applyType === type ? 'var(--color-surface)' : 'var(--color-text-muted)',
                        cursor: 'pointer', borderRadius: 'var(--radius-sm)',
                      }}>
                      {type === 'legacy' ? 'Personal Legacy' : 'Business Succession'}
                    </button>
                  ))}
                </div>
              </div>

              {isBusiness && (
                <p style={{ ...SERIF, fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.85, color: 'var(--color-text-secondary)', marginBottom: '40px' }}>
                  A Legacy Guide will contact you within 48 hours to discuss your founder&rsquo;s succession program.
                </p>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                <div>
                  <label style={LABEL} htmlFor="apply-name">{isBusiness ? 'Founder Name' : 'Your Name'}</label>
                  <input id="apply-name" type="text" required placeholder="First and last name"
                    value={form.name} onChange={set('name')} className="apply-input" style={INPUT} />
                </div>

                <div>
                  <label style={LABEL} htmlFor="apply-email">Email Address</label>
                  <input id="apply-email" type="email" required placeholder="your@email.com"
                    value={form.email} onChange={set('email')} className="apply-input" style={INPUT} />
                </div>

                {isBusiness && (
                  <>
                    <div>
                      <label style={LABEL} htmlFor="apply-company">Company Name</label>
                      <input id="apply-company" type="text" required placeholder="Your company"
                        value={form.companyName} onChange={set('companyName')} className="apply-input" style={INPUT} />
                    </div>
                    <div>
                      <label style={LABEL} htmlFor="apply-industry">Industry</label>
                      <input id="apply-industry" type="text" required placeholder="e.g. Manufacturing, Financial Services"
                        value={form.industry} onChange={set('industry')} className="apply-input" style={INPUT} />
                    </div>
                    <div>
                      <label style={LABEL} htmlFor="apply-employees">Number of Employees</label>
                      <select id="apply-employees" required value={form.employees} onChange={set('employees')}
                        className="apply-input" style={{ ...INPUT, cursor: 'pointer', appearance: 'none' as const }}>
                        <option value="" disabled>Select range</option>
                        <option>1 to 10</option><option>11 to 50</option>
                        <option>51 to 200</option><option>201 to 1000</option><option>1000+</option>
                      </select>
                    </div>
                    <div>
                      <label style={LABEL} htmlFor="apply-timeline">Succession Timeline</label>
                      <select id="apply-timeline" required value={form.successionTimeline} onChange={set('successionTimeline')}
                        className="apply-input" style={{ ...INPUT, cursor: 'pointer', appearance: 'none' as const }}>
                        <option value="" disabled>Select one</option>
                        <option>Within 1 year</option><option>1 to 3 years</option>
                        <option>3 to 5 years</option><option>Planning ahead</option>
                      </select>
                    </div>
                  </>
                )}

                {!isBusiness && (
                  <div>
                    <label style={LABEL} htmlFor="apply-subject">Who is the primary archive subject</label>
                    <select id="apply-subject" required value={form.subject} onChange={set('subject')}
                      className="apply-input" style={{ ...INPUT, cursor: 'pointer', appearance: 'none' as const }}>
                      <option value="" disabled>Select one</option>
                      <option>Myself</option><option>A parent</option><option>A grandparent</option>
                      <option>A spouse or partner</option><option>Someone who has passed</option><option>Other</option>
                    </select>
                  </div>
                )}

                <div>
                  <label style={LABEL} htmlFor="apply-reason">{isBusiness ? 'Tell us about your succession situation' : 'What brings you to Basalith'}</label>
                  <textarea id="apply-reason" rows={5} required
                    placeholder={isBusiness ? 'Describe the founder, the business, and what you are hoping to preserve.' : 'Tell us what you are hoping to preserve and why now.'}
                    value={form.reason} onChange={set('reason')}
                    className="apply-input" style={{ ...INPUT, resize: 'none' as const, lineHeight: 1.75 }} />
                </div>

                <div>
                  <label style={LABEL} htmlFor="apply-source">How did you hear about us</label>
                  <select id="apply-source" required value={form.referralSource} onChange={set('referralSource')}
                    className="apply-input" style={{ ...INPUT, cursor: 'pointer', appearance: 'none' as const }}>
                    <option value="" disabled>Select one</option>
                    <option>Referred by a Legacy Guide</option>
                    <option>Referred by an attorney or advisor</option>
                    <option>Found online</option>
                    <option>Referred by a friend or family member</option>
                    <option>Other</option>
                  </select>
                </div>

                {error && <p style={{ ...SERIF, fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>{error}</p>}

                <button type="submit" disabled={submitting}
                  style={{
                    ...MONO, fontSize: 'var(--text-caption)',
                    background: submitting ? 'rgba(184,150,62,0.6)' : 'var(--color-gold)',
                    color: '#FAFAF8', border: 'none', borderRadius: 'var(--radius-sm)',
                    padding: '16px 32px', cursor: submitting ? 'not-allowed' : 'pointer',
                    width: '100%', transition: 'background 250ms ease',
                  }}
                  onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLElement).style.background = 'var(--color-gold-light)' }}
                  onMouseLeave={e => { if (!submitting) (e.currentTarget as HTMLElement).style.background = 'var(--color-gold)' }}
                >
                  {submitting ? 'Submitting...' : isBusiness ? 'Submit Succession Inquiry' : 'Submit Application'}
                </button>

              </form>
            </>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}
