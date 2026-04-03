'use client'

import { useState, useEffect } from 'react'

type SignificantDate = {
  id:          string
  person_name: string
  date_type:   string
  month:       number
  day:         number
  year:        number | null
  notes:       string | null
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DATE_TYPES = [
  { value: 'birthday',            label: 'Birthday'            },
  { value: 'death_anniversary',   label: 'Death Anniversary'   },
  { value: 'wedding_anniversary', label: 'Wedding Anniversary' },
  { value: 'other',               label: 'Other'               },
]

function daysUntil(month: number, day: number): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const thisYear = today.getFullYear()
  let target = new Date(thisYear, month - 1, day)
  if (target.getTime() < today.getTime()) target = new Date(thisYear + 1, month - 1, day)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function isToday(month: number, day: number): boolean {
  const today = new Date()
  return today.getMonth() + 1 === month && today.getDate() === day
}

function dateTypeColor(type: string): string {
  switch (type) {
    case 'birthday':            return '#C4A24A'
    case 'death_anniversary':   return '#9DA3A8'
    case 'wedding_anniversary': return '#F0EDE6'
    default:                    return '#5C6166'
  }
}

const FIELD_LABEL_STYLE: React.CSSProperties = {
  fontFamily:    "'Space Mono', monospace",
  fontSize:      '0.44rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color:         '#C4A24A',
  display:       'block',
  marginBottom:  '0.4rem',
}

const INPUT_STYLE: React.CSSProperties = {
  width:        '100%',
  background:   'rgba(255,255,255,0.04)',
  border:       '1px solid rgba(255,255,255,0.08)',
  borderRadius: '2px',
  padding:      '0.55rem 0.75rem',
  color:        '#F0EDE6',
  fontFamily:   'Georgia, serif',
  fontSize:     '0.9rem',
  outline:      'none',
  boxSizing:    'border-box',
}

const SELECT_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  appearance: 'none',
  cursor:     'pointer',
}

