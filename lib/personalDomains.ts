/**
 * The personal coverage taxonomy: eight kinds of judgment, one life.
 *
 * WHY THESE EIGHT. The owner of the first personal archive said his life is one
 * mural with no line between the business half and the rest. So the personal
 * map does not partition a life into spheres (work, family, faith, money) and
 * probe each one. It partitions by KIND OF JUDGMENT, exactly as the business
 * map does, and lets each probe land at home or at work. Family shows up inside
 * every kind rather than as a ninth box, because the question is never "what
 * did you decide about family," it is "how do you decide," with family usually
 * in the room.
 *
 * The eight slots are the same eight the business map uses (lib/b2bDomains.ts),
 * in the same order. Four keep their name. Four take a sphere-neutral name
 * where the business word would be wrong for a family: Capital is Money,
 * Culture is Standards, Strategy is Direction, Succession is Legacy. The
 * descriptions are written for a life. Renaming the business four to match is
 * a separate decision and a wider change (b2b_questions, the succession
 * dashboard, the state doc), so it is not done here.
 *
 * These names are stored in archive_coverage.domain for personal runs. Do not
 * rename one without bumping PERSONAL_PROBE_SET_VERSION in
 * lib/coverageProbesPersonal.ts, because a reading under one name is not
 * comparable to a reading under another.
 */

export type PersonalDomain = {
  name:        string
  description: string
  order:       number
}

export const PERSONAL_DOMAINS: PersonalDomain[] = [
  { name: 'Decision-Making', description: 'how you make the call when you cannot know enough',            order: 1 },
  { name: 'People',          description: 'how you read people, who you trust, and when you step back',   order: 2 },
  { name: 'Risk',            description: 'what you bet on and what you walk away from',                  order: 3 },
  { name: 'Money',           description: 'how you spend, save, give, and when you hold',                 order: 4 },
  { name: 'Standards',       description: 'the lines you hold and what you do when one is crossed',       order: 5 },
  { name: 'Direction',       description: 'where you put your years and what you say no to',              order: 6 },
  { name: 'Adversity',       description: 'how you act when things break',                                order: 7 },
  { name: 'Legacy',          description: 'what you want carried forward, and what you would change',     order: 8 },
]
