import { supabaseAdmin } from './supabase-admin'

export const storyPrompts = {
  childhood_memory: [
    {
      id:       'child_food',
      text:     'What is the earliest memory you have of {name} that involves food? A meal they made. A restaurant they loved. Something they ate that surprised you.',
      dimension: 'early_life',
      minWords: 50,
    },
    {
      id:       'child_home',
      text:     "Describe {name}'s home the way you first remember it. Not the furniture — the feeling of being there.",
      dimension: 'early_life',
      minWords: 50,
    },
    {
      id:       'child_laugh',
      text:     'What made {name} laugh? Not just smile. Actually laugh. Describe a specific moment if you can.',
      dimension: 'approach_to_people',
      minWords: 40,
    },
  ],
  work_purpose: [
    {
      id:       'work_pride',
      text:     "What did {name} do at work that nobody outside their world would understand or appreciate? What were they quietly proud of?",
      dimension: 'professional_philosophy',
      minWords: 60,
    },
    {
      id:       'work_style',
      text:     'How did {name} handle a difficult situation at work? Not the specifics — the style. How did they move through professional difficulty?',
      dimension: 'professional_philosophy',
      minWords: 60,
    },
  ],
  character: [
    {
      id:       'char_pressure',
      text:     'Describe a moment when {name} handled something difficult in a way that surprised you. Not what happened. How they handled it.',
      dimension: 'core_values',
      minWords: 70,
    },
    {
      id:       'char_phrase',
      text:     "What is something {name} always said that other people do not say? A phrase. A word. A specific expression that was completely theirs.",
      dimension: 'approach_to_people',
      minWords: 30,
    },
    {
      id:       'char_taught',
      text:     'What did {name} teach you without ever intending to teach you? Something you learned just from watching them.',
      dimension: 'wisdom_and_lessons',
      minWords: 60,
    },
  ],
  sensory: [
    {
      id:       'sense_smell',
      text:     "What did {name}'s home smell like at a specific time of year? What sounds do you associate with being around them?",
      dimension: 'early_life',
      minWords: 40,
    },
    {
      id:       'sense_hands',
      text:     "Describe {name}'s hands. What did they do with their hands? What do you associate with how they used them?",
      dimension: 'defining_experiences',
      minWords: 40,
    },
  ],
  unfinished: [
    {
      id:       'untold_story',
      text:     'What is a story about {name} that you have never told anyone? Not because it is a secret. Because nobody ever asked.',
      dimension: 'defining_experiences',
      minWords: 80,
    },
    {
      id:       'never_said',
      text:     'What is something {name} never said but you always knew they felt? What made you sure of it?',
      dimension: 'fears_and_vulnerabilities',
      minWords: 60,
    },
    {
      id:       'regret',
      text:     'What do you think {name} wished they had done differently? You do not need to be certain. Just honest.',
      dimension: 'fears_and_vulnerabilities',
      minWords: 60,
    },
  ],
  relationship: [
    {
      id:       'rel_conflict',
      text:     'Describe a disagreement you had with {name}. Not the content of the argument — how they argued. What was their style when they disagreed?',
      dimension: 'approach_to_people',
      minWords: 60,
    },
    {
      id:       'rel_proud',
      text:     'What do you think {name} was most proud of in their relationship with you? What would they have said if you had asked them directly?',
      dimension: 'relationship_to_family',
      minWords: 60,
    },
  ],
  wisdom: [
    {
      id:       'wisdom_money',
      text:     'What did {name} believe about money that came from growing up when they did? What shaped that belief?',
      dimension: 'approach_to_money',
      minWords: 60,
    },
    {
      id:       'wisdom_advice',
      text:     'What advice did {name} give you that you did not understand at the time but understand now?',
      dimension: 'wisdom_and_lessons',
      minWords: 60,
    },
    {
      id:       'wisdom_fear',
      text:     'What was {name} afraid of that they tried not to show? How did you know?',
      dimension: 'fears_and_vulnerabilities',
      minWords: 60,
    },
  ],
}

export type StoryPrompt = {
  id:        string
  text:      string
  dimension: string
  minWords:  number
}

export type ResolvedPrompt = {
  promptId:  string
  text:      string
  dimension: string
  minWords:  number
}

// Flat list of all prompts
export function getAllPrompts(): StoryPrompt[] {
  return Object.values(storyPrompts).flat()
}

// Replace {name} placeholder
export function resolvePromptText(text: string, ownerName: string): string {
  const firstName = ownerName.split(' ')[0]
  return text.replace(/\{name\}/g, firstName)
}

// Get next unanswered prompt for a contributor, prioritising weak dimensions
export async function getNextStoryPrompt(
  contributorId:      string,
  archiveId:          string,
  ownerName:          string,
  weakestDimensions:  string[],
): Promise<ResolvedPrompt | null> {
  const { data: answered } = await supabaseAdmin
    .from('contributor_story_prompts')
    .select('prompt_id')
    .eq('contributor_id', contributorId)

  const answeredIds = new Set((answered ?? []).map(a => a.prompt_id))

  const all = getAllPrompts()

  const prioritised = [
    ...all.filter(p => weakestDimensions.includes(p.dimension) && !answeredIds.has(p.id)),
    ...all.filter(p => !weakestDimensions.includes(p.dimension) && !answeredIds.has(p.id)),
  ]

  if (prioritised.length === 0) return null

  const prompt = prioritised[0]
  return {
    promptId:  prompt.id,
    text:      resolvePromptText(prompt.text, ownerName),
    dimension: prompt.dimension,
    minWords:  prompt.minWords,
  }
}

// Get the weakest entity dimensions for an archive
export async function getWeakestDimensions(archiveId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('entity_accuracy')
    .select('dimension, score')
    .eq('archive_id', archiveId)
    .order('score', { ascending: true })
    .limit(3)

  return (data ?? []).map(d => d.dimension).filter(Boolean)
}
