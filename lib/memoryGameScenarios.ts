import { supabaseAdmin } from './supabase-admin'

export const scenarioTemplates = [
  {
    id:        'miss_most',
    type:      'perspective',
    template:  '{name} left {place} and moved to {destination}. What do you think they missed most in their first year away?',
    dimension: 'defining_experiences',
  },
  {
    id:        'proudest_moment',
    type:      'perspective',
    template:  'If you asked {name} what they were most proud of in their life — what do you think they would say? Not what they should say. What they actually would.',
    dimension: 'core_values',
  },
  {
    id:        'hardest_year',
    type:      'perspective',
    template:  "Which year of {name}'s life do you think was the hardest? What makes you think that?",
    dimension: 'defining_experiences',
  },
  {
    id:        'morning_routine',
    type:      'sensory',
    template:  "{name}'s morning routine as you remember it. What did they do first? What were they like before the day started?",
    dimension: 'early_life',
  },
  {
    id:        'relationship_advice',
    type:      'wisdom',
    template:  'What advice do you think {name} would give a young person starting out today? Based on what you know of how they lived — not what they said.',
    dimension: 'wisdom_and_lessons',
  },
  {
    id:        'secret_talent',
    type:      'character',
    template:  "What could {name} do that most people did not know about? A skill, an ability, a knowledge — something they were quietly good at.",
    dimension: 'defining_experiences',
  },
  {
    id:        'relationship_to_age',
    type:      'wisdom',
    template:  'How did {name} feel about getting older? What did they say about it? What did they show about it that they did not say?',
    dimension: 'fears_and_vulnerabilities',
  },
  {
    id:        'defining_decade',
    type:      'perspective',
    template:  "Which decade of {name}'s life do you think shaped them the most? What happened during that time?",
    dimension: 'defining_experiences',
  },
  {
    id:        'relationship_to_home',
    type:      'sensory',
    template:  'What did home mean to {name}? Not a place — the feeling. What made somewhere feel like home to them?',
    dimension: 'relationship_to_family',
  },
  {
    id:        'unspoken_rule',
    type:      'character',
    template:  "What was an unspoken rule in {name}'s world? Something everyone around them understood without being told?",
    dimension: 'core_values',
  },
]

export async function generateGameScenario(
  archiveId:         string,
  ownerName:         string,
  ownerBirthplace?:  string,
  ownerCurrentCity?: string,
): Promise<{
  text:       string
  type:       string
  dimension:  string
  templateId: string
}> {
  // Get already-used template IDs for this archive
  const { data: used } = await supabaseAdmin
    .from('memory_game_sessions')
    .select('metadata')
    .eq('archive_id', archiveId)
    .eq('game_type', 'story')

  const usedIds = new Set((used ?? []).map(u => (u.metadata as Record<string, string>)?.templateId).filter(Boolean))

  const available = scenarioTemplates.filter(t => !usedIds.has(t.id))

  // All templates exhausted — pick any randomly
  const pool      = available.length > 0 ? available : scenarioTemplates
  const template  = pool[Math.floor(Math.random() * pool.length)]
  const firstName = ownerName.split(' ')[0]

  const text = template.template
    .replace(/\{name\}/g, firstName)
    .replace(/\{place\}/g,       ownerBirthplace  ?? 'their hometown')
    .replace(/\{destination\}/g, ownerCurrentCity ?? 'a new city')

  return {
    text,
    type:       template.type,
    dimension:  template.dimension,
    templateId: template.id,
  }
}
