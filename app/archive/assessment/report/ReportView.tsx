import type { BuiltReport } from '@/lib/dependencyReadings'

// The key person dependency report, as a page. Slice 4a, October 8, 2026.
//
// Presentational only: it draws the snapshot it is handed
// (dependency_reports.report, built by lib/dependencyReport.ts) and computes
// nothing. Every count, sentence, and limit on the page is in the snapshot.
// The founder's page uses it today; a buyer's view will use the same component,
// so the two can never show different reports.
//
// What it draws, and what it will not:
//   - Two readings per domain, side by side, one mark per question. A filled
//     mark is a question answered from a deposit. No bar, no percent.
//   - No overall score, no state word, no ranking number.
//   - Who makes each kind of decision is always labeled as the founder's own
//     statement.
//
// Colors are the portal's stone register, read from the .portal-stone block in
// globals.css. No hex literal belongs here.

const SERIF  = 'var(--portal-serif)'
const MONO   = 'var(--portal-mono)'
const GOLD   = 'var(--portal-gold-ink)'
const INK    = 'var(--portal-ink)'
const BODY   = 'var(--portal-body)'
const SECOND = 'var(--portal-secondary)'
const LABEL  = 'var(--portal-label)'
const LINE   = 'var(--portal-card-line)'

type Domain = BuiltReport['domains'][number]
type Reading = Domain['readings'][number]

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  } catch {
    return ''
  }
}

function Marks({ reading, label }: { reading: Reading; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: LABEL, width: '10.5em', flexShrink: 0, whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {/* One mark per usable question. Filled = answered from a deposit. */}
      <span aria-hidden="true" style={{ display: 'flex', gap: '5px' }}>
        {Array.from({ length: reading.total }).map((_, i) => (
          <span key={i} style={{ width: '16px', height: '7px', borderRadius: '1px', background: i < reading.deposit ? 'var(--portal-btn)' : LINE }} />
        ))}
      </span>
      <span style={{ fontFamily: SERIF, fontSize: '15.5px', color: SECOND, whiteSpace: 'nowrap' }}>
        {reading.deposit} of {reading.total}
      </span>
    </div>
  )
}

function DomainRow({ d }: { d: Domain }) {
  return (
    <li style={{ padding: '22px 0', borderTop: `1px solid ${LINE}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '16px', flexWrap: 'wrap', marginBottom: '4px' }}>
        <h3 style={{ fontFamily: SERIF, fontSize: '21px', fontWeight: 400, color: INK, margin: 0, lineHeight: 1.25 }}>{d.domain}</h3>
        <p style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: d.answer === 'delegated' ? LABEL : GOLD, margin: 0 }}>
          {d.dependencyLabel}
        </p>
      </div>
      <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '15.5px', color: SECOND, lineHeight: 1.5, margin: '0 0 14px' }}>
        {d.description}
      </p>
      {d.role && (
        <p style={{ fontFamily: SERIF, fontSize: '16px', color: BODY, lineHeight: 1.5, margin: '-6px 0 14px' }}>
          {d.answer === 'shared' ? 'Shared with' : 'Handled by'}: {d.role}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
        <Marks reading={d.readings[0]} label="First reading" />
        <Marks reading={d.readings[1]} label="Second reading" />
      </div>
      <p style={{ fontFamily: SERIF, fontSize: '16.5px', color: INK, lineHeight: 1.55, margin: 0 }}>
        {d.countLine}.
      </p>
    </li>
  )
}

export default function ReportView({
  report,
  founderName,
  buyerName,
  buyerOrg,
  builtAt,
}: {
  report:      BuiltReport
  founderName: string
  buyerName:   string
  buyerOrg:    string | null
  builtAt:     string
}) {
  const preparedFor = [buyerName, buyerOrg].filter(Boolean).join(', ')

  return (
    <article>
      <header style={{ marginBottom: '36px' }}>
        <p style={eyebrow()}>Key person dependency report</p>
        <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(34px,4.2vw,50px)', fontWeight: 400, lineHeight: 1.08, letterSpacing: '-0.015em', color: INK, marginBottom: '16px' }}>
          How this business runs through {founderName}.
        </h1>
        <p style={{ fontFamily: SERIF, fontSize: '17px', color: SECOND, lineHeight: 1.6, margin: 0 }}>
          Prepared for {preparedFor}. Built {fmtDate(builtAt)}. Question set {report.probeSetVersion}, {report.questionsPerDomain} questions a domain, read twice.
        </p>
      </header>

      {/* The finding. Counts only, each with its denominator. */}
      <section aria-label="Summary" style={{ ...panel(), borderTop: '3px solid var(--portal-btn)' }}>
        <p style={eyebrow()}>The finding</p>
        {report.headline.map((line, i) => (
          <p
            key={i}
            style={{
              fontFamily: SERIF,
              fontSize:   i === 0 ? 'clamp(24px,2.6vw,30px)' : '19px',
              fontWeight: 400,
              lineHeight: i === 0 ? 1.25 : 1.6,
              color:      i === 0 ? INK : BODY,
              margin:     i === 0 ? '0 0 16px' : '0 0 8px',
              maxWidth:   '60ch',
            }}
          >
            {line}
          </p>
        ))}
        <p style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: LABEL, margin: '18px 0 0' }}>
          {report.attribution}: who makes each kind of decision
        </p>
      </section>

      {report.exposure.length > 0 && (
        <section aria-label="Exposure" style={panel()}>
          <p style={eyebrow()}>Where the founder is in the decision</p>
          <h2 style={h2()}>Thinnest record first.</h2>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {report.exposure.map((d, i) => (
              <li key={d.domain} style={{ display: 'flex', gap: '16px', alignItems: 'baseline', padding: '12px 0', borderTop: `1px solid ${LINE}` }}>
                <span style={{ fontFamily: MONO, fontSize: '11.5px', color: LABEL, width: '1.6em', flexShrink: 0 }}>{i + 1}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: SERIF, fontSize: '18.5px', color: INK }}>{d.domain}</span>
                  <span style={{ fontFamily: SERIF, fontSize: '16px', color: SECOND }}>{'  '}{d.dependencyLabel}. {d.countLine}.</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-label="By domain" style={panel()}>
        <p style={eyebrow()}>By domain</p>
        <h2 style={h2()}>All eight, with both readings.</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {report.domains.map(d => <DomainRow key={d.domain} d={d} />)}
        </ul>
      </section>

      <section aria-label="Method and limits" style={panel()}>
        <p style={eyebrow()}>What this report is, and is not</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {report.limits.map((line, i) => (
            <li key={i} style={{ fontFamily: SERIF, fontSize: '17px', color: BODY, lineHeight: 1.65, padding: '10px 0', borderTop: i === 0 ? 'none' : `1px solid ${LINE}`, maxWidth: '62ch' }}>
              {line}
            </li>
          ))}
        </ul>
      </section>
    </article>
  )
}

function panel(): React.CSSProperties {
  return {
    background:   'var(--portal-card)',
    border:       '1px solid var(--portal-card-line)',
    boxShadow:    'var(--portal-lift)',
    padding:      'clamp(1.6rem,4vw,2.25rem) clamp(1.35rem,4vw,2.25rem)',
    borderRadius: '2px',
    marginBottom: '24px',
  }
}

function eyebrow(): React.CSSProperties {
  return { fontFamily: MONO, fontSize: '11.5px', letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, marginBottom: '18px' }
}

function h2(): React.CSSProperties {
  return { fontFamily: SERIF, fontSize: '28px', fontWeight: 400, color: INK, lineHeight: 1.2, marginBottom: '16px' }
}
