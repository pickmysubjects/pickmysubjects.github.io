import { passedCodes, type Profile } from '@/engine/recommend'
import type { Dataset } from '@/engine/schema'

/** Points still to take in a degree of `degreePoints`: passed subjects only count as progress (a fail still counts in the WAM). */
export function pointsLeft(results: Profile['results'], data: Dataset, degreePoints: number): number {
  const passed = new Set(passedCodes(results))
  const done = [...passed].reduce((sum, c) => sum + (data.subjects[c]?.points ?? 12.5), 0)
  return Math.max(0, degreePoints - done)
}

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
