'use client'

import { useState, useEffect } from 'react'

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

const inputCls = 'bg-[#0C0C0D] border border-[rgba(255,255,255,0.08)] rounded-sm px-3 py-2 font-sans text-[0.82rem] text-[#F0F0EE] focus:outline-none focus:border-[rgba(196,162,74,0.4)] transition-colors duration-200 w-full'

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
      const res = await fetch('/api/archive/poll-replies', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ manual: true }),
      })
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

  if (loading) {
    return (
      <div className="max-w-2xl">
        <p className="font-serif italic text-[#5C6166] text-[0.95rem]">Loading preferences…</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">

      <div className="mb-10">
        <p className="font-sans text-[0.62rem] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: '#C4A24A' }}>Email Delivery</p>
        <h1 className="font-serif font-semibold text-[#F0F0EE] tracking-[-0.025em]" style={{ fontSize: 'clamp(1.8rem,3vw,2.5rem)' }}>
          Photograph Delivery
        </h1>
        <p className="font-sans text-[0.75rem] mt-2" style={{ color: '#5C6166' }}>
          Contributors receive one photograph by email and reply with their memories.
        </p>
      </div>

      {/* Cadence */}
      <div className="rounded-sm border border-[rgba(255,255,255,0.06)] px-6 py-6 mb-4" style={{ background: '#111112' }}>
        <p className="font-sans text-[0.6rem] font-bold tracking-[0.18em] uppercase text-[#5C6166] mb-5">Cadence</p>
        <div className="flex flex-col gap-3">
          {CADENCES.map(c => (
            <label key={c.value} className="flex items-start gap-3 cursor-pointer group">
              <div
                className="w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center transition-colors duration-150"
                style={{
                  borderColor:     cadence === c.value ? '#C4A24A' : 'rgba(255,255,255,0.2)',
                  backgroundColor: cadence === c.value ? 'rgba(196,162,74,0.15)' : 'transparent',
                }}
              >
                {cadence === c.value && (
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#C4A24A' }} />
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
                <p className="font-sans text-[0.82rem] font-medium" style={{ color: cadence === c.value ? '#F0F0EE' : '#9DA3A8' }}>
                  {c.label}
                </p>
                <p className="font-sans text-[0.68rem] mt-0.5" style={{ color: '#5C6166' }}>{c.sub}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Time and timezone */}
      {cadence !== 'paused' && (
        <div className="rounded-sm border border-[rgba(255,255,255,0.06)] px-6 py-6 mb-4" style={{ background: '#111112' }}>
          <p className="font-sans text-[0.6rem] font-bold tracking-[0.18em] uppercase text-[#5C6166] mb-5">Delivery Time</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <p className="font-sans text-[0.62rem] tracking-[0.1em] uppercase text-[#5C6166] mb-2">Time</p>
              <select className={inputCls} value={sendTime} onChange={e => setSendTime(e.target.value)}
                style={{ background: '#0C0C0D' }}>
                {SEND_TIMES.map(t => (
                  <option key={t.value} value={t.value} style={{ background: '#0C0C0D' }}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="font-sans text-[0.62rem] tracking-[0.1em] uppercase text-[#5C6166] mb-2">Timezone</p>
              <select className={inputCls} value={timezone} onChange={e => setTimezone(e.target.value)}
                style={{ background: '#0C0C0D' }}>
                {TIMEZONES.map(t => (
                  <option key={t.value} value={t.value} style={{ background: '#0C0C0D' }}>{t.label}</option>
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
          <p className="font-sans text-[0.72rem]" style={{ color: '#4CAF50' }}>Preferences updated.</p>
        )}
      </div>

      {/* Check replies */}
      <div className="rounded-sm border border-[rgba(255,255,255,0.06)] px-6 py-6 mb-4" style={{ background: '#111112' }}>
        <p className="font-sans text-[0.6rem] font-bold tracking-[0.18em] uppercase text-[#5C6166] mb-2">
          Check for Replies
        </p>
        <p className="font-sans text-[0.75rem] mb-5" style={{ color: '#5C6166' }}>
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
            <p className="font-sans text-[0.72rem]" style={{ color: replyMsg.startsWith('Found') ? '#4CAF50' : '#9DA3A8' }}>
              {replyMsg}
            </p>
          )}
        </div>
      </div>

      {/* Test send */}
      <div className="rounded-sm border border-[rgba(255,255,255,0.06)] px-6 py-6" style={{ background: '#111112' }}>
        <p className="font-sans text-[0.6rem] font-bold tracking-[0.18em] uppercase text-[#5C6166] mb-2">
          Send a Test Photograph Now
        </p>
        <p className="font-sans text-[0.75rem] mb-5" style={{ color: '#5C6166' }}>
          Immediately sends the next photograph in the queue to all active contributors.
          Useful for testing and first impressions.
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={sendTest}
            disabled={sending}
            className="btn-monolith-ghost disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send Now →'}
          </button>
          {testMsg && (
            <p className="font-sans text-[0.72rem]" style={{ color: testMsg.startsWith('Sent') ? '#4CAF50' : '#9DA3A8' }}>
              {testMsg}
            </p>
          )}
        </div>
      </div>

    </div>
  )
}
