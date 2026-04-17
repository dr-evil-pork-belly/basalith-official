'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import VoiceRecorder from '@/app/components/VoiceRecorder'

// ── Types ──────────────────────────────────────────────────────────────────────

type ContributorProps = {
  id:                 string
  name:               string
  email:              string
  relationship:       string
  photos_uploaded:    number
  videos_uploaded:    number
  voice_recordings:   number
  questions_answered: number
  photos_labelled:    number
}

type ArchiveProps = {
  id:          string
  name:        string
  family_name: string
  owner_name:  string
}

type Question = {
  id:               string
  question_text:    string
  question_type:    string
  photograph_id:    string | null
  photoUrl:         string | null
  ai_era_estimate?: string | null
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

const RELATIONSHIP_LABELS: Record<string, string> = {
  daughter:        'Daughter',
  son:             'Son',
  spouse:          'Spouse',
  sibling:         'Sibling',
  colleague:       'Colleague',
  childhood_friend: 'Childhood Friend',
  grandchild:      'Grandchild',
  other:           'Contributor',
}

// ── Section card ───────────────────────────────────────────────────────────────

function SectionCard({
  title,
  subtitle,
  prominent = false,
  children,
}: {
  title:      string
  subtitle?:  string
  prominent?: boolean
  children:   React.ReactNode
}) {
  return (
    <div style={{
      background:   'rgba(196,162,74,0.03)',
      border:       '1px solid rgba(196,162,74,0.1)',
      borderTop:    prominent ? '2px solid rgba(196,162,74,0.45)' : '2px solid rgba(196,162,74,0.2)',
      borderRadius: '2px',
      padding:      '1.5rem',
      marginBottom: '1rem',
    }}>
      <p style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: prominent ? 'rgba(196,162,74,0.9)' : 'rgba(196,162,74,0.7)', margin: '0 0 0.35rem' }}>
        {title}
      </p>
      {subtitle && (
        <p className="font-serif italic" style={{ fontSize: '0.9rem', color: '#9DA3A8', lineHeight: 1.7, marginBottom: '1.25rem' }}>
          {subtitle}
        </p>
      )}
      {children}
    </div>
  )
}

// ── Questions section ──────────────────────────────────────────────────────────

