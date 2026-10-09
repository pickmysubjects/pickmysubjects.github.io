import { offeredIn } from './availability'
import { checkCourse } from './courseRules'
import type { Plan, PlanTerm } from './plan'
import { checkTerms } from './planCheck'
import { passedCodes, recommend, type Profile } from './recommend'
import { planRoles } from './roles'
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
const FIRST_TERM_WEIGHT = 1.5
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
  // The first semester weighs more: students are still finding their feet, and measured by
  // real load rather than credit points it is among the heaviest (Borchers & Pardos, LAK 2023).
  const cost = (xs: number[]) => xs.reduce((sum, x, i) => sum + (i === 0 ? FIRST_TERM_WEIGHT : 1) * x * x, 0)
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
  /**
   * Swapping subjects with other semesters makes this one lighter: the whole new arrangement.
   * `replaced`: the swap would have made the other semester heavy, so one of its free
   * electives is taken differently too.
   */
  | { kind: 'spread'; terms: PlanTerm[]; swaps: { a: string; b: string }[]; replaced?: { code: string; with: string } }
  /** Taking one subject in the summer or winter term next to it. */
  | { kind: 'shortTerm'; code: string; year: number; period: Period }
  /** Taking a different elective that counts the same way (same category, level and points). */
  | { kind: 'replace'; code: string; with: string; terms: PlanTerm[] }

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
  // Only what actually takes the semester down a level counts: a button that leaves it
  // "heavy" after you press it helps nobody.
  const lighter = (subjects: string[]) => RANK[termStress(subjects, data, profile).level] < RANK[before.level]

  // A swap between this semester and another, so the one the student is looking at gets
  // lighter and the other doesn't get heavier. Best by the two semesters' combined load.
  const one = swapFor(plan, data, termIndex, profile, lighter)
  if (one) return one

  // Keeping the semester as it is but taking a different elective in place of the one
  // that makes it heavy, chosen the way suggestions are (the student's interests,
  // strengths and marks).
  const other = replaceFor(plan, data, termIndex, profile, lighter)
  if (other) return other

  // A swap that would push the other semester over, fixed there by a different elective.
  const both = swapThenReplace(plan, data, termIndex, profile, lighter)
  if (both) return both

  // Otherwise the whole-plan balance, if it happens to lighten this one.
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

/**
 * After balancing: for each semester still heavy, the one swap that brings its level down
 * without raising another's (what "Spread it out" offers), or else a different elective in
 * place of the one that makes it heavy; applied in turn. Changes plan.terms in place and
 * returns what it changed.
 */
export function fixHeavyTerms(plan: Plan, data: Dataset, profile?: Profile): { a: string; b: string; kind: 'swap' | 'replace' }[] {
  const made: { a: string; b: string; kind: 'swap' | 'replace' }[] = []
  for (let round = 0; round < plan.terms.length * 2; round++) {
    let changed = false
    for (const [i, term] of plan.terms.entries()) {
      const before = termStress(term.subjects, data, profile)
      if (before.level === 'ok') continue
      const lighter = (subjects: string[]) => RANK[termStress(subjects, data, profile).level] < RANK[before.level]
      const r =
        swapFor(plan, data, i, profile, lighter) ??
        replaceFor(plan, data, i, profile, lighter) ??
        swapThenReplace(plan, data, i, profile, lighter)
      if (r?.kind === 'spread') {
        made.push(...r.swaps.map((x) => ({ ...x, kind: 'swap' as const })))
        if (r.replaced) made.push({ a: r.replaced.code, b: r.replaced.with, kind: 'replace' })
      } else if (r?.kind === 'replace') made.push({ a: r.code, b: r.with, kind: 'replace' })
      else continue
      plan.terms.splice(0, plan.terms.length, ...r.terms)
      changed = true
    }
    if (!changed) break
  }
  return made
}

/** How many suggested alternatives to try for each elective. */
const REPLACE_TRIES = 12

const FIXED = new WeakMap<Dataset, Map<string, Set<string>>>()

/** Compulsory subjects and picks from the major's or specialisation's lists (worked out once per plan setup). */
function fixedSubjects(data: Dataset, plan: Plan): Set<string> {
  let cache = FIXED.get(data)
  if (!cache) FIXED.set(data, (cache = new Map()))
  const key = [plan.course, plan.courseYear, plan.major ?? '', plan.specialisation ?? ''].join('|')
  let out = cache.get(key)
  if (!out) {
    const roles = planRoles(data, plan.course, plan.courseYear, [plan.major ?? '', plan.specialisation ?? ''])
    cache.set(key, (out = new Set([...roles.required, ...roles.options])))
  }
  return out
}

const ALTERNATIVES = new WeakMap<Dataset, Map<string, string[]>>()

/** Subjects that could fill a free-elective slot, best first for this student (the suggestions' ranking). */
function alternatives(data: Dataset, profile: Profile, course: string, category: string, level: number, term: PlanTerm): string[] {
  let cache = ALTERNATIVES.get(data)
  if (!cache) ALTERNATIVES.set(data, (cache = new Map()))
  const key = JSON.stringify([profile, course, category, level, term.year, term.period])
  let out = cache.get(key)
  if (!out) {
    out = recommend(data, profile, { course, category, level, term: { year: term.year, period: term.period }, eligibleWith: [] })
      .filter((x) => x.eligibility !== 'fail')
      .map((x) => x.code)
    cache.set(key, out)
  }
  return out
}

