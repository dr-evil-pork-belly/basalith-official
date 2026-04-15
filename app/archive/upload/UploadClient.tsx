'use client'

import { useState, useRef, useCallback } from 'react'

interface Props {
  archiveId: string
}

type UploadSection = 'photographs' | 'videos' | 'documents' | 'voice'

interface UploadState {
  status: 'idle' | 'uploading' | 'success' | 'error'
  message: string
  progress: number
}

const DOCUMENT_TYPES = [
  { value: 'personal_letter',  label: 'Personal Letter' },
  { value: 'journal_entry',    label: 'Journal Entry' },
  { value: 'email',            label: 'Email' },
  { value: 'speech',           label: 'Speech' },
  { value: 'legal_document',   label: 'Legal Document' },
  { value: 'news_clipping',    label: 'News Clipping' },
  { value: 'other',            label: 'Other Document' },
]

const VIDEO_TYPES = [
  { value: 'home_video',   label: 'Home Video' },
  { value: 'interview',    label: 'Interview' },
  { value: 'speech',       label: 'Speech / Presentation' },
  { value: 'celebration',  label: 'Celebration' },
  { value: 'other',        label: 'Other Video' },
]

const DECADES = [
  '1920s','1930s','1940s','1950s','1960s','1970s','1980s','1990s','2000s','2010s','2020s',
]

