'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { BuiltReport } from '@/lib/dependencyReadings'
import ReportView from './ReportView'

// The founder's reading of their own report. Slice 4a, October 8, 2026.
//
// Read only. Releasing the report to the buyer is not built yet, so this page
// offers no release and makes no promise about one. The one line above the
// report says what is true today: nobody else has been sent it.

const SERIF  = 'var(--portal-serif)'
const MONO   = 'var(--portal-mono)'
const GOLD   = 'var(--portal-gold-ink)'
const BODY   = 'var(--portal-body)'
const ERR    = 'var(--portal-error)'

type Payload = {
  status:      string
  report:      BuiltReport
  builtAt:     string
  founderName: string
  buyerName:   string
  buyerOrg:    string | null
}

export default function ReportClient() {
  const [data, setData]       = useState<Payload | null>(null)
  const [missing, setMissing] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    let active = true
    fetch('/api/archive/assessment/report', { cache: 'no-store' })
      .then(async res => {
        if (!active) return
        if (res.status === 404) { setMissing(true); return }
        const body = await res.json().catch(() => null)
        if (!res.ok || !body) { setError(body?.error || 'Could not load your report.'); return }
        setData(body as Payload)
      })
      .catch(() => { if (active) setError('Could not load your report.') })
    return () => { active = false }
  }, [])

  return (
    <div className="max-w-3xl mx-auto" style={{ paddingBottom: '64px' }}>
      <p style={{ marginBottom: '28px' }}>
        <Link href="/archive/assessment" className="no-underline" style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: GOLD }}>
          ← Your assessment
        </Link>
      </p>

      {error && <p role="alert" style={{ fontFamily: SERIF, fontSize: '1rem', color: ERR }}>{error}</p>}

      {missing && (
        <p style={{ fontFamily: SERIF, fontSize: '19px', color: BODY, lineHeight: 1.6, maxWidth: '560px' }}>
          There is no report yet. It is built once all eight calls and your answers are in.
        </p>
      )}

      {data && (
        <>
          {data.status === 'ready' && (
            <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '17px', color: BODY, lineHeight: 1.6, marginBottom: '28px', maxWidth: '60ch' }}>
              Only you can see this. It has not been sent to {data.buyerName}.
            </p>
          )}
          <ReportView
            report={data.report}
            founderName={data.founderName}
            buyerName={data.buyerName}
            buyerOrg={data.buyerOrg}
            builtAt={data.builtAt}
          />
        </>
      )}
    </div>
  )
}
