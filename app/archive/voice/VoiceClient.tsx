'use client'

import { useState, useEffect, useRef } from 'react'
import VoiceRecorder from '@/app/components/VoiceRecorder'

// ── Types ────────────────────────────────────────────────────────────────────
type RecordingRow = {
  id:               string
  created_at:       string
  duration_seconds: number | null
  transcript:       string | null
  language_detected: string | null
  storage_path:     string
  prompt:           string | null
}

type Tab = 'freeform' | 'prompt' | 'story'

// ── Story prompts ─────────────────────────────────────────────────────────────
const STORY_PROMPTS = [
  'Tell me about the house you grew up in.',
  'Describe your first job.',
  'Tell me about the day you met your partner.',
  'Describe a moment of real failure.',
  'Tell me about someone who changed your life.',
  'What would you tell your 20-year-old self?',
  'Describe the best decision you ever made.',
  'Tell me about a time you were genuinely afraid.',
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function totalMinutes(recordings: RecordingRow[]) {
  const secs = recordings.reduce((sum, r) => sum + (r.duration_seconds || 0), 0)
  return Math.round(secs / 60)
}

function uniqueLanguages(recordings: RecordingRow[]) {
  const langs = recordings
    .map(r => r.language_detected)
    .filter((l): l is string => !!l && l !== 'english')
  return [...new Set(langs)].length + (recordings.some(r => r.language_detected === 'english' || !r.language_detected) ? 1 : 0)
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function VoiceClient({ archiveId }: { archiveId: string }) {
  const [tab, setTab]                     = useState<Tab>('freeform')
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null)
  const [recordings, setRecordings]       = useState<RecordingRow[]>([])
  const [loadingList, setLoadingList]     = useState(true)
  const [weeklyPrompt, setWeeklyPrompt]   = useState<string>('')
  const [playingId, setPlayingId]         = useState<string | null>(null)
  const audioRef                          = useRef<HTMLAudioElement | null>(null)
  const recorderRef                       = useRef<HTMLDivElement | null>(null)

  // Fetch recordings list
  const fetchRecordings = async () => {
    try {
      const res  = await fetch(`/api/archive/voice-recordings?archiveId=${archiveId}`)
      const data = await res.json()
      if (data.recordings) setRecordings(data.recordings)
    } catch (_) {
      // non-fatal
    } finally {
      setLoadingList(false)
    }
  }

  // Fetch weekly prompt (lowest accuracy dimension)
  const fetchWeeklyPrompt = async () => {
    try {
      const res  = await fetch(`/api/archive/entity-accuracy?archiveId=${archiveId}`)
      const data = await res.json()
      if (data.weeklyPrompt) setWeeklyPrompt(data.weeklyPrompt)
    } catch (_) {
      setWeeklyPrompt('What is the most important thing you have learned in your life?')
    }
  }

  useEffect(() => {
    fetchRecordings()
    fetchWeeklyPrompt()
  }, [archiveId])

  const handleRecordingComplete = (transcript: string) => {
    // Refresh list after a short delay so the new row is committed
    setTimeout(fetchRecordings, 1500)
  }

  const handlePlayRecording = async (id: string) => {
    if (playingId === id) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }
    try {
      const res  = await fetch(`/api/archive/voice-recordings/${id}/play`)
      const data = await res.json()
      if (!data.url) return

      if (audioRef.current) {
        audioRef.current.pause()
      }
      const audio = new Audio(data.url)
      audioRef.current = audio
      audio.onended = () => setPlayingId(null)
      audio.play()
      setPlayingId(id)
    } catch (_) {
      // non-fatal
    }
  }

  const selectStoryPrompt = (p: string) => {
    setSelectedPrompt(p)
    setTimeout(() => {
      recorderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  const activePrompt =
    tab === 'prompt' ? weeklyPrompt :
    tab === 'story'  ? (selectedPrompt || undefined) :
    undefined

  const langCount = uniqueLanguages(recordings)

  return (
    <div style={{ maxWidth: '680px' }}>
      <style>{`
        @media (max-width: 480px) {
          .voice-tab { padding: 0.6rem 0.5rem !important; font-size: 0.5rem !important; letter-spacing: 0.1em !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.3em', color: 'var(--portal-gold-ink)', textTransform: 'uppercase', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ display: 'block', width: '20px', height: '1px', background: 'var(--portal-btn)', flexShrink: 0 }} aria-hidden="true" />
        Voice Archive
      </p>
      <h1 style={{ fontFamily: 'var(--portal-serif)', fontWeight: 300, fontSize: 'clamp(1.8rem,3vw,2.4rem)', color: 'var(--portal-ink)', margin: '0 0 16px', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
        Your voice. Preserved.
      </h1>
      <p style={{ fontFamily: 'var(--portal-serif)', fontStyle: 'italic', fontWeight: 300, fontSize: '1.05rem', color: 'var(--portal-body)', lineHeight: 1.8, maxWidth: '560px', margin: '0 0 12px' }}>
        Speak your memories, wisdom, and stories in any language.
        Every recording is transcribed and saved to your archive permanently.
        Your voice is preserved alongside your words.
      </p>
      <p style={{ fontFamily: 'var(--portal-serif)', fontStyle: 'italic', fontWeight: 300, fontSize: '1.05rem', color: 'var(--portal-body)', lineHeight: 1.8, maxWidth: '560px', margin: '0 0 12px' }}>
        Or call{' '}
        <a href="tel:+18886889168" style={{ color: 'var(--portal-gold-ink)', textDecoration: 'none', whiteSpace: 'nowrap' }}>1-888-688-9168</a>
        {' '}and talk.
      </p>
      <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--portal-label)', marginBottom: '28px' }}>
        Supports Vietnamese · Spanish · Cantonese · Arabic · Tagalog · Korean · English · and 93 more
      </p>

      {/* Thin gold rule */}
      <div style={{ width: '100%', height: '1px', background: 'var(--portal-tint)', marginBottom: '2rem' }} />

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--portal-gold-line)', marginBottom: '2rem' }}>
        {(['freeform', 'prompt', 'story'] as Tab[]).map(t => {
          const label = t === 'freeform' ? 'FREE FORM' : t === 'prompt' ? "THIS WEEK'S PROMPT" : 'STORY MODE'
          const active = tab === t
          return (
            <button
              key={t}
              onClick={() => { setTab(t); setSelectedPrompt(null) }}
              className="voice-tab"
              style={{
                fontFamily: 'var(--portal-mono)',
                fontSize: '11px',
                letterSpacing: '0.18em',
                color:         active ? 'var(--portal-gold-ink)' : 'var(--portal-secondary)',
                background:    'transparent',
                border:        'none',
                borderBottom:  active ? '2px solid var(--portal-gold-ink)' : '2px solid transparent',
                padding:       '0.75rem 1.25rem',
                cursor:        'pointer',
                transition:    'color 0.15s',
                marginBottom:  '-1px',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Tab: Free Form ── */}
      {tab === 'freeform' && (
        <div>
          <p style={{ fontFamily: 'var(--portal-serif)', fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--portal-secondary)', marginBottom: '1.5rem' }}>
            Record anything. No prompt.
          </p>
          <div ref={recorderRef}>
            <VoiceRecorder
              archiveId={archiveId}
              onComplete={handleRecordingComplete}
            />
          </div>
        </div>
      )}

      {/* ── Tab: This Week's Prompt ── */}
      {tab === 'prompt' && (
        <div>
          <p style={{ fontFamily: 'var(--portal-serif)', fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--portal-secondary)', marginBottom: '1.5rem' }}>
            Answer this week&rsquo;s question by voice.
          </p>
          <div ref={recorderRef}>
            <VoiceRecorder
              archiveId={archiveId}
              prompt={weeklyPrompt || undefined}
              onComplete={handleRecordingComplete}
            />
          </div>
        </div>
      )}

      {/* ── Tab: Story Mode ── */}
      {tab === 'story' && (
        <div>
          {!selectedPrompt ? (
            <div>
              <p style={{ fontFamily: 'var(--portal-serif)', fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--portal-secondary)', marginBottom: '1.5rem' }}>
                Choose a story to tell.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
                {STORY_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => selectStoryPrompt(p)}
                    style={{
                      background:   'var(--portal-gold-wash)',
                      border:       '1px solid var(--portal-gold-line)',
                      borderRadius: '2px',
                      padding:      '1rem 1.25rem',
                      fontFamily: 'var(--portal-serif)',
                      fontStyle:    'italic',
                      fontSize:     '1rem',
                      color:        'var(--portal-body)',
                      textAlign:    'left',
                      cursor:       'pointer',
                      transition:   'all 0.15s',
                      lineHeight:   1.6,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--portal-gold-line)'
                      e.currentTarget.style.color = 'var(--portal-ink)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--portal-gold-line)'
                      e.currentTarget.style.color = 'var(--portal-body)'
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <button
                onClick={() => setSelectedPrompt(null)}
                style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.18em', color: 'var(--portal-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: '1.5rem', padding: 0 }}
              >
                ← BACK TO STORIES
              </button>
              <div ref={recorderRef}>
                <VoiceRecorder
                  archiveId={archiveId}
                  prompt={selectedPrompt}
                  onComplete={handleRecordingComplete}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Recording History ── */}
      <div style={{ marginTop: '3rem' }}>
        <div style={{ width: '100%', height: '1px', background: 'var(--portal-gold-wash)', marginBottom: '2rem' }} />

        <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.25em', color: 'var(--portal-secondary)', marginBottom: '1.5rem' }}>
          YOUR RECORDINGS
        </p>

        {/* Stats bar */}
        {recordings.length > 0 && (
          <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.14em', color: 'var(--portal-secondary)', marginBottom: '1.5rem' }}>
            {recordings.length} recording{recordings.length !== 1 ? 's' : ''}
            {' · '}{totalMinutes(recordings)} minute{totalMinutes(recordings) !== 1 ? 's' : ''}
            {' · '}{langCount} language{langCount !== 1 ? 's' : ''}
          </p>
        )}

        {loadingList ? (
          <p style={{ fontFamily: 'var(--portal-serif)', fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--portal-secondary)' }}>
            Loading recordings...
          </p>
        ) : recordings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
            <p style={{ fontFamily: 'var(--portal-serif)', fontWeight: 600, fontSize: '1rem', color: 'var(--portal-body)', marginBottom: '0.5rem' }}>
              Your voice is not in your archive.
            </p>
            <p style={{ fontFamily: 'var(--portal-serif)', fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--portal-secondary)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
              Record a memory in any language. Your words are transcribed and preserved permanently.
            </p>
          </div>
        ) : (
          <div>
            {recordings.map(r => (
              <div
                key={r.id}
                style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem 0', borderBottom: '1px solid var(--portal-card-line)' }}
              >
                {/* Left: meta */}
                <div style={{ minWidth: '90px', flexShrink: 0 }}>
                  <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.1em', color: 'var(--portal-secondary)', margin: '0 0 2px' }}>
                    {formatDate(r.created_at)}
                  </p>
                  <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.1em', color: 'var(--portal-secondary)', margin: '0 0 2px' }}>
                    {formatDuration(r.duration_seconds)}
                  </p>
                  {r.language_detected && r.language_detected !== 'english' && (
                    <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.16em', color: 'var(--portal-gold-ink)', margin: 0 }}>
                      {r.language_detected.toUpperCase()}
                    </p>
                  )}
                </div>

                {/* Center: transcript excerpt */}
                <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                  {r.transcript ? (
                    <p style={{ fontFamily: 'var(--portal-serif)', fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--portal-body)', margin: 0, lineHeight: 1.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                      &ldquo;{r.transcript.slice(0, 120)}{r.transcript.length > 120 ? '…' : ''}&rdquo;
                    </p>
                  ) : (
                    <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.1em', color: 'var(--portal-label)', margin: 0 }}>
                      No transcript
                    </p>
                  )}
                  {r.prompt && (
                    <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.1em', color: 'var(--portal-label)', margin: '4px 0 0' }}>
                      {r.prompt.slice(0, 60)}{r.prompt.length > 60 ? '…' : ''}
                    </p>
                  )}
                </div>

                {/* Right: play button */}
                <button
                  onClick={() => handlePlayRecording(r.id)}
                  title={playingId === r.id ? 'Pause' : 'Play recording'}
                  style={{ flexShrink: 0, width: '32px', height: '32px', borderRadius: '50%', background: 'transparent', border: '1px solid var(--portal-gold-line)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--portal-btn)'; e.currentTarget.style.background = 'var(--portal-gold-wash)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--portal-tint)'; e.currentTarget.style.background = 'transparent' }}
                >
                  {playingId === r.id ? (
                    // Pause icon
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="var(--portal-btn)">
                      <rect x="2" y="1" width="3" height="10" rx="1"/>
                      <rect x="7" y="1" width="3" height="10" rx="1"/>
                    </svg>
                  ) : (
                    // Play triangle
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="var(--portal-btn)">
                      <path d="M3 2l7 4-7 4V2z"/>
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
