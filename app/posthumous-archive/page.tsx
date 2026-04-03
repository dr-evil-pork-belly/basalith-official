import Nav    from '../components/Nav'
import Footer from '../components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'The Posthumous Archive · Basalith',
  description: 'For families who want to build an archive for someone they have lost. What can be built. What it honestly costs. How the process works.',
}

// ── shared tokens ────────────────────────────────────────────────────────────

const EYEBROW: React.CSSProperties = {
  fontFamily:    "'Space Mono', 'DM Mono', monospace",
  fontSize:      '0.62rem',
  letterSpacing: '0.28em',
  textTransform: 'uppercase',
  color:         '#C4A24A',
  marginBottom:  '1.75rem',
  display:       'block',
}

const H1: React.CSSProperties = {
  fontFamily:    "'Cormorant Garamond', Georgia, serif",
  fontWeight:    700,
  fontSize:      'clamp(2.2rem, 5vw, 3.4rem)',
  color:         '#F0EDE6',
  lineHeight:    1.15,
  letterSpacing: '-0.02em',
  marginBottom:  '2rem',
}

const H2: React.CSSProperties = {
  fontFamily:    "'Cormorant Garamond', Georgia, serif",
  fontWeight:    700,
  fontSize:      'clamp(1.7rem, 3.5vw, 2.4rem)',
  color:         '#F0EDE6',
  lineHeight:    1.2,
  letterSpacing: '-0.02em',
  marginBottom:  '1.75rem',
}

const BODY: React.CSSProperties = {
  fontFamily:  "'Cormorant Garamond', Georgia, serif",
  fontWeight:  300,
  fontSize:    '1.1rem',
  color:       '#9DA3A8',
  lineHeight:  1.9,
}

const GOLD_RULE: React.CSSProperties = {
  height:     '1px',
  margin:     '4rem 0',
  background: 'linear-gradient(90deg, transparent, rgba(196,162,74,0.35), transparent)',
}

// ── Section 1 — Opening ──────────────────────────────────────────────────────

function Opening() {
  return (
    <section
      aria-label="Opening"
      style={{
        background: '#0A0908',
        padding:    '8rem 2rem',
      }}
    >
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <span style={EYEBROW}>For families who are starting after</span>

        <h1 style={H1}>
          Some families come to us after the loss.
          <br />Not before it.
        </h1>

        <p style={BODY}>
          They have boxes of photographs no one has labeled. Letters in
          handwriting only one person could read. Voicemails saved for years
          on phones that are starting to fail.
        </p>
        <p style={{ ...BODY, marginTop: '1.5rem' }}>
          They want to know if something can still be built from what remains.
        </p>
        <p
          style={{
            ...BODY,
            marginTop: '1.5rem',
            color:     '#F0EDE6',
            fontStyle: 'italic',
          }}
        >
          It can.
        </p>
      </div>
    </section>
  )
}

// ── Section 2 — The honest truth ─────────────────────────────────────────────

function HonestTruth() {
  return (
    <section
      aria-label="What we can build"
      style={{
        background: '#0A0908',
        padding:    '0 2rem 6rem',
      }}
    >
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div aria-hidden="true" style={GOLD_RULE} />

        <span style={EYEBROW}>What we can build</span>

        <h2 style={H2}>
          An entity bounded by<br />what was left behind.
        </h2>

        <p style={BODY}>
          The entity we build will reflect the archive we are given.
        </p>
        <p style={{ ...BODY, marginTop: '1.5rem' }}>
          A rich archive — one built from thousands of labeled photographs,
          transcribed letters, recorded stories from family members who knew
          them — produces a rich entity. One that speaks in recognizable
          patterns. That carries their known opinions, their specific memories,
          their way of thinking about the world.
        </p>
        <p style={{ ...BODY, marginTop: '1.5rem' }}>
          A sparse archive produces a sparser entity.
        </p>
        <p style={{ ...BODY, marginTop: '1.5rem' }}>
          We will never claim to give you back the person you lost.
        </p>
        <p style={{ ...BODY, marginTop: '1.5rem' }}>
          We will give you the best possible preservation of who they were —
          built from everything your family can provide, and held with the same
          legal and technical permanence as any Basalith archive. That is what
          we can honestly offer. That is what we will deliver.
        </p>
      </div>
    </section>
  )
}

// ── Section 3 — The process ──────────────────────────────────────────────────

const STEPS = [
  {
    n:    '01',
    name: 'Material Assessment',
    body: 'A Senior Archivist reviews everything your family can provide — photographs, letters, documents, audio, video. We tell you honestly what we can build from it.',
  },
  {
    n:    '02',
    name: 'Digitization Guidance',
    body: 'We guide your family through what to scan, photograph, transcribe, and upload. We work with what exists — we never fabricate what doesn\'t.',
  },
  {
    n:    '03',
    name: 'Guided Family Labeling Sessions',
    body: 'Three 90-minute sessions with your family. We surface the photographs. Your family provides the stories. This is where the entity comes alive.',
  },
  {
    n:    '04',
    name: 'Letter and Document Transcription',
    body: 'Written correspondence, journals, notes — transcribed and indexed with their voice intact.',
  },
  {
    n:    '05',
    name: 'Audio and Video Processing',
    body: 'Voicemails, home videos, recordings — processed and integrated into the archive as primary source material.',
  },
  {
    n:    '06',
    name: 'Entity Initialization',
    body: 'The entity is built from everything collected. Initialized. Tested with the family. Delivered with full archive access and legal custodian designation.',
  },
]

