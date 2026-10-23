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

/** Roughly when each teaching period starts (month 0–11, day): a term that has started is past for planning. */
const STARTS: Record<Period, [number, number]> = { summer: [0, 1], 'semester-1': [1, 24], winter: [5, 30], 'semester-2': [6, 21] }

/** Whether a term is still ahead of `today` (it hasn't started yet). */
export function isUpcoming(term: { year: number; period: Period }, today: Date = new Date()): boolean {
  const [m, d] = STARTS[term.period]
  return new Date(term.year, m, d) > today
}

/**
 * The term to suggest for adding a subject: the first one it runs in that is still ahead, from
 * the plan's first semester on if that's later; a past term only when nothing else is left.
 */
export function defaultTerm<T extends { year: number; period: Period }>(choices: readonly T[], planStart?: { year: number; period: Period }, today: Date = new Date()): T | undefined {
  const ahead = choices.filter((x) => isUpcoming(x, today))
  const fromPlan = planStart ? ahead.find((x) => termKey(x.year, x.period) >= termKey(planStart.year, planStart.period)) : undefined
  return fromPlan ?? ahead[0] ?? choices.at(-1)
}
