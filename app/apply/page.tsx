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

export default function ApplyPage() {
  const [form, setForm] = useState({
    name:           '',
    email:          '',
    subject:        '',
    reason:         '',
    referralSource: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(f => ({ ...f, [key]: e.target.value }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/apply', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Submission failed')
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please email legacy@basalith.xyz directly.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <style>{`
        .apply-input:focus {
          border-color: var(--color-gold) !important;
          box-shadow: var(--shadow-gold) !important;
        }
        .apply-input::placeholder {
          color: var(--color-text-faint);
          font-style: italic;
        }
        .apply-input option {
          background: #fff;
          color: var(--color-text-primary);
        }
      `}</style>
      <Nav />
      <main style={{ background: 'var(--color-bg)', minHeight: '100svh' }}>
        <section style={{ maxWidth: '600px', margin: '0 auto', padding: 'clamp(140px,16vw,180px) clamp(24px,6vw,48px) clamp(80px,10vw,120px)' }}>

          {submitted ? (
            <div style={{ textAlign: 'center' }}>
              {/* Gold sigil */}
              <div
                aria-hidden="true"
                style={{
                  width:        '40px',
                  height:       '1px',
                  background:   'var(--color-gold)',
                  margin:       '0 auto 40px',
                }}
              />
              <h1 style={{ ...SERIF, fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '20px', lineHeight: 1.2 }}>
                Your application has been received.
              </h1>
              <p style={{ ...SERIF, fontSize: '1.1rem', fontStyle: 'italic', fontWeight: 300, color: 'var(--color-text-secondary)', lineHeight: 1.9, maxWidth: '420px', margin: '0 auto 32px' }}>
                We review every application personally. If your archive is a good fit you will
                hear from us within 48 hours with your next steps and Legacy Guide assignment.
                <br /><br />
                We will not follow up with rejections.
              </p>
              <p style={{
                fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
                fontSize:      '0.48rem',
                letterSpacing: '0.3em',
                textTransform: 'uppercase' as const,
                color:         'var(--color-gold)',
              }}>
                Basalith · Heritage Nexus Inc.
              </p>
            </div>
          ) : (
            <>
              <p
                style={{
                  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
                  fontSize:      'var(--text-caption)',
                  letterSpacing: '0.35em',
                  textTransform: 'uppercase' as const,
                  color:         'var(--color-gold)',
                  display:       'flex',
                  alignItems:    'center',
                  gap:           '12px',
                  marginBottom:  '24px',
                }}
              >
                <span style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }} aria-hidden="true" />
                Request Your Founding
              </p>

              <h1
                style={{
                  ...SERIF,
                  fontSize:      'var(--text-h1)',
                  fontWeight:    300,
                  lineHeight:    1.15,
                  color:         'var(--color-text-primary)',
                  letterSpacing: '-0.025em',
                  marginBottom:  '20px',
                }}
              >
                Every archive begins<br />with a conversation.
              </h1>

              <p
                style={{
                  ...SERIF,
                  fontSize:     '1.1rem',
                  fontStyle:    'italic',
                  fontWeight:   300,
                  lineHeight:   1.85,
                  color:        'var(--color-text-secondary)',
                  marginBottom: '52px',
                }}
              >
                Tell us a little about yourself and what brings you to Basalith.
                We review every application personally and respond within 48 hours.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                <div>
                  <label style={LABEL} htmlFor="apply-name">Your Name</label>
                  <input
                    id="apply-name"
                    type="text"
                    required
                    placeholder="First and last name"
                    value={form.name}
                    onChange={set('name')}
                    className="apply-input"
                    style={INPUT}
                  />
                </div>

                <div>
                  <label style={LABEL} htmlFor="apply-email">Email Address</label>
                  <input
                    id="apply-email"
                    type="email"
                    required
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={set('email')}
                    className="apply-input"
                    style={INPUT}
                  />
                </div>

                <div>
                  <label style={LABEL} htmlFor="apply-subject">Who is the primary archive subject</label>
                  <select
                    id="apply-subject"
                    required
                    value={form.subject}
                    onChange={set('subject')}
                    className="apply-input"
                    style={{ ...INPUT, cursor: 'pointer', appearance: 'none' as const }}
                  >
                    <option value="" disabled>Select one</option>
                    <option value="Myself">Myself</option>
                    <option value="A parent">A parent</option>
                    <option value="A grandparent">A grandparent</option>
                    <option value="A spouse or partner">A spouse or partner</option>
                    <option value="Someone who has passed">Someone who has passed</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={LABEL} htmlFor="apply-reason">What brings you to Basalith</label>
                  <textarea
                    id="apply-reason"
                    rows={5}
                    required
                    placeholder="Tell us what you are hoping to preserve and why now."
                    value={form.reason}
                    onChange={set('reason')}
                    className="apply-input"
                    style={{ ...INPUT, resize: 'none' as const, lineHeight: 1.75 }}
                  />
                </div>

                <div>
                  <label style={LABEL} htmlFor="apply-source">How did you hear about us</label>
                  <select
                    id="apply-source"
                    required
                    value={form.referralSource}
                    onChange={set('referralSource')}
                    className="apply-input"
                    style={{ ...INPUT, cursor: 'pointer', appearance: 'none' as const }}
                  >
                    <option value="" disabled>Select one</option>
                    <option value="Referred by a Legacy Guide">Referred by a Legacy Guide</option>
                    <option value="Referred by an attorney or advisor">Referred by an attorney or advisor</option>
                    <option value="Found online">Found online</option>
                    <option value="Referred by a friend or family member">Referred by a friend or family member</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {error && (
                  <p style={{ ...SERIF, fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
                    fontSize:      'var(--text-caption)',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase' as const,
                    background:    submitting ? 'rgba(184,150,62,0.6)' : 'var(--color-gold)',
                    color:         '#FAFAF8',
                    border:        'none',
                    borderRadius:  'var(--radius-sm)',
                    padding:       '16px 32px',
                    cursor:        submitting ? 'not-allowed' : 'pointer',
                    width:         '100%',
                    transition:    'background 250ms ease',
                  }}
                  onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLElement).style.background = 'var(--color-gold-light)' }}
                  onMouseLeave={e => { if (!submitting) (e.currentTarget as HTMLElement).style.background = 'var(--color-gold)' }}
                >
                  {submitting ? 'Submitting…' : 'Submit Application'}
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
