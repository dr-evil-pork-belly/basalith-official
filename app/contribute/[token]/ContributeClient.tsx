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
  phone:              string | null
  preferred_language: string
}

const PORTAL_UI = {
  en: {
    welcome:          (name: string) => `Welcome, ${name}.`,
    contributions:    'Your contributions',
    addPhotos:        'Add your photos',
    videosAndDocs:    'Videos and documents',
    recordMemory:     'Record a memory',
    callInStories:    'Call in your stories',
    questionsForYou:  'Questions for you',
    footerNote:       'Everything you share here is preserved permanently.',
    contributions_n:  (n: number) => `${n} CONTRIBUTION${n !== 1 ? 'S' : ''}`,
    honesty:          'Be honest. The most valuable thing you can contribute is the truth. Difficult memories and complicated feelings are as important as positive ones.',
  },
  zh: {
    welcome:          (name: string) => `欢迎您，${name}。`,
    contributions:    '您的贡献',
    addPhotos:        '上传照片',
    videosAndDocs:    '视频和文件',
    recordMemory:     '录制回忆',
    callInStories:    '电话录制故事',
    questionsForYou:  '您的专属问题',
    footerNote:       '您在此分享的一切都将被永久保存。',
    contributions_n:  (n: number) => `${n} 条贡献`,
    honesty:          '请诚实作答。您能贡献的最有价值的东西是真相。困难的记忆和复杂的感受与积极的记忆同样重要。',
  },
  es: {
    welcome:          (name: string) => `Bienvenido, ${name}.`,
    contributions:    'Sus contribuciones',
    addPhotos:        'Agregar sus fotos',
    videosAndDocs:    'Videos y documentos',
    recordMemory:     'Grabar un recuerdo',
    callInStories:    'Contar historias por teléfono',
    questionsForYou:  'Preguntas para usted',
    footerNote:       'Todo lo que comparte aquí se preserva permanentemente.',
    contributions_n:  (n: number) => `${n} CONTRIBUCIÓN${n !== 1 ? 'ES' : ''}`,
    honesty:          'Sea honesto. Lo más valioso que puede aportar es la verdad. Los recuerdos difíciles y los sentimientos complicados son tan importantes como los positivos.',
  },
  vi: {
    welcome:          (name: string) => `Chào mừng, ${name}.`,
    contributions:    'Đóng góp của bạn',
    addPhotos:        'Thêm ảnh của bạn',
    videosAndDocs:    'Video và tài liệu',
    recordMemory:     'Ghi lại một ký ức',
    callInStories:    'Kể chuyện qua điện thoại',
    questionsForYou:  'Câu hỏi dành cho bạn',
    footerNote:       'Mọi thứ bạn chia sẻ ở đây được lưu giữ vĩnh viễn.',
    contributions_n:  (n: number) => `${n} ĐÓNG GÓP`,
    honesty:          'Hãy thành thật. Điều có giá trị nhất bạn có thể đóng góp là sự thật. Những ký ức khó khăn cũng quan trọng như những ký ức tích cực.',
  },
  tl: {
    welcome:          (name: string) => `Maligayang pagdating, ${name}.`,
    contributions:    'Ang inyong mga kontribusyon',
    addPhotos:        'Magdagdag ng mga larawan',
    videosAndDocs:    'Mga video at dokumento',
    recordMemory:     'Mag-record ng alaala',
    callInStories:    'Mag-record ng kwento sa telepono',
    questionsForYou:  'Mga tanong para sa inyo',
    footerNote:       'Lahat ng inyong ibabahagi dito ay permanenteng maiingatan.',
    contributions_n:  (n: number) => `${n} KONTRIBUSYON`,
    honesty:          'Maging matapat. Ang pinakamahalagang bagay na maaari ninyong ibahagi ay ang katotohanan. Ang mahirap na mga alaala ay kasinghalaga ng mga positibo.',
  },
  ko: {
    welcome:          (name: string) => `${name}님, 환영합니다.`,
    contributions:    '귀하의 기여',
    addPhotos:        '사진 추가',
    videosAndDocs:    '동영상 및 문서',
    recordMemory:     '추억 녹음',
    callInStories:    '전화로 이야기 전달',
    questionsForYou:  '귀하를 위한 질문',
    footerNote:       '여기에 공유하신 모든 것은 영구적으로 보존됩니다.',
    contributions_n:  (n: number) => `기여 ${n}건`,
    honesty:          '솔직하게 말씀해 주세요. 귀하가 기여할 수 있는 가장 소중한 것은 진실입니다. 어려운 기억도 긍정적인 것만큼 중요합니다.',
  },
  yue: {
    welcome:          (name: string) => `歡迎你，${name}。`,
    contributions:    '你嘅貢獻',
    addPhotos:        '上傳相片',
    videosAndDocs:    '影片同文件',
    recordMemory:     '錄製回憶',
    callInStories:    '致電錄製故事',
    questionsForYou:  '只有你先至答得到嘅問題',
    footerNote:       '你喺呢度分享嘅所有嘢都會永久保存。',
    contributions_n:  (n: number) => `${n} 個貢獻`,
    honesty:          '請誠實。你能夠貢獻嘅最有價值嘅嘢就係真相。困難嘅回憶同複雜嘅感受，同積極嘅一樣重要。',
  },
  ja: {
    welcome:          (name: string) => `${name}さん、ようこそ。`,
    contributions:    'あなたのご貢献',
    addPhotos:        '写真を追加',
    videosAndDocs:    '動画・書類',
    recordMemory:     '思い出を録音',
    callInStories:    'お電話で物語を録音',
    questionsForYou:  'あなたへのご質問',
    footerNote:       'ここでお分かちいただいたものはすべて永久に保存されます。',
    contributions_n:  (n: number) => `${n}件のご貢献`,
    honesty:          '正直にお答えください。ご提供いただける最も貴重なものは真実です。辛い記憶や複雑な感情も、前向きなものと同様に大切です。',
  },
}

