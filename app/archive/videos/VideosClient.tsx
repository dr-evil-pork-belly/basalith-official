'use client'

import { useState, useEffect, useRef } from 'react'

interface Props {
  archiveId: string
}

interface ArchiveVideo {
  id:                 string
  file_name:          string
  file_type:          string
  video_type:         string
  title:              string | null
  summary:            string | null
  word_count:         number | null
  language_detected:  string | null
  duration_seconds:   number | null
  approximate_decade: string | null
  created_by:         string | null
  uploaded_by_name:   string | null
  transcript_status:  string
  deposit_id:         string | null
  created_at:         string
}

const VIDEO_TYPE_LABELS: Record<string, string> = {
  home_video:  'Home Video',
  interview:   'Interview',
  speech:      'Speech',
  celebration: 'Celebration',
  other:       'Video',
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export default function VideosClient({ archiveId }: Props) {
  const [videos,      setVideos]      = useState<ArchiveVideo[]>([])
  const [loading,     setLoading]     = useState(true)
  const [modalVideo,  setModalVideo]  = useState<ArchiveVideo | null>(null)
  const [transcript,  setTranscript]  = useState<string | null>(null)
  const [playUrl,     setPlayUrl]     = useState<string | null>(null)
  const [loadingPlay, setLoadingPlay] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    fetch(`/api/archive/archive-videos?archiveId=${archiveId}`)
      .then(r => r.json())
      .then(d => { setVideos(d.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [archiveId])

  async function openModal(video: ArchiveVideo) {
    setModalVideo(video)
    setTranscript(null)
    setPlayUrl(null)

    // Fetch transcript
    fetch(`/api/archive/archive-videos/${video.id}`)
      .then(r => r.json())
      .then(d => { if (d.transcript) setTranscript(d.transcript) })
      .catch(() => {})
  }

  async function loadPlayUrl(video: ArchiveVideo) {
    setLoadingPlay(true)
    try {
      const res  = await fetch(`/api/archive/archive-videos/${video.id}/play`)
      const data = await res.json()
      if (data.url) setPlayUrl(data.url)
    } catch {
      // ignore
    }
    setLoadingPlay(false)
  }

  function closeModal() {
    setModalVideo(null)
    setTranscript(null)
    setPlayUrl(null)
  }

  const totalDuration = videos.reduce((sum, v) => sum + (v.duration_seconds || 0), 0)
  const languages     = [...new Set(videos.map(v => v.language_detected).filter(Boolean))]

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="font-compute text-xs text-[var(--portal-label)] tracking-wider">LOADING…</p>
      </div>
    )
  }

  return (
    <div className="min-h-full text-[var(--portal-ink)]">
      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-8">
          <p className="font-compute text-xs tracking-widest text-[var(--portal-gold-ink)] uppercase mb-2">Archive</p>
          <h1 className="font-legacy text-4xl text-[var(--portal-ink)] mb-2">Videos</h1>
          <p className="font-compute text-xs text-[var(--portal-secondary)]">Home videos, interviews, speeches, and captured moments.</p>
        </div>

        {/* Stats */}
        {videos.length > 0 && (
          <div className="flex gap-6 mb-8 pb-8 border-b border-[var(--portal-rule)]">
            <div>
              <p className="font-compute text-2xl text-[var(--portal-gold-ink)]">{videos.length}</p>
              <p className="font-compute text-xs text-[var(--portal-secondary)] mt-0.5">videos</p>
            </div>
            {totalDuration > 0 && (
              <div>
                <p className="font-compute text-2xl text-[var(--portal-gold-ink)]">{formatDuration(totalDuration)}</p>
                <p className="font-compute text-xs text-[var(--portal-secondary)] mt-0.5">total</p>
              </div>
            )}
            {languages.length > 0 && (
              <div>
                <p className="font-compute text-2xl text-[var(--portal-gold-ink)]">{languages.length}</p>
                <p className="font-compute text-xs text-[var(--portal-secondary)] mt-0.5">language{languages.length !== 1 ? 's' : ''}</p>
              </div>
            )}
          </div>
        )}

        {/* Upload CTA */}
        <div className="mb-6">
          <a
            href="/archive/upload"
            className="inline-flex items-center gap-2 font-compute text-xs tracking-wider text-[var(--portal-gold-ink)] hover:text-[var(--portal-ink)] transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12l7-7 7 7"/>
            </svg>
            ADD VIDEO
          </a>
        </div>

        {/* Videos grid */}
        {videos.length === 0 ? (
          <div className="text-center py-20">
            <svg className="mx-auto mb-4 text-[var(--portal-label)]" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <p className="font-legacy text-2xl text-[var(--portal-label)] mb-3">No videos yet</p>
            <p className="font-compute text-xs text-[var(--portal-label)]">
              Upload home videos, interviews, speeches, and celebrations.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {videos.map(video => (
              <div
                key={video.id}
                className="border border-[var(--portal-rule)] rounded-lg bg-[var(--portal-card)] px-5 py-4 cursor-pointer hover:bg-[var(--portal-inset)] transition-colors"
                onClick={() => openModal(video)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-compute text-xs text-[var(--portal-gold-ink)] tracking-wider">
                        {VIDEO_TYPE_LABELS[video.video_type] || 'Video'}
                      </span>
                      {video.approximate_decade && (
                        <span className="font-compute text-xs text-[var(--portal-label)]">{video.approximate_decade}</span>
                      )}
                      {video.language_detected && video.language_detected !== 'english' && (
                        <span className="font-compute text-xs text-[var(--portal-label)] uppercase">{video.language_detected}</span>
                      )}
                      {video.transcript_status === 'pending' && (
                        <span className="font-compute text-xs text-[var(--portal-gold-ink)]">transcribing…</span>
                      )}
                    </div>
                    <p className="font-legacy text-lg text-[var(--portal-ink)] leading-tight truncate">
                      {video.title || video.file_name}
                    </p>
                    {video.created_by && (
                      <p className="font-compute text-xs text-[var(--portal-label)] mt-0.5">{video.created_by}</p>
                    )}
                    {video.summary && (
                      <p className="font-compute text-xs text-[var(--portal-secondary)] mt-1.5 line-clamp-2">{video.summary}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {video.duration_seconds ? (
                      <span className="font-compute text-xs text-[var(--portal-secondary)]">{formatDuration(video.duration_seconds)}</span>
                    ) : null}
                    <div className="w-8 h-8 rounded-full border border-[var(--portal-card-line)] flex items-center justify-center">
                      <svg className="text-[var(--portal-label)] ml-0.5" width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalVideo && (
        <div
          className="fixed inset-0 bg-[var(--portal-scrim)] flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-[var(--portal-card)] border border-[var(--portal-card-line)] rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-[var(--portal-rule)] flex items-start justify-between gap-3">
              <div>
                <p className="font-compute text-xs text-[var(--portal-gold-ink)] tracking-wider mb-1">
                  {VIDEO_TYPE_LABELS[modalVideo.video_type] || 'Video'}
                  {modalVideo.approximate_decade ? ` · ${modalVideo.approximate_decade}` : ''}
                </p>
                <h2 className="font-legacy text-2xl text-[var(--portal-ink)]">
                  {modalVideo.title || modalVideo.file_name}
                </h2>
                {modalVideo.created_by && (
                  <p className="font-compute text-xs text-[var(--portal-secondary)] mt-1">{modalVideo.created_by}</p>
                )}
              </div>
              <button
                onClick={closeModal}
                className="text-[var(--portal-label)] hover:text-[var(--portal-secondary)] shrink-0 text-xl leading-none"
              >×</button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Play button */}
              {!playUrl ? (
                <button
                  onClick={() => loadPlayUrl(modalVideo)}
                  disabled={loadingPlay}
                  className="w-full flex items-center justify-center gap-3 py-4 border border-[var(--portal-card-line)] rounded-lg hover:border-[var(--portal-gold-line)] hover:bg-[var(--portal-tint)] transition-colors disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-full border border-[var(--portal-card-line)] flex items-center justify-center">
                    <svg className="text-[var(--portal-secondary)] ml-0.5" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  </div>
                  <span className="font-compute text-xs tracking-wider text-[var(--portal-secondary)]">
                    {loadingPlay ? 'LOADING…' : 'PLAY VIDEO'}
                  </span>
                </button>
              ) : (
                <video
                  ref={videoRef}
                  src={playUrl}
                  controls
                  autoPlay
                  className="w-full rounded-lg bg-[var(--invert-bg)]"
                />
              )}

              {/* Stats */}
              <div className="flex gap-4">
                {modalVideo.duration_seconds ? (
                  <div>
                    <p className="font-compute text-xs text-[var(--portal-label)] mb-0.5">DURATION</p>
                    <p className="font-compute text-sm text-[var(--portal-body)]">{formatDuration(modalVideo.duration_seconds)}</p>
                  </div>
                ) : null}
                {modalVideo.word_count ? (
                  <div>
                    <p className="font-compute text-xs text-[var(--portal-label)] mb-0.5">WORDS</p>
                    <p className="font-compute text-sm text-[var(--portal-body)]">{modalVideo.word_count.toLocaleString()}</p>
                  </div>
                ) : null}
                {modalVideo.language_detected && (
                  <div>
                    <p className="font-compute text-xs text-[var(--portal-label)] mb-0.5">LANGUAGE</p>
                    <p className="font-compute text-sm text-[var(--portal-body)] capitalize">{modalVideo.language_detected}</p>
                  </div>
                )}
              </div>

              {/* Summary */}
              {modalVideo.summary && (
                <div>
                  <p className="font-compute text-xs text-[var(--portal-label)] tracking-wider mb-1.5">SUMMARY</p>
                  <p className="font-compute text-xs text-[var(--portal-secondary)] leading-relaxed">{modalVideo.summary}</p>
                </div>
              )}

              {/* Transcript */}
              {transcript ? (
                <div>
                  <p className="font-compute text-xs text-[var(--portal-label)] tracking-wider mb-2">TRANSCRIPT</p>
                  <div className="bg-[var(--portal-inset)] rounded p-4 max-h-48 overflow-y-auto">
                    <p className="font-legacy text-sm text-[var(--portal-body)] leading-relaxed whitespace-pre-wrap">{transcript}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="font-compute text-xs text-[var(--portal-label)] tracking-wider">Loading transcript…</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
