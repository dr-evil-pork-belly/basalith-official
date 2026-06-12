import './load-env'

/**
 * One-time seed that inserts the approved elicitation_questions bank
 * (db/seed-elicitation-questions.sql, Blocks 1 and 2) via supabaseAdmin,
 * bypassing the Supabase SQL editor.
 *
 * This script is NOT imported by app code and does not run automatically.
 * It is meant to be run by hand, once, from the command line.
 *
 * Dry run (default, writes nothing):
 *   npx tsx scripts/seed-questions.ts
 *
 * Commit (inserts any question whose text is not already present):
 *   npx tsx scripts/seed-questions.ts --commit
 *
 * Idempotent: any row whose `text` already exists in elicitation_questions
 * is skipped, so re-running after a partial commit is safe.
 */

import { supabaseAdmin } from '../lib/supabase-admin'

const COMMIT = process.argv.includes('--commit')

type Tier = 'onramp' | 'standard' | 'deep'

interface SeedQuestion {
  slug: string
  tier: Tier
  text: string
}

// ── Block 1: 40 onramp prompts (db/seed-elicitation-questions.sql) ──────────
const ONRAMP_QUESTIONS: SeedQuestion[] = [
  { slug: 'senses',    tier: 'onramp', text: 'What did your home smell like when you were a child?' },
  { slug: 'joy',       tier: 'onramp', text: 'Tell me about a meal you made so many times you stopped needing a recipe.' },
  { slug: 'work',      tier: 'onramp', text: 'What is something small you do every day that no one would notice if you stopped?' },
  { slug: 'people',    tier: 'onramp', text: 'Describe what a normal Sunday looked like when the house was busiest.' },
  { slug: 'adversity', tier: 'onramp', text: 'What is something you were afraid of that turned out to be nothing?' },
  { slug: 'people',    tier: 'onramp', text: 'Tell me about a person you saw regularly but never really knew, like a neighbor or a shopkeeper.' },
  { slug: 'senses',    tier: 'onramp', text: 'What is a sound that immediately takes you somewhere else?' },
  { slug: 'joy',       tier: 'onramp', text: 'Describe the best weather you have ever been in.' },
  { slug: 'senses',    tier: 'onramp', text: 'What did you drink first thing in the morning, and how did you make it?' },
  { slug: 'senses',    tier: 'onramp', text: 'Describe a walk you have taken so many times you could do it with your eyes closed.' },
  { slug: 'senses',    tier: 'onramp', text: 'What could you see from the window of a kitchen you spent a lot of time in?' },
  { slug: 'work',      tier: 'onramp', text: 'What does your handwriting look like, and has it changed over the years?' },
  { slug: 'joy',       tier: 'onramp', text: 'What is a song you know every word to without trying?' },
  { slug: 'work',      tier: 'onramp', text: 'What did you usually eat for lunch on an ordinary workday?' },
  { slug: 'origins',   tier: 'onramp', text: 'What kind of shoes did you wear as a kid, and where did they take you?' },
  { slug: 'joy',       tier: 'onramp', text: 'Where in your home do you sit when you want to feel settled?' },
  { slug: 'senses',    tier: 'onramp', text: 'What was usually playing in the background at home, on the radio or the television?' },
  { slug: 'work',      tier: 'onramp', text: 'What is a small task you only do at a certain time of year?' },
  { slug: 'people',    tier: 'onramp', text: 'What is a phrase you picked up from someone and still say today?' },
  { slug: 'joy',       tier: 'onramp', text: 'What time of day is quietest for you, and what do you do with it?' },
  { slug: 'senses',    tier: 'onramp', text: 'What is something you always keep in the kitchen, no matter what?' },
  { slug: 'senses',    tier: 'onramp', text: 'What is a kind of weather that brings a specific day back to you?' },
  { slug: 'work',      tier: 'onramp', text: 'What do your hands do when they are busy and your mind wanders?' },
  { slug: 'origins',   tier: 'onramp', text: 'What sounds could you hear through the walls or windows where you grew up?' },
  { slug: 'work',      tier: 'onramp', text: 'What did your first job smell like?' },
  { slug: 'joy',       tier: 'onramp', text: 'Describe a cup or mug you have used for years.' },
  { slug: 'joy',       tier: 'onramp', text: 'What did the last hour before bed look like in your house?' },
  { slug: 'senses',    tier: 'onramp', text: 'What is a shortcut or back way you take that most people do not know about?' },
  { slug: 'joy',       tier: 'onramp', text: 'What did weekend breakfast look like when you were younger?' },
  { slug: 'senses',    tier: 'onramp', text: 'Describe a drive you have made hundreds of times.' },
  { slug: 'work',      tier: 'onramp', text: 'What is something around the house you have learned to fix yourself?' },
  { slug: 'senses',    tier: 'onramp', text: 'What is a smell that tells you a season has changed?' },
  { slug: 'senses',    tier: 'onramp', text: 'Where is a place you have spent a lot of time waiting?' },
  { slug: 'joy',       tier: 'onramp', text: 'Is there a chair or a seat that everyone knows is yours?' },
  { slug: 'senses',    tier: 'onramp', text: 'What does the light look like in your home early in the morning?' },
  { slug: 'joy',       tier: 'onramp', text: 'What is something small you have ended up collecting without meaning to?' },
  { slug: 'people',    tier: 'onramp', text: 'Whose voice could you recognize instantly, even in a crowd?' },
  { slug: 'work',      tier: 'onramp', text: 'What is an errand you run on the same day most weeks?' },
  { slug: 'senses',    tier: 'onramp', text: 'What does rain sound like on the roof of a place you have lived?' },
  { slug: 'joy',       tier: 'onramp', text: 'Describe an ordinary day that you would happily live again.' },
]

