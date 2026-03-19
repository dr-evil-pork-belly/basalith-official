'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = 'photograph' | 'document' | 'video' | 'audio' | 'text'

type VaultFile = {
  id:            string
  original_name: string
  category:      Category
  size_bytes:    number
  year:          number | null
  location:      string | null
  essence_tagged: boolean
  created_at:    string
}

type QueueItem = {
  id:       string   // local only, crypto.randomUUID()
  file:     File
  category: Category
}

type UploadItem = {
  id:       string
  name:     string
  percent:  number
  status:   'uploading' | 'processing' | 'sealed' | 'error'
  error?:   string
}

type Metadata = {
  year:        string
  location:    string
  description: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1_048_576)     return `${(bytes / 1_024).toFixed(1)} KB`
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`
  return `${(bytes / 1_073_741_824).toFixed(2)} GB`
}

function formatStorageGB(bytes: number): string {
  if (bytes < 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(2)} GB`
  return `${(bytes / 1_099_511_627_776).toFixed(2)} TB`
}

function detectCategory(mime: string): Category {
  if (mime.startsWith('image/'))  return 'photograph'
  if (mime.startsWith('video/'))  return 'video'
  if (mime.startsWith('audio/'))  return 'audio'
  if (mime === 'application/pdf' || mime.includes('word') || mime.includes('document')) return 'document'
  return 'text'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function CategoryIcon({ category, size = 16 }: { category: Category; size?: number }) {
  const s = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  if (category === 'photograph') return <svg {...s}><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="3.5"/><path d="M8 5l1.5-2h5L16 5"/></svg>
  if (category === 'video')      return <svg {...s}><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-3v10l-6-3V10z"/></svg>
  if (category === 'audio')      return <svg {...s}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
  if (category === 'document')   return <svg {...s}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>
  return <svg {...s}><path d="M4 6h16M4 10h16M4 14h10"/></svg>
}

const CATEGORY_BADGE: Record<Category, string> = {
  photograph: 'text-amber/80 border-amber/20 bg-amber/[0.05]',
  video:      'text-purple-400/80 border-purple-400/20 bg-purple-400/[0.05]',
  audio:      'text-blue-400/80 border-blue-400/20 bg-blue-400/[0.05]',
  document:   'text-text-secondary border-border-subtle bg-transparent',
  text:       'text-text-muted border-border-subtle bg-transparent',
}

// ── Upload zone ───────────────────────────────────────────────────────────────

const ACCEPT = '.jpg,.jpeg,.png,.webp,.heic,.tiff,.pdf,.doc,.docx,.txt,.mp4,.mov,.avi,.mp3,.wav,.aac,.m4a'

function UploadZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only leave if we've left the zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.size > 0)
    if (files.length) onFiles(files)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length) onFiles(files)
    // Reset so same file can be re-added
    e.target.value = ''
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
      aria-label="Upload files to vault"
      className="relative rounded-sm cursor-pointer select-none transition-all duration-200"
      style={{
        border:     `1.5px dashed ${isDragOver ? 'rgba(255,179,71,0.7)' : 'rgba(255,179,71,0.3)'}`,
        background: isDragOver ? 'rgba(255,179,71,0.04)' : 'transparent',
        boxShadow:  isDragOver ? '0 0 40px rgba(255,179,71,0.07)' : 'none',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        onChange={handleInputChange}
        tabIndex={-1}
      />

      <div className="flex flex-col items-center justify-center py-14 px-8 text-center">
        {/* Upload icon */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-5 transition-all duration-200"
          style={{
            background:  isDragOver ? 'rgba(255,179,71,0.1)' : 'rgba(255,255,255,0.03)',
            border:      `1px solid ${isDragOver ? 'rgba(255,179,71,0.3)' : 'rgba(255,255,255,0.07)'}`,
          }}
        >
          <svg
            width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke={isDragOver ? '#FFB347' : 'rgba(255,255,255,0.3)'}
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
            style={{ transition: 'stroke 0.2s' }}
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>

        <p
          className="font-serif font-semibold tracking-[-0.01em] mb-2 transition-colors duration-200"
          style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.35rem)',
            color: isDragOver ? '#FFB347' : 'rgba(232,232,238,0.85)',
          }}
        >
          {isDragOver ? 'Release to add to your vault' : 'Drop files here to add to your vault'}
        </p>
        <p className="font-sans text-[0.78rem] text-text-muted mb-3">
          or click to browse
        </p>
        <p className="font-sans text-[0.65rem] font-bold tracking-[0.1em] uppercase text-text-muted/50">
          Photographs · Documents · Video · Audio
        </p>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FilesPage() {
  // Vault state
  const [vaultId,      setVaultId]      = useState<string | null>(null)
  const [storageUsed,  setStorageUsed]  = useState(0)
  const [storageLimit, setStorageLimit] = useState(107_374_182_400) // 100 GB default
  const [loading,      setLoading]      = useState(true)

  // Files list
  const [files, setFiles] = useState<VaultFile[]>([])

  // Upload flow
  const [queue,        setQueue]        = useState<QueueItem[]>([])
  const [uploads,      setUploads]      = useState<UploadItem[]>([])
  const [phase,        setPhase]        = useState<'idle' | 'queued' | 'uploading' | 'complete'>('idle')
  const [metaExpanded, setMetaExpanded] = useState(false)
  const [metadata,     setMetadata]     = useState<Metadata>({ year: '', location: '', description: '' })
  const [sealedCount,  setSealedCount]  = useState(0)

  // ── Load vault + files ──
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: vault } = await supabase
        .from('vaults')
        .select('id, storage_used_bytes, storage_limit_bytes')
        .eq('archivist_id', user.id)
        .single()

      if (!vault) { setLoading(false); return }
      setVaultId(vault.id)
      setStorageUsed(vault.storage_used_bytes ?? 0)
      setStorageLimit(vault.storage_limit_bytes ?? 107_374_182_400)

      const { data: fileRows } = await supabase
        .from('vault_files')
        .select('id, original_name, category, size_bytes, year, location, essence_tagged, created_at')
        .eq('vault_id', vault.id)
        .order('created_at', { ascending: false })

      setFiles(fileRows ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // ── Add files to queue ──
  function handleFiles(incoming: File[]) {
    const items: QueueItem[] = incoming.map(file => ({
      id:       crypto.randomUUID(),
      file,
      category: detectCategory(file.type),
    }))
    setQueue(prev => [...prev, ...items])
    setPhase('queued')
  }

  function removeFromQueue(id: string) {
    setQueue(prev => {
      const next = prev.filter(q => q.id !== id)
      if (next.length === 0) setPhase('idle')
      return next
    })
  }

  // ── Upload ──
  const handleUpload = useCallback(async () => {
    if (!vaultId || queue.length === 0) return

    const supabase = createClient()
    setPhase('uploading')
    setSealedCount(0)

    // Initialise upload items
    const uploadItems: UploadItem[] = queue.map(q => ({
      id:      q.id,
      name:    q.file.name,
      percent: 0,
      status:  'uploading',
    }))
    setUploads(uploadItems)

    let sealed = 0

    for (const item of queue) {
      const fileId      = crypto.randomUUID()
      const storagePath = `vaults/${vaultId}/${fileId}/${item.file.name}`

      function updateUpload(patch: Partial<UploadItem>) {
        setUploads(prev => prev.map(u => u.id === item.id ? { ...u, ...patch } : u))
      }

      // 1 — Upload to Supabase Storage via XHR for progress tracking
      const { data: { session } } = await supabase.auth.getSession()
      const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      const storageUrl   = `${supabaseUrl}/storage/v1/object/vault-files/${storagePath}`

      const storageError = await new Promise<string | null>(resolve => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', storageUrl)
        xhr.setRequestHeader('Authorization', `Bearer ${session?.access_token ?? supabaseAnon}`)
        xhr.setRequestHeader('x-upsert', 'false')
        xhr.upload.addEventListener('progress', e => {
          if (e.lengthComputable) {
            updateUpload({ percent: Math.round((e.loaded / e.total) * 100) })
          }
        })
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(null)
          } else {
            try {
              const body = JSON.parse(xhr.responseText)
              resolve(body.error ?? `Storage error ${xhr.status}`)
            } catch {
              resolve(`Storage error ${xhr.status}`)
            }
          }
        })
        xhr.addEventListener('error', () => resolve('Network error during upload'))
        const formData = new FormData()
        formData.append('', item.file, item.file.name)
        xhr.send(formData)
      })

      if (storageError) {
        updateUpload({ status: 'error', error: storageError })
        continue
      }

      updateUpload({ percent: 100, status: 'processing' })

      // 2 — Register in database
      const res = await fetch('/api/dashboard/upload', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          vault_id:     vaultId,
          storage_path: storagePath,
          original_name: item.file.name,
          mime_type:    item.file.type || 'application/octet-stream',
          size_bytes:   item.file.size,
          category:     item.category,
          year:         metadata.year ? parseInt(metadata.year, 10) : undefined,
          location:     metadata.location.trim() || undefined,
          description:  metadata.description.trim() || undefined,
        }),
      })
      const data = await res.json()

      if (data.ok) {
        updateUpload({ status: 'sealed' })
        sealed++
        setSealedCount(sealed)
        setStorageUsed(prev => prev + item.file.size)
        // Add to files list
        setFiles(prev => [{
          id:             data.file_id,
          original_name:  item.file.name,
          category:       item.category,
          size_bytes:     item.file.size,
          year:           metadata.year ? parseInt(metadata.year, 10) : null,
          location:       metadata.location.trim() || null,
          essence_tagged: false,
          created_at:     new Date().toISOString(),
        }, ...prev])
      } else {
        updateUpload({ status: 'error', error: data.error ?? 'Registration failed.' })
      }
    }

    setQueue([])
    setPhase('complete')
  }, [vaultId, queue, metadata])

  function handleNewUpload() {
    setPhase('idle')
    setUploads([])
    setSealedCount(0)
    setMetadata({ year: '', location: '', description: '' })
    setMetaExpanded(false)
  }

  // ── Derived ──
  const totalQueueBytes  = queue.reduce((sum, q) => sum + q.file.size, 0)
  const storagePercent   = storageLimit > 0 ? Math.min(100, (storageUsed / storageLimit) * 100) : 0
  const uploadedCount    = uploads.filter(u => u.status === 'sealed').length
  const overallPercent   = uploads.length > 0
    ? Math.round(uploads.reduce((sum, u) => sum + u.percent, 0) / uploads.length)
    : 0

  const inputClass = 'w-full border border-border-subtle rounded-sm px-4 py-2.5 font-sans text-[0.85rem] text-text-primary bg-obsidian focus:outline-none focus:border-border-amber transition-colors duration-200 placeholder:text-text-muted'

  if (loading) {
    return <div className="flex justify-center py-24"><span className="ai-dot" /></div>
  }

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── A: Header ── */}
      <div className="mb-10">
        <p className="eyebrow mb-2">Archive</p>
        <h1 className="font-serif text-[2rem] font-semibold text-text-primary tracking-[-0.02em] mb-4">
          Your Archive
        </h1>
        <p className="font-sans text-[0.8rem] text-text-muted mb-3">
          {formatStorageGB(storageUsed)} of {formatStorageGB(storageLimit)} used
        </p>
        {/* Storage bar */}
        <div className="h-px w-full max-w-xs bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-amber/60 rounded-full transition-all duration-700"
            style={{ width: `${storagePercent}%` }}
          />
        </div>
      </div>

      {/* ── B/C/D: Upload section ── */}
      <div className="mb-12">

        {/* Upload zone — hidden during upload + complete */}
        {phase !== 'uploading' && phase !== 'complete' && (
          <UploadZone onFiles={handleFiles} />
        )}

        {/* ── C: Queue ── */}
        {phase === 'queued' && queue.length > 0 && (
          <div className="mt-6">
            <div className="flex flex-col gap-2 mb-4">
              {queue.map(item => (
                <div key={item.id} className="glass-obsidian rounded-sm px-4 py-3 flex items-center gap-4">
                  <div className="text-text-muted flex-shrink-0">
                    <CategoryIcon category={item.category} />
                  </div>
                  <p className="flex-1 min-w-0 font-sans text-[0.82rem] text-text-primary truncate">
                    {item.file.name}
                  </p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-sm border font-sans text-[0.6rem] font-bold tracking-[0.1em] uppercase flex-shrink-0 ${CATEGORY_BADGE[item.category]}`}>
                    {item.category}
                  </span>
                  <span className="font-sans text-[0.72rem] text-text-muted flex-shrink-0 tabular-nums">
                    {formatBytes(item.file.size)}
                  </span>
                  <button
                    onClick={() => removeFromQueue(item.id)}
                    aria-label={`Remove ${item.file.name}`}
                    className="font-sans text-[0.9rem] text-text-muted hover:text-red-400 transition-colors duration-150 flex-shrink-0 leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Optional metadata */}
            <div className="glass-obsidian rounded-sm overflow-hidden mb-4">
              <button
                onClick={() => setMetaExpanded(p => !p)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors duration-150"
              >
                <span className="font-sans text-[0.72rem] font-bold tracking-[0.1em] uppercase text-text-muted">
                  Add Metadata <span className="font-normal normal-case tracking-normal">— applies to all files in this batch</span>
                </span>
                <svg
                  width="11" height="11" viewBox="0 0 12 12" fill="none"
                  className={`text-text-muted transition-transform duration-200 ${metaExpanded ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                >
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {metaExpanded && (
                <div className="px-4 pb-4 flex flex-col gap-3 border-t border-border-subtle">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block font-sans text-[0.65rem] font-bold tracking-[0.1em] uppercase text-text-muted mb-1.5">Year</label>
                      <input
                        type="number"
                        value={metadata.year}
                        onChange={e => setMetadata(p => ({ ...p, year: e.target.value }))}
                        placeholder="1987"
                        min="1800" max="2099"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block font-sans text-[0.65rem] font-bold tracking-[0.1em] uppercase text-text-muted mb-1.5">Location</label>
                      <input
                        type="text"
                        value={metadata.location}
                        onChange={e => setMetadata(p => ({ ...p, location: e.target.value }))}
                        placeholder="Lake Tahoe, CA"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-sans text-[0.65rem] font-bold tracking-[0.1em] uppercase text-text-muted mb-1.5">Description</label>
                    <textarea
                      value={metadata.description}
                      onChange={e => setMetadata(p => ({ ...p, description: e.target.value }))}
                      rows={2}
                      placeholder="Summer reunion, Whitfield family cabin…"
                      className={inputClass + ' resize-none'}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Queue footer */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="font-sans text-[0.75rem] text-text-muted">
                <span className="text-text-primary font-medium">{queue.length}</span> {queue.length === 1 ? 'file' : 'files'} selected
                {' · '}
                <span className="text-text-primary font-medium">{formatBytes(totalQueueBytes)}</span> total
              </p>
              <button
                onClick={handleUpload}
                disabled={queue.length === 0}
                className="btn-monolith-amber disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Upload to Vault →
              </button>
            </div>
          </div>
        )}

        {/* ── D: Upload progress ── */}
        {(phase === 'uploading' || phase === 'complete') && (
          <div className="mt-2">

            {/* Overall bar */}
            {phase === 'uploading' && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-sans text-[0.72rem] font-bold tracking-[0.1em] uppercase text-text-muted">
                    Uploading {uploadedCount} of {uploads.length} sealed
                  </p>
                  <p className="font-sans text-[0.72rem] text-text-muted tabular-nums">{overallPercent}%</p>
                </div>
                <div className="h-px w-full bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber rounded-full transition-all duration-300"
                    style={{ width: `${overallPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Per-file list */}
            <div className="flex flex-col gap-2 mb-6">
              {uploads.map(u => (
                <div key={u.id} className="glass-obsidian rounded-sm px-4 py-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-[0.82rem] text-text-primary truncate">{u.name}</p>
                    </div>
                    <span className="font-sans text-[0.68rem] tabular-nums flex-shrink-0" style={{
                      color: u.status === 'sealed' ? 'rgb(52,211,153)' : u.status === 'error' ? 'rgb(248,113,113)' : 'rgba(255,179,71,0.8)'
                    }}>
                      {u.status === 'sealed'     ? '✓ Sealed'
                       : u.status === 'error'    ? '✗ Error'
                       : u.status === 'processing' ? 'Processing…'
                       : `${u.percent}%`}
                    </span>
                  </div>
                  {u.status !== 'sealed' && u.status !== 'error' && (
                    <div className="h-px w-full bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${u.percent}%`,
                          background: u.status === 'processing' ? 'rgba(255,179,71,0.4)' : '#FFB347',
                        }}
                      />
                    </div>
                  )}
                  {u.status === 'error' && u.error && (
                    <p className="font-sans text-[0.7rem] text-red-400 mt-1">{u.error}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Completion */}
            {phase === 'complete' && (
              <div className="text-center py-6 border-t border-border-subtle">
                <p
                  className="font-serif font-semibold text-text-primary tracking-[-0.01em] mb-2"
                  style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)' }}
                >
                  {sealedCount === 1
                    ? '1 memory has been added to your vault.'
                    : `${sealedCount} memories have been added to your vault.`}
                </p>
                <p className="font-sans text-[0.78rem] text-text-muted mb-6">
                  {uploads.length - sealedCount > 0 && `${uploads.length - sealedCount} files failed. `}
                  Your archive has been updated.
                </p>
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <button onClick={handleNewUpload} className="btn-monolith-amber">
                    Upload More →
                  </button>
                  <a href="#files-list" className="btn-monolith-ghost">
                    View All Files
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── E: Files list ── */}
      <div id="files-list">
        <p className="font-sans text-[0.65rem] font-bold tracking-[0.18em] uppercase text-text-muted mb-4">
          All Files{files.length > 0 && ` · ${files.length}`}
        </p>

        {files.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-serif italic text-[1.05rem] text-text-muted/60">
              Your vault is empty. Upload your first memories above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {files.map(f => (
              <div key={f.id} className="glass-obsidian rounded-sm p-4 flex flex-col gap-2.5">
                {/* Icon + category */}
                <div className="flex items-center justify-between">
                  <div className="text-text-muted">
                    <CategoryIcon category={f.category} size={15} />
                  </div>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm border font-sans text-[0.55rem] font-bold tracking-[0.1em] uppercase ${
                    f.essence_tagged
                      ? 'text-amber border-amber/25 bg-amber/[0.06]'
                      : 'text-text-muted/50 border-border-subtle bg-transparent'
                  }`}>
                    {f.essence_tagged ? 'Labeled' : 'Unlabeled'}
                  </span>
                </div>

                {/* Filename */}
                <p className="font-sans text-[0.75rem] font-medium text-text-primary leading-[1.4] line-clamp-2 break-all">
                  {f.original_name}
                </p>

                {/* Meta */}
                {(f.year || f.location) && (
                  <p className="font-sans text-[0.65rem] text-text-muted leading-[1.4]">
                    {[f.year, f.location].filter(Boolean).join(' · ')}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-1">
                  <span className="font-sans text-[0.62rem] text-text-muted tabular-nums">
                    {formatBytes(f.size_bytes)}
                  </span>
                  <span className="font-sans text-[0.62rem] text-text-muted">
                    {formatDate(f.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
