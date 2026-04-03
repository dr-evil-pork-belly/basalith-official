'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

type LabelRow = {
  id:                 string
  what_was_happening: string | null
  labelled_by:        string
  year_taken:         number | null
}

export default function DepositClient({ archiveId }: { archiveId: string }) {
  const searchParams  = useSearchParams()
  const router        = useRouter()
  const photographId  = searchParams.get('photographId')

  const [photoUrl,    setPhotoUrl]    = useState<string | null>(null)
  const [labels,      setLabels]      = useState<LabelRow[]>([])
  const [response,    setResponse]    = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [submitted,   setSubmitted]   = useState(false)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!photographId) { setLoading(false); return }

    // Fetch photo URL and existing labels in parallel
    Promise.all([
      fetch(`/api/archive/photo-url?archiveId=${archiveId}&photographId=${photographId}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => d?.url ? setPhotoUrl(d.url) : null),

      fetch(`/api/archive/photo-labels?archiveId=${archiveId}&photographId=${photographId}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => d?.labels ? setLabels(d.labels) : null),
    ]).finally(() => setLoading(false))
  }, [archiveId, photographId])

  async function submit() {
    if (!response.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/archive/owner-deposit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          archiveId,
          photographId: photographId ?? undefined,
          prompt:  labels[0]?.what_was_happening ?? null,
          response: response.trim(),
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSubmitted(true)
      setTimeout(() => router.push('/archive/dashboard'), 2500)
    } catch {
      // keep form open
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto pt-16 text-center">
        <p style={{ fontFamily: 'monospace', fontSize: '0.52rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.8)', marginBottom: '1rem' }}>
          SAVED TO ARCHIVE
        </p>
        <p className="font-serif italic" style={{ fontSize: '1.3rem', color: '#F0EDE6', lineHeight: 1.6 }}>
          Your memory has been preserved.
        </p>
        <p className="font-sans text-[0.72rem] mt-3" style={{ color: '#5C6166' }}>Returning to your archive…</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">

      <div className="mb-10">
        <p style={{ fontFamily: 'monospace', fontSize: '0.52rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)', marginBottom: '0.5rem' }}>
          Add Your Memory
        </p>
        <h1 className="font-serif font-semibold tracking-[-0.025em]" style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', color: '#F0EDE6' }}>
          What do you remember?
        </h1>
      </div>

      {/* Photograph */}
      {loading ? (
        <div className="w-full rounded-sm mb-8" style={{ height: '280px', background: 'rgba(255,255,255,0.04)', animation: 'mysteryGlowPulse 1.8s ease-in-out infinite' }} />
      ) : photoUrl ? (
        <div className="mb-8 rounded-sm overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="Archive photograph" className="w-full h-auto block" style={{ maxHeight: '420px', objectFit: 'cover' }} />
        </div>
      ) : null}

      {/* What contributors remembered */}
      {labels.length > 0 && (
        <div className="mb-8 rounded-sm border px-6 py-6" style={{ background: '#111112', borderColor: 'rgba(255,255,255,0.06)' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5C6166', marginBottom: '1rem' }}>
            What others remembered
          </p>
          <div className="flex flex-col gap-4">
            {labels.map(l => (
              <div key={l.id}>
                <p className="font-serif italic leading-[1.7]" style={{ fontSize: '0.95rem', color: '#B8B4AB' }}>
                  &ldquo;{l.what_was_happening}&rdquo;
                </p>
                <p style={{ fontFamily: 'monospace', fontSize: '0.48rem', letterSpacing: '0.1em', color: '#C4A24A', marginTop: '0.4rem' }}>
                  — {l.labelled_by}{l.year_taken ? ' · ' + l.year_taken : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prompt */}
      <div className="mb-6">
        <p className="font-serif font-light leading-[1.75] mb-5" style={{ fontSize: '1.1rem', color: '#9DA3A8' }}>
          What do you remember about this moment that only you would know?
        </p>
        <textarea
          value={response}
          onChange={e => setResponse(e.target.value)}
          rows={8}
          placeholder="Write whatever comes to mind…"
          className="w-full rounded-sm px-4 py-4 font-serif leading-[1.8] resize-none focus:outline-none transition-colors duration-200"
          style={{
            background:   '#0C0C0D',
            border:       '1px solid rgba(255,255,255,0.08)',
            color:        '#F0EDE6',
            fontSize:     '1rem',
            borderColor:  response ? 'rgba(196,162,74,0.35)' : 'rgba(255,255,255,0.08)',
          }}
        />
      </div>

      <button
        onClick={submit}
        disabled={submitting || !response.trim()}
        className="btn-monolith-amber disabled:opacity-40"
      >
        {submitting ? 'Saving…' : 'ADD TO ARCHIVE'}
      </button>

    </div>
  )
}