// ── Block 2: 64 new questions, 44 standard + 20 deep ────────────────────────
const NEW_QUESTIONS: SeedQuestion[] = [
  // origins / standard
  { slug: 'origins', tier: 'standard', text: 'What is the earliest home you remember, and what was one room in it like?' },
  { slug: 'origins', tier: 'standard', text: 'Who lived in your house when you were growing up?' },
  { slug: 'origins', tier: 'standard', text: 'What did the street outside your childhood home look like?' },
  { slug: 'origins', tier: 'standard', text: 'What is a meal that always reminds you of being young?' },
  { slug: 'origins', tier: 'standard', text: 'What did your parents do for work, and what did you learn watching them?' },
  { slug: 'origins', tier: 'standard', text: 'What is a story your family told over and over?' },
  // origins / deep
  { slug: 'origins', tier: 'deep', text: 'Why do you think your family did things the way they did?' },
  { slug: 'origins', tier: 'deep', text: 'What is something about how you were raised that you carried into your own life, and why did it stick?' },

  // people / standard
  { slug: 'people', tier: 'standard', text: 'Tell me about a friend you have known for a very long time.' },
  { slug: 'people', tier: 'standard', text: 'Who is someone who made you feel welcome when you needed it?' },
  { slug: 'people', tier: 'standard', text: 'Describe a person in your family who was hard to figure out.' },
  { slug: 'people', tier: 'standard', text: 'Tell me about someone you used to see often but have lost touch with.' },
  // people / deep
  { slug: 'people', tier: 'deep', text: 'Think of someone you have stayed close to for decades. Why do you think that friendship lasted when others did not?' },
  { slug: 'people', tier: 'deep', text: 'What did someone in your life teach you about how to treat people, and why does it still matter to you?' },

  // work / standard
  { slug: 'work', tier: 'standard', text: 'What was the first job you ever had, and what did a normal day look like?' },
  { slug: 'work', tier: 'standard', text: 'Tell me about a skill you picked up on the job that nobody taught you in school.' },
  { slug: 'work', tier: 'standard', text: 'Describe a workplace you spent a lot of time in.' },
  { slug: 'work', tier: 'standard', text: 'What is a tool or piece of equipment you got really good at using?' },
  // work / deep
  { slug: 'work', tier: 'deep', text: 'Why did you choose the kind of work you did?' },
  { slug: 'work', tier: 'deep', text: 'What is something about how you work that you think came from one specific experience?' },

  // decisions / standard
  { slug: 'decisions', tier: 'standard', text: 'Tell me about a time you had to choose between two places to live.' },
  { slug: 'decisions', tier: 'standard', text: 'Describe a decision that took you a long time to make.' },
  { slug: 'decisions', tier: 'standard', text: 'What is something you decided not to do, and what happened instead?' },
  { slug: 'decisions', tier: 'standard', text: 'Tell me about a purchase you thought hard about before making.' },
  // decisions / deep
  { slug: 'decisions', tier: 'deep', text: 'Think of a decision you would make again exactly the same way. What made it right?' },
  { slug: 'decisions', tier: 'deep', text: 'What is a choice you made that changed the direction of your life, and why did you make it?' },

  // values / standard
  { slug: 'values', tier: 'standard', text: 'What is a rule you have always followed, even when it was inconvenient?' },
  { slug: 'values', tier: 'standard', text: 'Tell me about something you refuse to do, no matter what.' },
  { slug: 'values', tier: 'standard', text: 'Describe a time you stood up for something small but important to you.' },
  { slug: 'values', tier: 'standard', text: 'What is something you were taught to never waste?' },
  // values / deep
  { slug: 'values', tier: 'deep', text: 'What is a belief you have actually tested in your own life? What convinced you it was right?' },
  { slug: 'values', tier: 'deep', text: 'Where did your sense of right and wrong come from? Name a person or a moment that shaped it.' },

  // adversity / standard
  { slug: 'adversity', tier: 'standard', text: 'Tell me about a time things did not go the way you planned.' },
  { slug: 'adversity', tier: 'standard', text: 'Describe a period when money was tight.' },
  { slug: 'adversity', tier: 'standard', text: 'What is something that scared you that you had to do anyway?' },
  { slug: 'adversity', tier: 'standard', text: 'Tell me about a time you had to start over.' },
  // adversity / deep
  { slug: 'adversity', tier: 'deep', text: 'When life knocked you down, what did you reach for first to get back up?' },
  { slug: 'adversity', tier: 'deep', text: 'What is something a hard time taught you that an easy time never could?' },

  // joy / standard
  { slug: 'joy', tier: 'standard', text: 'Tell me about a day that felt easy and good for no special reason.' },
  { slug: 'joy', tier: 'standard', text: 'What is something that always makes you laugh?' },
  { slug: 'joy', tier: 'standard', text: 'Describe a place that makes you feel calm just thinking about it.' },
  { slug: 'joy', tier: 'standard', text: 'Tell me about a small thing you look forward to.' },
  // joy / deep
  { slug: 'joy', tier: 'deep', text: 'What is something simple that reliably makes you happy? Why do you think it works on you every time?' },
  { slug: 'joy', tier: 'deep', text: 'What makes a day feel well spent to you, and why that instead of something else?' },

  // senses / standard
  { slug: 'senses', tier: 'standard', text: 'What is a smell that brings back a specific memory?' },
  { slug: 'senses', tier: 'standard', text: 'Describe a sound you have not heard in years but would recognize instantly.' },
  { slug: 'senses', tier: 'standard', text: 'What does the air feel like in a place you love?' },
  { slug: 'senses', tier: 'standard', text: 'Tell me about a texture you find satisfying to touch.' },
  // senses / deep
  { slug: 'senses', tier: 'deep', text: 'What is a smell or sound from years ago that has never left you? Why do you think it stayed?' },
  { slug: 'senses', tier: 'deep', text: 'What do you notice that other people seem to walk right past?' },

  // worldview / standard
  { slug: 'worldview', tier: 'standard', text: 'Tell me about something that surprised you about how the world actually works.' },
  { slug: 'worldview', tier: 'standard', text: 'Describe a time your opinion about something changed.' },
  { slug: 'worldview', tier: 'standard', text: 'What is something you used to believe as a kid that you do not believe anymore?' },
  { slug: 'worldview', tier: 'standard', text: 'Tell me about a place you visited that changed how you saw things.' },
  { slug: 'worldview', tier: 'standard', text: 'What is some advice people give all the time that you would never give?' },
  { slug: 'worldview', tier: 'standard', text: 'What has changed in your lifetime that nobody seems to talk about?' },
  // worldview / deep
  { slug: 'worldview', tier: 'deep', text: 'What is an opinion you held for years and then dropped? What changed your mind?' },
  { slug: 'worldview', tier: 'deep', text: 'What is something you think most people get wrong, and why do you see it differently?' },

  // forward / standard
  { slug: 'forward', tier: 'standard', text: 'What is something you hope stays the same for the people who come after you?' },
  { slug: 'forward', tier: 'standard', text: 'Tell me about a habit you hope someone else picks up from you.' },
  { slug: 'forward', tier: 'standard', text: 'What is something you would want someone to know about you, even if they only had a few minutes?' },
  { slug: 'forward', tier: 'standard', text: 'Describe a place you would want someone you love to visit someday.' },
  // forward / deep
  { slug: 'forward', tier: 'deep', text: 'What do you want to be remembered for, and why that instead of everything else?' },
  { slug: 'forward', tier: 'deep', text: 'What is something you have not said to someone that you find yourself thinking about saying?' },
]

