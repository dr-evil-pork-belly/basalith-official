import { supabaseAdmin } from './supabase-admin'

export interface DailySpark {
  id:          string
  text:        string
  category:    string
  dimension:   string
  dayOfWeek?:  number   // 0=Sun…6=Sat; undefined = any day
  minWords:    number
  followUp?:   string
}

export const dailySparks: DailySpark[] = [
  // ── SENSORY MEMORY ──────────────────────────────────────────────────────────
  { id: 'sense_001', text: 'What is one thing you ate as a child that you have never been able to find since? Where did you eat it and who made it?', category: 'sensory', dimension: 'early_life', dayOfWeek: 1, minWords: 30, followUp: 'What does that taste remind you of now when you think of it?' },
  { id: 'sense_002', text: 'What is a sound you associate with a specific period of your life? Not music. An everyday sound. What was happening when you heard it?', category: 'sensory', dimension: 'early_life', minWords: 30, followUp: 'When was the last time you heard that sound?' },
  { id: 'sense_003', text: 'What did your hands look like at work? What did you do with them that nobody else did quite the same way?', category: 'sensory', dimension: 'professional_philosophy', dayOfWeek: 2, minWords: 30 },
  { id: 'sense_004', text: 'What smell takes you somewhere specific? Where does it take you and how old are you when you arrive?', category: 'sensory', dimension: 'early_life', minWords: 30 },
  { id: 'sense_005', text: 'What did the kitchen in your childhood home smell like on a cold morning?', category: 'sensory', dimension: 'early_life', minWords: 20 },

  // ── SMALL ORDINARY MOMENTS ──────────────────────────────────────────────────
  { id: 'ordinary_001', text: 'What did you do on a Saturday when you were 12 years old? Walk me through an ordinary Saturday.', category: 'ordinary', dimension: 'early_life', dayOfWeek: 6, minWords: 50 },
  { id: 'ordinary_002', text: 'What was the first thing you did every morning before anyone else was awake?', category: 'ordinary', dimension: 'core_values', minWords: 20 },
  { id: 'ordinary_003', text: 'Describe the route you took to school or work for the longest period of your life. What did you see every day?', category: 'ordinary', dimension: 'early_life', minWords: 40 },
  { id: 'ordinary_004', text: 'What did you eat for lunch most days during your working years? Where did you eat it?', category: 'ordinary', dimension: 'professional_philosophy', minWords: 20 },
  { id: 'ordinary_005', text: 'What was the last thing you did before you went to sleep most nights?', category: 'ordinary', dimension: 'core_values', minWords: 20 },

  // ── BELIEFS AND VALUES ───────────────────────────────────────────────────────
  { id: 'belief_001', text: 'What is something you believed at 30 that you no longer believe? What changed your mind?', category: 'beliefs', dimension: 'core_values', dayOfWeek: 4, minWords: 50 },
  { id: 'belief_002', text: 'What is something most people think is important that you have never cared much about?', category: 'beliefs', dimension: 'core_values', minWords: 40 },
  { id: 'belief_003', text: 'What do you believe about luck? Do people make their own or does it arrive on its own?', category: 'beliefs', dimension: 'core_values', minWords: 40 },
  { id: 'belief_004', text: 'What is something you know to be true that is very hard to explain to someone younger?', category: 'beliefs', dimension: 'wisdom_and_lessons', minWords: 50 },
  { id: 'belief_005', text: 'What did your parents believe about money? Did you inherit that belief or reject it?', category: 'beliefs', dimension: 'approach_to_money', minWords: 50 },

  // ── PEOPLE AND RELATIONSHIPS ─────────────────────────────────────────────────
  { id: 'people_001', text: 'Who is someone from your past who changed how you saw the world? Not a famous person. Someone you actually knew.', category: 'people', dimension: 'approach_to_people', minWords: 60 },
  { id: 'people_002', text: 'Who made you laugh harder than anyone else in your life? What did they do that nobody else did?', category: 'people', dimension: 'approach_to_people', minWords: 40 },
  { id: 'people_003', text: 'Who do you wish you had spent more time with? What stopped you?', category: 'people', dimension: 'fears_and_vulnerabilities', dayOfWeek: 0, minWords: 40 },
  { id: 'people_004', text: 'Describe someone you admired but never told. What did you admire about them?', category: 'people', dimension: 'core_values', minWords: 50 },
  { id: 'people_005', text: 'Who was the most different from you of anyone you have ever been close to? What did that friendship teach you?', category: 'people', dimension: 'approach_to_people', minWords: 60 },

  // ── WORK AND PURPOSE ─────────────────────────────────────────────────────────
  { id: 'work_001', text: 'What is the best day of work you ever had? Not an achievement. A day where everything felt right.', category: 'work', dimension: 'professional_philosophy', minWords: 60 },
  { id: 'work_002', text: 'What is something you were genuinely good at that most people never knew about?', category: 'work', dimension: 'defining_experiences', minWords: 40 },
  { id: 'work_003', text: 'What was the hardest decision you ever made at work? Not the biggest. The hardest.', category: 'work', dimension: 'professional_philosophy', minWords: 60 },
  { id: 'work_004', text: 'What did you know how to do that younger people today would find remarkable?', category: 'work', dimension: 'defining_experiences', minWords: 40 },

  // ── BEAUTY AND WONDER ────────────────────────────────────────────────────────
  { id: 'beauty_001', text: 'What is the most beautiful place you have ever been? Not the most famous. The most beautiful.', category: 'beauty', dimension: 'defining_experiences', dayOfWeek: 5, minWords: 40 },
  { id: 'beauty_002', text: 'What is something you find beautiful that most people walk past without noticing?', category: 'beauty', dimension: 'core_values', minWords: 30 },
  { id: 'beauty_003', text: 'What is a piece of music that puts you somewhere specific? Where does it take you?', category: 'beauty', dimension: 'early_life', minWords: 40 },

  // ── HARD QUESTIONS ───────────────────────────────────────────────────────────
  { id: 'hard_001', text: 'What is something your parents never knew about you? Not because it was a secret. Because they never asked.', category: 'hard', dimension: 'fears_and_vulnerabilities', dayOfWeek: 0, minWords: 50 },
  { id: 'hard_002', text: 'What is something you have carried for years that has gotten lighter with time? What made it lighter?', category: 'hard', dimension: 'fears_and_vulnerabilities', minWords: 60 },
  { id: 'hard_003', text: 'What is a version of yourself that you left behind? What happened to that person?', category: 'hard', dimension: 'defining_experiences', minWords: 60 },
  { id: 'hard_004', text: 'What is something you got wrong that took you a long time to admit?', category: 'hard', dimension: 'wisdom_and_lessons', minWords: 60 },
  { id: 'hard_005', text: 'What is something you are still figuring out?', category: 'hard', dimension: 'fears_and_vulnerabilities', minWords: 30 },

  // ── CULTURAL AND HERITAGE ────────────────────────────────────────────────────
  { id: 'heritage_001', text: 'What did you bring with you from your childhood culture that you have never let go of?', category: 'heritage', dimension: 'core_values', minWords: 50 },
  { id: 'heritage_002', text: 'What tradition did your family have that you have passed on? What tradition did you let end with your generation?', category: 'heritage', dimension: 'relationship_to_family', minWords: 60 },
  { id: 'heritage_003', text: 'What language do you think in? Is it the same language you dream in?', category: 'heritage', dimension: 'early_life', minWords: 30 },
  { id: 'heritage_004', text: 'What did moving to a new place cost you that people who stayed do not understand?', category: 'heritage', dimension: 'defining_experiences', minWords: 60 },

  // ── CONTRIBUTOR SPARKS (about the archive owner) ─────────────────────────────
  { id: 'contrib_001', text: 'What is something {name} did regularly that you found quietly remarkable?', category: 'contributor', dimension: 'core_values', minWords: 40 },
  { id: 'contrib_002', text: 'What would {name} order at a restaurant without looking at the menu?', category: 'contributor', dimension: 'early_life', minWords: 20 },
  { id: 'contrib_003', text: 'What did {name} worry about that they never admitted was a worry?', category: 'contributor', dimension: 'fears_and_vulnerabilities', minWords: 40 },
  { id: 'contrib_004', text: 'What is a phrase {name} used that nobody else says quite the same way?', category: 'contributor', dimension: 'approach_to_people', minWords: 20 },
  { id: 'contrib_005', text: 'What did {name} look like when they were proud of something but trying not to show it?', category: 'contributor', dimension: 'core_values', minWords: 30 },
  { id: 'contrib_006', text: 'What is something {name} taught you that they never sat down and formally taught you?', category: 'contributor', dimension: 'wisdom_and_lessons', minWords: 50 },
  { id: 'contrib_007', text: 'What did {name} do when they were nervous that gave them away?', category: 'contributor', dimension: 'fears_and_vulnerabilities', minWords: 30 },
  { id: 'contrib_008', text: 'What is the funniest thing you remember {name} doing or saying?', category: 'contributor', dimension: 'approach_to_people', minWords: 40 },
]

