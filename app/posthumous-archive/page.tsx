import Nav    from '../components/Nav'
import Footer from '../components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'The Witness Archive',
  description: 'Build a permanent AI entity from the memories of everyone who loved them. The Witness Archive by Basalith.',
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
  color:       '#B8B4AB',
  lineHeight:  1.9,
  marginBottom: '1.5rem',
}

const GOLD_RULE: React.CSSProperties = {
  height:     '1px',
  margin:     '4rem 0',
  background: 'linear-gradient(90deg, transparent, rgba(196,162,74,0.35), transparent)',
}

// ── Section 1 — Opening ──────────────────────────────────────────────────────

function Opening() {
  return (
    <section aria-label="Opening" style={{ background: '#0A0908', padding: 'clamp(7rem,12vw,10rem) 2rem 6rem' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <span style={EYEBROW}>The Witness Archive</span>

        <h1 style={H1}>
          The people who loved them remember things<br />
          they never knew about themselves.
        </h1>

        <p style={BODY}>Every Basalith archive is built from two directions simultaneously.</p>

        <p style={BODY}>
          The subject deposits their own memories, wisdom, and beliefs —
          the inside looking out.
        </p>

        <p style={BODY}>
          The people who knew them contribute what they observed, what they witnessed,
          what only they could see — the outside looking in.
        </p>

        <p style={BODY}>
          The combination of both produces the most accurate possible representation
          of a human life.
        </p>

        <p style={BODY}>
          When someone has passed, the inside data is frozen at whatever was deposited
          while they were alive. But the outside data — the witness perspective —
          is fully available.
        </p>

        <p style={{ ...BODY, color: '#F0EDE6', fontStyle: 'italic', marginBottom: 0 }}>
          And witnesses, it turns out, often carry things about a person
          that the person never knew about themselves.
        </p>
      </div>
    </section>
  )
}

// ── Section 2 — What witnesses carry ────────────────────────────────────────

function WitnessesCarry() {
  return (
    <section aria-label="What witnesses carry" style={{ background: '#0C0B0A', padding: '6rem 2rem' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <span style={EYEBROW}>What Witnesses Carry</span>

        <h2 style={H2}>
          A daughter remembers her father&rsquo;s patience in moments
          he never thought of as patient.
        </h2>

        <p style={BODY}>
          A colleague remembers a decision that seemed small to the leader
          but changed everything for the team.
        </p>

        <p style={BODY}>
          A childhood friend remembers who someone was before they became
          who they thought they were.
        </p>

        <p style={BODY}>
          A spouse remembers who they were when no one was watching.
        </p>

        <p style={BODY}>
          These observations are not secondary to the archive. In many ways they
          are the archive&rsquo;s most valuable data — because they capture dimensions
          of a person that the person themselves would never think to deposit.
        </p>

        <p style={BODY}>
          When someone has passed, the witness perspective becomes everything.
          And it is often richest immediately after a loss — when family members
          are thinking about the person constantly, when memories are surfacing,
          when stories are being told at gatherings that have never been told before.
        </p>

        <p style={{ ...BODY, color: '#F0EDE6', fontStyle: 'italic', marginBottom: 0 }}>
          That is the moment to begin.
        </p>
      </div>
    </section>
  )
}

// ── Section 3 — What we can build ───────────────────────────────────────────

function WhatWeCanBuild() {
  return (
    <section aria-label="What we can build" style={{ background: '#0A0908', padding: '6rem 2rem' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div aria-hidden="true" style={GOLD_RULE} />

        <span style={EYEBROW}>What We Can Build</span>

        <h2 style={H2}>
          An entity built from what remains —<br />
          and what the people who loved them remember.
        </h2>

        <p style={BODY}>The entity we build will reflect the archive we are given.</p>

        <p style={BODY}>
          A witness archive built from thousands of labeled photographs, transcribed
          letters, guided family sessions, voicemails, and structured witness
          observations — produces an entity of genuine depth. One that speaks
          in recognizable patterns. That carries known opinions, specific memories,
          a particular way of thinking about the world.
        </p>

        <p style={BODY}>A sparse witness archive produces a sparser entity.</p>

        <p style={BODY}>We will never claim to give you back the person you lost.</p>

        <p style={{ ...BODY, marginBottom: 0 }}>
          We will build the most complete possible preservation of who they were —
          from everything that remains and everything the people who loved them remember.
          That is what we can honestly offer. That is what we will deliver.
        </p>
      </div>
    </section>
  )
}

// ── Section 4 — The missing piece ───────────────────────────────────────────

function MissingPiece() {
  return (
    <section aria-label="The missing piece" style={{ background: '#0C0B0A', padding: '6rem 2rem' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <span style={EYEBROW}>The Missing Piece</span>

        <h2 style={H2}>
          Every witness archive has gaps.<br />
          Here is how we close them.
        </h2>

        <p style={BODY}>When someone has passed, the data that only they could provide is frozen.</p>

        <p style={BODY}>
          We cannot recover memories they never deposited. We cannot ask them
          questions they never answered. We cannot fill the gaps with invention.
        </p>

        <p style={BODY}>
          What we can do is use every available witness to triangulate toward the truth.
        </p>

        <p style={BODY}>
          When five people who loved the same person each answer the question
          &ldquo;Describe a moment when you watched them handle something difficult&rdquo; —
          the entity that emerges from those five answers is more accurate than
          anything the subject alone could have produced.
        </p>

        <p style={BODY}>
          Because the witnesses saw things the subject never saw about themselves.
        </p>

        <p style={{ ...BODY, color: '#F0EDE6', fontStyle: 'italic', marginBottom: 0 }}>
          That is the witness archive. Not a lesser product. A different kind of truth.
        </p>
      </div>
    </section>
  )
}

// ── Section 5 — The process ──────────────────────────────────────────────────

const STEPS = [
  {
    n:    '01',
    name: 'Material Assessment',
    body: 'A Senior Archivist reviews everything your family can provide — photographs, letters, documents, audio, video. We tell you honestly what we can build from it.',
  },
  {
    n:    '02',
    name: 'Digitization Guidance',
    body: "We guide your family through what to scan, photograph, transcribe, and upload. We work with what exists — we never fabricate what doesn't.",
  },
  {
    n:    '03',
    name: 'Guided Witness Sessions',
    body: "Three 90-minute guided sessions with your family. We surface the photographs. We ask the witness questions — the ones designed to extract what only each person from their specific vantage point could know. A daughter gets different questions than a colleague. A childhood friend gets different questions than a spouse. Every perspective adds something no other perspective can.",
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
    <section aria-label="The Witness Founding process" style={{ background: '#0A0908', padding: '6rem 2rem' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div aria-hidden="true" style={GOLD_RULE} />

        <span style={EYEBROW}>The Witness Founding</span>

        <h2 style={H2}>
          Six weeks. Your whole family.<br />Everything that remains.
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', marginTop: '3rem' }}>
          {STEPS.map(({ n, name, body }) => (
            <div
              key={n}
              style={{ display: 'grid', gridTemplateColumns: '3rem 1fr', gap: '1.5rem', alignItems: 'start' }}
            >
              <span style={{
                fontFamily:    "'Space Mono', 'DM Mono', monospace",
                fontSize:      '0.62rem',
                letterSpacing: '0.1em',
                color:         'rgba(196,162,74,0.45)',
                paddingTop:    '0.2rem',
                display:       'block',
              }}>
                {n}
              </span>
              <div>
                <p style={{
                  fontFamily:    "'Space Mono', 'DM Mono', monospace",
                  fontSize:      '0.6rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color:         '#C4A24A',
                  marginBottom:  '0.6rem',
                }}>
                  {name}
                </p>
                <p style={{ ...BODY, fontSize: '1rem', marginBottom: 0 }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Section 6 — Pricing ──────────────────────────────────────────────────────

function Pricing() {
  return (
    <section aria-label="Pricing" style={{ background: '#0C0B0A', padding: '6rem 2rem' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div aria-hidden="true" style={GOLD_RULE} />

        <span style={EYEBROW}>Investment</span>

        {/* Part 1 — The Founding */}
        <div style={{ border: '1px solid rgba(196,162,74,0.2)', borderTop: '2px solid rgba(196,162,74,0.5)', borderRadius: '2px', padding: '2.5rem', marginBottom: '1.5rem' }}>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.44rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#C4A24A', marginBottom: '1rem' }}>
            The Witness Founding
          </p>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 700, fontSize: '3rem', color: '#F0EDE6', lineHeight: 1, marginBottom: '0.4rem' }}>
            $4,500
          </p>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.44rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5C6166', marginBottom: '1rem' }}>
            One-Time Engagement Fee
          </p>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: 'italic', fontSize: '0.9rem', color: '#9DA3A8', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            Six weeks. Every session. Everything that remains.
          </p>
          <div style={{ borderTop: '1px solid rgba(196,162,74,0.2)', width: '80px', margin: '0 0 1.5rem' }} />
          <p style={{ ...BODY, fontSize: '0.95rem', marginBottom: 0 }}>
            Higher than the standard Founding because the labor is different.
            There is no ongoing deposit. There is a fixed body of material and
            six weeks of concentrated work to make the most of what remains.
          </p>
        </div>

        {/* Part 2 — Ongoing Stewardship */}
        <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '2px', padding: '2.5rem', marginBottom: '2.5rem' }}>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.44rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#C4A24A', marginBottom: '1rem' }}>
            Witness Archive Stewardship
          </p>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 700, fontSize: '2.5rem', color: '#F0EDE6', lineHeight: 1, marginBottom: '0.4rem' }}>
            $3,600 <span style={{ fontSize: '1.2rem', fontWeight: 300 }}>/ year</span>
          </p>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.44rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5C6166', marginBottom: '0.75rem' }}>
            $300 / month equivalent
          </p>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: 'italic', fontSize: '0.85rem', color: '#9DA3A8', lineHeight: 1.65, marginBottom: '1.5rem' }}>
            Full Estate tier stewardship — the same infrastructure as any active Basalith archive.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
            {[
              'Permanent secure archive storage',
              'AI entity active and accessible',
              'Annual AI model updates applied',
              'Up to 10 family contributors',
              'Nightly photograph emails continue',
              'Custodian designation maintained',
              'Data Custodianship Reserve coverage',
              'Legal estate documentation preserved',
            ].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="7" cy="7" r="6.5" stroke="rgba(255,179,71,0.3)" />
                  <path d="M4 7l2 2 4-4" stroke="#FFB347" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '0.95rem', color: '#B8B4AB', lineHeight: 1.5 }}>{f}</span>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: 'italic', fontSize: '0.85rem', color: '#5C6166', lineHeight: 1.75, margin: 0 }}>
            Stewardship begins after The Witness Founding is complete. Renews annually.
            Cancel at any time — archive accessible for 90 days after cancellation.
          </p>
        </div>

        {/* Consultation note + CTA */}
        <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: 'italic', fontSize: '0.95rem', color: '#9DA3A8', lineHeight: 1.8, marginBottom: '2rem', maxWidth: '560px' }}>
          The Witness Founding requires a consultation before engagement.
          Every family&rsquo;s situation is different. We will tell you honestly
          what we can build — and what it will cost — before you commit to anything.
        </p>

        <a
          href="mailto:legacy@basalith.xyz?subject=Witness%20Archive%20Enquiry"
          style={{
            display:        'inline-block',
            fontFamily:     "'Space Mono', monospace",
            fontSize:       '0.58rem',
            letterSpacing:  '0.22em',
            textTransform:  'uppercase',
            color:          '#B8B4AB',
            textDecoration: 'none',
            border:         '1px solid rgba(196,162,74,0.3)',
            borderRadius:   '2px',
            padding:        '1rem 2rem',
            transition:     'border-color 0.2s, color 0.2s',
          }}
          className="hover:border-amber hover:text-amber"
        >
          Request a Consultation
        </a>
      </div>
    </section>
  )
}

// ── Section 7 — Closing quote ────────────────────────────────────────────────

function ClosingQuote() {
  return (
    <section aria-label="Closing" style={{ background: '#0A0908', padding: '7rem 2rem', textAlign: 'center' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <p style={{
          fontFamily:   "'Cormorant Garamond', Georgia, serif",
          fontWeight:   300,
          fontSize:     '1.3rem',
          fontStyle:    'italic',
          color:        '#9DA3A8',
          lineHeight:   1.85,
          marginBottom: '3rem',
        }}>
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

        <p style={{
          fontFamily:    "'Space Mono', 'DM Mono', monospace",
          fontSize:      '0.44rem',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color:         '#C4A24A',
        }}>
          The Witness Archive &middot; Basalith
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
        <WitnessesCarry />
        <WhatWeCanBuild />
        <MissingPiece />
        <TheProcess />
        <Pricing />
        <ClosingQuote />
      </main>
      <Footer />
    </>
  )
}
