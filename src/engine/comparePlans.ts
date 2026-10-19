import { termKey } from './availability'
import type { Period } from './schema'
import type { PlanTerm } from './plan'
import type { StressLevel } from './termStress'

/** One plan to compare: its semesters, and (optionally) how heavy each one is, in the same order. */
export interface CompareSide {
  terms: PlanTerm[]
  levels?: StressLevel[]
}

export interface CompareCell {
  points: number
  count: number
  level?: StressLevel
}

/** A semester in either plan, with each plan's load in it (null: that plan has nothing there). */
export interface CompareRow {
  year: number
  period: Period
  a: CompareCell | null
  b: CompareCell | null
}

export interface PlanDiff {
  onlyA: string[]
  onlyB: string[]
  both: string[]
  rows: CompareRow[]
  totalA: number
  totalB: number
}

/** Two plans side by side: the subjects they differ on, and their semesters lined up by date. */
export function comparePlans(a: CompareSide, b: CompareSide, pointsOf: (code: string) => number): PlanDiff {
  const codesA = new Set(a.terms.flatMap((t) => t.subjects))
  const codesB = new Set(b.terms.flatMap((t) => t.subjects))
  const sorted = (xs: Iterable<string>) => [...xs].sort()
  const rows = new Map<number, CompareRow>()
  const fill = (side: CompareSide, which: 'a' | 'b') => {
    side.terms.forEach((t, i) => {
      if (t.subjects.length === 0) return
      const key = termKey(t.year, t.period)
      const row = rows.get(key) ?? { year: t.year, period: t.period, a: null, b: null }
      const level = side.levels?.[i]
      row[which] = { points: t.subjects.reduce((sum, c) => sum + pointsOf(c), 0), count: t.subjects.length, ...(level ? { level } : {}) }
      rows.set(key, row)
    })
  }
  fill(a, 'a')
  fill(b, 'b')
  const total = (codes: Set<string>) => [...codes].reduce((sum, c) => sum + pointsOf(c), 0)
  return {
    onlyA: sorted([...codesA].filter((c) => !codesB.has(c))),
    onlyB: sorted([...codesB].filter((c) => !codesA.has(c))),
    both: sorted([...codesA].filter((c) => codesB.has(c))),
    rows: [...rows.entries()].sort((x, y) => x[0] - y[0]).map(([, r]) => r),
    totalA: total(codesA),
    totalB: total(codesB),
  }
}
