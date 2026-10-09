import { offeredIn } from './availability'
import { checkCourse } from './courseRules'
import type { Plan, PlanTerm } from './plan'
import { checkTerms } from './planCheck'
import type { Profile } from './recommend'
import type { Dataset, Period } from './schema'
import { termStress, type StressLevel } from './termStress'

/**
 * Making a heavy semester lighter without breaking the plan: swapping subjects between
 * semesters (what the plan builder does after filling a plan, and what "Spread it out" does
 * on a plan the student has edited), or moving one subject into a summer or winter term.
 * Either way nothing may get worse: no new term problem (prerequisites, when it runs,
 * clashes) and no course rule newly unmet.
 */

const BALANCE_ROUNDS = 12
const RANK: Record<StressLevel, number> = { ok: 0, heavy: 1, veryHeavy: 2 }

/** Problems a change must not add: errors and warnings counted apart, and unmet course rules. */
function guard(plan: Plan, data: Dataset): () => boolean {
  const count = () => {
    const issues = checkTerms(plan, data)
    return {
      errors: issues.filter((i) => i.severity === 'error').length,
      warnings: issues.filter((i) => i.severity === 'warning').length,
      unmet: checkCourse(plan, data).statuses.filter((s) => s.status === 'fail').length,
    }
  }
  const base = count()
  return () => {
    const now = count()
    return now.errors <= base.errors && now.warnings <= base.warnings && now.unmet <= base.unmet
  }
}

/**
 * Swap equal-points subjects between semesters while that evens out the load (sum of squared
 * stress scores goes down) and nothing gets worse. Greedy, best swap first. Changes
 * plan.terms in place and returns the swaps made.
 */
export function balanceTerms(plan: Plan, data: Dataset, profile?: Profile): { a: string; b: string }[] {
  const { terms } = plan
  const safe = guard(plan, data)
  const scores = () => terms.map((t) => termStress(t.subjects, data, profile).score)
  const cost = (xs: number[]) => xs.reduce((sum, x) => sum + x * x, 0)
  const made: { a: string; b: string }[] = []
  let current = scores()
  for (let round = 0; round < BALANCE_ROUNDS; round++) {
    // Any semester at or over the line may give a subject away — not only the heaviest, which
    // is often heavy for reasons no swap can fix (a run of compulsory subjects).
    const heavy = current.flatMap((x, i) => (x >= 1 ? [i] : []))
    let best: { from: number; to: number; a: string; b: string; scores: number[] } | null = null
    for (const fromIndex of heavy) {
      const from = terms[fromIndex] as PlanTerm
      for (const a of [...from.subjects]) {
        for (const [to, other] of terms.entries()) {
          if (to === fromIndex) continue
          for (const b of [...other.subjects]) {
            const sa = data.subjects[a]
            const sb = data.subjects[b]
            if (!sa || !sb || sa.points !== sb.points) continue
            if (offeredIn(sa, other.year, other.period).status !== 'ok' || offeredIn(sb, from.year, from.period).status !== 'ok') continue
            swap(from, other, a, b)
            const next = scores()
            if (cost(next) < cost(best?.scores ?? current) - 1e-6 && safe()) best = { from: fromIndex, to, a, b, scores: next }
            swap(from, other, b, a)
          }
        }
      }
    }
    if (!best) break
    swap(terms[best.from] as PlanTerm, terms[best.to] as PlanTerm, best.a, best.b)
    current = best.scores
    made.push({ a: best.a, b: best.b })
  }
  return made
}

function swap(x: PlanTerm, y: PlanTerm, a: string, b: string): void {
  x.subjects[x.subjects.indexOf(a)] = b
  y.subjects[y.subjects.indexOf(b)] = a
}

export type Relief =
  /** Swapping subjects with other semesters makes this one lighter: the whole new arrangement. */
  | { kind: 'spread'; terms: PlanTerm[]; swaps: { a: string; b: string }[] }
  /** Taking one subject in the summer or winter term next to it. */
  | { kind: 'shortTerm'; code: string; year: number; period: Period }

/** The summer/winter terms either side of a semester: before it first (prerequisites are usually fine there). */
function shortTermsBeside(term: PlanTerm): { year: number; period: Period }[] {
  if (term.period === 'semester-1') return [{ year: term.year, period: 'summer' }, { year: term.year, period: 'winter' }]
  if (term.period === 'semester-2') return [{ year: term.year, period: 'winter' }, { year: term.year + 1, period: 'summer' }]
  return []
}

const order = (t: { year: number; period: Period }) =>
  t.year * 10 + (['summer', 'semester-1', 'winter', 'semester-2'] as Period[]).indexOf(t.period)

/** A way to make one heavy semester lighter, or null when there's no safe one. */
export function relieveTerm(plan: Plan, data: Dataset, termIndex: number, profile?: Profile): Relief | null {
  const term = plan.terms[termIndex]
  if (!term) return null
  const before = termStress(term.subjects, data, profile)
  if (before.level === 'ok') return null
  const lighter = (subjects: string[]) => {
    const after = termStress(subjects, data, profile)
    return RANK[after.level] < RANK[before.level] || (after.level === before.level && after.score < before.score - 0.5)
  }

  const copy: Plan = { ...plan, terms: plan.terms.map((t) => ({ ...t, subjects: [...t.subjects] })) }
  const swaps = balanceTerms(copy, data, profile)
  if (swaps.length && lighter((copy.terms[termIndex] as PlanTerm).subjects)) return { kind: 'spread', terms: copy.terms, swaps }

  // Subjects named in the reasons first: they're what makes it heavy.
  const named = before.reasons.flatMap((r) => String(r.params.codes ?? '').split(', ')).filter((c) => term.subjects.includes(c))
  const candidates = [...new Set([...named, ...term.subjects])]
  for (const code of candidates) {
    const s = data.subjects[code]
    if (!s) continue
    for (const at of shortTermsBeside(term)) {
      // Not before the plan starts: a summer term before first semester is before enrolment.
      if (plan.terms[0] && order(at) < order(plan.terms[0])) continue
      if (offeredIn(s, at.year, at.period).status !== 'ok') continue
      const terms = plan.terms.map((t) => ({ ...t, subjects: t.subjects.filter((c) => c !== code) }))
      let target = terms.find((t) => t.year === at.year && t.period === at.period)
      if (!target) {
        target = { year: at.year, period: at.period, subjects: [] }
        const i = terms.findIndex((t) => order(t) > order(at))
        terms.splice(i < 0 ? terms.length : i, 0, target)
      }
      target.subjects.push(code)
      const moved: Plan = { ...plan, terms }
      // Measured against the plan as it was, with the new term (empty) already in it.
      const baseline: Plan = { ...plan, terms: terms.map((t) => (t === target ? { ...t, subjects: t.subjects.filter((c) => c !== code) } : t)) }
      baseline.terms = baseline.terms.map((t) => (t.year === term.year && t.period === term.period ? { ...t, subjects: [...term.subjects] } : t))
      if (!lighter(term.subjects.filter((c) => c !== code))) continue
      if (noWorse(baseline, moved, data)) return { kind: 'shortTerm', code, ...at }
    }
  }
  return null
}

function noWorse(before: Plan, after: Plan, data: Dataset): boolean {
  const count = (p: Plan) => {
    const issues = checkTerms(p, data)
    return [
      issues.filter((i) => i.severity === 'error').length,
      issues.filter((i) => i.severity === 'warning').length,
      checkCourse(p, data).statuses.filter((s) => s.status === 'fail').length,
    ]
  }
  const a = count(before)
  const b = count(after)
  return b.every((x, i) => x <= (a[i] as number))
}
