import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from './supabase-admin'

const anthropic = new Anthropic()

export async function generateRelationshipQuestion(
  contributorId:   string,
  archiveId:       string,
  relationship:    string,
  contributorName: string,
  primaryUserName: string,
  language        = 'en',
): Promise<string> {
  const [weakDimensions, recentAnswered, unlabeledPhotos] = await Promise.all([
    supabaseAdmin
      .from('entity_accuracy')
      .select('dimension, accuracy_score')
      .eq('archive_id', archiveId)
      .order('accuracy_score', { ascending: true })
      .limit(3),

    supabaseAdmin
      .from('contributor_questions')
      .select('question_text, dimension')
      .eq('contributor_id', contributorId)
      .eq('status', 'answered')
      .order('answered_at', { ascending: false })
      .limit(20),

    supabaseAdmin
      .from('photographs')
      .select('id, ai_era_estimate, ai_category')
      .eq('archive_id', archiveId)
      .eq('status', 'unlabelled')
      .limit(5),
  ])

  const weak             = weakDimensions.data ?? []
  const answered         = recentAnswered.data  ?? []
  const weakDimensionNames = weak.slice(0, 2).map(d => d.dimension).join(', ')
  const recentTopics     = answered.slice(0, 5).map(q => q.question_text.substring(0, 60)).join('\n')
  const primaryFirstName = primaryUserName.split(' ')[0]

  const languageInstruction =
    language === 'zh'  ? 'Write the question in Simplified Chinese (普通话).'
    : language === 'yue' ? 'Write the question in Cantonese (廣東話) using Traditional Chinese characters.'
    : language === 'ja'  ? 'Write the question in polite Japanese (丁寧語).'
    : language === 'es'  ? 'Write the question in Spanish.'
    : language === 'ko'  ? 'Write the question in Korean.'
    : language === 'vi'  ? 'Write the question in Vietnamese.'
    : language === 'tl'  ? 'Write the question in Filipino (Tagalog).'
    : 'Write the question in English.'

  const prompt = `You are generating a personalized question for a contributor to a family legacy archive.

CONTRIBUTOR: ${contributorName.split(' ')[0]}
RELATIONSHIP TO SUBJECT: ${relationship}
ARCHIVE SUBJECT: ${primaryFirstName}

ARCHIVE NEEDS (weakest dimensions): ${weakDimensionNames || 'wisdom_and_lessons'}

QUESTIONS THIS CONTRIBUTOR ALREADY ANSWERED:
${recentTopics || 'None yet'}

YOUR TASK:
Write ONE deeply personal question that:
1. Only this contributor can answer given their specific relationship as ${relationship}
2. Addresses one of the weak dimensions: ${weakDimensionNames || 'general wisdom'}
3. Is NOT similar to questions already answered above
4. Feels written specifically for this person, not a generic question
5. Is emotionally resonant but not heavy
6. Asks for a specific memory or observation, not a general statement
7. Is 2-4 sentences maximum

${languageInstruction}

Return ONLY the question text. No preamble. No explanation. Just the question.`

  const response = await anthropic.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages:   [{ role: 'user', content: prompt }],
  })

  return response.content[0].type === 'text' ? response.content[0].text.trim() : ''
}

// ── Email builders ─────────────────────────────────────────────────────────────

export function buildQuestionSubject(archiveName: string, lang: string): string {
  const subjects: Record<string, string> = {
    en:  `A question only you can answer · ${archiveName}`,
    zh:  `只有您能回答的问题 · ${archiveName}`,
    yue: `只有你能答嘅問題 · ${archiveName}`,
    ja:  `あなただけが答えられる質問 · ${archiveName}`,
    es:  `Una pregunta que solo tú puedes responder · ${archiveName}`,
    ko:  `당신만이 답할 수 있는 질문 · ${archiveName}`,
    vi:  `Câu hỏi chỉ bạn mới có thể trả lời · ${archiveName}`,
    tl:  `Isang tanong na ikaw lamang ang makakapagsagot · ${archiveName}`,
  }
  return subjects[lang] ?? subjects.en
}

export function buildQuestionEmail(
  archiveName: string,
  firstName:   string,
  question:    string,
  portalUrl:   string,
  lang:        string,
): string {
  type Labels = { greeting: string; intro: string; cta: string; footer: string }
  const labels: Record<string, Labels> = {
    en:  { greeting: `${firstName},`,    intro: 'The archive has a question that only you can answer.', cta: 'ANSWER THIS QUESTION →', footer: 'Reply to this email or visit your contributor portal.' },
    zh:  { greeting: `${firstName}，`,   intro: '档案有一个只有您能回答的问题。', cta: '回答这个问题 →', footer: '请回复此邮件或访问您的贡献者页面。' },
    yue: { greeting: `${firstName}，`,   intro: '檔案有一個只有你能答嘅問題。', cta: '回答呢個問題 →', footer: '請回覆此電郵或訪問你嘅貢獻者頁面。' },
    ja:  { greeting: `${firstName}様、`, intro: 'アーカイブには、あなただけが答えられる質問があります。', cta: 'この質問に答える →', footer: 'このメールに返信するか、コントリビューターポータルをご覧ください。' },
    es:  { greeting: `${firstName},`,    intro: 'El archivo tiene una pregunta que solo tú puedes responder.', cta: 'RESPONDER ESTA PREGUNTA →', footer: 'Responde a este correo o visita tu portal de colaborador.' },
    ko:  { greeting: `${firstName}님,`,  intro: '아카이브에 당신만이 답할 수 있는 질문이 있습니다.', cta: '이 질문에 답하기 →', footer: '이 이메일에 답장하거나 기여자 포털을 방문하세요.' },
    vi:  { greeting: `${firstName},`,    intro: 'Kho lưu trữ có một câu hỏi chỉ bạn mới có thể trả lời.', cta: 'TRẢ LỜI CÂU HỎI NÀY →', footer: 'Trả lời email này hoặc truy cập cổng cộng tác viên của bạn.' },
    tl:  { greeting: `${firstName},`,    intro: 'May tanong ang archive na ikaw lamang ang makakapagsagot.', cta: 'SAGUTIN ANG TANONG NA ITO →', footer: 'Sumagot sa email na ito o bisitahin ang iyong contributor portal.' },
  }
  const l = labels[lang] ?? labels.en

  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">
  <div style="padding:32px 32px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">${archiveName.toUpperCase()}</p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;margin:0">A QUESTION FOR YOU</p>
  </div>
  <div style="padding:32px">
    <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;color:#B8B4AB;margin:0 0 8px">${l.greeting}</p>
    <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;font-style:italic;color:#B8B4AB;margin:0 0 32px">${l.intro}</p>
    <div style="border-left:3px solid rgba(196,162,74,0.5);padding:24px 28px;margin:0 0 40px;background:rgba(196,162,74,0.04)">
      <p style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#F0EDE6;line-height:1.7;margin:0;font-style:italic">${question}</p>
    </div>
    <a href="${portalUrl}" style="display:inline-block;background:#C4A24A;color:#0A0908;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-decoration:none;padding:14px 28px;border-radius:2px">${l.cta}</a>
    <p style="font-family:Georgia,serif;font-size:13px;font-style:italic;color:#5C6166;margin:24px 0 0;line-height:1.7">${l.footer}</p>
  </div>
  <div style="padding:0 32px 32px;border-top:1px solid rgba(240,237,230,0.06);margin-top:16px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;line-height:1.8;margin:20px 0 0">BASALITH · XYZ<br>${archiveName}</p>
  </div>
</body>
</html>`
}
