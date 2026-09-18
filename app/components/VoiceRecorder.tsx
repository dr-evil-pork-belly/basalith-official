'use client'
import { useState, useRef, useCallback } from 'react'

interface VoiceRecorderProps {
  archiveId: string
  prompt?: string
  onComplete?: (transcript: string) => void
  onClose?: () => void
}

type RecorderState =
  'idle' | 'requesting' | 'recording' |
  'processing' | 'complete' | 'error'

export default function VoiceRecorder({
  archiveId,
  prompt,
  onComplete,
  onClose,
}: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle')
  const [duration, setDuration] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [languageDetected, setLanguageDetected] = useState('')
  const [error, setError] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef   = useRef<Blob[]>([])
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef        = useRef<MediaStream | null>(null)
  const durationRef      = useRef(0)

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  const processRecording = useCallback(async (finalDuration: number) => {
    setState('processing')
    try {
      const mimeType  = audioChunksRef.current[0]?.type || 'audio/webm'
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })

      const formData = new FormData()
      formData.append('audio', audioBlob, `recording.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`)
      formData.append('archiveId', archiveId)
      formData.append('prompt', prompt || '')
      formData.append('duration', finalDuration.toString())

      const response = await fetch('/api/archive/transcribe-voice', {
        method: 'POST',
        body:   formData,
      })
      const data = await response.json()

      if (data.success && data.transcript) {
        setTranscript(data.transcript)
        setLanguageDetected(data.languageDetected || '')
        setState('complete')
        onComplete?.(data.transcript)
      } else if (data.success && !data.transcript) {
        setState('error')
        setError('Could not transcribe this recording. Please speak clearly and try again.')
      } else {
        throw new Error(data.error || 'Processing failed')
      }
    } catch (err: unknown) {
      setState('error')
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }, [archiveId, prompt, onComplete])

  const startRecording = useCallback(async () => {
    try {
      setState('requesting')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      })
      streamRef.current      = stream
      audioChunksRef.current = []
      durationRef.current    = 0

      const mimeType =
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
        MediaRecorder.isTypeSupported('audio/mp4')              ? 'audio/mp4' :
        'audio/webm'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        await processRecording(durationRef.current)
      }

      mediaRecorder.start(1000)
      setState('recording')
      setDuration(0)

      timerRef.current = setInterval(() => {
        durationRef.current += 1
        setDuration(durationRef.current)
        if (durationRef.current >= 300) stopRecording()
      }, 1000)

    } catch (err: unknown) {
      setState('error')
      const name = err instanceof Error ? (err as { name?: string }).name : ''
      setError(
        name === 'NotAllowedError' ? 'Microphone access was denied. Please allow microphone access in your browser settings and try again.' :
        name === 'NotFoundError'   ? 'No microphone found. Please connect a microphone and try again.' :
        `Could not start recording: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }, [stopRecording, processRecording])

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const reset = () => {
    setState('idle')
    setDuration(0)
    durationRef.current = 0
    setTranscript('')
    setLanguageDetected('')
    setError('')
    audioChunksRef.current = []
  }

  return (
    <div style={{
      background:   'var(--portal-gold-wash)',
      border:       '1px solid var(--portal-gold-line)',
      borderRadius: '4px',
      padding:      '2rem',
      maxWidth:     '520px',
      margin:       '0 auto',
    }}>

      {/* Prompt */}
      {prompt && (
        <div style={{ borderLeft: '2px solid var(--portal-gold-line)', paddingLeft: '1rem', marginBottom: '1.5rem' }}>
          <p style={{ fontFamily: 'var(--portal-serif)', fontSize: '1rem', fontStyle: 'italic', color: 'var(--portal-ink)', lineHeight: 1.7, margin: 0 }}>
            &ldquo;{prompt}&rdquo;
          </p>
        </div>
      )}

      {/* IDLE */}
      {state === 'idle' && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--portal-serif)', fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--portal-secondary)', marginBottom: '0.5rem', lineHeight: 1.7 }}>
            Speak naturally in any language.
          </p>
          <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.12em', color: 'var(--portal-label)', marginBottom: '1.5rem' }}>
            VIETNAMESE · SPANISH · CANTONESE · ARABIC · TAGALOG · KOREAN · AND 93 MORE
          </p>
          <button
            onClick={startRecording}
            style={{
              width:           '80px',
              height:          '80px',
              borderRadius:    '50%',
              background:      'var(--portal-gold-wash)',
              border:          '2px solid var(--portal-gold-line)',
              cursor:          'pointer',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              margin:          '0 auto 1rem',
              transition:      'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--portal-tint)'
              e.currentTarget.style.borderColor = 'var(--portal-gold-ink)'
              e.currentTarget.style.transform    = 'scale(1.05)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--portal-gold-wash)'
              e.currentTarget.style.borderColor = 'var(--portal-gold-line)'
              e.currentTarget.style.transform    = 'scale(1)'
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--portal-gold-ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8"  y1="23" x2="16" y2="23"/>
            </svg>
          </button>
          <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.2em', color: 'var(--portal-gold-ink)' }}>
            TAP TO RECORD · UP TO 5 MINUTES
          </p>
        </div>
      )}

      {/* REQUESTING */}
      {state === 'requesting' && (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <p style={{ fontFamily: 'var(--portal-serif)', fontStyle: 'italic', color: 'var(--portal-secondary)' }}>
            Requesting microphone access...
          </p>
        </div>
      )}

      {/* RECORDING */}
      {state === 'recording' && (
        <div style={{ textAlign: 'center' }}>
          <style>{`
            @keyframes vr-pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50%       { opacity: 0.7; transform: scale(1.08); }
            }
          `}</style>
          <div style={{
            width:           '80px',
            height:          '80px',
            borderRadius:    '50%',
            background:      'var(--portal-tint)',
            border:          '2px solid var(--portal-error)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            margin:          '0 auto 1rem',
            animation:       'vr-pulse 1.2s ease-in-out infinite',
          }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--portal-error)' }} />
          </div>
          <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '1.4rem', color: 'var(--portal-ink)', letterSpacing: '0.05em', margin: '0 0 0.25rem' }}>
            {formatDuration(duration)}
          </p>
          <p style={{ fontFamily: 'var(--portal-serif)', fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--portal-secondary)', marginBottom: '2rem' }}>
            Recording. Speak naturally.
          </p>
          <button
            onClick={stopRecording}
            style={{
              fontFamily: 'var(--portal-mono)',
              fontSize:      '0.72rem',
              letterSpacing: '0.25em',
              color:         'var(--portal-btn-label)',
              background:    'var(--portal-btn)',
              border:        'none',
              padding:       '0.85rem 2.5rem',
              cursor:        'pointer',
              borderRadius:  '2px',
            }}
          >
            STOP AND SAVE
          </button>
        </div>
      )}

      {/* PROCESSING */}
      {state === 'processing' && (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <p style={{ fontFamily: 'var(--portal-serif)', fontSize: '1rem', fontStyle: 'italic', color: 'var(--portal-ink)', marginBottom: '0.5rem' }}>
            Transcribing your recording...
          </p>
          <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.16em', color: 'var(--portal-secondary)' }}>
            {formatDuration(duration)} RECORDED · DETECTING LANGUAGE
          </p>
        </div>
      )}

      {/* COMPLETE */}
      {state === 'complete' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.25em', color: 'var(--portal-gold-ink)', margin: 0 }}>
              ✓ SAVED TO YOUR ARCHIVE
            </p>
            {languageDetected && (
              <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.12em', color: 'var(--portal-label)', margin: 0 }}>
                · {languageDetected.toUpperCase()}
              </p>
            )}
          </div>
          <p style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.16em', color: 'var(--portal-secondary)', marginBottom: '0.75rem' }}>
            TRANSCRIPT
          </p>
          <div style={{ background: 'var(--portal-inset)', border: '1px solid var(--portal-gold-line)', borderRadius: '2px', padding: '1rem 1.25rem', marginBottom: '1.5rem', maxHeight: '200px', overflowY: 'auto' }}>
            <p style={{ fontFamily: 'var(--portal-serif)', fontSize: '0.95rem', fontWeight: 300, color: 'var(--portal-body)', lineHeight: 1.85, margin: 0, fontStyle: 'italic' }}>
              &ldquo;{transcript}&rdquo;
            </p>
          </div>
          <p style={{ fontFamily: 'var(--portal-serif)', fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--portal-label)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            Your words have been transcribed and saved as a deposit.
            Your voice recording is preserved permanently in your archive.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={reset}
              style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.2em', color: 'var(--portal-gold-ink)', background: 'transparent', border: '1px solid var(--portal-gold-line)', padding: '0.65rem 1.25rem', cursor: 'pointer', borderRadius: '2px' }}
            >
              RECORD AGAIN
            </button>
            {onClose && (
              <button
                onClick={onClose}
                style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.2em', color: 'var(--portal-secondary)', background: 'transparent', border: '1px solid var(--portal-card-line)', padding: '0.65rem 1.25rem', cursor: 'pointer', borderRadius: '2px' }}
              >
                DONE
              </button>
            )}
          </div>
        </div>
      )}

      {/* ERROR */}
      {state === 'error' && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--portal-serif)', fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--portal-error)', marginBottom: '1.5rem', lineHeight: 1.7, maxWidth: '360px', margin: '0 auto 1.5rem' }}>
            {error}
          </p>
          <button
            onClick={reset}
            style={{ fontFamily: 'var(--portal-mono)', fontSize: '11px', letterSpacing: '0.2em', color: 'var(--portal-gold-ink)', background: 'transparent', border: '1px solid var(--portal-gold-line)', padding: '0.65rem 1.25rem', cursor: 'pointer', borderRadius: '2px' }}
          >
            TRY AGAIN
          </button>
        </div>
      )}

    </div>
  )
}