function replaceFor(
  plan: Plan,
  data: Dataset,
  termIndex: number,
  profile: Profile | undefined,
  lighter: (subjects: string[]) => boolean,
  onlyNamed = false,
): Relief | null {
  const term = plan.terms[termIndex] as PlanTerm
  // Only free choices: not a compulsory subject, and not one picked from a major's or
  // specialisation's own list (another subject of the same category wouldn't count there).
  const fixed = fixedSubjects(data, plan)
  const stress = termStress(term.subjects, data, profile)
  const named = stress.reasons.flatMap((r) => String(r.params.codes ?? '').split(', ')).filter((c) => term.subjects.includes(c))
  const done = [...plan.completed, ...passedCodes(profile?.results ?? [])]
  const inPlan = plan.terms.flatMap((t) => t.subjects)
  const student: Profile = profile ?? { results: [], skills: {}, interests: [], goal: 'balanced' }
  for (const code of onlyNamed ? [...new Set(named)] : [...new Set([...named, ...term.subjects])]) {
    const s = data.subjects[code]
    // Without a category we can't tell what it counts towards, so nothing could stand in for it.
    if (!s || fixed.has(code) || !s.categories[plan.course]) continue
    // Ranked once per kind of slot (category, level, teaching period) and student; whether
    // the prerequisites are met where it would go is checked on the whole plan below.
    const recs = alternatives(data, student, plan.course, s.categories[plan.course] as string, s.level, term)
      .filter((x) => !inPlan.includes(x) && !done.includes(x) && data.subjects[x]?.points === s.points)
      .slice(0, REPLACE_TRIES)
    for (const rec of recs) {
      const subjects = term.subjects.map((c) => (c === code ? rec : c))
      if (!lighter(subjects)) continue
      const terms = plan.terms.map((t, i) => (i === termIndex ? { ...t, subjects } : { ...t, subjects: [...t.subjects] }))
      if (noWorse(plan, { ...plan, terms }, data)) return { kind: 'replace', code, with: rec, terms }
    }
  }
  return null
}

function swapThenReplace(
  plan: Plan,
  data: Dataset,
  termIndex: number,
  profile: Profile | undefined,
  lighter: (subjects: string[]) => boolean,
): Relief | null {
  const from = plan.terms[termIndex] as PlanTerm
  const reasons = termStress(from.subjects, data, profile).reasons
  // Only the subjects that make it heavy are worth moving.
  const movable = [...new Set(reasons.flatMap((x) => String(x.params.codes ?? '').split(', ')))].filter((c) => from.subjects.includes(c))
  for (const a of movable) {
    for (const [to, other] of plan.terms.entries()) {
      if (to === termIndex) continue
      const otherBefore = RANK[termStress(other.subjects, data, profile).level]
      for (const b of other.subjects) {
        const sa = data.subjects[a]
        const sb = data.subjects[b]
        if (!sa || !sb || sa.points !== sb.points) continue
        if (offeredIn(sa, other.year, other.period).status !== 'ok' || offeredIn(sb, from.year, from.period).status !== 'ok') continue
        const terms = plan.terms.map((t) => ({ ...t, subjects: [...t.subjects] }))
        swap(terms[termIndex] as PlanTerm, terms[to] as PlanTerm, a, b)
        if (!lighter((terms[termIndex] as PlanTerm).subjects)) continue
        const swapped: Plan = { ...plan, terms }
        const back = (subjects: string[]) => RANK[termStress(subjects, data, profile).level] <= otherBefore
        if (back((terms[to] as PlanTerm).subjects)) continue // a plain swap; swapFor covers it
        const fix = replaceFor(swapped, data, to, profile, back, true)
        if (fix?.kind !== 'replace' || !noWorse(plan, { ...plan, terms: fix.terms }, data)) continue
        if (!lighter((fix.terms[termIndex] as PlanTerm).subjects)) continue
        return { kind: 'spread', terms: fix.terms, swaps: [{ a, b }], replaced: { code: fix.code, with: fix.with } }
      }
    }
  }
  return null
}

function swapFor(
  plan: Plan,
  data: Dataset,
  termIndex: number,
  profile: Profile | undefined,
  lighter: (subjects: string[]) => boolean,
): Relief | null {
  const from = plan.terms[termIndex] as PlanTerm
  const copy: Plan = { ...plan, terms: plan.terms.map((t) => ({ ...t, subjects: [...t.subjects] })) }
  const here = copy.terms[termIndex] as PlanTerm
  const safe = guard(copy, data)
  let best: { to: number; a: string; b: string; cost: number } | null = null
  for (const a of from.subjects) {
    for (const [to, other] of plan.terms.entries()) {
      if (to === termIndex) continue
      const there = copy.terms[to] as PlanTerm
      const otherBefore = termStress(other.subjects, data, profile).level
      for (const b of other.subjects) {
        const sa = data.subjects[a]
        const sb = data.subjects[b]
        if (!sa || !sb || sa.points !== sb.points) continue
        if (offeredIn(sa, other.year, other.period).status !== 'ok' || offeredIn(sb, from.year, from.period).status !== 'ok') continue
        swap(here, there, a, b)
        const otherAfter = termStress(there.subjects, data, profile)
        if (lighter(here.subjects) && RANK[otherAfter.level] <= RANK[otherBefore]) {
          const cost = termStress(here.subjects, data, profile).score ** 2 + otherAfter.score ** 2
          if ((!best || cost < best.cost) && safe()) best = { to, a, b, cost }
        }
        swap(here, there, b, a)
      }
    }
  }
  if (!best) return null
  swap(here, copy.terms[best.to] as PlanTerm, best.a, best.b)
  return { kind: 'spread', terms: copy.terms, swaps: [{ a: best.a, b: best.b }] }
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