export default function DatesClient({ archiveId }: { archiveId: string }) {
  const [dates,    setDates]    = useState<SignificantDate[]>([])
  const [loading,  setLoading]  = useState(true)
  const [fetchErr, setFetchErr] = useState<string | null>(null)
  const [sending,  setSending]  = useState<string | null>(null)
  const [saved,    setSaved]    = useState(false)
  const [saveErr,  setSaveErr]  = useState<string | null>(null)

  const [form, setForm] = useState({
    personName: '',
    dateType:   'birthday',
    month:      '',
    day:        '',
    year:       '',
    notes:      '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchDates() }, [archiveId])

  async function fetchDates() {
    setLoading(true)
    setFetchErr(null)
    try {
      const r    = await fetch(`/api/archive/dates?archiveId=${archiveId}`)
      const json = await r.json()
      console.log('dates fetch response:', json)
      if (json.error) {
        console.error('dates fetch error:', json.error)
        setFetchErr(json.error)
      }
      setDates(json.dates ?? [])
    } catch (err: any) {
      console.error('dates fetch exception:', err)
      setFetchErr(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaveErr(null)
    if (!form.personName || !form.month || !form.day) return
    setSaving(true)
    try {
      const body = {
        archiveId,
        personName: form.personName,
        dateType:   form.dateType,
        month:      parseInt(form.month),
        day:        parseInt(form.day),
        year:       form.year ? parseInt(form.year) : null,
        notes:      form.notes || null,
      }
      console.log('dates POST sending:', body)
      const r    = await fetch('/api/archive/dates', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const json = await r.json()
      console.log('dates POST response:', json)
      if (!r.ok || json.error) {
        setSaveErr(json.error || 'Save failed')
        return
      }
      setForm({ personName: '', dateType: 'birthday', month: '', day: '', year: '', notes: '' })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      await fetchDates()
    } catch (err: any) {
      console.error('dates POST exception:', err)
      setSaveErr(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const r = await fetch('/api/archive/dates', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
    if (r.ok) setDates(prev => prev.filter(d => d.id !== id))
  }

  async function handleTestSend(dateRow: SignificantDate) {
    setSending(dateRow.id)
    try {
      const r    = await fetch('/api/archive/life-event', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ archiveId, dateId: dateRow.id, force: true }),
      })
      const json = await r.json()
      console.log('life-event test send:', json)
    } finally {
      setSending(null)
    }
  }

  const sortedDates = [...dates].sort((a, b) => {
    const da = daysUntil(a.month, a.day)
    const db = daysUntil(b.month, b.day)
    return da - db
  })

  return (
    <div style={{ maxWidth: '680px' }}>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '0.62rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#5C6166', margin: '0 0 0.5rem' }}>
          Archive
        </p>
        <h1 className="font-serif" style={{ fontSize: '1.8rem', fontWeight: 700, color: '#F0EDE6', margin: '0 0 0.5rem' }}>
          Important Dates
        </h1>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#5C6166', lineHeight: 1.7, margin: 0 }}>
          On these dates the archive automatically sends a curated photograph and memory to you and all contributors.
        </p>
      </div>

      {/* Add form */}
      <div style={{ background: 'rgba(196,162,74,0.04)', border: '1px solid rgba(196,162,74,0.15)', borderTop: '2px solid rgba(196,162,74,0.4)', borderRadius: '2px', padding: '1.5rem', marginBottom: '2.5rem' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C4A24A', margin: '0 0 1.25rem' }}>
          Add a Date
        </p>

        <form onSubmit={handleAdd}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={FIELD_LABEL_STYLE}>Person&rsquo;s Name</label>
              <input
                style={INPUT_STYLE}
                placeholder="e.g. Harold, Mom, Grandma Rose"
                value={form.personName}
                onChange={e => setForm(f => ({ ...f, personName: e.target.value }))}
                required
              />
            </div>

            <div>
              <label style={FIELD_LABEL_STYLE}>Type</label>
              <select
                style={SELECT_STYLE}
                value={form.dateType}
                onChange={e => setForm(f => ({ ...f, dateType: e.target.value }))}
              >
                {DATE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={FIELD_LABEL_STYLE}>Year (optional)</label>
              <input
                style={INPUT_STYLE}
                type="number"
                placeholder="e.g. 1945"
                min="1800"
                max={new Date().getFullYear()}
                value={form.year}
                onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
              />
            </div>

            <div>
              <label style={FIELD_LABEL_STYLE}>Month</label>
              <select
                style={SELECT_STYLE}
                value={form.month}
                onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
                required
              >
                <option value="">Select month</option>
                {MONTH_NAMES.slice(1).map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={FIELD_LABEL_STYLE}>Day</label>
              <input
                style={INPUT_STYLE}
                type="number"
                placeholder="1–31"
                min="1"
                max="31"
                value={form.day}
                onChange={e => setForm(f => ({ ...f, day: e.target.value }))}
                required
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={FIELD_LABEL_STYLE}>Personal note (optional — included in the email)</label>
              <textarea
                style={{ ...INPUT_STYLE, minHeight: '72px', resize: 'vertical' } as React.CSSProperties}
                placeholder="A sentence or two about why this date matters..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={saving}
              style={{ background: 'rgba(196,162,74,1)', color: '#0A0A0B', fontFamily: 'monospace', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', border: 'none', borderRadius: '2px', padding: '0.6rem 1.25rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Saving...' : 'Add Date'}
            </button>
            {saved && (
              <span style={{ fontFamily: 'monospace', fontSize: '0.58rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C4A24A' }}>
                Saved ✓
              </span>
            )}
            {saveErr && (
              <span style={{ fontFamily: 'monospace', fontSize: '0.52rem', letterSpacing: '0.12em', color: '#E05A5A' }}>
                Error: {saveErr}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Fetch error */}
      {fetchErr && (
        <div style={{ background: 'rgba(224,90,90,0.06)', border: '1px solid rgba(224,90,90,0.2)', borderRadius: '2px', padding: '0.75rem 1rem', marginBottom: '1.5rem' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '0.54rem', letterSpacing: '0.12em', color: '#E05A5A', margin: 0 }}>
            Could not load dates: {fetchErr}
          </p>
        </div>
      )}

      {/* Existing dates */}
      {loading ? (
        <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#3A3830' }}>
          Loading...
        </p>
      ) : sortedDates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#5C6166', fontSize: '0.95rem' }}>
            No important dates added yet.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {sortedDates.map(dateRow => {
            const today     = isToday(dateRow.month, dateRow.day)
            const days      = daysUntil(dateRow.month, dateRow.day)
            const isSending = sending === dateRow.id
            const yearsAgo  = dateRow.year ? new Date().getFullYear() - dateRow.year : null

            return (
              <div
                key={dateRow.id}
                style={{
                  background:   today ? 'rgba(196,162,74,0.06)' : 'rgba(255,255,255,0.02)',
                  border:       `1px solid ${today ? 'rgba(196,162,74,0.25)' : 'rgba(255,255,255,0.06)'}`,
                  borderLeft:   `3px solid ${dateTypeColor(dateRow.date_type)}`,
                  borderRadius: '2px',
                  padding:      '1rem 1.25rem',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '1rem',
                }}
              >
                {/* Date badge */}
                <div style={{ textAlign: 'center', minWidth: '48px', flexShrink: 0 }}>
                  <p style={{ fontFamily: 'monospace', fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5C6166', margin: '0 0 2px' }}>
                    {MONTH_NAMES[dateRow.month]?.slice(0, 3).toUpperCase()}
                  </p>
                  <p className="font-serif" style={{ fontSize: '1.6rem', fontWeight: 700, color: today ? '#C4A24A' : '#F0EDE6', lineHeight: 1, margin: 0 }}>
                    {dateRow.day}
                  </p>
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <p className="font-serif" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#F0EDE6', margin: 0 }}>
                      {dateRow.person_name}
                    </p>
                    {today && (
                      <span style={{ fontFamily: 'monospace', fontSize: '0.46rem', letterSpacing: '0.2em', textTransform: 'uppercase', background: 'rgba(196,162,74,0.15)', color: '#C4A24A', padding: '2px 6px', borderRadius: '2px' }}>
                        TODAY
                      </span>
                    )}
                  </div>
                  <p style={{ fontFamily: 'monospace', fontSize: '0.56rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5C6166', margin: '4px 0 0' }}>
                    {DATE_TYPES.find(t => t.value === dateRow.date_type)?.label}
                    {yearsAgo && dateRow.date_type === 'birthday' ? ` · Would be ${yearsAgo}` : ''}
                    {yearsAgo && dateRow.date_type === 'death_anniversary' ? ` · ${yearsAgo} years` : ''}
                    {yearsAgo && dateRow.date_type === 'wedding_anniversary' ? ` · ${yearsAgo} years` : ''}
                    {!today && ` · ${days} day${days === 1 ? '' : 's'} away`}
                  </p>
                  {dateRow.notes && (
                    <p className="font-serif" style={{ fontStyle: 'italic', fontSize: '0.82rem', color: '#9DA3A8', margin: '6px 0 0', lineHeight: 1.6 }}>
                      {dateRow.notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                  <button
                    onClick={() => handleTestSend(dateRow)}
                    disabled={isSending}
                    title="Send now (test)"
                    style={{ fontFamily: 'monospace', fontSize: '0.52rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#C4A24A', background: 'none', border: '1px solid rgba(196,162,74,0.3)', borderRadius: '2px', padding: '4px 10px', cursor: isSending ? 'not-allowed' : 'pointer', opacity: isSending ? 0.5 : 1 }}
                  >
                    {isSending ? '...' : 'Send now →'}
                  </button>
                  <button
                    onClick={() => handleDelete(dateRow.id)}
                    title="Remove"
                    style={{ fontFamily: 'monospace', fontSize: '0.52rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#5C6166', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
