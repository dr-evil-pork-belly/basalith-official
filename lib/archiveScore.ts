// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function calculateArchiveScore(
  archive: any,
  photographs: any[],
  labels: any[],
  contributors: any[],
  decades: any[],
  ownerDeposits: any[]
): { score: number; breakdown: Record<string, unknown>; label: string } {

  let score = 0
  const breakdown: Record<string, unknown> = {}

  // Photographs labeled (max 25 points)
  const labeledCount = photographs.filter(p => p.status === 'labelled').length
  const photoScore   = Math.min(Math.floor(labeledCount / 2), 25)
  breakdown.photographs = {
    score: photoScore,
    max:   25,
    count: labeledCount,
    next:  `Label ${Math.max(0, (photoScore + 1) * 2 - labeledCount)} more photographs for +1 point`,
  }
  score += photoScore

  // Decade coverage (max 20 points)
  const decadesWithPhotos = decades.filter(d => d.photo_count > 0).length
  const decadeScore       = decadesWithPhotos * 2
  breakdown.decades = {
    score:   decadeScore,
    max:     20,
    covered: decadesWithPhotos,
    total:   10,
    next:    decadesWithPhotos < 10
      ? 'Add photographs from an uncovered decade for +2 points'
      : 'All decades covered',
  }
  score += decadeScore

  // Active contributors (max 15 points)
  const activeContributors = contributors.filter(c => c.status === 'active').length
  const contributorScore   = Math.min(activeContributors * 3, 15)
  breakdown.contributors = {
    score: contributorScore,
    max:   15,
    count: activeContributors,
    next:  activeContributors < 5
      ? 'Invite another contributor for +3 points'
      : 'Maximum contributor bonus reached',
  }
  score += contributorScore

  // Owner deposits (max 25 points)
  const depositScore = Math.min(ownerDeposits.length * 2, 25)
  breakdown.ownerDeposits = {
    score: depositScore,
    max:   25,
    count: ownerDeposits.length,
    next:  `Add ${Math.max(0, Math.ceil((depositScore + 2) / 2) - ownerDeposits.length)} more of your own memories for +2 points`,
  }
  score += depositScore

  // Consistency streak (max 15 points)
  const streakScore = Math.min(Math.floor((archive.current_streak || 0) / 3), 15)
  breakdown.streak = {
    score: streakScore,
    max:   15,
    days:  archive.current_streak || 0,
    next:  `Maintain your streak for ${Math.max(0, ((streakScore + 1) * 3) - (archive.current_streak || 0))} more days for +1 point`,
  }
  score += streakScore

  // Use labels count if no photographs data available
  void labels

  const finalScore = Math.min(score, 100)

  const milestoneLabel =
    finalScore >= 90 ? 'A living legacy'    :
    finalScore >= 75 ? 'A serious archive'  :
    finalScore >= 60 ? 'Taking shape'       :
    finalScore >= 40 ? 'Growing'            :
    finalScore >= 20 ? 'Just beginning'     :
                       'Waiting to begin'

  return { score: finalScore, breakdown, label: milestoneLabel }
}
