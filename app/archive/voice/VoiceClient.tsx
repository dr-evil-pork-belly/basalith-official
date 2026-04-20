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

      {/* ── Header ── */}
      <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.68rem', letterSpacing: '0.3em', color: '#C4A24A', textTransform: 'uppercase', margin: '0 0 0.75rem' }}>
        VOICE ARCHIVE
      </p>
      <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: '2.2rem', color: '#F0EDE6', margin: '0 0 1rem', lineHeight: 1.2 }}>
        Your voice. Preserved.
      </h1>
      <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '1.05rem', color: '#9DA3A8', lineHeight: 1.75, maxWidth: '560px', margin: '0 0 1rem' }}>
        Speak your memories, wisdom, and stories in any language.
        Every recording is transcribed and saved to your archive permanently.
        Your voice is preserved alongside your words.
      </p>
      <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.62rem', letterSpacing: '0.14em', color: '#3A3830', marginBottom: '2rem' }}>
        SUPPORTS VIETNAMESE · SPANISH · CANTONESE · ARABIC · TAGALOG · KOREAN · ENGLISH · AND 93 MORE
      </p>

      {/* Thin gold rule */}
      <div style={{ width: '100%', height: '1px', background: 'rgba(196,162,74,0.2)', marginBottom: '2rem' }} />

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(196,162,74,0.12)', marginBottom: '2rem' }}>
        {(['freeform', 'prompt', 'story'] as Tab[]).map(t => {
          const label = t === 'freeform' ? 'FREE FORM' : t === 'prompt' ? "THIS WEEK'S PROMPT" : 'STORY MODE'
          const active = tab === t
          return (
            <button
              key={t}
              onClick={() => { setTab(t); setSelectedPrompt(null) }}
              style={{
                fontFamily:    '"Courier New", monospace',
                fontSize:      '0.62rem',
                letterSpacing: '0.18em',
                color:         active ? '#C4A24A' : '#5C6166',
                background:    'transparent',
                border:        'none',
                borderBottom:  active ? '2px solid #C4A24A' : '2px solid transparent',
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
          <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.95rem', color: '#706C65', marginBottom: '1.5rem' }}>
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
          <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.95rem', color: '#706C65', marginBottom: '1.5rem' }}>
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
              <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.95rem', color: '#706C65', marginBottom: '1.5rem' }}>
                Choose a story to tell.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
                {STORY_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => selectStoryPrompt(p)}
                    style={{
                      background:   'rgba(196,162,74,0.03)',
                      border:       '1px solid rgba(196,162,74,0.1)',
                      borderRadius: '2px',
                      padding:      '1rem 1.25rem',
                      fontFamily:   'Georgia, serif',
                      fontStyle:    'italic',
                      fontSize:     '1rem',
                      color:        '#9DA3A8',
                      textAlign:    'left',
                      cursor:       'pointer',
                      transition:   'all 0.15s',
                      lineHeight:   1.6,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(196,162,74,0.3)'
                      e.currentTarget.style.color       = '#D0CBC0'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'rgba(196,162,74,0.1)'
                      e.currentTarget.style.color       = '#9DA3A8'
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
                style={{ fontFamily: '"Courier New", monospace', fontSize: '0.6rem', letterSpacing: '0.18em', color: '#5C6166', background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: '1.5rem', padding: 0 }}
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
        <div style={{ width: '100%', height: '1px', background: 'rgba(196,162,74,0.1)', marginBottom: '2rem' }} />

        <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.68rem', letterSpacing: '0.25em', color: '#706C65', marginBottom: '1.5rem' }}>
          YOUR RECORDINGS
        </p>

        {/* Stats bar */}
        {recordings.length > 0 && (
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.64rem', letterSpacing: '0.14em', color: '#5C6166', marginBottom: '1.5rem' }}>
            {recordings.length} recording{recordings.length !== 1 ? 's' : ''}
            {' · '}{totalMinutes(recordings)} minute{totalMinutes(recordings) !== 1 ? 's' : ''}
            {' · '}{langCount} language{langCount !== 1 ? 's' : ''}
          </p>
        )}

        {loadingList ? (
          <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.9rem', color: '#5C6166' }}>
            Loading recordings...
          </p>
        ) : recordings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
            <p style={{ fontFamily: 'Georgia, serif', fontWeight: 600, fontSize: '1rem', color: '#9DA3A8', marginBottom: '0.5rem' }}>
              Your voice is not in your archive.
            </p>
            <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.9rem', color: '#5C6166', lineHeight: 1.7, marginBottom: '1.25rem' }}>
              Record a memory in any language. Your words are transcribed and preserved permanently.
            </p>
          </div>
        ) : (
          <div>
            {recordings.map(r => (
              <div
                key={r.id}
                style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem 0', borderBottom: '1px solid rgba(240,237,230,0.06)' }}
              >
                {/* Left: meta */}
                <div style={{ minWidth: '90px', flexShrink: 0 }}>
                  <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.6rem', letterSpacing: '0.1em', color: '#5C6166', margin: '0 0 2px' }}>
                    {formatDate(r.created_at)}
                  </p>
                  <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.6rem', letterSpacing: '0.1em', color: '#5C6166', margin: '0 0 2px' }}>
                    {formatDuration(r.duration_seconds)}
                  </p>
                  {r.language_detected && r.language_detected !== 'english' && (
                    <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.58rem', letterSpacing: '0.16em', color: '#C4A24A', margin: 0 }}>
                      {r.language_detected.toUpperCase()}
                    </p>
                  )}
                </div>

                {/* Center: transcript excerpt */}
                <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                  {r.transcript ? (
                    <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.9rem', color: '#9DA3A8', margin: 0, lineHeight: 1.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                      &ldquo;{r.transcript.slice(0, 120)}{r.transcript.length > 120 ? '…' : ''}&rdquo;
                    </p>
                  ) : (
                    <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.6rem', letterSpacing: '0.1em', color: '#3A3830', margin: 0 }}>
                      No transcript
                    </p>
                  )}
                  {r.prompt && (
                    <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.58rem', letterSpacing: '0.1em', color: '#3A3830', margin: '4px 0 0' }}>
                      {r.prompt.slice(0, 60)}{r.prompt.length > 60 ? '…' : ''}
                    </p>
                  )}
                </div>

                {/* Right: play button */}
                <button
                  onClick={() => handlePlayRecording(r.id)}
                  title={playingId === r.id ? 'Pause' : 'Play recording'}
                  style={{ flexShrink: 0, width: '32px', height: '32px', borderRadius: '50%', background: 'transparent', border: '1px solid rgba(196,162,74,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#C4A24A'; e.currentTarget.style.background = 'rgba(196,162,74,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(196,162,74,0.2)'; e.currentTarget.style.background = 'transparent' }}
                >
                  {playingId === r.id ? (
                    // Pause icon
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="#C4A24A">
                      <rect x="2" y="1" width="3" height="10" rx="1"/>
                      <rect x="7" y="1" width="3" height="10" rx="1"/>
                    </svg>
                  ) : (
                    // Play triangle
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="#C4A24A">
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
