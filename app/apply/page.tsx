'use client'

import { useState } from 'react'
import Nav    from '../components/Nav'
import Footer from '../components/Footer'

const EYEBROW: React.CSSProperties = {
  fontFamily:    "'Space Mono', 'DM Mono', monospace",
  fontSize:      '0.42rem',
  letterSpacing: '0.4em',
  textTransform: 'uppercase' as const,
  color:         '#C4A24A',
  display:       'block',
  marginBottom:  '1.25rem',
}

const LABEL: React.CSSProperties = {
  display:       'block',
  fontFamily:    "'Space Mono', 'DM Mono', monospace",
  fontSize:      '0.42rem',
  letterSpacing: '0.25em',
  textTransform: 'uppercase' as const,
  color:         '#5C6166',
  marginBottom:  '0.65rem',
}

const INPUT: React.CSSProperties = {
  width:          '100%',
  background:     'transparent',
  border:         'none',
  borderBottom:   '1px solid rgba(196,162,74,0.2)',
  outline:        'none',
  fontFamily:     "'Cormorant Garamond', Georgia, serif",
  fontSize:       '1rem',
  color:          '#F0EDE6',
  padding:        '0.4rem 0 0.6rem',
  lineHeight:     1.5,
}

const SELECT: React.CSSProperties = {
  ...INPUT,
  cursor:      'pointer',
  appearance:  'none' as const,
}

function Sigil({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="20" y="3"  width="12" height="12" transform="rotate(45 20 3)"  fill="none" stroke="rgba(196,162,74,0.45)" strokeWidth="1"/>
      <rect x="20" y="10" width="8"  height="8"  transform="rotate(45 20 10)" fill="none" stroke="rgba(196,162,74,0.75)" strokeWidth="1"/>
      <rect x="20" y="16" width="4"  height="4"  transform="rotate(45 20 16)" fill="rgba(196,162,74,0.95)"/>
    </svg>
  )
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

  const focusStyle = `
    input:focus, select:focus, textarea:focus {
      border-bottom-color: rgba(196,162,74,0.5) !important;
    }
    select option {
      background: #111112;
      color: #F0EDE6;
    }
    ::placeholder {
      color: #3A3F44;
      font-style: italic;
    }
  `

  return (
    <>
      <style>{focusStyle}</style>
      <Nav />
      <main style={{ background: '#0A0908', minHeight: '100vh' }}>
        <section style={{ maxWidth: '600px', margin: '0 auto', padding: '10rem 2rem 8rem' }}>

          {submitted ? (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <Sigil size={32} />
              <h1 style={{
                fontFamily:    "'Cormorant Garamond', Georgia, serif",
                fontWeight:    700,
                fontSize:      '1.5rem',
                color:         '#F0EDE6',
                lineHeight:    1.2,
                margin:        0,
              }}>
                Your application has been received.
              </h1>
              <p style={{
                fontFamily:  "'Cormorant Garamond', Georgia, serif",
                fontWeight:  300,
                fontSize:    '1rem',
                fontStyle:   'italic',
                color:       '#9DA3A8',
                lineHeight:  1.9,
                maxWidth:    '480px',
                margin:      0,
              }}>
                We review every application personally.<br /><br />
                If your archive is a good fit you will hear from us within 48 hours
                with your next steps and Legacy Guide assignment.<br /><br />
                We will not follow up with rejections.
              </p>
              <p style={{
                fontFamily:    "'Space Mono', 'DM Mono', monospace",
                fontSize:      '0.42rem',
                letterSpacing: '0.3em',
                color:         '#C4A24A',
                marginTop:     '1rem',
              }}>
                BASALITH · HERITAGE NEXUS INC.
              </p>
            </div>
          ) : (
            <>
              <span style={EYEBROW}>Request Your Founding</span>

              <h1 style={{
                fontFamily:    "'Cormorant Garamond', Georgia, serif",
                fontWeight:    700,
                fontSize:      'clamp(2rem, 4vw, 3rem)',
                color:         '#F0EDE6',
                lineHeight:    1.15,
                letterSpacing: '-0.02em',
                marginBottom:  '1.5rem',
              }}>
                Every archive begins<br />with a conversation.
              </h1>

              <p style={{
                fontFamily:  "'Cormorant Garamond', Georgia, serif",
                fontWeight:  300,
                fontSize:    '1.05rem',
                fontStyle:   'italic',
                color:       '#9DA3A8',
                lineHeight:  1.85,
                maxWidth:    '520px',
                marginBottom: '3.5rem',
              }}>
                Tell us a little about yourself and what brings you to Basalith.
                We review every application personally and respond within 48 hours.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

                <div>
                  <label style={LABEL}>Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="First and last name"
                    value={form.name}
                    onChange={set('name')}
                    style={INPUT}
                  />
                </div>

                <div>
                  <label style={LABEL}>Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={set('email')}
                    style={INPUT}
                  />
                </div>

                <div>
                  <label style={LABEL}>Who is the primary archive subject</label>
                  <select required value={form.subject} onChange={set('subject')} style={SELECT}>
                    <option value="" disabled style={{ color: '#3A3F44' }}>Select one</option>
                    <option value="Myself">Myself</option>
                    <option value="A parent">A parent</option>
                    <option value="A grandparent">A grandparent</option>
                    <option value="A spouse or partner">A spouse or partner</option>
                    <option value="Someone who has passed">Someone who has passed</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={LABEL}>What brings you to Basalith</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Tell us what you are hoping to preserve and why now."
                    value={form.reason}
                    onChange={set('reason')}
                    style={{ ...INPUT, resize: 'none' as const, lineHeight: 1.7 }}
                  />
                </div>

                <div>
                  <label style={LABEL}>How did you hear about us</label>
                  <select required value={form.referralSource} onChange={set('referralSource')} style={SELECT}>
                    <option value="" disabled style={{ color: '#3A3F44' }}>Select one</option>
                    <option value="Referred by a Legacy Guide">Referred by a Legacy Guide</option>
                    <option value="Referred by an attorney or advisor">Referred by an attorney or advisor</option>
                    <option value="Found online">Found online</option>
                    <option value="Referred by a friend or family member">Referred by a friend or family member</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {error && (
                  <p style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize:   '0.52rem',
                    color:      '#9DA3A8',
                    letterSpacing: '0.06em',
                  }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    fontFamily:      "'Space Mono', 'DM Mono', monospace",
                    fontSize:        '0.44rem',
                    letterSpacing:   '0.3em',
                    textTransform:   'uppercase' as const,
                    background:      submitting ? 'rgba(196,162,74,0.5)' : '#C4A24A',
                    color:           '#0A0908',
                    border:          'none',
                    padding:         '1rem 2rem',
                    cursor:          submitting ? 'not-allowed' : 'pointer',
                    width:           '100%',
                    transition:      'background 0.2s',
                  }}
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