function getDayOfYear(): number {
  const now   = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

function applyName(text: string, ownerName: string): string {
  return text.replace(/\{name\}/g, ownerName.split(' ')[0])
}

// Returns today's spark for a given context, rotated by day of year.
// Same spark for all archives on the same day (intentional — creates shared rhythm).
export function getTodaysSpark(isContributor: boolean, ownerName = ''): DailySpark | null {
  const today     = new Date()
  const dayOfWeek = today.getDay()
  const dayOfYear = getDayOfYear()

  const candidates = dailySparks.filter(s => {
    if (isContributor  && s.category !== 'contributor') return false
    if (!isContributor && s.category === 'contributor') return false
    if (s.dayOfWeek !== undefined && s.dayOfWeek !== dayOfWeek) return false
    return true
  })

  if (!candidates.length) return null
  const spark = candidates[dayOfYear % candidates.length]
  return spark ? { ...spark, text: applyName(spark.text, ownerName) } : null
}

// Returns the next unanswered spark for a specific user (non-repeating).
export async function getNextUnseenSpark(
  contributorId: string | null,
  archiveId:     string,
  isContributor: boolean,
  ownerName:     string,
): Promise<DailySpark | null> {
  const { data: answered } = await supabaseAdmin
    .from('daily_spark_responses')
    .select('spark_id')
    .eq('archive_id', archiveId)
    .eq(isContributor && contributorId ? 'contributor_id' : 'is_owner', isContributor && contributorId ? contributorId : true)

  const answeredIds = (answered ?? []).map(a => a.spark_id)

  const unanswered = dailySparks.filter(s =>
    !answeredIds.includes(s.id) &&
    (isContributor ? s.category === 'contributor' : s.category !== 'contributor')
  )

  if (!unanswered.length) return null
  return { ...unanswered[0], text: applyName(unanswered[0].text, ownerName) }
}