type ArchiveProps = {
  id:                             string
  name:                           string
  family_name:                    string
  owner_name:                     string
  contributor_entity_access:      'none' | 'preview' | 'open'
  entity_preview_contributor_ids: string[]
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

// ── Story Game Section ─────────────────────────────────────────────────────────

type StoryGame = {
  id:             string
  scenarioText:   string
  status:         'active' | 'revealed'
  revealAt:       string
  responseCount:  number
  alreadyAnswered: boolean
  revealedAnswers: string[] | null
}

function StoryGameSection({
  archiveId,
  contributorId,
  ownerName,
  lang,
}: {
  archiveId:     string
  contributorId: string
  ownerName:     string
  lang:          string
}) {
  const [game,      setGame]      = useState<StoryGame | null | 'none'>('none')
  const [answer,    setAnswer]    = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetch(`/api/game/story?archiveId=${archiveId}&contributorId=${contributorId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setGame(d?.session ?? null))
      .catch(() => setGame(null))
  }, [archiveId, contributorId])

  async function handleSubmit() {
    if (!answer.trim() || submitting || typeof game !== 'object' || !game) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/game/story', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ archiveId, contributorId, responseText: answer.trim() }),
      })
      if (res.ok) {
        setSubmitted(true)
        setGame(prev => prev && typeof prev === 'object' ? { ...prev, alreadyAnswered: true, responseCount: prev.responseCount + 1 } : prev)
      }
    } catch {}
    setSubmitting(false)
  }

  if (game === 'none' || game === null) return null

  const ownerFirst  = ownerName.split(' ')[0]
  const revealDate  = typeof game === 'object' ? new Date(game.revealAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : ''

  const ui = {
    en:  { title: 'Remember When', badge: 'Monthly Game', prompt: 'Your answer', submitted: 'Submitted — answers revealed on', responded: (n: number) => `${n} answer${n !== 1 ? 's' : ''} submitted so far`, revealTitle: 'Answers', cta: 'SUBMIT YOUR ANSWER', noAnswer: 'Write your answer…' },
    yue: { title: '你還記得嗎', badge: '每月遊戲', prompt: '你嘅回答', submitted: '已提交 — 答案將於以下日期公開：', responded: (n: number) => `已有 ${n} 個答案`, revealTitle: '所有答案', cta: '提交你嘅回答', noAnswer: '寫下你嘅回答…' },
    zh:  { title: '你还记得吗', badge: '每月游戏', prompt: '您的回答', submitted: '已提交 — 答案将于以下日期公开：', responded: (n: number) => `已有 ${n} 个答案`, revealTitle: '所有答案', cta: '提交您的回答', noAnswer: '写下您的回答…' },
  }
  const t = (ui as Record<string, typeof ui.en>)[lang] ?? ui.en

  if (typeof game !== 'object') return null

  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(26,24,20,0.08)', borderTop: '2px solid #B8963E', borderRadius: '2px', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(26,24,20,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontSize: '1.15rem', fontWeight: 700, color: '#1A1814', margin: 0 }}>{t.title}</p>
          </div>
          <span style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.42rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B8963E', background: 'rgba(184,150,62,0.08)', padding: '3px 8px' }}>{t.badge}</span>
        </div>

        <div style={{ padding: '1.25rem' }}>
          {/* Scenario */}
          <div style={{ borderLeft: '3px solid rgba(184,150,62,0.4)', padding: '14px 18px', marginBottom: '20px', background: 'rgba(184,150,62,0.04)' }}>
            <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontSize: '1.2rem', fontStyle: 'italic', fontWeight: 300, color: '#1A1814', lineHeight: 1.7, margin: 0 }}>
              {game.scenarioText}
            </p>
          </div>

          {/* Status line */}
          {game.status === 'active' && (
            <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.44rem', letterSpacing: '0.12em', color: '#8A8680', marginBottom: '16px' }}>
              {t.responded(game.responseCount)} · answers revealed {revealDate}
            </p>
          )}

          {/* Active — answer input or submitted state */}
          {game.status === 'active' && !game.alreadyAnswered && !submitted && (
            <>
              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder={t.noAnswer}
                style={{ width: '100%', minHeight: '100px', padding: '12px', fontFamily: '"Cormorant Garamond",Georgia,serif', fontSize: '1rem', lineHeight: 1.65, color: '#1A1814', background: '#FAFAF8', border: '1px solid rgba(26,24,20,0.12)', borderRadius: '2px', resize: 'vertical', boxSizing: 'border-box', marginBottom: '12px' }}
              />
              <button
                onClick={handleSubmit}
                disabled={!answer.trim() || submitting}
                style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.52rem', letterSpacing: '0.2em', textTransform: 'uppercase', background: answer.trim() && !submitting ? '#B8963E' : 'rgba(184,150,62,0.3)', color: '#FFFFFF', border: 'none', padding: '12px 24px', cursor: answer.trim() ? 'pointer' : 'not-allowed' }}
              >
                {submitting ? '…' : t.cta}
              </button>
            </>
          )}

          {(game.alreadyAnswered || submitted) && game.status === 'active' && (
            <div style={{ padding: '14px 18px', background: 'rgba(184,150,62,0.06)', border: '1px solid rgba(184,150,62,0.2)', borderRadius: '2px' }}>
              <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.48rem', letterSpacing: '0.14em', color: '#B8963E', margin: 0 }}>
                ✓ {t.submitted} {revealDate}
              </p>
            </div>
          )}

          {/* Revealed — show all answers */}
          {game.status === 'revealed' && game.revealedAnswers && (
            <>
              <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.44rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B8963E', marginBottom: '16px' }}>
                {t.revealTitle} · {game.revealedAnswers.length}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {game.revealedAnswers.map((a, i) => (
                  <div key={i} style={{ border: '1px solid rgba(184,150,62,0.2)', padding: '14px 18px', background: 'rgba(184,150,62,0.02)' }}>
                    <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontSize: '1rem', fontStyle: 'italic', color: '#1A1814', lineHeight: 1.7, margin: 0 }}>{a}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

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
      background:    '#FFFFFF',
      border:        '1px solid rgba(26,24,20,0.08)',
      borderTop:     prominent ? '2px solid #B8963E' : '2px solid rgba(184,150,62,0.25)',
      borderRadius:  '4px',
      padding:       '24px',
      marginBottom:  '16px',
      boxShadow:     prominent ? '0 4px 16px rgba(26,24,20,0.06)' : '0 1px 3px rgba(26,24,20,0.04)',
    }}>
      <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.5rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: prominent ? '#B8963E' : 'rgba(138,134,128,0.8)', margin: '0 0 6px' }}>
        {title}
      </p>
      {subtitle && (
        <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, color: '#4A4640', lineHeight: 1.7, marginBottom: '20px' }}>
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
  lang = 'en',
}: {
  token:       string
  archiveName: string
  ownerName:   string
  lang?:       string
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
      <SectionCard title={PORTAL_UI[lang === 'zh' ? 'zh' : 'en'].questionsForYou} prominent>
        <div style={{ height: '80px', background: 'rgba(255,255,255,0.03)', borderRadius: '2px', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </SectionCard>
    )
  }

  if (questions.length === 0) return null

  const subjectName = ownerName ? ownerName.split(' ')[0] : 'the archive subject'

  return (
    <SectionCard
      title={PORTAL_UI[lang === 'zh' ? 'zh' : 'en'].questionsForYou}
      subtitle={lang === 'zh'
        ? `档案中有 ${questions.length} 个只有您能回答的问题。`
        : `The archive has ${questions.length} question${questions.length !== 1 ? 's' : ''} only you can answer.`}
      prominent
    >
      {/* Honesty framing */}
      <div
        style={{
          borderLeft:   '2px solid rgba(184,150,62,0.3)',
          paddingLeft:  '20px',
          marginBottom: '32px',
          maxWidth:     '560px',
        }}
      >
        <p
          style={{
            fontFamily:  '"Cormorant Garamond",Georgia,serif',
            fontSize:    '1rem',
            fontStyle:   'italic',
            fontWeight:  300,
            color:       '#4A4640',
            lineHeight:  1.8,
            margin:      0,
          }}
        >
          Be honest.
          <br /><br />
          The most valuable thing you can contribute is the truth.
          <br /><br />
          Difficult memories and complicated feelings are as important as positive ones.
          <br /><br />
          An honest archive is one the family will recognize and trust.
        </p>
      </div>

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
            <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontWeight: 500, fontSize: '1.05rem', color: '#1A1814', lineHeight: 1.55, marginBottom: '16px' }}>
              {q.question_text.replace(/\[subject\]/gi, subjectName)}
            </p>
            {saved[q.id] ? (
              <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.48rem', letterSpacing: '0.22em', color: '#B8963E' }}>
                Saved ✓
              </p>
            ) : (
              <>
                <textarea
                  value={answers[q.id] ?? ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Share what you remember..."
                  rows={4}
                  style={{
                    width:        '100%',
                    minHeight:    '120px',
                    background:   '#F5F3EE',
                    border:       '1px solid rgba(26,24,20,0.08)',
                    borderRadius: '2px',
                    color:        '#1A1814',
                    fontFamily:   '"Cormorant Garamond",Georgia,serif',
                    fontSize:     '1.05rem',
                    fontWeight:   300,
                    lineHeight:   1.75,
                    padding:      '12px 14px',
                    resize:       'vertical',
                    outline:      'none',
                    boxSizing:    'border-box',
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
  lang = 'en',
}: {
  token:       string
  archiveName: string
  subjectName: string
  onUploaded:  (count: number) => void
  lang?:       string
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
        let errorDetail = ''
        try { errorDetail = await storageRes.text() } catch {}
        console.error('[uploadOne] Storage PUT failed:', {
          status:     storageRes.status,
          statusText: storageRes.statusText,
          error:      errorDetail,
          urlPrefix:  uploadUrl?.substring(0, 80),
        })
        throw new Error(`Storage upload failed: ${storageRes.status} ${errorDetail}`)
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
      title={PORTAL_UI[lang === 'zh' ? 'zh' : 'en'].addPhotos}
      subtitle={lang === 'zh'
        ? `您收藏中有关${subjectName}的照片。`
        : `Photographs you have of ${subjectName} from your own collection.`}
    >
      <p style={{
        fontFamily:    '"Space Mono","Courier New",monospace',
        fontSize:      '0.44rem',
        letterSpacing: '0.18em',
        textTransform: 'uppercase' as const,
        color:         'rgba(138,134,128,0.7)',
        marginBottom:  '16px',
        lineHeight:    1.7,
      }}>
        Any memory. Any era.<br />Positive or difficult. Everything helps.
      </p>

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
  lang = 'en',
}: {
  token:      string
  onUploaded: () => void
  lang?:      string
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
        let errorDetail = ''
        try { errorDetail = await storageRes.text() } catch {}
        console.error('[media-upload] Storage PUT failed:', {
          status:     storageRes.status,
          statusText: storageRes.statusText,
          error:      errorDetail,
          urlPrefix:  uploadUrl?.substring(0, 80),
        })
        throw new Error(`Storage upload failed: ${storageRes.status} ${errorDetail}`)
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
      title={PORTAL_UI[lang === 'zh' ? 'zh' : 'en'].videosAndDocs}
      subtitle={lang === 'zh' ? '家庭录像、信件、文件——您收藏中的任何内容。' : 'Home videos, letters, documents, anything from your collection.'}
    >
      <p style={{
        fontFamily:    '"Space Mono","Courier New",monospace',
        fontSize:      '0.44rem',
        letterSpacing: '0.18em',
        textTransform: 'uppercase' as const,
        color:         'rgba(138,134,128,0.7)',
        marginBottom:  '16px',
        lineHeight:    1.7,
      }}>
        Any memory. Any era.<br />Positive or difficult. Everything helps.
      </p>

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
  lang = 'en',
}: {
  archiveId:   string
  subjectName: string
  onRecorded:  () => void
  lang?:       string
}) {
  const [showRecorder, setShowRecorder] = useState(false)

  return (
    <SectionCard
      title={PORTAL_UI[lang === 'zh' ? 'zh' : 'en'].recordMemory}
      subtitle={lang === 'zh'
        ? `用任何语言讲述。用您自己的话分享关于${subjectName}的回忆。`
        : `Speak in any language. Share a memory of ${subjectName} in your own words.`}
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

// ── Phone call section ────────────────────────────────────────────────────────

function PhoneCallSection({
  contributorId,
  hasPhone,
  token,
  lang = 'en',
}: {
  contributorId: string
  hasPhone:      boolean
  token:         string
  lang?:         string
}) {
  const twilioPhone = process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER
  const [phone,     setPhone]     = useState('')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [phoneOnFile, setPhoneOnFile] = useState(hasPhone)

  if (!twilioPhone) return null

  async function savePhone() {
    if (!phone.trim()) return
    setSaving(true)
    try {
      const res  = await fetch('/api/contribute/save-phone', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, phone: phone.trim() }),
      })
      if (res.ok) {
        setSaved(true)
        setPhoneOnFile(true)
      }
    } catch {}
    setSaving(false)
  }

  return (
    <SectionCard title={PORTAL_UI[lang === 'zh' ? 'zh' : 'en'].callInStories}>
      {phoneOnFile ? (
        <div>
          <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontWeight: 500, fontSize: '1.8rem', color: '#1A1814', letterSpacing: '0.04em', marginBottom: '8px', lineHeight: 1 }}>
            {twilioPhone}
          </p>
          <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 300, color: '#4A4640', lineHeight: 1.75, marginBottom: '12px' }}>
            Call this number from your registered phone. A friendly voice will guide you through a question.
            No login or password needed.
          </p>
          <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.42rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(138,134,128,0.6)' }}>
            Call from your registered phone · Any time
          </p>
        </div>
      ) : (
        <div>
          <p className="font-serif italic" style={{ fontSize: '0.9rem', color: '#9DA3A8', lineHeight: 1.75, marginBottom: '1.25rem' }}>
            Add your phone number to record stories by phone call. No login needed. Just call and speak.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+1 555 000 0000"
              style={{
                background:   'transparent',
                border:       'none',
                borderBottom: '1px solid rgba(255,255,255,0.15)',
                color:        '#F0EDE6',
                fontFamily:   'Georgia, serif',
                fontSize:     '1rem',
                padding:      '0.4rem 0',
                outline:      'none',
                flex:         1,
                minWidth:     '160px',
              }}
            />
            <button
              onClick={savePhone}
              disabled={!phone.trim() || saving}
              style={{
                background:    phone.trim() ? '#C4A24A' : 'rgba(196,162,74,0.2)',
                border:        'none',
                borderRadius:  '2px',
                padding:       '0.5rem 1.25rem',
                minHeight:     '44px',
                fontFamily:    'monospace',
                fontSize:      '0.4rem',
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color:         phone.trim() ? '#0A0908' : '#5C6166',
                cursor:        phone.trim() && !saving ? 'pointer' : 'not-allowed',
              }}
            >
              {saving ? 'Saving...' : saved ? 'Saved' : 'Save Number'}
            </button>
          </div>
          <p style={{ fontFamily: 'monospace', fontSize: '0.38rem', letterSpacing: '0.1em', color: '#3A3F44', marginTop: '0.75rem' }}>
            Include country code. Your number is only used for call-in recording.
          </p>
        </div>
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
  lang = 'en',
}: {
  photosUploaded:    number
  videosUploaded:    number
  voiceRecordings:   number
  questionsAnswered: number
  photosLabelled:    number
  lang?:             string
}) {
  const total = photosUploaded + videosUploaded + voiceRecordings + questionsAnswered + photosLabelled

  return (
    <SectionCard title={PORTAL_UI[lang === 'zh' ? 'zh' : 'en'].contributions}>
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

// ── Contributor Entity Section ─────────────────────────────────────────────────

type EntityMessage = { id: string; role: 'user' | 'entity'; content: string; rating?: string }

function ContributorEntitySection({
  archiveId,
  ownerName,
  hasAccess,
}: {
  archiveId: string
  ownerName: string
  hasAccess: boolean
}) {
  const firstName = ownerName.split(' ')[0] || ownerName

  const [messages,  setMessages]  = useState<EntityMessage[]>([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const userMsg: EntityMessage = { id: Date.now().toString(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    try {
      const res = await fetch('/api/archive/entity-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archiveId,
          message: text,
          sessionId,
          conversationHistory: messages.map(m => ({ role: m.role === 'entity' ? 'assistant' : 'user', content: m.content })),
        }),
      })
      const data = await res.json()
      if (data.sessionId) setSessionId(data.sessionId)
      if (data.response) {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'entity', content: data.response }])
      }
    } catch {}
    setLoading(false)
  }

  async function rateMessage(msgId: string, rating: string) {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, rating } : m))
    await fetch('/api/archive/entity-feedback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archiveId, rating }),
    }).catch(() => {})
  }

  const SECTION_STYLE: React.CSSProperties = {
    background:   '#0F0F10',
    border:       '1px solid rgba(196,162,74,0.2)',
    borderTop:    '3px solid rgba(196,162,74,0.5)',
    borderRadius: '2px',
    marginBottom: '24px',
    padding:      'clamp(1.25rem,4vw,2rem)',
  }

  if (!hasAccess) {
    return (
      <div style={SECTION_STYLE}>
        <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.48rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.55)', marginBottom: '1.5rem' }}>
          {firstName}&rsquo;s Entity Is Learning
        </p>
        <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontStyle: 'italic', fontSize: '1.05rem', fontWeight: 300, color: '#9DA3A8', lineHeight: 1.85, marginBottom: '0.6rem' }}>
          You are helping build it.
        </p>
        <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontStyle: 'italic', fontSize: '1.05rem', fontWeight: 300, color: '#706C65', lineHeight: 2.0, marginBottom: '1.25rem' }}>
          Every photograph you label<br />
          every question you answer<br />
          every memory you share<br />
          teaches it something specific<br />
          about how {firstName} thinks.
        </p>
        <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontStyle: 'italic', fontSize: '1.0rem', fontWeight: 300, color: '#5C6166', lineHeight: 1.85, marginBottom: '1.25rem' }}>
          When it is ready,<br />
          {firstName} will invite you to talk to it.
        </p>
        <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontStyle: 'italic', fontSize: '1.0rem', fontWeight: 300, color: 'rgba(196,162,74,0.45)', lineHeight: 1.85, margin: 0 }}>
          Keep contributing.<br />
          You are making it more accurate.
        </p>
      </div>
    )
  }

  return (
    <div style={SECTION_STYLE}>
      <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.48rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C4A24A', marginBottom: '8px' }}>
        Talk to {firstName}&rsquo;s Entity
      </p>
      <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontStyle: 'italic', fontSize: '0.9rem', color: '#706C65', lineHeight: 1.7, marginBottom: '1.5rem' }}>
        This entity has learned from {firstName}&rsquo;s deposits, photographs, and your contributions.
        Ask it anything.
      </p>

      {/* Conversation */}
      {messages.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', maxHeight: '400px', overflowY: 'auto' }}>
          {messages.map(msg => (
            <div key={msg.id}>
              <div style={{
                display:      'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth:     '80%',
                  background:   msg.role === 'user' ? 'rgba(196,162,74,0.1)' : 'rgba(255,255,255,0.03)',
                  border:       msg.role === 'user' ? '1px solid rgba(196,162,74,0.2)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '2px',
                  padding:      '0.65rem 0.9rem',
                }}>
                  <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontSize: '0.95rem', color: msg.role === 'user' ? '#D4C08A' : '#B8B4AB', lineHeight: 1.7, margin: 0 }}>
                    {msg.content}
                  </p>
                </div>
              </div>
              {msg.role === 'entity' && !msg.rating && (
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '4px', paddingLeft: '4px' }}>
                  {([['accurate','✓','#4CAF50'], ['partial','~','#C4A24A'], ['inaccurate','✗','#ff6b6b']] as const).map(([r, icon, color]) => (
                    <button key={r} onClick={() => rateMessage(msg.id, r)}
                      style={{ fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.1em', color, background: 'transparent', border: `1px solid ${color}40`, padding: '2px 6px', cursor: 'pointer', borderRadius: '2px', opacity: 0.7 }}>
                      {icon} {r}
                    </button>
                  ))}
                </div>
              )}
              {msg.role === 'entity' && msg.rating && (
                <p style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.1em', color: '#5C6166', marginTop: '4px', paddingLeft: '4px' }}>
                  Rated: {msg.rating}
                </p>
              )}
            </div>
          ))}
          {loading && (
            <p style={{ fontFamily: 'monospace', fontSize: '0.46rem', letterSpacing: '0.1em', color: 'rgba(196,162,74,0.5)', animation: 'mysteryGlowPulse 1.5s ease-in-out infinite' }}>
              {firstName.toUpperCase()} IS THINKING…
            </p>
          )}
        </div>
      )}

      {/* Input */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={`Ask ${firstName}'s entity anything…`}
          rows={2}
          style={{
            flex:       1,
            background: 'rgba(255,255,255,0.02)',
            border:     '1px solid rgba(255,255,255,0.07)',
            borderRadius: '2px',
            color:      '#F0EDE6',
            fontFamily: '"Cormorant Garamond",Georgia,serif',
            fontSize:   '0.95rem',
            padding:    '0.6rem 0.75rem',
            resize:     'none',
            outline:    'none',
            lineHeight: 1.5,
          }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            fontFamily:    '"Space Mono","Courier New",monospace',
            fontSize:      '0.44rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color:         '#0A0908',
            background:    loading || !input.trim() ? 'rgba(196,162,74,0.4)' : '#C4A24A',
            border:        'none',
            padding:       '0 1rem',
            cursor:        loading || !input.trim() ? 'not-allowed' : 'pointer',
            borderRadius:  '2px',
            flexShrink:    0,
          }}
        >
          Ask
        </button>
      </div>
    </div>
  )
}

