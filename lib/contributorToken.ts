import { randomBytes } from 'crypto'
import { supabaseAdmin } from './supabase-admin'

export async function generateContributorToken(contributorId: string): Promise<string> {
  const token = randomBytes(32).toString('hex')

  await supabaseAdmin
    .from('contributors')
    .update({
      access_token:     token,
      token_created_at: new Date().toISOString(),
    })
    .eq('id', contributorId)

  return token
}

export async function getContributorByToken(token: string) {
  if (!token || token.length < 32) {
    console.log('[getContributorByToken] Token too short or missing:', token?.length)
    return null
  }

  console.log('[getContributorByToken] Looking up token:', token.substring(0, 10))

  const { data: contributor, error: contribError } = await supabaseAdmin
    .from('contributors')
    .select('*')
    .eq('access_token', token)
    .eq('status', 'active')
    .maybeSingle()

  console.log('[getContributorByToken] Contributor:', contributor?.id ?? null, contribError?.message ?? null)

  if (!contributor) return null

  const { data: archive, error: archiveError } = await supabaseAdmin
    .from('archives')
    .select('id, name, family_name, owner_name, owner_email, status')
    .eq('id', contributor.archive_id)
    .maybeSingle()

  console.log('[getContributorByToken] Archive:', archive?.id ?? null, archive?.status ?? null, archiveError?.message ?? null)

  if (!archive) return null

  return { ...contributor, archives: archive }
}

export async function generateQuestionsForContributor(
  contributorId: string,
  archiveId:     string,
  relationship:  string,
): Promise<void> {
  const { count } = await supabaseAdmin
    .from('contributor_questions')
    .select('id', { count: 'exact', head: true })
    .eq('contributor_id', contributorId)
    .eq('status', 'pending')

  if ((count ?? 0) >= 3) return

  const needed = 3 - (count ?? 0)

  const [{ data: accuracy }, { data: photos }] = await Promise.all([
    supabaseAdmin
      .from('entity_accuracy')
      .select('dimension, accuracy_score')
      .eq('archive_id', archiveId)
      .order('accuracy_score', { ascending: true })
      .limit(3),
    supabaseAdmin
      .from('photographs')
      .select('id, ai_era_estimate, ai_category')
      .eq('archive_id', archiveId)
      .eq('status', 'unlabelled')
      .is('memory_game_used_at', null)
      .order('priority_score', { ascending: false })
      .limit(5),
  ])

  const relationshipQuestions: Record<string, string[]> = {
    daughter: [
      'What is a memory of your father that you have never shared with anyone?',
      'Describe a moment when your father surprised you — when he did something you did not expect.',
      'What did your father teach you without ever sitting down to teach it?',
      'What do you know about your father that he does not know you know?',
    ],
    son: [
      'What is the most important thing your father ever said to you?',
      'Describe your father in a moment of genuine joy — what was he doing?',
      'What did you learn from watching your father work?',
      'What do you wish you had asked your father before it was too late?',
    ],
    spouse: [
      'Describe your partner when they think no one is watching.',
      'What is something about your partner that most people misunderstand?',
      'What has your partner taught you about how to live?',
      'What would you want your grandchildren to know about who your partner really is?',
    ],
    sibling: [
      'What role did your sibling play in your family that nobody ever named?',
      'Describe a memory of your sibling from childhood that captures who they were.',
      'What do you understand about your sibling now that you did not understand when you were young?',
      'What did your sibling carry from your family that shaped who they became?',
    ],
    colleague: [
      'Describe a moment when you watched this person make a difficult decision under pressure.',
      'What does this person do that you have tried to learn from?',
      'What do people who work with them not understand about them that you do?',
      'What would be lost if this person had never been part of your professional life?',
    ],
    childhood_friend: [
      'Describe this person as you knew them when you were both young.',
      'What did you know about them then that predicted who they became?',
      'What is something about them that only someone who knew them then would understand?',
      'What shared experience shaped both of you?',
    ],
    grandchild: [
      'What is your favorite memory with your grandparent?',
      'What did your grandparent teach you that you still carry today?',
      'Describe your grandparent in a moment that felt special to you.',
      'What do you want to remember about your grandparent forever?',
    ],
    other: [
      'How did you come to know this person and what made the relationship meaningful?',
      'What do you admire most about this person?',
      'Describe a moment that captures who this person really is.',
      'What would you want their family to know about them?',
    ],
  }

  const relQuestions = relationshipQuestions[relationship] ?? relationshipQuestions.other

  // Fetch all existing question texts (any status) so we never repeat one
  const { data: existingRows } = await supabaseAdmin
    .from('contributor_questions')
    .select('question_text')
    .eq('contributor_id', contributorId)
    .eq('archive_id', archiveId)

  function normalizeQuestionText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[.!?]+$/, '')
  }

  const existingNormalized = new Set((existingRows ?? []).map(r => normalizeQuestionText(r.question_text)))
  const existingTexts       = (existingRows ?? []).map(r => normalizeQuestionText(r.question_text))

  function isDuplicate(candidate: string): boolean {
    // Hard exclusion: exact match (after normalization) regardless of keyword count
    if (existingNormalized.has(normalizeQuestionText(candidate))) return true

    // Secondary fuzzy guard for paraphrase-level near-duplicates
    const keywords = candidate.toLowerCase().split(' ').filter(w => w.length > 5)
    return existingTexts.some(existing => {
      const matches = keywords.filter(k => existing.includes(k)).length
      return matches > 3
    })
  }

  const questions: object[] = []

  // 1. Photograph question if we have unlabelled photos
  if (photos && photos.length > 0 && needed > 0) {
    // Find a photo not already used in a pending/answered question
    const usedPhotoIds = new Set(
      await supabaseAdmin
        .from('contributor_questions')
        .select('photograph_id')
        .eq('contributor_id', contributorId)
        .not('photograph_id', 'is', null)
        .then(({ data }) => (data ?? []).map(r => r.photograph_id as string))
    )
    const freshPhoto = photos.find(p => !usedPhotoIds.has(p.id))
    if (freshPhoto) {
      const photoQuestion = `Do you recognize anyone in this photograph${freshPhoto.ai_era_estimate ? ` from ${freshPhoto.ai_era_estimate}` : ''}? What do you remember about this moment?`
      if (!isDuplicate(photoQuestion)) {
        questions.push({
          archive_id:     archiveId,
          contributor_id: contributorId,
          question_text:  photoQuestion,
          question_type:  'photograph_label',
          photograph_id:  freshPhoto.id,
          dimension:      null,
        })
      }
    }
  }

  // 2. Relationship-specific questions — skip any already asked
  for (const q of relQuestions) {
    if (questions.length >= needed) break
    if (isDuplicate(q)) {
      console.log('[questions] skipping duplicate:', q.substring(0, 60))
      continue
    }
    const weakDimension = accuracy?.[questions.length]?.dimension ?? null
    questions.push({
      archive_id:     archiveId,
      contributor_id: contributorId,
      question_text:  q,
      question_type:  'relationship_specific',
      photograph_id:  null,
      dimension:      weakDimension,
    })
  }

  if (questions.length > 0) {
    await supabaseAdmin.from('contributor_questions').insert(questions)
  }
}
