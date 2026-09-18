'use client'

import { useState, useEffect } from 'react'

function BirthYearSection({ archiveId }: { archiveId: string }) {
  const [year,   setYear]   = useState('')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => {
    fetch(`/api/archive/dashboard?archiveId=${archiveId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.archive?.owner_birth_year) setYear(String(d.archive.owner_birth_year)) })
      .catch(() => {})
  }, [archiveId])

  async function save() {
    if (!year || isNaN(parseInt(year))) { setError('Enter a valid year'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/archive/update-profile', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birthYear: parseInt(year) }),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    else { const d = await res.json(); setError(d.error ?? 'Failed') }
  }

  return (
    <div className="rounded-sm border border-[var(--portal-card-line)] px-6 py-6 mb-4" style={{ background: 'var(--portal-card)' }}>
      <p className="font-sans text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--portal-secondary)] mb-2">Birth Year</p>
      <p className="font-sans text-[15px] mb-4" style={{ color: 'var(--portal-secondary)' }}>
        Used to personalize your life timeline with accurate age ranges per decade.
      </p>
      <div className="flex items-center gap-4 flex-wrap">
        <input
          type="number" min={1900} max={new Date().getFullYear()}
          placeholder="e.g. 1949" value={year} onChange={e => setYear(e.target.value)}
          className="bg-[var(--portal-card)] border border-[var(--portal-card-line)] rounded-sm px-3 py-2 font-mono text-[15.5px] text-[var(--portal-ink)] focus:outline-none focus:border-[var(--portal-gold-ink)] w-32"
        />
        <button onClick={save} disabled={saving} className="btn-monolith-ghost disabled:opacity-50">
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
        </button>
        {error && <p className="font-sans text-[15px]" style={{ color: 'var(--portal-error)' }}>{error}</p>}
      </div>
    </div>
  )
}

const CADENCES = [
  { value: 'daily',        label: 'Daily',              sub: 'One photograph every evening' },
  { value: 'three_weekly', label: 'Three times a week', sub: 'Monday, Wednesday, Friday' },
  { value: 'weekly',       label: 'Weekly',             sub: 'Every Sunday evening' },
  { value: 'paused',       label: 'Paused',             sub: 'No photograph emails until resumed' },
]

const SEND_TIMES = [
  { value: '19:00', label: '7:00 PM' },
  { value: '20:00', label: '8:00 PM' },
  { value: '21:00', label: '9:00 PM' },
  { value: '22:00', label: '10:00 PM' },
]

const TIMEZONES = [
  { value: 'America/New_York',    label: 'Eastern Time (ET)' },
  { value: 'America/Chicago',     label: 'Central Time (CT)' },
  { value: 'America/Denver',      label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix',     label: 'Arizona (no DST)' },
  { value: 'Pacific/Honolulu',    label: 'Hawaii (HT)' },
]

const inputCls = 'bg-[var(--portal-card)] border border-[var(--portal-card-line)] rounded-sm px-3 py-2 font-sans text-[15.5px] text-[var(--portal-ink)] focus:outline-none focus:border-[var(--portal-gold-ink)] transition-colors duration-200 w-full'

export default function PreferencesClient({ archiveId }: { archiveId: string }) {
  const [cadence,   setCadence]   = useState('daily')
  const [sendTime,  setSendTime]  = useState('21:00')
  const [timezone,  setTimezone]  = useState('America/New_York')
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [sending,   setSending]   = useState(false)
  const [checking,  setChecking]  = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [testMsg,   setTestMsg]   = useState<string | null>(null)
  const [replyMsg,  setReplyMsg]  = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/archive/preferences?archiveId=${archiveId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.preferences) {
          setCadence(data.preferences.cadence   ?? 'daily')
          setSendTime(data.preferences.send_time ?? '21:00')
          setTimezone(data.preferences.timezone  ?? 'America/New_York')
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [archiveId])

  async function save() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/archive/preferences', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ archiveId, cadence, send_time: sendTime, timezone }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      // keep form open
    } finally {
      setSaving(false)
    }
  }

  async function checkReplies() {
    setChecking(true)
    setReplyMsg(null)
    try {
      // No body. The route authenticates the owner from the Supabase session
      // cookie, which the browser sends on this same-origin request, and scopes
      // the run to this owner's archive. The old `{ manual: true }` body was
      // the bypass, not a credential.
      const res = await fetch('/api/archive/poll-replies', { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        setReplyMsg(`Error: ${data.error}`)
      } else {
        setReplyMsg(data.processed > 0
          ? `Found and saved ${data.processed} new ${data.processed === 1 ? 'reply' : 'replies'}.`
          : 'No new replies found.')
      }
    } catch {
      setReplyMsg('Failed to check replies.')
    } finally {
      setChecking(false)
    }
  }

  async function sendTest() {
    setSending(true)
    setTestMsg(null)
    try {
      const res = await fetch('/api/archive/send-photo', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ archiveId }),
      })
      const data = await res.json()
      if (data.skipped) {
        setTestMsg(`Skipped: ${data.reason}`)
      } else if (data.error) {
        setTestMsg(`Error: ${data.error}`)
      } else {
        setTestMsg(`Sent to ${data.recipientCount} contributor${data.recipientCount === 1 ? '' : 's'}.`)
      }
    } catch {
      setTestMsg('Failed to send. Check your Resend configuration.')
    } finally {
      setSending(false)
    }
  }

  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState<string | null>(null)

  // The export is assembled in the background and delivered by email. It is not
  // a download from this request: a full archive runs to hundreds of megabytes
  // and cannot be built and transferred inside one HTTP response.
  async function handleExport() {
    setExporting(true)
    setExportMsg(null)
    try {
      const res  = await fetch('/api/archive/export', { method: 'POST' })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setExportMsg(data?.error ?? 'Export request failed. Please try again.')
        return
      }
      setExportMsg(data?.message ?? 'Your export is being prepared and will arrive by email.')
    } catch {
      setExportMsg('Export request failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl">
        <p className="font-serif italic text-[var(--portal-secondary)] text-[0.95rem]">Loading preferences…</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">

      <div className="mb-10">
        <p className="font-sans text-[11.5px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: 'var(--portal-gold-ink)' }}>Email Delivery</p>
        <h1 className="font-serif font-semibold text-[var(--portal-ink)] tracking-[-0.025em]" style={{ fontSize: 'clamp(1.8rem,3vw,2.5rem)' }}>
          Photograph Delivery
        </h1>
        <p className="font-sans text-[15px] mt-2" style={{ color: 'var(--portal-secondary)' }}>
          Contributors receive one photograph by email and reply with their memories.
        </p>
      </div>

      {/* Cadence */}
      <div className="rounded-sm border border-[var(--portal-label)] px-6 py-6 mb-4" style={{ background: 'var(--portal-card)' }}>
        <p className="font-sans text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--portal-secondary)] mb-5">Cadence</p>
        <div className="flex flex-col gap-3">
          {CADENCES.map(c => (
            <label key={c.value} className="flex items-start gap-3 cursor-pointer group">
              <div
                className="w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center transition-colors duration-150"
                style={{
                  borderColor:     cadence === c.value ? 'var(--portal-gold-ink)' : 'var(--portal-card-line)',
                  backgroundColor: cadence === c.value ? 'var(--portal-tint)' : 'transparent',
                }}
              >
                {cadence === c.value && (
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--portal-btn)' }} />
                )}
              </div>
              <input
                type="radio"
                className="sr-only"
                name="cadence"
                value={c.value}
                checked={cadence === c.value}
                onChange={() => setCadence(c.value)}
              />
              <div>
                <p className="font-sans text-[15.5px] font-medium" style={{ color: cadence === c.value ? 'var(--portal-ink)' : 'var(--portal-body)' }}>
                  {c.label}
                </p>
                <p className="font-sans text-[14.5px] mt-0.5" style={{ color: 'var(--portal-secondary)' }}>{c.sub}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Time and timezone */}
      {cadence !== 'paused' && (
        <div className="rounded-sm border border-[var(--portal-label)] px-6 py-6 mb-4" style={{ background: 'var(--portal-card)' }}>
          <p className="font-sans text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--portal-secondary)] mb-5">Delivery Time</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <p className="font-sans text-[11.5px] tracking-[0.1em] uppercase text-[var(--portal-secondary)] mb-2">Time</p>
              <select className={inputCls} value={sendTime} onChange={e => setSendTime(e.target.value)}
                style={{ background: 'var(--portal-card)' }}>
                {SEND_TIMES.map(t => (
                  <option key={t.value} value={t.value} style={{ background: 'var(--portal-card)' }}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="font-sans text-[11.5px] tracking-[0.1em] uppercase text-[var(--portal-secondary)] mb-2">Timezone</p>
              <select className={inputCls} value={timezone} onChange={e => setTimezone(e.target.value)}
                style={{ background: 'var(--portal-card)' }}>
                {TIMEZONES.map(t => (
                  <option key={t.value} value={t.value} style={{ background: 'var(--portal-card)' }}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Save */}
      <div className="flex items-center gap-4 mb-10">
        <button
          onClick={save}
          disabled={saving}
          className="btn-monolith-amber disabled:opacity-50"
        >
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save Preferences'}
        </button>
        {saved && (
          <p className="font-sans text-[15px]" style={{ color: 'var(--portal-ok)' }}>Preferences updated.</p>
        )}
      </div>

      {/* Birth Year */}
      <BirthYearSection archiveId={archiveId} />

      {/* Check replies */}
      <div className="rounded-sm border border-[var(--portal-label)] px-6 py-6 mb-4" style={{ background: 'var(--portal-card)' }}>
        <p className="font-sans text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--portal-secondary)] mb-2">
          Check for Replies
        </p>
        <p className="font-sans text-[15px] mb-5" style={{ color: 'var(--portal-secondary)' }}>
          Fetch and process any new replies from contributors that arrived since the last check.
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={checkReplies}
            disabled={checking}
            className="btn-monolith-ghost disabled:opacity-50"
          >
            {checking ? 'Checking…' : 'Check for Replies →'}
          </button>
          {replyMsg && (
            <p className="font-sans text-[15px]" style={{ color: replyMsg.startsWith('Found') ? 'var(--portal-ok)' : 'var(--portal-body)' }}>
              {replyMsg}
            </p>
          )}
        </div>
      </div>

      {/* Test send */}
      <div className="rounded-sm border border-[var(--portal-label)] px-6 py-6" style={{ background: 'var(--portal-card)' }}>
        <p className="font-sans text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--portal-secondary)] mb-2">
          Send a Test Photograph Now
        </p>
        <p className="font-sans text-[15px] mb-5" style={{ color: 'var(--portal-secondary)' }}>
          Immediately sends the next photograph in the queue to all active contributors.
          Useful for testing and first impressions.
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <button onClick={sendTest} disabled={sending} className="btn-monolith-ghost disabled:opacity-50">
            {sending ? 'Sending…' : 'Send Now →'}
          </button>
          {testMsg && (
            <p className="font-sans text-[15px]" style={{ color: testMsg.startsWith('Sent') ? 'var(--portal-ok)' : 'var(--portal-body)' }}>
              {testMsg}
            </p>
          )}
        </div>
      </div>

      {/* Data export */}
      <div className="mt-10 mb-4">
        <p className="font-sans text-[11.5px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: 'var(--portal-gold-ink)' }}>Your Data</p>
        <h2 className="font-serif font-semibold text-[var(--portal-ink)]" style={{ fontSize: 'clamp(1.4rem,2.5vw,1.9rem)' }}>
          Download Your Archive
        </h2>
        <p className="font-sans text-[15px] mt-2" style={{ color: 'var(--portal-secondary)' }}>
          You own your archive completely. Download everything at any time.
        </p>
      </div>

      <div className="rounded-sm border border-[var(--portal-label)] px-6 py-6" style={{ background: 'var(--portal-card)' }}>
        <p className="font-sans text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--portal-secondary)] mb-2">Complete Archive Export</p>
        <p className="font-sans text-[15px] mb-5" style={{ color: 'var(--portal-body)' }}>
          Your export is one zip file holding the actual contents of your archive.
          Your photographs, recordings, and video as real files, plus every record
          in plain JSON. It opens with no account and no connection to Basalith.
        </p>
        <p className="font-sans text-[15px] mb-5" style={{ color: 'var(--portal-secondary)' }}>
          We assemble it in the background and email you a download link when it is
          ready, usually within a few minutes. The link works for 7 days, and you can
          request another export at any time.
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-monolith-ghost disabled:opacity-50"
            style={{ borderColor: 'var(--portal-gold-line)', color: 'var(--portal-gold-ink)' }}
          >
            {exporting ? 'Requesting…' : 'Request Archive Export →'}
          </button>
          {exportMsg && (
            <p className="font-sans text-[15px]" style={{ color: 'var(--portal-body)' }}>{exportMsg}</p>
          )}
        </div>
      </div>

    </div>
  )
}