export default function UploadClient({ archiveId }: Props) {
  const [activeSection, setActiveSection] = useState<UploadSection>('photographs')

  // Photograph state
  const [photoFiles,     setPhotoFiles]     = useState<File[]>([])
  const [photoUpload,    setPhotoUpload]     = useState<UploadState>({ status: 'idle', message: '', progress: 0 })
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Document state
  const [docFile,        setDocFile]         = useState<File | null>(null)
  const [docType,        setDocType]         = useState('personal_letter')
  const [docDecade,      setDocDecade]       = useState('')
  const [docTitle,       setDocTitle]        = useState('')
  const [docCreatedBy,   setDocCreatedBy]    = useState('')
  const [docUpload,      setDocUpload]       = useState<UploadState>({ status: 'idle', message: '', progress: 0 })
  const docInputRef = useRef<HTMLInputElement>(null)

  // Video state
  const [videoFile,      setVideoFile]       = useState<File | null>(null)
  const [videoType,      setVideoType]       = useState('home_video')
  const [videoDecade,    setVideoDecade]     = useState('')
  const [videoTitle,     setVideoTitle]      = useState('')
  const [videoCreatedBy, setVideoCreatedBy]  = useState('')
  const [videoUpload,    setVideoUpload]     = useState<UploadState>({ status: 'idle', message: '', progress: 0 })
  const videoInputRef = useRef<HTMLInputElement>(null)

  // Drag state
  const [dragging, setDragging] = useState(false)

  const handlePhotoDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    setPhotoFiles(prev => [...prev, ...files])
  }, [])

  const handleDocDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) setDocFile(file)
  }, [])

  const handleVideoDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) setVideoFile(file)
  }, [])

  async function uploadPhotographs() {
    if (!photoFiles.length) return
    setPhotoUpload({ status: 'uploading', message: `Uploading ${photoFiles.length} photo(s)…`, progress: 0 })

    let succeeded = 0
    for (let i = 0; i < photoFiles.length; i++) {
      const f = photoFiles[i]
      const fd = new FormData()
      fd.append('file', f)
      fd.append('archiveId', archiveId)

      try {
        const res = await fetch('/api/archive/upload-photo', { method: 'POST', body: fd })
        if (res.ok) succeeded++
      } catch {
        // continue
      }
      setPhotoUpload({ status: 'uploading', message: `Uploading… (${i + 1}/${photoFiles.length})`, progress: Math.round(((i + 1) / photoFiles.length) * 100) })
    }

    setPhotoFiles([])
    setPhotoUpload({ status: 'success', message: `${succeeded} photo(s) uploaded successfully.`, progress: 100 })
  }

  async function uploadDocument() {
    if (!docFile) return
    setDocUpload({ status: 'uploading', message: 'Processing document…', progress: 50 })

    const fd = new FormData()
    fd.append('file',          docFile)
    fd.append('archiveId',     archiveId)
    fd.append('documentType',  docType)
    fd.append('decade',        docDecade)
    fd.append('title',         docTitle)
    fd.append('createdBy',     docCreatedBy)

    try {
      const res  = await fetch('/api/archive/process-document', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Upload failed')

      setDocFile(null)
      setDocTitle('')
      setDocCreatedBy('')
      setDocUpload({
        status:   'success',
        message:  `Document processed. ${data.wordCount} words extracted${data.title ? ` — "${data.title}"` : ''}.`,
        progress: 100,
      })
    } catch (err: unknown) {
      setDocUpload({ status: 'error', message: err instanceof Error ? err.message : 'Upload failed', progress: 0 })
    }
  }

  async function uploadVideo() {
    if (!videoFile) return
    if (videoFile.size > 500 * 1024 * 1024) {
      setVideoUpload({ status: 'error', message: 'File too large (500MB limit)', progress: 0 })
      return
    }

    setVideoUpload({ status: 'uploading', message: 'Uploading and transcribing video — this may take a minute…', progress: 30 })

    const fd = new FormData()
    fd.append('file',       videoFile)
    fd.append('archiveId',  archiveId)
    fd.append('videoType',  videoType)
    fd.append('decade',     videoDecade)
    fd.append('title',      videoTitle)
    fd.append('createdBy',  videoCreatedBy)

    try {
      const res  = await fetch('/api/archive/process-video', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Upload failed')

      setVideoFile(null)
      setVideoTitle('')
      setVideoCreatedBy('')
      setVideoUpload({
        status:   'success',
        message:  `Video processed. ${data.wordCount} words transcribed${data.languageDetected ? ` (${data.languageDetected})` : ''}${data.title ? ` — "${data.title}"` : ''}.`,
        progress: 100,
      })
    } catch (err: unknown) {
      setVideoUpload({ status: 'error', message: err instanceof Error ? err.message : 'Upload failed', progress: 0 })
    }
  }

  const sections: { key: UploadSection; label: string; icon: React.ReactNode }[] = [
    {
      key: 'photographs',
      label: 'Photographs',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <rect x="3" y="5" width="18" height="14" rx="2"/>
          <circle cx="12" cy="12" r="3"/>
          <path d="M9 5l1.5-2h3L15 5"/>
        </svg>
      ),
    },
    {
      key: 'documents',
      label: 'Writing',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
      ),
    },
    {
      key: 'videos',
      label: 'Videos',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      ),
    },
    {
      key: 'voice',
      label: 'Voice',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <rect x="9" y="2" width="6" height="12" rx="3"/>
          <path d="M5 10a7 7 0 0014 0M12 19v3M8 22h8"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-obsidian text-white-ghost">
      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-10">
          <p className="font-compute text-xs tracking-widest text-gold/60 uppercase mb-2">Archive</p>
          <h1 className="font-legacy text-4xl text-white-ghost mb-2">Upload</h1>
          <p className="font-compute text-xs text-white-ghost/40">Add to your archive — photographs, documents, videos, or voice recordings.</p>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 mb-8 border border-white/5 rounded p-1 bg-monolith">
          {sections.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded font-compute text-xs tracking-wider transition-all ${
                activeSection === s.key
                  ? 'bg-gold/10 text-gold border border-gold/20'
                  : 'text-white-ghost/40 hover:text-white-ghost/70'
              }`}
            >
              {s.icon}
              <span className="hidden sm:inline">{s.label.toUpperCase()}</span>
            </button>
          ))}
        </div>

        {/* PHOTOGRAPHS */}
        {activeSection === 'photographs' && (
          <div className="space-y-6">

            {/* Photo redirect notice */}
            <div style={{ background: 'rgba(196,162,74,0.06)', border: '1px solid rgba(196,162,74,0.2)', padding: '1rem 1.5rem' }}>
              <p className="font-legacy text-base italic mb-1" style={{ color: '#F0EDE6' }}>
                Uploading photos?
              </p>
              <p className="font-legacy text-base italic mb-4" style={{ color: 'rgba(240,237,230,0.55)' }}>
                Photos are uploaded through the Label section in your sidebar.
                This page is for videos, letters, and documents only.
              </p>
              <a
                href="/archive/label"
                className="inline-block font-compute text-xs tracking-widest no-underline"
                style={{ background: '#C4A24A', color: '#0A0908', padding: '0.5rem 1.25rem' }}
              >
                GO TO PHOTO UPLOAD →
              </a>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                dragging ? 'border-gold/60 bg-gold/5' : 'border-white/10 hover:border-white/20'
              }`}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handlePhotoDrop}
              onClick={() => photoInputRef.current?.click()}
            >
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => {
                  const files = Array.from(e.target.files || [])
                  setPhotoFiles(prev => [...prev, ...files])
                  e.target.value = ''
                }}
              />
              <svg className="mx-auto mb-3 text-white/20" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <rect x="3" y="5" width="18" height="14" rx="2"/>
                <circle cx="12" cy="12" r="3"/>
                <path d="M9 5l1.5-2h3L15 5"/>
              </svg>
              <p className="font-compute text-xs text-white-ghost/40 tracking-wider">
                {photoFiles.length ? `${photoFiles.length} file(s) selected` : 'DROP PHOTOS OR CLICK TO SELECT'}
              </p>
            </div>

            {photoFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {photoFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-monolith border border-white/5 rounded px-3 py-1.5">
                    <span className="font-compute text-xs text-white-ghost/60 max-w-32 truncate">{f.name}</span>
                    <button
                      onClick={() => setPhotoFiles(prev => prev.filter((_, j) => j !== i))}
                      className="text-white/30 hover:text-white/60"
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            {photoUpload.status !== 'idle' && (
              <StatusBanner state={photoUpload} onDismiss={() => setPhotoUpload({ status: 'idle', message: '', progress: 0 })} />
            )}

            <button
              onClick={uploadPhotographs}
              disabled={!photoFiles.length || photoUpload.status === 'uploading'}
              className="w-full py-3 font-compute text-xs tracking-widest border border-gold/30 text-gold rounded hover:bg-gold/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              UPLOAD {photoFiles.length > 0 ? `${photoFiles.length} PHOTO${photoFiles.length > 1 ? 'S' : ''}` : 'PHOTOGRAPHS'}
            </button>
          </div>
        )}

        {/* DOCUMENTS */}
        {activeSection === 'documents' && (
          <div className="space-y-5">
            <div
              className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
                dragging ? 'border-gold/60 bg-gold/5' : 'border-white/10 hover:border-white/20'
              }`}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDocDrop}
              onClick={() => docInputRef.current?.click()}
            >
              <input
                ref={docInputRef}
                type="file"
                accept=".pdf,.txt,.doc,.docx,image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) setDocFile(f); e.target.value = '' }}
              />
              <svg className="mx-auto mb-3 text-white/20" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              <p className="font-compute text-xs text-white-ghost/40 tracking-wider">
                {docFile ? docFile.name : 'DROP FILE OR CLICK TO SELECT'}
              </p>
              <p className="font-compute text-xs text-white-ghost/25 mt-1">PDF · TXT · DOC · DOCX · Image</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-compute text-xs text-white-ghost/40 tracking-wider block mb-1.5">DOCUMENT TYPE</label>
                <select
                  value={docType}
                  onChange={e => setDocType(e.target.value)}
                  className="w-full bg-monolith border border-white/10 rounded px-3 py-2 font-compute text-xs text-white-ghost focus:outline-none focus:border-gold/30"
                >
                  {DOCUMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="font-compute text-xs text-white-ghost/40 tracking-wider block mb-1.5">APPROXIMATE DECADE</label>
                <select
                  value={docDecade}
                  onChange={e => setDocDecade(e.target.value)}
                  className="w-full bg-monolith border border-white/10 rounded px-3 py-2 font-compute text-xs text-white-ghost focus:outline-none focus:border-gold/30"
                >
                  <option value="">Unknown</option>
                  {DECADES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="font-compute text-xs text-white-ghost/40 tracking-wider block mb-1.5">TITLE (optional — AI will generate if blank)</label>
              <input
                type="text"
                value={docTitle}
                onChange={e => setDocTitle(e.target.value)}
                placeholder="e.g. Letter to grandmother, 1962"
                className="w-full bg-monolith border border-white/10 rounded px-3 py-2 font-compute text-xs text-white-ghost placeholder-white/20 focus:outline-none focus:border-gold/30"
              />
            </div>

            <div>
              <label className="font-compute text-xs text-white-ghost/40 tracking-wider block mb-1.5">WRITTEN BY (optional)</label>
              <input
                type="text"
                value={docCreatedBy}
                onChange={e => setDocCreatedBy(e.target.value)}
                placeholder="e.g. Harold Whitmore"
                className="w-full bg-monolith border border-white/10 rounded px-3 py-2 font-compute text-xs text-white-ghost placeholder-white/20 focus:outline-none focus:border-gold/30"
              />
            </div>

            {docUpload.status !== 'idle' && (
              <StatusBanner state={docUpload} onDismiss={() => setDocUpload({ status: 'idle', message: '', progress: 0 })} />
            )}

            <button
              onClick={uploadDocument}
              disabled={!docFile || docUpload.status === 'uploading'}
              className="w-full py-3 font-compute text-xs tracking-widest border border-gold/30 text-gold rounded hover:bg-gold/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {docUpload.status === 'uploading' ? 'PROCESSING…' : 'PROCESS DOCUMENT'}
            </button>

            <p className="font-compute text-xs text-white-ghost/25 text-center">
              Handwritten images are transcribed via AI vision. PDFs and text files are read directly.
            </p>
          </div>
        )}

        {/* VIDEOS */}
        {activeSection === 'videos' && (
          <div className="space-y-5">
            <div
              className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
                dragging ? 'border-gold/60 bg-gold/5' : 'border-white/10 hover:border-white/20'
              }`}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleVideoDrop}
              onClick={() => videoInputRef.current?.click()}
            >
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) setVideoFile(f); e.target.value = '' }}
              />
              <svg className="mx-auto mb-3 text-white/20" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              <p className="font-compute text-xs text-white-ghost/40 tracking-wider">
                {videoFile ? `${videoFile.name} (${(videoFile.size / 1024 / 1024).toFixed(0)} MB)` : 'DROP VIDEO OR CLICK TO SELECT'}
              </p>
              <p className="font-compute text-xs text-white-ghost/25 mt-1">MP4 · MOV · AVI · MKV · WEBM · max 500MB</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-compute text-xs text-white-ghost/40 tracking-wider block mb-1.5">VIDEO TYPE</label>
                <select
                  value={videoType}
                  onChange={e => setVideoType(e.target.value)}
                  className="w-full bg-monolith border border-white/10 rounded px-3 py-2 font-compute text-xs text-white-ghost focus:outline-none focus:border-gold/30"
                >
                  {VIDEO_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="font-compute text-xs text-white-ghost/40 tracking-wider block mb-1.5">APPROXIMATE DECADE</label>
                <select
                  value={videoDecade}
                  onChange={e => setVideoDecade(e.target.value)}
                  className="w-full bg-monolith border border-white/10 rounded px-3 py-2 font-compute text-xs text-white-ghost focus:outline-none focus:border-gold/30"
                >
                  <option value="">Unknown</option>
                  {DECADES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="font-compute text-xs text-white-ghost/40 tracking-wider block mb-1.5">TITLE (optional — AI will generate if blank)</label>
              <input
                type="text"
                value={videoTitle}
                onChange={e => setVideoTitle(e.target.value)}
                placeholder="e.g. Christmas morning 1987"
                className="w-full bg-monolith border border-white/10 rounded px-3 py-2 font-compute text-xs text-white-ghost placeholder-white/20 focus:outline-none focus:border-gold/30"
              />
            </div>

            <div>
              <label className="font-compute text-xs text-white-ghost/40 tracking-wider block mb-1.5">FILMED BY (optional)</label>
              <input
                type="text"
                value={videoCreatedBy}
                onChange={e => setVideoCreatedBy(e.target.value)}
                placeholder="e.g. Harold Whitmore"
                className="w-full bg-monolith border border-white/10 rounded px-3 py-2 font-compute text-xs text-white-ghost placeholder-white/20 focus:outline-none focus:border-gold/30"
              />
            </div>

            {videoUpload.status !== 'idle' && (
              <StatusBanner state={videoUpload} onDismiss={() => setVideoUpload({ status: 'idle', message: '', progress: 0 })} />
            )}

            <button
              onClick={uploadVideo}
              disabled={!videoFile || videoUpload.status === 'uploading'}
              className="w-full py-3 font-compute text-xs tracking-widest border border-gold/30 text-gold rounded hover:bg-gold/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {videoUpload.status === 'uploading' ? 'PROCESSING…' : 'UPLOAD & TRANSCRIBE'}
            </button>

            <p className="font-compute text-xs text-white-ghost/25 text-center">
              Audio is transcribed via Whisper. Language is detected automatically.
            </p>
          </div>
        )}

        {/* VOICE */}
        {activeSection === 'voice' && (
          <div className="text-center py-16">
            <svg className="mx-auto mb-4 text-white/20" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <rect x="9" y="2" width="6" height="12" rx="3"/>
              <path d="M5 10a7 7 0 0014 0M12 19v3M8 22h8"/>
            </svg>
            <p className="font-legacy text-2xl text-white-ghost/60 mb-3">Voice Recording</p>
            <p className="font-compute text-xs text-white-ghost/30 mb-6">Record your voice directly in the archive.</p>
            <a
              href="/archive/voice"
              className="inline-block px-8 py-3 font-compute text-xs tracking-widest border border-gold/30 text-gold rounded hover:bg-gold/5 transition-colors"
            >
              GO TO VOICE RECORDING →
            </a>
          </div>
        )}

      </div>
    </div>
  )
}

function StatusBanner({ state, onDismiss }: { state: UploadState; onDismiss: () => void }) {
  const isError   = state.status === 'error'
  const isSuccess = state.status === 'success'
  const isLoading = state.status === 'uploading'

  return (
    <div className={`flex items-start justify-between gap-3 px-4 py-3 rounded border font-compute text-xs ${
      isError   ? 'bg-red-900/20 border-red-900/30 text-red-300' :
      isSuccess ? 'bg-green-900/20 border-green-900/30 text-green-300' :
      'bg-gold/5 border-gold/20 text-gold'
    }`}>
      <span>{state.message}</span>
      {!isLoading && (
        <button onClick={onDismiss} className="opacity-50 hover:opacity-80 shrink-0">×</button>
      )}
    </div>
  )
}