function TheProcess() {
  return (
    <section
      aria-label="The Posthumous Founding process"
      style={{
        background: '#0C0B0A',
        padding:    '6rem 2rem',
      }}
    >
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <span style={EYEBROW}>The Posthumous Founding</span>

        <h2 style={H2}>
          Six weeks. Your whole family.<br />Everything that remains.
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', marginTop: '3rem' }}>
          {STEPS.map(({ n, name, body }) => (
            <div
              key={n}
              style={{
                display:   'grid',
                gridTemplateColumns: '3rem 1fr',
                gap:       '1.5rem',
                alignItems: 'start',
              }}
            >
              <span
                style={{
                  fontFamily:    "'Space Mono', 'DM Mono', monospace",
                  fontSize:      '0.62rem',
                  letterSpacing: '0.1em',
                  color:         'rgba(196,162,74,0.45)',
                  paddingTop:    '0.2rem',
                  display:       'block',
                }}
              >
                {n}
              </span>
              <div>
                <p
                  style={{
                    fontFamily:    "'Space Mono', 'DM Mono', monospace",
                    fontSize:      '0.6rem',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color:         '#C4A24A',
                    marginBottom:  '0.6rem',
                  }}
                >
                  {name}
                </p>
                <p style={{ ...BODY, fontSize: '1rem' }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Section 4 — Pricing ──────────────────────────────────────────────────────

function Pricing() {
  return (
    <section
      aria-label="Pricing"
      style={{
        background: '#0A0908',
        padding:    '6rem 2rem',
      }}
    >
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div aria-hidden="true" style={GOLD_RULE} />

        <span style={EYEBROW}>Investment</span>

        <div
          style={{
            border:       '1px solid rgba(196,162,74,0.15)',
            padding:      '2.5rem',
            marginBottom: '2rem',
          }}
        >
          <p
            style={{
              fontFamily:    "'Space Mono', 'DM Mono', monospace",
              fontSize:      '0.58rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color:         '#C4A24A',
              marginBottom:  '0.75rem',
            }}
          >
            The Posthumous Founding
          </p>
          <p
            style={{
              fontFamily:  "'Cormorant Garamond', Georgia, serif",
              fontWeight:  300,
              fontSize:    '2.6rem',
              color:       '#F0EDE6',
              lineHeight:  1,
              marginBottom: '0.4rem',
            }}
          >
            $4,500
          </p>
          <p
            style={{
              fontFamily:    "'Space Mono', 'DM Mono', monospace",
              fontSize:      '0.58rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color:         '#5C6166',
            }}
          >
            One-time engagement fee
          </p>
        </div>

        <p style={{ ...BODY, fontSize: '1rem', marginBottom: '1.5rem' }}>
          Higher than the standard Founding because the labor is different.
          There is no ongoing deposit. There is a fixed body of material and
          six weeks of concentrated work to make the most of what remains.
        </p>

        <p style={{ ...BODY, fontSize: '1rem', marginBottom: '3rem' }}>
          Ongoing stewardship continues at standard Archive or Estate tier
          pricing after the Founding is complete.
        </p>

        <p
          style={{
            fontFamily:  "'Cormorant Garamond', Georgia, serif",
            fontWeight:  300,
            fontSize:    '0.95rem',
            fontStyle:   'italic',
            color:       '#5C6166',
            lineHeight:  1.8,
            marginBottom: '3rem',
            paddingLeft: '1.25rem',
            borderLeft:  '2px solid rgba(196,162,74,0.15)',
          }}
        >
          The Posthumous Founding requires a consultation before engagement.
          Every family&rsquo;s situation is different. We will tell you honestly
          what we can build before you commit to anything.
        </p>

        <a
          href="mailto:legacy@basalith.xyz?subject=Posthumous%20Archive%20Enquiry"
          style={{
            display:       'inline-block',
            fontFamily:    "'Space Mono', 'DM Mono', monospace",
            fontSize:      '0.62rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color:         '#9DA3A8',
            textDecoration: 'none',
            border:        '1px solid rgba(196,162,74,0.3)',
            padding:       '1rem 2rem',
            transition:    'border-color 0.2s, color 0.2s',
          }}
          className="hover:border-amber hover:text-text-primary"
        >
          Request a Consultation
        </a>
      </div>
    </section>
  )
}

// ── Section 5 — The honest caveat ────────────────────────────────────────────

function HonestCaveat() {
  return (
    <section
      aria-label="The honest caveat"
      style={{
        background: '#0C0B0A',
        padding:    '7rem 2rem',
        textAlign:  'center',
      }}
    >
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <p
          style={{
            fontFamily:  "'Cormorant Garamond', Georgia, serif",
            fontWeight:  300,
            fontSize:    '1.3rem',
            fontStyle:   'italic',
            color:       '#9DA3A8',
            lineHeight:  1.85,
            marginBottom: '3rem',
          }}
        >
          &ldquo;We have had families come to us with a single shoebox of
          photographs and a handful of voicemails.
          <br /><br />
          We have had families come to us with forty years of journals and
          thousands of labeled photographs.
          <br /><br />
          Both deserve the same care. Both produce something worth having.
          <br /><br />
          Neither produces the person back.
          <br /><br />
          Nothing does.
          <br /><br />
          But a carefully built archive — honest about what it is and what it
          isn&rsquo;t — can let a family keep talking to someone they thought
          they had lost.&rdquo;
        </p>

        <p
          style={{
            fontFamily:    "'Space Mono', 'DM Mono', monospace",
            fontSize:      '0.44rem',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color:         '#C4A24A',
          }}
        >
          The Posthumous Archive &middot; Basalith &middot; AI
        </p>
      </div>
    </section>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PosthumousArchivePage() {
  return (
    <>
      <Nav />
      <main>
        <Opening />
        <HonestTruth />
        <TheProcess />
        <Pricing />
        <HonestCaveat />
      </main>
      <Footer />
    </>
  )
}