// ── Memory Map Teaser (contributor portal) ─────────────────────────────────────

function MemoryMapTeaser({ token }: { token: string }) {
  const [weakestDecade,    setWeakestDecade]    = useState<{ label: string; photoCount: number } | null>(null)
  const [weakestDimension, setWeakestDimension] = useState<{ label: string; score: number } | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch(`/api/contribute/memory-map?token=${token}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        setWeakestDecade(d.weakestDecade     ?? null)
        setWeakestDimension(d.weakestDimension ?? null)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [token])

  if (!loaded || (!weakestDecade && !weakestDimension)) return null

  function Bar({ pct, color }: { pct: number; color: string }) {
    return (
      <div style={{ flex: 1, height: '6px', background: 'rgba(196,162,74,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: '2px' }} />
      </div>
    )
  }

  return (
    <div style={{ background: 'rgba(196,162,74,0.04)', border: '1px solid rgba(196,162,74,0.15)', borderRadius: '2px', padding: '1.25rem', marginBottom: '24px' }}>
      <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.44rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)', marginBottom: '1rem' }}>
        Where the Archive Needs You
      </p>

      {weakestDecade && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontFamily: '"Courier New",monospace', fontSize: '0.46rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#706C65', width: '64px', flexShrink: 0 }}>
              {weakestDecade.label}
            </span>
            <Bar pct={weakestDecade.photoCount * 10} color="rgba(196,162,74,0.25)" />
            <span style={{ fontFamily: '"Courier New",monospace', fontSize: '0.42rem', color: 'rgba(196,162,74,0.4)', flexShrink: 0 }}>
              {weakestDecade.photoCount === 0 ? 'MISSING' : `${weakestDecade.photoCount} photos`}
            </span>
          </div>
        </div>
      )}

      {weakestDimension && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontFamily: '"Courier New",monospace', fontSize: '0.46rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#706C65', width: '64px', flexShrink: 0 }}>
              {weakestDimension.label}
            </span>
            <Bar pct={weakestDimension.score} color="rgba(196,162,74,0.25)" />
            <span style={{ fontFamily: '"Courier New",monospace', fontSize: '0.42rem', color: 'rgba(196,162,74,0.4)', flexShrink: 0 }}>
              {weakestDimension.score === 0 ? 'EMPTY' : `${weakestDimension.score}%`}
            </span>
          </div>
        </div>
      )}

      <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontStyle: 'italic', fontSize: '0.9rem', color: '#5C6166', lineHeight: 1.7, margin: 0 }}>
        Do you have photographs or memories from these areas? Any detail helps.
      </p>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

const PORTAL_LANGS = Object.keys(PORTAL_UI) as (keyof typeof PORTAL_UI)[]

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

  // displayLang: prefer cookie, fall back to contributor's server-side language
  function getInitialLang(): keyof typeof PORTAL_UI {
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/preferred_language=([^;]+)/)
      const val   = match?.[1]
      if (val && PORTAL_LANGS.includes(val as keyof typeof PORTAL_UI)) {
        return val as keyof typeof PORTAL_UI
      }
    }
    const serverLang = contributor.preferred_language as keyof typeof PORTAL_UI
    return PORTAL_LANGS.includes(serverLang) ? serverLang : 'en'
  }
  const [displayLang, setDisplayLang] = useState<keyof typeof PORTAL_UI>('en')
  // Hydrate on client
  useState(() => { setDisplayLang(getInitialLang()) })

  function switchPortalLang(code: keyof typeof PORTAL_UI) {
    document.cookie = `preferred_language=${code};path=/;max-age=31536000;SameSite=Lax`
    setDisplayLang(code)
  }

  const lang = displayLang
  const ui   = PORTAL_UI[lang]
  const firstName     = contributor.name ? contributor.name.split(' ')[0] : 'there'
  const relLabel      = RELATIONSHIP_LABELS[contributor.relationship] ?? 'Contributor'
  const subjectName   = archive.owner_name ? archive.owner_name.split(' ')[0] : 'the archive subject'
  const totalContribs = photosUploaded + videosUploaded + voiceRecordings + contributor.questions_answered + contributor.photos_labelled

  return (
    <div style={{ background: '#FAFAF8', minHeight: '100svh', color: '#1A1814' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: 'clamp(40px,8vw,72px) 24px clamp(28px,5vw,40px)', background: '#FFFFFF', borderBottom: '1px solid rgba(26,24,20,0.06)' }}>
        <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.52rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#B8963E', margin: '0 0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <span style={{ display: 'block', width: '20px', height: '1px', background: '#B8963E', flexShrink: 0 }} aria-hidden="true" />
          {archive.name}
          <span style={{ display: 'block', width: '20px', height: '1px', background: '#B8963E', flexShrink: 0 }} aria-hidden="true" />
        </p>
        <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontWeight: 500, fontSize: 'clamp(1.4rem,4vw,2rem)', color: '#1A1814', margin: '0 0 8px', lineHeight: 1.2 }}>
          {ui.welcome(firstName)}
        </p>
        <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, color: '#8A8680', margin: '0 0 6px' }}>
          You have been invited to contribute to this archive.
        </p>
        <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.44rem', letterSpacing: '0.15em', color: 'rgba(138,134,128,0.6)', margin: 0 }}>
          {relLabel}{totalContribs > 0 ? ` · ${ui.contributions_n(totalContribs)}` : ''}
        </p>
      </div>

      {/* Language switcher */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(26,24,20,0.06)', padding: '8px 24px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {PORTAL_LANGS.map(code => (
            <button
              key={code}
              onClick={() => switchPortalLang(code)}
              style={{
                fontFamily:    '"Space Mono","Courier New",monospace',
                fontSize:      '0.42rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                color:         displayLang === code ? '#B8963E' : 'rgba(138,134,128,0.5)',
                background:    displayLang === code ? 'rgba(184,150,62,0.08)' : 'transparent',
                border:        displayLang === code ? '1px solid rgba(184,150,62,0.25)' : '1px solid transparent',
                borderRadius:  '2px',
                padding:       '4px 8px',
                cursor:        'pointer',
                minHeight:     '28px',
                transition:    'all 150ms ease',
              }}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Gold rule */}
      <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, rgba(184,150,62,0.3), transparent)' }} aria-hidden="true" />

      {/* Content */}
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '1.5rem 1.25rem 4rem' }}>

        {/* Where the archive needs you */}
        <MemoryMapTeaser token={token} />

        {/* Monthly memory game */}
        <StoryGameSection
          archiveId={archive.id}
          contributorId={contributor.id}
          ownerName={archive.owner_name}
          lang={lang}
        />

        {/* Questions */}
        <QuestionsSection
          token={token}
          archiveName={archive.name}
          ownerName={archive.owner_name}
          lang={lang}
        />

        {/* Photos */}
        <PhotoUploadSection
          token={token}
          archiveName={archive.name}
          subjectName={subjectName}
          onUploaded={count => setPhotosUploaded(prev => prev + count)}
          lang={lang}
        />

        {/* Videos & Documents */}
        <MediaUploadSection
          token={token}
          onUploaded={() => setVideosUploaded(prev => prev + 1)}
          lang={lang}
        />

        {/* Voice */}
        <VoiceSection
          archiveId={archive.id}
          subjectName={subjectName}
          onRecorded={() => setVoiceRecordings(prev => prev + 1)}
          lang={lang}
        />

        {/* Phone call recording */}
        <PhoneCallSection
          contributorId={contributor.id}
          hasPhone={!!contributor.phone}
          token={token}
          lang={lang}
        />

        {/* Contributions summary */}
        <ContributionsSection
          photosUploaded={photosUploaded}
          videosUploaded={videosUploaded}
          voiceRecordings={voiceRecordings}
          questionsAnswered={contributor.questions_answered}
          photosLabelled={contributor.photos_labelled}
          lang={lang}
        />

        {/* Entity access */}
        <ContributorEntitySection
          archiveId={archive.id}
          ownerName={archive.owner_name}
          hasAccess={
            archive.contributor_entity_access === 'open' ||
            (archive.contributor_entity_access === 'preview' &&
              archive.entity_preview_contributor_ids.includes(contributor.id))
          }
        />

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingTop: '32px', borderTop: '1px solid rgba(26,24,20,0.06)' }}>
          <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.44rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(138,134,128,0.5)', margin: 0 }}>
            Basalith · Heritage Nexus Inc.
          </p>
          <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontStyle: 'italic', fontSize: '0.85rem', color: 'rgba(138,134,128,0.5)', margin: '6px 0 0' }}>
            {ui.footerNote}
          </p>
        </div>
      </div>
    </div>
  )
}
