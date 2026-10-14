import { isFail, termKey, type Period, type Profile } from '@/engine'

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
    const item: PastResult = { code: r.code, mark: r.mark, failed: isFail(r) }
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

/** Every term from one semester to another, in order (summer and winter included). */
export function termsBetween(from: { year: number; period: Period }, to: { year: number; period: Period }): { year: number; period: Period }[] {
  const order = (t: { year: number; period: Period }) => t.year * 10 + PERIODS.indexOf(t.period)
  const out: { year: number; period: Period }[] = []
  for (let y = from.year; y <= to.year; y++) {
    for (const p of PERIODS) {
      const t = { year: y, period: p }
      if (order(t) >= order(from) && order(t) <= order(to)) out.push(t)
    }
  }
  return out
}
