import { PASS_MARK, termKey, type Period, type Profile } from '@/engine'

export interface PastResult {
  code: string
  mark?: number
  failed: boolean
}

export interface PastTerm {
  year: number
  period: Period
  results: PastResult[]
}

const PERIODS: readonly Period[] = ['summer', 'semester-1', 'winter', 'semester-2']

/**
 * The student's completed subjects grouped into the semesters they were taken, oldest first,
 * plus the ones with no semester given. A stored semester that doesn't make sense (edited by
 * hand, say) counts as not given rather than breaking the board.
 */
export function pastTerms(results: Profile['results']): { terms: PastTerm[]; undated: PastResult[] } {
  const byTerm = new Map<number, PastTerm>()
  const undated: PastResult[] = []
  for (const r of results) {
    const item: PastResult = { code: r.code, mark: r.mark, failed: r.mark !== undefined && r.mark < PASS_MARK }
    const valid = Number.isInteger(r.year) && (r.year as number) >= 1990 && (r.year as number) <= 2100 && PERIODS.includes(r.period as Period)
    if (!valid) {
      undated.push(item)
      continue
    }
    const key = termKey(r.year as number, r.period as Period)
    let term = byTerm.get(key)
    if (!term) byTerm.set(key, (term = { year: r.year as number, period: r.period as Period, results: [] }))
    term.results.push(item)
  }
  const terms = [...byTerm.entries()].sort(([a], [b]) => a - b).map(([, t]) => t)
  return { terms, undated }
}

/** Semesters a student may have taken subjects in: the last few years, newest first. */
export function recentTerms(now = new Date(), years = 6): { year: number; period: Period }[] {
  const out: { year: number; period: Period }[] = []
  for (let y = now.getFullYear(); y > now.getFullYear() - years; y--) {
    for (const p of [...PERIODS].reverse()) out.push({ year: y, period: p })
  }
  return out
}