const ALL_QUESTIONS: SeedQuestion[] = [...ONRAMP_QUESTIONS, ...NEW_QUESTIONS]

async function fetchAllRows<T>(
  table: string,
  columns: string,
  applyFilter?: (query: any) => any,
): Promise<T[]> {
  const pageSize = 1000
  let from = 0
  const rows: T[] = []

  for (;;) {
    let query = supabaseAdmin.from(table).select(columns)
    if (applyFilter) query = applyFilter(query)
    const { data, error } = await query.range(from, from + pageSize - 1)

    if (error) {
      console.error(`ERROR fetching from ${table}: ${error.message}`)
      process.exit(1)
    }
    if (!data || data.length === 0) break

    rows.push(...(data as unknown as T[]))
    if (data.length < pageSize) break
    from += pageSize
  }

  return rows
}

async function main() {
  console.log(`-- ${COMMIT ? 'COMMIT' : 'DRY RUN'} -----------------------------------------------\n`)

  // Resolve cognitive_domains slug -> id (scope b2c).
  const domains = await fetchAllRows<{ id: number; slug: string }>(
    'cognitive_domains',
    'id, slug',
    query => query.eq('scope', 'b2c'),
  )
  const slugToId = new Map(domains.map(d => [d.slug, d.id]))

  const missingSlugs = [...new Set(ALL_QUESTIONS.map(q => q.slug))].filter(slug => !slugToId.has(slug))
  if (missingSlugs.length > 0) {
    console.error(`ERROR: missing cognitive_domains rows (scope=b2c) for slug(s): ${missingSlugs.join(', ')}`)
    process.exit(1)
  }

  // Existing question rows, for idempotency.
  const existing = await fetchAllRows<{ id: number; text: string }>('elicitation_questions', 'id, text')
  const existingTexts = new Set(existing.map(r => r.text))

  // Some existing rows carry whitespace artifacts (e.g. a literal \r\n from an
  // earlier paste into the SQL editor) that make them differ from the clean
  // approved text byte-for-byte while reading as the same question. Match
  // those on normalized (collapsed-whitespace) text and repair in place,
  // rather than inserting a clean duplicate.
  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim()
  const normalizedToExisting = new Map(existing.map(r => [normalize(r.text), r]))

  const toInsert: { scope: 'b2c'; domain_id: number; tier: Tier; text: string }[] = []
  const toFix:    { id: number; oldText: string; newText: string }[] = []
  const insertedByTier: Record<Tier, number> = { onramp: 0, standard: 0, deep: 0 }
  const skippedByTier:  Record<Tier, number> = { onramp: 0, standard: 0, deep: 0 }
  const fixedByTier:    Record<Tier, number> = { onramp: 0, standard: 0, deep: 0 }

  for (const q of ALL_QUESTIONS) {
    if (existingTexts.has(q.text)) {
      skippedByTier[q.tier] += 1
      continue
    }
    const normMatch = normalizedToExisting.get(normalize(q.text))
    if (normMatch) {
      toFix.push({ id: normMatch.id, oldText: normMatch.text, newText: q.text })
      fixedByTier[q.tier] += 1
      continue
    }
    toInsert.push({ scope: 'b2c', domain_id: slugToId.get(q.slug)!, tier: q.tier, text: q.text })
    insertedByTier[q.tier] += 1
  }

  console.log('Per-tier counts (this run):')
  for (const tier of ['onramp', 'standard', 'deep'] as Tier[]) {
    console.log(`  ${tier.padEnd(8)} insert: ${insertedByTier[tier]}  fix: ${fixedByTier[tier]}  skip (already present): ${skippedByTier[tier]}`)
  }
  console.log(`\nTotal to insert: ${toInsert.length}`)
  console.log(`Total to fix:    ${toFix.length}`)
  console.log(`Total skipped:   ${ALL_QUESTIONS.length - toInsert.length - toFix.length}\n`)

  for (const f of toFix) {
    console.log(`would fix id ${f.id}:`)
    console.log(`  old: ${JSON.stringify(f.oldText)}`)
    console.log(`  new: ${JSON.stringify(f.newText)}`)
  }
  if (toFix.length > 0) console.log('')

  if (!COMMIT) {
    console.log('This was a dry run. No rows were inserted or fixed.')
    console.log('Re-run with --commit to apply.\n')
    return
  }

  for (const f of toFix) {
    const { error } = await supabaseAdmin
      .from('elicitation_questions')
      .update({ text: f.newText })
      .eq('id', f.id)
    if (error) {
      console.error(`ERROR fixing elicitation_questions id ${f.id}: ${error.message}`)
      process.exit(1)
    }
  }
  if (toFix.length > 0) console.log(`Fixed ${toFix.length} row(s).\n`)

  if (toInsert.length > 0) {
    const { error } = await supabaseAdmin.from('elicitation_questions').insert(toInsert)
    if (error) {
      console.error(`ERROR inserting elicitation_questions: ${error.message}`)
      process.exit(1)
    }
    console.log(`Inserted ${toInsert.length} row(s).\n`)
  } else {
    console.log('Nothing to insert.\n')
  }

  const finalCounts = await fetchAllRows<{ tier: Tier }>('elicitation_questions', 'tier')
  const tally: Record<string, number> = {}
  for (const row of finalCounts) tally[row.tier] = (tally[row.tier] ?? 0) + 1

  console.log('-- Final tier counts -----------------------------------------\n')
  for (const tier of Object.keys(tally).sort()) {
    console.log(`  ${tier.padEnd(8)} ${tally[tier]}`)
  }
  console.log('\nExpected: deep 20, onramp 40, standard 44\n')
}

main().catch(err => {
  console.error('Seed error:', err instanceof Error ? err.message : err)
  process.exit(1)
})
