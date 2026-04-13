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
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <p className="font-compute text-xs text-white-ghost/30 tracking-wider">LOADING…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-obsidian text-white-ghost">
      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-8">
          <p className="font-compute text-xs tracking-widest text-gold/60 uppercase mb-2">Archive</p>
          <h1 className="font-legacy text-4xl text-white-ghost mb-2">Videos</h1>
          <p className="font-compute text-xs text-white-ghost/40">Home videos, interviews, speeches, and captured moments.</p>
        </div>

        {/* Stats */}
        {videos.length > 0 && (
          <div className="flex gap-6 mb-8 pb-8 border-b border-white/5">
            <div>
              <p className="font-compute text-2xl text-gold">{videos.length}</p>
              <p className="font-compute text-xs text-white-ghost/40 mt-0.5">videos</p>
            </div>
            {totalDuration > 0 && (
              <div>
                <p className="font-compute text-2xl text-gold">{formatDuration(totalDuration)}</p>
                <p className="font-compute text-xs text-white-ghost/40 mt-0.5">total</p>
              </div>
            )}
            {languages.length > 0 && (
              <div>
                <p className="font-compute text-2xl text-gold">{languages.length}</p>
                <p className="font-compute text-xs text-white-ghost/40 mt-0.5">language{languages.length !== 1 ? 's' : ''}</p>
              </div>
            )}
          </div>
        )}

        {/* Upload CTA */}
        <div className="mb-6">
          <a
            href="/archive/upload"
            className="inline-flex items-center gap-2 font-compute text-xs tracking-wider text-gold/60 hover:text-gold transition-colors"
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
            <svg className="mx-auto mb-4 text-white/10" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <p className="font-legacy text-2xl text-white-ghost/30 mb-3">No videos yet</p>
            <p className="font-compute text-xs text-white-ghost/20">
              Upload home videos, interviews, speeches, and celebrations.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {videos.map(video => (
              <div
                key={video.id}
                className="border border-white/5 rounded-lg bg-monolith px-5 py-4 cursor-pointer hover:bg-white/2 transition-colors"
                onClick={() => openModal(video)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-compute text-xs text-gold/60 tracking-wider">
                        {VIDEO_TYPE_LABELS[video.video_type] || 'Video'}
                      </span>
                      {video.approximate_decade && (
                        <span className="font-compute text-xs text-white-ghost/30">{video.approximate_decade}</span>
                      )}
                      {video.language_detected && video.language_detected !== 'english' && (
                        <span className="font-compute text-xs text-white-ghost/30 uppercase">{video.language_detected}</span>
                      )}
                      {video.transcript_status === 'pending' && (
                        <span className="font-compute text-xs text-yellow-400/60">transcribing…</span>
                      )}
                    </div>
                    <p className="font-legacy text-lg text-white-ghost leading-tight truncate">
                      {video.title || video.file_name}
                    </p>
                    {video.created_by && (
                      <p className="font-compute text-xs text-white-ghost/30 mt-0.5">{video.created_by}</p>
                    )}
                    {video.summary && (
                      <p className="font-compute text-xs text-white-ghost/40 mt-1.5 line-clamp-2">{video.summary}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {video.duration_seconds ? (
                      <span className="font-compute text-xs text-white-ghost/40">{formatDuration(video.duration_seconds)}</span>
                    ) : null}
                    <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center">
                      <svg className="text-white/30 ml-0.5" width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
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
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-monolith border border-white/10 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-white/5 flex items-start justify-between gap-3">
              <div>
                <p className="font-compute text-xs text-gold/60 tracking-wider mb-1">
                  {VIDEO_TYPE_LABELS[modalVideo.video_type] || 'Video'}
                  {modalVideo.approximate_decade ? ` · ${modalVideo.approximate_decade}` : ''}
                </p>
                <h2 className="font-legacy text-2xl text-white-ghost">
                  {modalVideo.title || modalVideo.file_name}
                </h2>
                {modalVideo.created_by && (
                  <p className="font-compute text-xs text-white-ghost/40 mt-1">{modalVideo.created_by}</p>
                )}
              </div>
              <button
                onClick={closeModal}
                className="text-white/30 hover:text-white/60 shrink-0 text-xl leading-none"
              >×</button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Play button */}
              {!playUrl ? (
                <button
                  onClick={() => loadPlayUrl(modalVideo)}
                  disabled={loadingPlay}
                  className="w-full flex items-center justify-center gap-3 py-4 border border-white/10 rounded-lg hover:border-gold/20 hover:bg-gold/5 transition-colors disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
                    <svg className="text-white/60 ml-0.5" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  </div>
                  <span className="font-compute text-xs tracking-wider text-white-ghost/60">
                    {loadingPlay ? 'LOADING…' : 'PLAY VIDEO'}
                  </span>
                </button>
              ) : (
                <video
                  ref={videoRef}
                  src={playUrl}
                  controls
                  autoPlay
                  className="w-full rounded-lg bg-black"
                />
              )}

              {/* Stats */}
              <div className="flex gap-4">
                {modalVideo.duration_seconds ? (
                  <div>
                    <p className="font-compute text-xs text-white-ghost/30 mb-0.5">DURATION</p>
                    <p className="font-compute text-sm text-white-ghost/70">{formatDuration(modalVideo.duration_seconds)}</p>
                  </div>
                ) : null}
                {modalVideo.word_count ? (
                  <div>
                    <p className="font-compute text-xs text-white-ghost/30 mb-0.5">WORDS</p>
                    <p className="font-compute text-sm text-white-ghost/70">{modalVideo.word_count.toLocaleString()}</p>
                  </div>
                ) : null}
                {modalVideo.language_detected && (
                  <div>
                    <p className="font-compute text-xs text-white-ghost/30 mb-0.5">LANGUAGE</p>
                    <p className="font-compute text-sm text-white-ghost/70 capitalize">{modalVideo.language_detected}</p>
                  </div>
                )}
              </div>

              {/* Summary */}
              {modalVideo.summary && (
                <div>
                  <p className="font-compute text-xs text-white-ghost/30 tracking-wider mb-1.5">SUMMARY</p>
                  <p className="font-compute text-xs text-white-ghost/60 leading-relaxed">{modalVideo.summary}</p>
                </div>
              )}

              {/* Transcript */}
              {transcript ? (
                <div>
                  <p className="font-compute text-xs text-white-ghost/30 tracking-wider mb-2">TRANSCRIPT</p>
                  <div className="bg-obsidian rounded p-4 max-h-48 overflow-y-auto">
                    <p className="font-legacy text-sm text-white-ghost/70 leading-relaxed whitespace-pre-wrap">{transcript}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="font-compute text-xs text-white-ghost/20 tracking-wider">Loading transcript…</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
