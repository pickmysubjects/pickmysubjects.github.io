/** Average mark needed over the remaining points to reach `target`. */
export function neededAverage(wam: number, donePoints: number, target: number, remainingPoints: number): number | null {
  if (remainingPoints <= 0) return null
  const raw = (target * (donePoints + remainingPoints) - wam * donePoints) / remainingPoints
  return Math.round(raw * 10) / 10
}

/** WAM after the remaining points if they average `average`. */
export function projectedWam(wam: number, donePoints: number, average: number, remainingPoints: number): number | null {
  const total = donePoints + remainingPoints
  if (total <= 0) return null
  return Math.round(((wam * donePoints + average * remainingPoints) / total) * 10) / 10
}

/** UniMelb grade for a mark. */
export function gradeOf(mark: number): string {
  if (mark >= 80) return 'H1'
  if (mark >= 75) return 'H2A'
  if (mark >= 70) return 'H2B'
  if (mark >= 65) return 'H3'
  if (mark >= 50) return 'P'
  return 'N'
}
