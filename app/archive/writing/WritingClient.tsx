'use client'

import { useState, useEffect } from 'react'

interface Props {
  archiveId: string
}

interface ArchiveDocument {
  id:                  string
  file_name:           string
  file_type:           string
  document_type:       string
  title:               string | null
  summary:             string | null
  word_count:          number | null
  approximate_decade:  string | null
  created_by:          string | null
  uploaded_by_name:    string | null
  transcript_status:   string
  linguistic_patterns: Record<string, unknown> | null
  deposit_id:          string | null
  created_at:          string
}

const DOC_TYPE_LABELS: Record<string, string> = {
  personal_letter:  'Personal Letter',
  journal_entry:    'Journal Entry',
  email:            'Email',
  speech:           'Speech',
  legal_document:   'Legal Document',
  news_clipping:    'News Clipping',
  other:            'Document',
}

export default function WritingClient({ archiveId }: Props) {
  const [documents,    setDocuments]    = useState<ArchiveDocument[]>([])
  const [loading,      setLoading]      = useState(true)
  const [expandedId,   setExpandedId]   = useState<string | null>(null)
  const [transcripts,  setTranscripts]  = useState<Record<string, string>>({})
  const [loadingTx,    setLoadingTx]    = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/archive/documents?archiveId=${archiveId}`)
      .then(r => r.json())
      .then(d => { setDocuments(d.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [archiveId])

  async function loadTranscript(doc: ArchiveDocument) {
    if (transcripts[doc.id] !== undefined) {
      setExpandedId(expandedId === doc.id ? null : doc.id)
      return
    }

    setLoadingTx(doc.id)
    try {
      const res  = await fetch(`/api/archive/documents/${doc.id}`)
      const data = await res.json()
      if (data.transcript) {
        setTranscripts(prev => ({ ...prev, [doc.id]: data.transcript }))
      }
    } catch {
      // ignore
    }
    setLoadingTx(null)
    setExpandedId(doc.id)
  }

  const totalWords = documents.reduce((sum, d) => sum + (d.word_count || 0), 0)
  const decades    = [...new Set(documents.map(d => d.approximate_decade).filter(Boolean))].sort()

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
          <p className="font-compute text-xs tracking-widest text-[var(--portal-gold-ink)] uppercase mb-2">Your Basalith</p>
          <h1 className="font-legacy text-4xl text-[var(--portal-ink)] mb-2">Writing</h1>
          <p className="font-compute text-xs text-[var(--portal-secondary)]">Letters, journals, emails, and other written documents.</p>
        </div>

        {/* Stats */}
        {documents.length > 0 && (
          <div className="flex gap-6 mb-8 pb-8 border-b border-[var(--portal-rule)]">
            <div>
              <p className="font-compute text-2xl text-[var(--portal-gold-ink)]">{documents.length}</p>
              <p className="font-compute text-xs text-[var(--portal-secondary)] mt-0.5">documents</p>
            </div>
            <div>
              <p className="font-compute text-2xl text-[var(--portal-gold-ink)]">{totalWords.toLocaleString()}</p>
              <p className="font-compute text-xs text-[var(--portal-secondary)] mt-0.5">words</p>
            </div>
            {decades.length > 0 && (
              <div>
                <p className="font-compute text-2xl text-[var(--portal-gold-ink)]">{decades.length}</p>
                <p className="font-compute text-xs text-[var(--portal-secondary)] mt-0.5">era{decades.length !== 1 ? 's' : ''}</p>
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
            ADD DOCUMENT
          </a>
        </div>

        {/* Documents list */}
        {documents.length === 0 ? (
          <div className="text-center py-20">
            <svg className="mx-auto mb-4 text-[var(--portal-label)]" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            <p className="font-legacy text-2xl text-[var(--portal-label)] mb-3">No documents yet</p>
            <p className="font-compute text-xs text-[var(--portal-label)]">
              Upload letters, journals, emails, and handwritten documents.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map(doc => {
              const isExpanded = expandedId === doc.id
              const patterns   = doc.linguistic_patterns as Record<string, unknown> | null

              return (
                <div
                  key={doc.id}
                  className="border border-[var(--portal-rule)] rounded-lg bg-[var(--portal-card)] overflow-hidden"
                >
                  {/* Row header */}
                  <div
                    className="px-5 py-4 cursor-pointer hover:bg-[var(--portal-inset)] transition-colors"
                    onClick={() => loadTranscript(doc)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-compute text-xs text-[var(--portal-gold-ink)] tracking-wider">
                            {DOC_TYPE_LABELS[doc.document_type] || 'Document'}
                          </span>
                          {doc.approximate_decade && (
                            <span className="font-compute text-xs text-[var(--portal-label)]">{doc.approximate_decade}</span>
                          )}
                          {doc.transcript_status === 'pending' && (
                            <span className="font-compute text-xs text-[var(--portal-gold-ink)]">processing…</span>
                          )}
                          {doc.transcript_status === 'failed' && (
                            <span className="font-compute text-xs text-[var(--portal-error)]">failed</span>
                          )}
                        </div>
                        <p className="font-legacy text-lg text-[var(--portal-ink)] leading-tight truncate">
                          {doc.title || doc.file_name}
                        </p>
                        {doc.created_by && (
                          <p className="font-compute text-xs text-[var(--portal-label)] mt-0.5">{doc.created_by}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {doc.word_count !== null && doc.word_count > 0 && (
                          <span className="font-compute text-xs text-[var(--portal-secondary)]">{doc.word_count.toLocaleString()} words</span>
                        )}
                        <svg
                          className={`text-[var(--portal-label)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                        >
                          <path d="M6 9l6 6 6-6"/>
                        </svg>
                      </div>
                    </div>

                    {doc.summary && (
                      <p className="font-compute text-xs text-[var(--portal-secondary)] mt-2 line-clamp-2">{doc.summary}</p>
                    )}
                  </div>

                  {/* Expanded section */}
                  {isExpanded && (
                    <div className="border-t border-[var(--portal-rule)] px-5 py-4 space-y-4">

                      {/* Linguistic patterns */}
                      {patterns && Object.keys(patterns).length > 0 && (
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                          {patterns.tone != null && (
                            <div>
                              <p className="font-compute text-xs text-[var(--portal-label)] tracking-wider mb-0.5">TONE</p>
                              <p className="font-compute text-xs text-[var(--portal-body)] capitalize">{String(patterns.tone)}</p>
                            </div>
                          )}
                          {patterns.vocabulary_level != null && (
                            <div>
                              <p className="font-compute text-xs text-[var(--portal-label)] tracking-wider mb-0.5">VOCABULARY</p>
                              <p className="font-compute text-xs text-[var(--portal-body)] capitalize">{String(patterns.vocabulary_level)}</p>
                            </div>
                          )}
                          {patterns.writing_style != null && (
                            <div className="col-span-2">
                              <p className="font-compute text-xs text-[var(--portal-label)] tracking-wider mb-0.5">WRITING STYLE</p>
                              <p className="font-compute text-xs text-[var(--portal-body)]">{String(patterns.writing_style)}</p>
                            </div>
                          )}
                          {Array.isArray(patterns.topics) && patterns.topics.length > 0 && (
                            <div className="col-span-2">
                              <p className="font-compute text-xs text-[var(--portal-label)] tracking-wider mb-1">TOPICS</p>
                              <div className="flex flex-wrap gap-1.5">
                                {(patterns.topics as string[]).map((t, i) => (
                                  <span key={i} className="font-compute text-xs text-[var(--portal-secondary)] border border-[var(--portal-card-line)] rounded px-2 py-0.5">{t}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {Array.isArray(patterns.distinctive_phrases) && patterns.distinctive_phrases.length > 0 && (
                            <div className="col-span-2">
                              <p className="font-compute text-xs text-[var(--portal-label)] tracking-wider mb-1">DISTINCTIVE PHRASES</p>
                              <div className="space-y-1">
                                {(patterns.distinctive_phrases as string[]).map((p, i) => (
                                  <p key={i} className="font-legacy text-sm text-[var(--portal-gold-ink)] italic">"{p}"</p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Transcript */}
                      {loadingTx === doc.id ? (
                        <p className="font-compute text-xs text-[var(--portal-label)] tracking-wider">LOADING TRANSCRIPT…</p>
                      ) : transcripts[doc.id] ? (
                        <div>
                          <p className="font-compute text-xs text-[var(--portal-label)] tracking-wider mb-2">TRANSCRIPT</p>
                          <div className="bg-[var(--portal-inset)] rounded p-4 max-h-64 overflow-y-auto">
                            <p className="font-legacy text-sm text-[var(--portal-body)] leading-relaxed whitespace-pre-wrap">
                              {transcripts[doc.id]}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
