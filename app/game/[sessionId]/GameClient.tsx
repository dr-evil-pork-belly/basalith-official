'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────
type SessionData = {
  session: {
    id:            string
    status:        string
    closesAt:      string
    totalMemories: number
    photographIds: string[]
  }
  archive: {
    name:       string
    familyName: string
    ownerName:  string
  }
  photoUrls:       Record<string, string>
  photoMeta:       Record<string, { ai_era_estimate?: string }>
  contribPerPhoto: Record<string, number>
  leaderboard:     { name: string; count: number }[]
}

// ── Countdown helper ──────────────────────────────────────────────────────────
function timeLeft(closesAt: string): string {
  const diff = new Date(closesAt).getTime() - Date.now()
  if (diff <= 0) return 'Closed'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function GameClient({ sessionId }: { sessionId: string }) {
  const [data,            setData]            = useState<SessionData | null>(null)
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState('')

  // Contributor identity
  const [identified,      setIdentified]      = useState(false)
  const [name,            setName]            = useState('')
  const [email,           setEmail]           = useState('')
  const [nameError,       setNameError]       = useState('')

  // Photo navigation
  const [photoIndex,      setPhotoIndex]      = useState(0)

  // Per-photo state
  const [memories,        setMemories]        = useState<Record<string, string>>({})
  const [savedPhotos,     setSavedPhotos]     = useState<Set<string>>(new Set())
  const [saving,          setSaving]          = useState(false)
  const [saveError,       setSaveError]       = useState('')
  const [memoriesCount,   setMemoriesCount]   = useState(0)

  // Post-game
  const [gameComplete,    setGameComplete]    = useState(false)
  const [countdown,       setCountdown]       = useState('')

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Restore identity from localStorage
  useEffect(() => {
    const savedName  = localStorage.getItem('mg-name')  || ''
    const savedEmail = localStorage.getItem('mg-email') || ''
    if (savedName) { setName(savedName); setEmail(savedEmail); setIdentified(true) }
  }, [])

  // Load session
  useEffect(() => {
    fetchSession()
  }, [sessionId])

  // Countdown timer
  useEffect(() => {
    if (!data) return
    const t = setInterval(() => setCountdown(timeLeft(data.session.closesAt)), 1000)
    setCountdown(timeLeft(data.session.closesAt))
    return () => clearInterval(t)
  }, [data])

  async function fetchSession() {
    try {
      const res  = await fetch(`/api/game/${sessionId}`)
      if (!res.ok) throw new Error('Not found')
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load game')
    } finally {
      setLoading(false)
    }
  }

  function handleStart() {
    if (!name.trim()) { setNameError('Please enter your name'); return }
    setNameError('')
    localStorage.setItem('mg-name',  name.trim())
    localStorage.setItem('mg-email', email.trim())
    setIdentified(true)
  }

  async function handleSaveMemory() {
    if (!data) return
    const photoId = data.session.photographIds[photoIndex]
    const text    = (memories[photoId] || '').trim()
    if (!text) return

    setSaving(true)
    setSaveError('')

    try {
      const res = await fetch(`/api/game/${sessionId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          photographId:    photoId,
          contributorEmail: email.trim() || undefined,
          contributorName:  name.trim(),
          memoryText:       text,
        }),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error || 'Save failed')

      setSavedPhotos(prev => new Set([...prev, photoId]))
      setMemoriesCount(c => c + 1)

      // Update leaderboard from response
      setData(prev => prev ? { ...prev, leaderboard: result.leaderboard ?? prev.leaderboard } : prev)

      // Auto-advance after brief confirmation
      setTimeout(() => {
        if (photoIndex < (data.session.photographIds.length - 1)) {
          setPhotoIndex(i => i + 1)
          setTimeout(() => textareaRef.current?.focus(), 200)
        } else {
          setGameComplete(true)
        }
      }, 800)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0908', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#5C6166' }}>Loading game…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0908', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.7rem', letterSpacing: '0.2em', color: '#5C6166', marginBottom: '1rem' }}>GAME NOT FOUND</p>
          <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#706C65' }}>This game link is no longer valid.</p>
        </div>
      </div>
    )
  }

  const isExpired = data.session.status !== 'active' || new Date(data.session.closesAt) <= new Date()
  const familyName = data.archive.familyName || data.archive.name
  const photos     = data.session.photographIds

  // ── Expired state ──────────────────────────────────────────────────────────
  if (isExpired) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0908', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.72rem', letterSpacing: '0.28em', color: '#C4A24A', marginBottom: '1.5rem' }}>
          THE {familyName.toUpperCase()} ARCHIVE
        </p>
        <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: '1.8rem', color: '#F0EDE6', margin: '0 0 1rem' }}>
          This game has closed.
        </h1>
        <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '1rem', color: '#706C65', maxWidth: '360px', lineHeight: 1.75 }}>
          A new game opens every Wednesday.
        </p>
      </div>
    )
  }

  // ── Completed state ────────────────────────────────────────────────────────
  if (gameComplete) {
    const maxCount = data.leaderboard[0]?.count ?? 1
    return (
      <div style={{ minHeight: '100vh', background: '#0A0908', padding: '3rem 1.5rem' }}>
        <div style={{ maxWidth: '540px', margin: '0 auto' }}>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.7rem', letterSpacing: '0.28em', color: '#C4A24A', textAlign: 'center', marginBottom: '2rem' }}>
            THE {familyName.toUpperCase()} ARCHIVE
          </p>

          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: '2rem', color: '#F0EDE6', margin: '0 0 0.75rem' }}>
              You contributed {memoriesCount} {memoriesCount === 1 ? 'memory' : 'memories'}.
            </h1>
            <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '1rem', color: '#9DA3A8', lineHeight: 1.75, maxWidth: '400px', margin: '0 auto 0.5rem' }}>
              Every memory you shared is now permanently preserved in The {familyName} Archive.
            </p>
            <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.9rem', color: '#5C6166' }}>
              The family leaderboard updates in real time.
            </p>
          </div>

          {data.leaderboard.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.64rem', letterSpacing: '0.22em', color: '#5C6166', marginBottom: '1rem' }}>
                CURRENT LEADERBOARD
              </p>
              {data.leaderboard.map((row, i) => {
                const isMe  = row.name === name.trim()
                const width = Math.round((row.count / maxCount) * 160)
                return (
                  <div key={row.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
                    <span style={{ fontFamily: '"Courier New", monospace', fontSize: '0.6rem', color: '#5C6166', width: '16px', flexShrink: 0 }}>
                      {i + 1}
                    </span>
                    <span style={{ fontFamily: '"Courier New", monospace', fontSize: '0.7rem', color: isMe ? '#C4A24A' : '#9DA3A8', minWidth: '100px', flexShrink: 0 }}>
                      {row.name}{isMe ? ' (you)' : ''}
                    </span>
                    <div style={{ width: `${width}px`, height: '6px', background: isMe ? 'rgba(196,162,74,0.7)' : 'rgba(240,237,230,0.15)', borderRadius: '2px', flexShrink: 0 }} />
                    <span style={{ fontFamily: '"Courier New", monospace', fontSize: '0.62rem', color: '#5C6166' }}>{row.count}</span>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ textAlign: 'center' }}>
            <Link
              href={`/game/${sessionId}/leaderboard`}
              style={{ display: 'inline-block', fontFamily: '"Courier New", monospace', fontSize: '0.68rem', letterSpacing: '0.25em', color: '#0A0908', background: '#C4A24A', textDecoration: 'none', padding: '0.85rem 2rem', borderRadius: '2px' }}
            >
              SEE THE LEADERBOARD →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const currentPhotoId  = photos[photoIndex]
  const currentPhotoUrl = data.photoUrls[currentPhotoId]
  const currentMeta     = data.photoMeta[currentPhotoId]
  const alreadySaved    = savedPhotos.has(currentPhotoId)
  const currentMemory   = memories[currentPhotoId] || ''

  // ── Identity gate ──────────────────────────────────────────────────────────
  if (!identified) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0908', padding: '3rem 1.5rem' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.7rem', letterSpacing: '0.28em', color: '#C4A24A', marginBottom: '0.5rem' }}>
            THE {familyName.toUpperCase()} ARCHIVE
          </p>
          <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: '1.8rem', color: '#F0EDE6', margin: '0 0 0.5rem' }}>
            This week&rsquo;s memory game.
          </h1>
          <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#9DA3A8', marginBottom: '0.5rem', lineHeight: 1.7 }}>
            {photos.length} photograph{photos.length !== 1 ? 's' : ''}.
            {data.session.totalMemories > 0 ? ` ${data.session.totalMemories} memories contributed so far.` : ''}
          </p>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.64rem', letterSpacing: '0.18em', color: 'rgba(196,162,74,0.7)', marginBottom: '2.5rem' }}>
            CLOSES IN {countdown}
          </p>

          <div style={{ width: '100%', height: '1px', background: 'rgba(196,162,74,0.15)', marginBottom: '2rem' }} />

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontFamily: '"Courier New", monospace', fontSize: '0.64rem', letterSpacing: '0.18em', color: '#706C65', marginBottom: '0.5rem' }}>
              YOUR NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleStart() }}
              placeholder="How the family knows you"
              autoFocus
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${nameError ? 'rgba(180,60,60,0.6)' : 'rgba(196,162,74,0.3)'}`, color: '#F0EDE6', fontFamily: 'Georgia, serif', fontSize: '1rem', padding: '0.5rem 0', outline: 'none', boxSizing: 'border-box' }}
            />
            {nameError && (
              <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.6rem', color: '#B85C5C', marginTop: '0.4rem' }}>{nameError}</p>
            )}
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', fontFamily: '"Courier New", monospace', fontSize: '0.64rem', letterSpacing: '0.18em', color: '#706C65', marginBottom: '0.5rem' }}>
              YOUR EMAIL <span style={{ color: '#3A3830' }}>(optional — to receive the summary)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleStart() }}
              placeholder="email@example.com"
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(196,162,74,0.15)', color: '#F0EDE6', fontFamily: 'Georgia, serif', fontSize: '1rem', padding: '0.5rem 0', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <button
            onClick={handleStart}
            style={{ background: '#C4A24A', border: 'none', color: '#0A0908', fontFamily: '"Courier New", monospace', fontSize: '0.7rem', letterSpacing: '0.28em', padding: '0.85rem 2.5rem', cursor: 'pointer', borderRadius: '2px' }}
          >
            START PLAYING →
          </button>
        </div>
      </div>
    )
  }

  // ── Active game ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0A0908' }}>

      {/* Header */}
      <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.68rem', letterSpacing: '0.25em', color: '#C4A24A', margin: '0 0 2px' }}>
              THE {familyName.toUpperCase()} ARCHIVE
            </p>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.6rem', letterSpacing: '0.14em', color: '#5C6166', margin: 0 }}>
              MEMORY GAME
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.6rem', letterSpacing: '0.12em', color: '#706C65', margin: '0 0 2px' }}>
              {data.session.totalMemories + memoriesCount} {(data.session.totalMemories + memoriesCount) === 1 ? 'memory' : 'memories'} so far
            </p>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.6rem', letterSpacing: '0.12em', color: 'rgba(196,162,74,0.7)', margin: 0 }}>
              Closes in {countdown}
            </p>
          </div>
        </div>
      </div>

      {/* Photo + input */}
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Photo counter */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.64rem', letterSpacing: '0.18em', color: '#5C6166', margin: 0 }}>
            PHOTO {photoIndex + 1} OF {photos.length}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {photos.map((pid, i) => (
              <button
                key={pid}
                onClick={() => setPhotoIndex(i)}
                style={{ width: '8px', height: '8px', borderRadius: '50%', background: i === photoIndex ? '#C4A24A' : savedPhotos.has(pid) ? 'rgba(196,162,74,0.4)' : 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', padding: 0 }}
              />
            ))}
          </div>
        </div>

        {/* Photo */}
        {currentPhotoUrl && (
          <div style={{ marginBottom: '1.5rem' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentPhotoUrl}
              alt={`Photograph ${photoIndex + 1}`}
              style={{ width: '100%', maxHeight: '480px', objectFit: 'cover', display: 'block', borderRadius: '2px' }}
            />
            {currentMeta?.ai_era_estimate && (
              <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.6rem', letterSpacing: '0.14em', color: '#3A3830', marginTop: '0.5rem' }}>
                {currentMeta.ai_era_estimate.toUpperCase()}
              </p>
            )}
          </div>
        )}

        {/* Memory input */}
        <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '1rem', color: '#9DA3A8', marginBottom: '0.75rem' }}>
          What do you remember about this?
        </p>

        {alreadySaved ? (
          <div style={{ padding: '1rem 0', borderBottom: '1px solid rgba(196,162,74,0.15)' }}>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.68rem', letterSpacing: '0.22em', color: '#C4A24A', margin: 0 }}>
              ✓ SAVED
            </p>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={currentMemory}
            onChange={e => setMemories(prev => ({ ...prev, [currentPhotoId]: e.target.value }))}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSaveMemory()
            }}
            placeholder="Any memory, any detail — even partial memories help."
            rows={4}
            style={{ width: '100%', minHeight: '120px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(196,162,74,0.3)', color: '#F0EDE6', fontFamily: 'Georgia, serif', fontSize: '1rem', fontStyle: 'italic', lineHeight: 1.7, padding: '0.5rem 0', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          />
        )}

        {saveError && (
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.62rem', color: '#B85C5C', marginTop: '0.5rem' }}>{saveError}</p>
        )}

        {!alreadySaved && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setPhotoIndex(i => Math.max(0, i - 1))}
                disabled={photoIndex === 0}
                style={{ fontFamily: '"Courier New", monospace', fontSize: '0.62rem', letterSpacing: '0.15em', color: '#5C6166', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', padding: '0.55rem 1rem', cursor: photoIndex === 0 ? 'not-allowed' : 'pointer', borderRadius: '2px', opacity: photoIndex === 0 ? 0.35 : 1 }}
              >
                ← PREV
              </button>
              <button
                onClick={() => setPhotoIndex(i => Math.min(photos.length - 1, i + 1))}
                disabled={photoIndex === photos.length - 1}
                style={{ fontFamily: '"Courier New", monospace', fontSize: '0.62rem', letterSpacing: '0.15em', color: '#5C6166', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', padding: '0.55rem 1rem', cursor: photoIndex === photos.length - 1 ? 'not-allowed' : 'pointer', borderRadius: '2px', opacity: photoIndex === photos.length - 1 ? 0.35 : 1 }}
              >
                NEXT →
              </button>
            </div>
            <button
              onClick={handleSaveMemory}
              disabled={saving || !currentMemory.trim()}
              style={{ background: saving || !currentMemory.trim() ? 'rgba(196,162,74,0.3)' : '#C4A24A', border: 'none', color: '#0A0908', fontFamily: '"Courier New", monospace', fontSize: '0.68rem', letterSpacing: '0.25em', padding: '0.85rem 2rem', cursor: saving || !currentMemory.trim() ? 'not-allowed' : 'pointer', borderRadius: '2px', transition: 'background 0.15s' }}
            >
              {saving ? 'SAVING…' : 'SAVE THIS MEMORY'}
            </button>
          </div>
        )}

        {alreadySaved && (
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              onClick={() => setPhotoIndex(i => Math.max(0, i - 1))}
              disabled={photoIndex === 0}
              style={{ fontFamily: '"Courier New", monospace', fontSize: '0.62rem', letterSpacing: '0.15em', color: '#5C6166', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', padding: '0.55rem 1rem', cursor: photoIndex === 0 ? 'not-allowed' : 'pointer', borderRadius: '2px', opacity: photoIndex === 0 ? 0.35 : 1 }}
            >
              ← PREV
            </button>
            {photoIndex < photos.length - 1 ? (
              <button
                onClick={() => setPhotoIndex(i => i + 1)}
                style={{ fontFamily: '"Courier New", monospace', fontSize: '0.62rem', letterSpacing: '0.15em', color: '#C4A24A', background: 'transparent', border: '1px solid rgba(196,162,74,0.3)', padding: '0.55rem 1rem', cursor: 'pointer', borderRadius: '2px' }}
              >
                NEXT PHOTO →
              </button>
            ) : (
              <button
                onClick={() => setGameComplete(true)}
                style={{ background: '#C4A24A', border: 'none', color: '#0A0908', fontFamily: '"Courier New", monospace', fontSize: '0.68rem', letterSpacing: '0.25em', padding: '0.55rem 1.5rem', cursor: 'pointer', borderRadius: '2px' }}
              >
                SEE RESULTS →
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