function QuestionsSection({
  token,
  archiveName,
  ownerName,
}: {
  token:       string
  archiveName: string
  ownerName:   string
}) {
  const [questions,    setQuestions]    = useState<Question[]>([])
  const [answers,      setAnswers]      = useState<Record<string, string>>({})
  const [saving,       setSaving]       = useState<Record<string, boolean>>({})
  const [saved,        setSaved]        = useState<Record<string, boolean>>({})
  const [loading,      setLoading]      = useState(true)

  const load = useCallback(async () => {
    try {
      const res  = await fetch(`/api/contribute/questions?token=${token}`)
      const data = await res.json()
      if (res.ok) setQuestions(data.questions ?? [])
    } catch {}
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  async function saveAnswer(q: Question) {
    const text = answers[q.id]?.trim()
    if (!text) return
    setSaving(prev => ({ ...prev, [q.id]: true }))
    try {
      const res  = await fetch('/api/contribute/answer', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, questionId: q.id, answerText: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setSaved(prev => ({ ...prev, [q.id]: true }))
      // Replace answered question with next one
      setQuestions(prev => {
        const remaining = prev.filter(x => x.id !== q.id)
        if (data.nextQuestion) return [...remaining, data.nextQuestion]
        return remaining
      })
      setAnswers(prev => { const next = { ...prev }; delete next[q.id]; return next })
    } catch {}
    setSaving(prev => ({ ...prev, [q.id]: false }))
  }

  if (loading) {
    return (
      <SectionCard title="Questions for you" prominent>
        <div style={{ height: '80px', background: 'rgba(255,255,255,0.03)', borderRadius: '2px', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </SectionCard>
    )
  }

  if (questions.length === 0) return null

  const subjectName = ownerName ? ownerName.split(' ')[0] : 'the archive subject'

  return (
    <SectionCard
      title="Questions for you"
      subtitle={`The archive has ${questions.length} question${questions.length !== 1 ? 's' : ''} only you can answer.`}
      prominent
    >
      <div className="flex flex-col" style={{ gap: '2rem' }}>
        {questions.map(q => (
          <div key={q.id}>
            {q.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={q.photoUrl}
                alt={q.ai_era_estimate ? `Photograph from ${q.ai_era_estimate}` : 'Archive photograph'}
                style={{ width: '100%', maxWidth: '280px', height: 'auto', borderRadius: '2px', marginBottom: '0.75rem', display: 'block' }}
              />
            )}
            <p className="font-serif" style={{ fontWeight: 700, fontSize: '1rem', color: '#F0EDE6', lineHeight: 1.5, marginBottom: '0.75rem' }}>
              {q.question_text.replace(/\[subject\]/gi, subjectName)}
            </p>
            {saved[q.id] ? (
              <p style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.2em', color: 'rgba(196,162,74,0.8)' }}>
                SAVED
              </p>
            ) : (
              <>
                <textarea
                  value={answers[q.id] ?? ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Share what you remember..."
                  rows={4}
                  style={{
                    width:         '100%',
                    minHeight:     '100px',
                    background:    'transparent',
                    border:        'none',
                    borderBottom:  '1px solid rgba(196,162,74,0.2)',
                    color:         '#F0EDE6',
                    fontFamily:    'Georgia, serif',
                    fontSize:      '0.95rem',
                    lineHeight:    1.7,
                    padding:       '0.5rem 0',
                    resize:        'vertical',
                    outline:       'none',
                    boxSizing:     'border-box',
                  }}
                />
                <button
                  onClick={() => saveAnswer(q)}
                  disabled={!answers[q.id]?.trim() || saving[q.id]}
                  style={{
                    marginTop:     '0.75rem',
                    background:    saving[q.id] ? 'rgba(196,162,74,0.4)' : '#C4A24A',
                    border:        'none',
                    borderRadius:  '2px',
                    padding:       '0.6rem 1.5rem',
                    fontFamily:    'monospace',
                    fontSize:      '0.4rem',
                    letterSpacing: '0.25em',
                    textTransform: 'uppercase',
                    color:         '#0A0908',
                    cursor:        saving[q.id] ? 'not-allowed' : 'pointer',
                    opacity:       !answers[q.id]?.trim() ? 0.4 : 1,
                  }}
                >
                  {saving[q.id] ? 'Saving...' : 'Save Answer'}
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ── Photo upload section ───────────────────────────────────────────────────────

function PhotoUploadSection({
  token,
  archiveName,
  subjectName,
  onUploaded,
}: {
  token:       string
  archiveName: string
  subjectName: string
  onUploaded:  (count: number) => void
}) {
  const [files,    setFiles]    = useState<File[]>([])
  const [status,   setStatus]   = useState<UploadStatus>('idle')
  const [message,  setMessage]  = useState('')
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function uploadOne(file: File): Promise<boolean> {
    try {
      // Step 1 — get signed URL
      const urlRes  = await fetch('/api/contribute/upload-url', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, fileName: file.name }),
      })
      if (!urlRes.ok) {
        const errBody = await urlRes.json().catch(() => ({}))
        throw new Error(errBody.error || `upload-url HTTP ${urlRes.status}`)
      }
      const { uploadUrl, path, archiveId } = await urlRes.json()

      // Step 2 — PUT directly to Supabase (bypasses Vercel size limit)
      console.log('[uploadOne] Starting upload:', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadUrl: uploadUrl?.substring(0, 50),
        path,
      })
      const storageRes = await fetch(uploadUrl, {
        method: 'PUT',
        body:   file,
      })
      console.log('[uploadOne] PUT response:', storageRes.status, storageRes.statusText)
      if (!storageRes.ok) {
        const errorText = await storageRes.text()
        console.log('[uploadOne] PUT error body:', errorText)
        throw new Error(`Storage upload failed: ${storageRes.status} - ${errorText}`)
      }

      // Step 3 — register in DB
      const regRes = await fetch('/api/contribute/register-photo', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, archiveId, storagePath: path, fileName: file.name, fileSize: file.size }),
      })
      if (!regRes.ok) {
        const regErr = await regRes.json().catch(() => ({}))
        throw new Error(regErr.error || `register-photo HTTP ${regRes.status}`)
      }
      return true
    } catch (err: unknown) {
      console.error('[uploadOne]', err instanceof Error ? err.message : err)
      return false
    }
  }

  async function handleUpload() {
    if (!files.length) return
    setStatus('uploading')
    setProgress(0)

    let succeeded = 0
    const BATCH = 5

    for (let i = 0; i < files.length; i += BATCH) {
      const batch   = files.slice(i, i + BATCH)
      const results = await Promise.allSettled(batch.map(uploadOne))
      results.forEach(r => { if (r.status === 'fulfilled' && r.value) succeeded++ })
      setProgress(Math.round(((i + batch.length) / files.length) * 100))
    }

    setFiles([])
    setStatus('success')
    setMessage(`${succeeded} photo${succeeded !== 1 ? 's' : ''} added to the archive.`)
    onUploaded(succeeded)
  }

  return (
    <SectionCard
      title="Add your photos"
      subtitle={`Photographs you have of ${subjectName} from your own collection.`}
    >
      <div
        style={{
          border:       `1px dashed ${dragging ? 'rgba(196,162,74,0.5)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '2px',
          padding:      '2rem 1.5rem',
          textAlign:    'center',
          cursor:       'pointer',
          background:   dragging ? 'rgba(196,162,74,0.04)' : 'transparent',
          transition:   'all 0.15s',
          marginBottom: files.length ? '0.75rem' : 0,
        }}
        onDragOver={e  => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault()
          setDragging(false)
          const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
          setFiles(prev => [...prev, ...dropped])
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => {
            setFiles(prev => [...prev, ...Array.from(e.target.files ?? [])])
            e.target.value = ''
          }}
        />
        <p style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.2em', color: '#5C6166', margin: 0 }}>
          {files.length ? `${files.length} PHOTO${files.length > 1 ? 'S' : ''} SELECTED` : 'TAP TO SELECT · DROP TO ADD'}
        </p>
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap" style={{ gap: '0.4rem', marginBottom: '0.75rem' }}>
          {files.map((f, i) => (
            <span key={i} style={{ fontFamily: 'monospace', fontSize: '0.38rem', color: '#706C65', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '2px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {f.name}
            </span>
          ))}
        </div>
      )}

      {status === 'uploading' && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden', marginBottom: '0.4rem' }}>
            <div style={{ height: '100%', background: '#C4A24A', borderRadius: '2px', width: `${progress}%`, transition: 'width 0.3s ease' }} />
          </div>
          <p style={{ fontFamily: 'monospace', fontSize: '0.38rem', color: '#706C65', letterSpacing: '0.1em' }}>
            UPLOADING... {progress}%
          </p>
        </div>
      )}

      {status === 'success' && (
        <p style={{ fontFamily: 'monospace', fontSize: '0.4rem', letterSpacing: '0.2em', color: 'rgba(196,162,74,0.8)', marginBottom: '0.75rem' }}>
          {message.toUpperCase()}
        </p>
      )}

      {status === 'error' && (
        <p style={{ fontFamily: 'monospace', fontSize: '0.38rem', color: '#8B5555', marginBottom: '0.75rem' }}>
          {message}
        </p>
      )}

      <button
        onClick={handleUpload}
        disabled={!files.length || status === 'uploading'}
        style={{
          background:    '#C4A24A',
          border:        'none',
          borderRadius:  '2px',
          padding:       '0.6rem 1.5rem',
          fontFamily:    'monospace',
          fontSize:      '0.4rem',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color:         '#0A0908',
          cursor:        (!files.length || status === 'uploading') ? 'not-allowed' : 'pointer',
          opacity:       !files.length ? 0.4 : 1,
        }}
      >
        {status === 'uploading' ? 'Uploading...' : `Add ${files.length > 0 ? files.length + ' ' : ''}Photo${files.length !== 1 ? 's' : ''}`}
      </button>
    </SectionCard>
  )
}

// ── Media upload section ───────────────────────────────────────────────────────

function MediaUploadSection({
  token,
  onUploaded,
}: {
  token:      string
  onUploaded: () => void
}) {
  const [file,     setFile]     = useState<File | null>(null)
  const [status,   setStatus]   = useState<UploadStatus>('idle')
  const [message,  setMessage]  = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload() {
    if (!file) return
    setStatus('uploading')
    setMessage('')
    try {
      // Step 1 — get presigned URL (picks correct bucket by file type)
      const urlRes = await fetch('/api/contribute/upload-url', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, fileName: file.name, fileType: file.type }),
      })
      if (!urlRes.ok) {
        const err = await urlRes.json().catch(() => ({}))
        throw new Error(err.error || `upload-url HTTP ${urlRes.status}`)
      }
      const { uploadUrl, path, archiveId, isVideo } = await urlRes.json()

      // Step 2 — PUT directly to Supabase (bypasses Vercel size limit)
      console.log('[media-upload] Starting upload:', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadUrl: uploadUrl?.substring(0, 50),
        path,
      })
      const storageRes = await fetch(uploadUrl, {
        method: 'PUT',
        body:   file,
      })
      console.log('[media-upload] PUT response:', storageRes.status, storageRes.statusText)
      if (!storageRes.ok) {
        const errorText = await storageRes.text()
        console.log('[media-upload] PUT error body:', errorText)
        throw new Error(`Storage upload failed: ${storageRes.status} - ${errorText}`)
      }

      // Step 3 — register in DB
      const regRes = await fetch('/api/contribute/register-media', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          token,
          archiveId,
          storagePath: path,
          fileName:    file.name,
          fileSize:    file.size,
          fileType:    file.type,
          isVideo,
        }),
      })
      if (!regRes.ok) {
        const regErr = await regRes.json().catch(() => ({}))
        throw new Error(regErr.error || `register HTTP ${regRes.status}`)
      }

      setFile(null)
      setStatus('success')
      setMessage(`${file.name} added to the archive.`)
      onUploaded()
    } catch (err: unknown) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  return (
    <SectionCard
      title="Videos and documents"
      subtitle="Home videos, letters, documents, anything from your collection."
    >
      <div
        style={{
          border:       '1px dashed rgba(255,255,255,0.1)',
          borderRadius: '2px',
          padding:      '1.5rem',
          textAlign:    'center',
          cursor:       'pointer',
          marginBottom: '0.75rem',
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*,.mov,.mp4,.m4v,.avi,.mkv,.webm,.pdf,.doc,.docx,.txt"
          className="hidden"
          onChange={e => { setFile(e.target.files?.[0] ?? null); e.target.value = '' }}
        />
        <p style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.2em', color: '#5C6166', margin: 0 }}>
          {file ? file.name : 'TAP TO SELECT FILE'}
        </p>
        <p style={{ fontFamily: 'monospace', fontSize: '0.38rem', color: '#3A3F44', margin: '0.3rem 0 0' }}>
          MOV · MP4 · AVI · PDF · DOC · TXT
        </p>
      </div>

      {status === 'uploading' && (
        <p style={{ fontFamily: 'monospace', fontSize: '0.38rem', letterSpacing: '0.15em', color: '#706C65', marginBottom: '0.75rem' }}>
          UPLOADING...
        </p>
      )}
      {status === 'success' && (
        <p style={{ fontFamily: 'monospace', fontSize: '0.4rem', letterSpacing: '0.2em', color: 'rgba(196,162,74,0.8)', marginBottom: '0.75rem' }}>
          {message.toUpperCase()}
        </p>
      )}
      {status === 'error' && (
        <p style={{ fontFamily: 'monospace', fontSize: '0.38rem', color: '#8B5555', marginBottom: '0.75rem' }}>
          {message}
        </p>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || status === 'uploading'}
        style={{
          background:    '#C4A24A',
          border:        'none',
          borderRadius:  '2px',
          padding:       '0.6rem 1.5rem',
          fontFamily:    'monospace',
          fontSize:      '0.4rem',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color:         '#0A0908',
          cursor:        (!file || status === 'uploading') ? 'not-allowed' : 'pointer',
          opacity:       !file ? 0.4 : 1,
        }}
      >
        {status === 'uploading' ? 'Uploading...' : 'Upload File'}
      </button>
    </SectionCard>
  )
}

// ── Voice section ──────────────────────────────────────────────────────────────

function VoiceSection({
  archiveId,
  subjectName,
  onRecorded,
}: {
  archiveId:   string
  subjectName: string
  onRecorded:  () => void
}) {
  const [showRecorder, setShowRecorder] = useState(false)

  return (
    <SectionCard
      title="Record a memory"
      subtitle={`Speak in any language. Share a memory of ${subjectName} in your own words.`}
    >
      {!showRecorder ? (
        <button
          onClick={() => setShowRecorder(true)}
          style={{
            background:    'transparent',
            border:        '1px solid rgba(196,162,74,0.3)',
            borderRadius:  '2px',
            padding:       '0.6rem 1.5rem',
            fontFamily:    'monospace',
            fontSize:      '0.4rem',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color:         '#C4A24A',
            cursor:        'pointer',
          }}
        >
          Start Recording
        </button>
      ) : (
        <VoiceRecorder
          archiveId={archiveId}
          prompt={`Share a memory about ${subjectName}`}
          onComplete={() => {
            onRecorded()
            setShowRecorder(false)
          }}
          onClose={() => setShowRecorder(false)}
        />
      )}
    </SectionCard>
  )
}

// ── Contributions section ──────────────────────────────────────────────────────

function ContributionsSection({
  photosUploaded,
  videosUploaded,
  voiceRecordings,
  questionsAnswered,
  photosLabelled,
}: {
  photosUploaded:    number
  videosUploaded:    number
  voiceRecordings:   number
  questionsAnswered: number
  photosLabelled:    number
}) {
  const total = photosUploaded + videosUploaded + voiceRecordings + questionsAnswered + photosLabelled

  return (
    <SectionCard title="Your contributions">
      {total === 0 ? (
        <p className="font-serif italic" style={{ color: '#5C6166', fontSize: '0.9rem' }}>
          Nothing yet. Your first contribution is just above.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {[
            { label: 'Questions answered', value: questionsAnswered },
            { label: 'Photos added',       value: photosUploaded + photosLabelled },
            { label: 'Videos/Documents',   value: videosUploaded },
            { label: 'Voice recordings',   value: voiceRecordings },
          ].filter(s => s.value > 0).map(({ label, value }) => (
            <div key={label}>
              <p className="font-serif" style={{ fontWeight: 700, fontSize: '1.6rem', color: '#C4A24A', lineHeight: 1, marginBottom: '0.2rem' }}>
                {value}
              </p>
              <p style={{ fontFamily: 'monospace', fontSize: '0.38rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5C6166' }}>
                {label}
              </p>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ContributeClient({
  token,
  contributor,
  archive,
}: {
  token:       string
  contributor: ContributorProps
  archive:     ArchiveProps
}) {
  const [photosUploaded,    setPhotosUploaded]    = useState(contributor.photos_uploaded)
  const [videosUploaded,    setVideosUploaded]    = useState(contributor.videos_uploaded)
  const [voiceRecordings,   setVoiceRecordings]   = useState(contributor.voice_recordings)

  const firstName     = contributor.name ? contributor.name.split(' ')[0] : 'there'
  const relLabel      = RELATIONSHIP_LABELS[contributor.relationship] ?? 'Contributor'
  const subjectName   = archive.owner_name ? archive.owner_name.split(' ')[0] : 'the archive subject'
  const totalContribs = photosUploaded + videosUploaded + voiceRecordings + contributor.questions_answered + contributor.photos_labelled

  return (
    <div style={{ background: '#0A0908', minHeight: '100vh', color: '#F0EDE6' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#C4A24A', margin: '0 0 0.75rem' }}>
          {archive.name}
        </p>
        <p className="font-serif" style={{ fontWeight: 700, fontSize: '1.5rem', color: '#F0EDE6', margin: '0 0 0.4rem' }}>
          Welcome, {firstName}.
        </p>
        <p style={{ fontFamily: 'monospace', fontSize: '0.38rem', letterSpacing: '0.15em', color: '#5C6166', margin: 0 }}>
          {relLabel}{totalContribs > 0 ? ` · ${totalContribs} CONTRIBUTION${totalContribs !== 1 ? 'S' : ''}` : ''}
        </p>
      </div>

      {/* Thin gold rule */}
      <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(196,162,74,0.3), transparent)', margin: '0' }} />

      {/* Content */}
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '1.5rem 1.25rem 4rem' }}>

        {/* Questions */}
        <QuestionsSection
          token={token}
          archiveName={archive.name}
          ownerName={archive.owner_name}
        />

        {/* Photos */}
        <PhotoUploadSection
          token={token}
          archiveName={archive.name}
          subjectName={subjectName}
          onUploaded={count => setPhotosUploaded(prev => prev + count)}
        />

        {/* Videos & Documents */}
        <MediaUploadSection
          token={token}
          onUploaded={() => setVideosUploaded(prev => prev + 1)}
        />

        {/* Voice */}
        <VoiceSection
          archiveId={archive.id}
          subjectName={subjectName}
          onRecorded={() => setVoiceRecordings(prev => prev + 1)}
        />

        {/* Contributions summary */}
        <ContributionsSection
          photosUploaded={photosUploaded}
          videosUploaded={videosUploaded}
          voiceRecordings={voiceRecordings}
          questionsAnswered={contributor.questions_answered}
          photosLabelled={contributor.photos_labelled}
        />

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '0.38rem', letterSpacing: '0.2em', color: '#3A3F44', margin: 0 }}>
            BASALITH · XYZ
          </p>
          <p className="font-serif italic" style={{ fontSize: '0.8rem', color: '#3A3F44', margin: '0.4rem 0 0' }}>
            Everything you share here is preserved permanently.
          </p>
        </div>
      </div>
    </div>
  )
}
