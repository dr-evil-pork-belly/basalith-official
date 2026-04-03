export const DIMENSIONS = [
  {
    id:          'professional_philosophy',
    label:       'Professional Philosophy',
    description: 'How you think about work, leadership, and building things',
    keywords:    ['work','business','career','leadership','build','company','professional','job','success','failure','money','finance'],
  },
  {
    id:          'relationship_to_family',
    label:       'Relationship to Family',
    description: 'How you think about family, love, and belonging',
    keywords:    ['family','mother','father','children','kids','parent','love','marriage','wife','husband','son','daughter','grandchildren','home'],
  },
  {
    id:          'core_values',
    label:       'Core Values',
    description: 'What you believe most deeply about how to live',
    keywords:    ['believe','value','principle','important','truth','honest','integrity','right','wrong','moral','character','person'],
  },
  {
    id:          'defining_experiences',
    label:       'Defining Experiences',
    description: 'The moments that shaped who you became',
    keywords:    ['experience','moment','remember','happened','year','time','when','life','changed','turned','point','crisis','opportunity','decision'],
  },
  {
    id:          'wisdom_and_lessons',
    label:       'Wisdom and Lessons',
    description: 'What you know now that you wish you had known earlier',
    keywords:    ['learn','lesson','wisdom','know','advice','younger','wish','would','should','mistake','regret','teach','understand','realize','discover'],
  },
  {
    id:          'approach_to_people',
    label:       'Approach to People',
    description: 'How you read people and build relationships',
    keywords:    ['people','trust','friend','relationship','person','human','connect','understand','judge','character','community','team'],
  },
  {
    id:          'approach_to_money',
    label:       'Approach to Money',
    description: 'What money means to you and how you think about it',
    keywords:    ['money','wealth','financial','invest','save','spend','rich','poor','afford','cost','worth','income','asset','debt'],
  },
  {
    id:          'early_life',
    label:       'Early Life',
    description: 'Where you came from and what formed you',
    keywords:    ['child','young','grow','childhood','school','early','first','begin','start','origin','poor','rich','neighborhood','city','town'],
  },
  {
    id:          'spiritual_beliefs',
    label:       'Spiritual Beliefs',
    description: 'What you believe about meaning, purpose, and faith',
    keywords:    ['believe','faith','god','spirit','meaning','purpose','why','death','life','soul','universe','prayer','religion','church','sacred'],
  },
  {
    id:          'fears_and_vulnerabilities',
    label:       'Fears and Vulnerabilities',
    description: 'What you are afraid of and where you feel most human',
    keywords:    ['fear','afraid','worry','anxious','scared','vulnerable','weak','fail','lose','alone','uncertain','doubt','risk','concern'],
  },
] as const

export type Dimension = typeof DIMENSIONS[number]

export function calculateDimensionScore(
  dimension: Dimension,
  deposits: any[],
  conversations: any[],
  labels: any[],
): number {
  let score = 0
  const keywords = dimension.keywords as readonly string[]

  // Owner deposits — max 60 points
  const relevantDeposits = deposits.filter(d => {
    const text = (d.response || '').toLowerCase()
    return keywords.some(k => text.includes(k))
  })
  score += Math.min(relevantDeposits.length * 12, 60)

  // Accurate entity conversations — max 25 points
  const accurateConversations = conversations.filter(
    c => c.role === 'entity' && c.accuracy_rating === 'accurate'
  )
  score += Math.min(accurateConversations.length * 5, 25)

  // Family labels — max 15 points
  const relevantLabels = labels.filter(l => {
    const text = ((l.what_was_happening || '') + (l.legacy_note || '')).toLowerCase()
    return keywords.some(k => text.includes(k))
  })
  score += Math.min(relevantLabels.length * 3, 15)

  return Math.min(score, 100)
}

export function getEntityDepthLabel(overallScore: number): string {
  if (overallScore >= 80) return 'Speaking with authority'
  if (overallScore >= 60) return 'Speaking with depth'
  if (overallScore >= 40) return 'Taking shape'
  if (overallScore >= 20) return 'Still learning'
  return 'Just beginning'
}

export function getTopImprovements(
  dimensions: Array<{ dimension: Dimension; score: number }>,
): string[] {
  const sorted = [...dimensions].sort((a, b) => a.score - b.score)
  return sorted.slice(0, 3).map(d => {
    if (d.score === 0)  return `Start a deposit about ${d.dimension.label.toLowerCase()}`
    if (d.score < 30)  return `Add more to ${d.dimension.label.toLowerCase()} in your entity chat`
    return `Deepen your ${d.dimension.label.toLowerCase()} with specific memories`
  })
}
