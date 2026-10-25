import { offeredIn } from './availability'
import { checkCourse, heldMajorIds, majorTitles, minorTitles, planComponentIds } from './courseRules'
import type { Plan, PlanTerm } from './plan'
import { evaluateField, referencedSubjects } from './expr'
import { careerGoal } from './careerGoal'
import { checkTerms } from './planCheck'
import { passedCodes, recommend, type Profile } from './recommend'
import { planRoles } from './roles'
import type { Dataset, Period } from './schema'
import { requiredWithPrerequisites, termStressesInPlan, termStressInPlan, type StressLevel, type TermStress } from './termStress'
import { topicsOf } from './topics'
import { doneBefore } from './yearLong'

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

/** Judges terms the way the plan shows them (see termStressInPlan), for one plan's setup. */
interface Judge {
  at(terms: readonly PlanTerm[], index: number): TermStress
  all(terms: readonly PlanTerm[]): TermStress[]
}

function judgeFor(plan: Plan, data: Dataset, profile?: Profile): Judge {
  const fixed = requiredWithPrerequisites(fixedSubjects(data, plan), plan.terms.flatMap((t) => t.subjects), data.subjects, plan.course)
  const ctx = { fixed, course: plan.course }
  return {
    at: (terms, index) => termStressInPlan(terms, index, data, profile, ctx),
    all: (terms) => termStressesInPlan(terms, data, profile, ctx),
  }
}

/** Whether a whole arrangement of terms is good enough (e.g. one term got lighter). */
type Test = (terms: readonly PlanTerm[]) => boolean

/** The same term with one subject changed for another. */
function withTerm(terms: readonly PlanTerm[], index: number, subjects: string[]): PlanTerm[] {
  return terms.map((t, i) => ({ ...t, subjects: i === index ? subjects : [...t.subjects] }))
}

/**
 * The plan's problems by identity: each term error or warning (kind, subject, rule; a term-wide
 * one by its term) and each unmet course rule. Counting them isn't enough: a swap could clear
 * one corequisite and break another.
 */
function problems(plan: Plan, data: Dataset): Set<string> {
  const out = new Set<string>()
  for (const i of checkTerms(plan, data)) {
    if (i.severity !== 'error' && i.severity !== 'warning') continue
    const where = i.subject ?? `${i.params.year ?? ''} ${i.params.period ?? ''}`
    out.add(`${i.severity}|${i.kind}|${where}|${i.ruleId ?? ''}`)
  }
  for (const s of checkCourse(plan, data).statuses) if (s.status === 'fail') out.add(`rule|${s.ruleId}`)
  return out
}

/** Whether every problem in `after` was already there. */
function noneNew(before: Set<string>, after: Set<string>): boolean {
  for (const x of after) if (!before.has(x)) return false
  return true
}

/** Problems a change must not add, judged against the plan as it is now. */
function guard(plan: Plan, data: Dataset): () => boolean {
  const base = problems(plan, data)
  return () => noneNew(base, problems(plan, data))
}

/**
 * Swap equal-points subjects between semesters while that evens out the load (sum of squared
 * stress scores goes down) and nothing gets worse. Greedy, best swap first. Changes
 * plan.terms in place and returns the swaps made.
 */
export function balanceTerms(plan: Plan, data: Dataset, profile?: Profile): { a: string; b: string }[] {
  const { terms } = plan
  const safe = guard(plan, data)
  const judge = judgeFor(plan, data, profile)
  const scores = () => judge.all(terms).map((t) => t.score)
  // The first semester weighs more: students are still finding their feet, and measured by
  // real load rather than credit points it is among the heaviest (Borchers & Pardos, LAK 2023).
  const cost = (xs: number[]) => xs.reduce((sum, x, i) => sum + (i === 0 ? FIRST_TERM_WEIGHT : 1) * x * x, 0)
  const made: { a: string; b: string }[] = []
  let current = scores()
  for (let round = 0; round < BALANCE_ROUNDS; round++) {
    // Any semester at or over the line may give a subject away — not only the heaviest, which
    // is often heavy for reasons no swap can fix (a run of compulsory subjects).
    // A student out to challenge themselves takes a heavy semester; only a very heavy one is spread.
    const line = profile?.goal === 'challenge' ? 2 : 1
    const heavy = current.flatMap((x, i) => (x >= line ? [i] : []))
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
            if (inverts(sa.level, sb.level, fromIndex, to)) continue
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
  const judge = judgeFor(plan, data, profile)
  const before = judge.at(plan.terms, termIndex)
  if (before.level === 'ok') return null
  // Only what actually takes the semester down a level counts: a button that leaves it
  // "heavy" after you press it helps nobody. Judged in the whole arrangement (by year and
  // teaching period, as a new short term can shift indexes).
  const lighterAt = (terms: readonly PlanTerm[]) => {
    const i = terms.findIndex((t) => t.year === term.year && t.period === term.period)
    return RANK[judge.at(terms, i).level] < RANK[before.level]
  }
  const lighter: Test = lighterAt

  // A swap between this semester and another, so the one the student is looking at gets
  // lighter and the other doesn't get heavier. Best by the two semesters' combined load.
  const one = swapFor(plan, data, termIndex, judge, lighter)
  if (one) return one

  // Keeping the semester as it is but taking a different elective in place of the one
  // that makes it heavy, chosen the way suggestions are (the student's interests,
  // strengths and marks).
  const other = replaceFor(plan, data, termIndex, profile, judge, lighter)
  if (other) return other

  // A swap that would push the other semester over, fixed there by a different elective.
  const both = swapThenReplace(plan, data, termIndex, profile, judge, lighter)
  if (both) return both

  // Otherwise the whole-plan balance, if it happens to lighten this one.
  const copy: Plan = { ...plan, terms: plan.terms.map((t) => ({ ...t, subjects: [...t.subjects] })) }
  const swaps = balanceTerms(copy, data, profile)
  if (swaps.length && lighter(copy.terms)) return { kind: 'spread', terms: copy.terms, swaps }

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
      if (!lighter(moved.terms)) continue
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
      const judge = judgeFor(plan, data, profile)
      const before = judge.at(plan.terms, i)
      if (RANK[before.level] <= RANK[tolerated(profile)]) continue
      const lighter: Test = (terms) => RANK[judge.at(terms, i).level] < RANK[before.level]
      const r =
        swapFor(plan, data, i, judge, lighter) ??
        replaceFor(plan, data, i, profile, judge, lighter) ??
        swapThenReplace(plan, data, i, profile, judge, lighter) ??
        // Last, the moves the "make it lighter" button would offer (it can chain several swaps).
        lighterRelief(relieveTerm(plan, data, i, profile), lighter)
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

function lighterRelief(r: Relief | null, lighter: Test): Relief | null {
  // Only moves between semesters: its replacements don't know which subjects the plan's
  // other requirements lean on (a maths prerequisite, say).
  if (!r || r.kind !== 'spread' || r.replaced) return null
  return lighter(r.terms) ? r : null
}

/** How many suggested alternatives to try for each elective. */
const REPLACE_TRIES = 12

const FIXED = new WeakMap<Dataset, Map<string, Set<string>>>()

/** Compulsory subjects and picks from the major's or specialisation's lists (worked out once per plan setup). */
function fixedSubjects(data: Dataset, plan: Plan): Set<string> {
  let cache = FIXED.get(data)
  if (!cache) FIXED.set(data, (cache = new Map()))
  const ids = planComponentIds(plan).map((id) => id ?? '')
  const key = [plan.course, plan.courseYear, ...ids].join('|')
  let out = cache.get(key)
  if (!out) {
    const roles = planRoles(data, plan.course, plan.courseYear, ids)
    cache.set(key, (out = new Set([...roles.required, ...roles.options])))
  }
  return out
}

/** Subjects the career goal's accreditation route needs (required, "one of", breadth), for this plan's majors. */
function routeSubjects(data: Dataset, plan: Plan, profile: Profile | undefined): string[] {
  const a = careerGoal(data, profile?.career, goalMajors(plan))?.major?.accreditation
  return a ? [...a.required.flat(), ...a.requiredBreadth] : []
}

function goalMajors(plan: Plan): string[] {
  return heldMajorIds(plan).filter((id): id is string => !!id)
}

const ALTERNATIVES = new WeakMap<Dataset, Map<string, string[]>>()

/**
 * Subjects that could fill a free-elective slot, best first for this student (the suggestions'
 * ranking), among those whose prerequisites what comes before the slot (`before`) meets.
 */
function alternatives(data: Dataset, profile: Profile, course: string, category: string, level: number, term: PlanTerm, majors: string[], before: Set<string>): string[] {
  let cache = ALTERNATIVES.get(data)
  if (!cache) ALTERNATIVES.set(data, (cache = new Map()))
  const key = JSON.stringify([profile, course, category, level, term.year, term.period, profile.career ? majors : [], [...before].sort()])
  let out = cache.get(key)
  if (!out) {
    // An empty list here meant no prerequisite counted as met, so only subjects needing nothing
    // first could ever stand in (never a level-2 elective after its level-1 one).
    out = recommend(data, profile, { course, category, level, term: { year: term.year, period: term.period }, eligibleWith: [...before], ...(profile.career ? { goalComponents: majors } : {}) })
      .filter((x) => x.eligibility !== 'fail')
      .map((x) => x.code)
    cache.set(key, out)
  }
  return out
}

/**
 * Whether a later subject's prerequisites hold with this one and stop holding without it,
 * including rules that name no subject ("25 points of MAST").
 */
function leanedOn(plan: Plan, data: Dataset, code: string): boolean {
  const at = plan.terms.findIndex((t) => t.subjects.includes(code))
  for (let i = at + 1; i < plan.terms.length; i++) {
    const before = [...doneBefore(plan.completed, plan.terms, i, data)]
    const without = new Set(before.filter((c) => c !== code))
    for (const c of (plan.terms[i] as PlanTerm).subjects) {
      const s = data.subjects[c]
      if (!s || s.prerequisites === 'none' || s.prerequisites === 'unknown') continue
      const ctx = { subjects: data.subjects, admittedCourse: plan.course, majors: majorTitles(data, heldMajorIds(plan)), minors: minorTitles(data, plan.minors) }
      if (evaluateField(s.prerequisites, { ...ctx, completed: new Set(before) }).status !== 'ok') continue
      if (evaluateField(s.prerequisites, { ...ctx, completed: without }).status !== 'ok') return true
    }
  }
  return false
}

function replaceFor(
  plan: Plan,
  data: Dataset,
  termIndex: number,
  profile: Profile | undefined,
  judge: Judge,
  lighter: Test,
  onlyNamed = false,
): Relief | null {
  const term = plan.terms[termIndex] as PlanTerm
  // Only free choices: not a compulsory subject, and not one picked from a major's or
  // specialisation's own list (another subject of the same category wouldn't count there).
  const inPlan = plan.terms.flatMap((t) => t.subjects)
  // Nor a subject those lean on: a maths prerequisite that a VCE score could also stand in
  // for still has to stay, or the plan quietly relies on a score the student may not have.
  const fixed = requiredWithPrerequisites(fixedSubjects(data, plan), inPlan, data.subjects, plan.course)
  // The career goal's accreditation route: a subject it needs is never swapped for one it doesn't.
  for (const c of routeSubjects(data, plan, profile)) fixed.add(c)
  for (const c of inPlan) {
    const p = data.subjects[c]
    if (p) for (const r of [...referencedSubjects(p.prerequisites), ...referencedSubjects(p.corequisites)]) if (inPlan.includes(r)) fixed.add(r)
  }
  const stress = judge.at(plan.terms, termIndex)
  const named = stress.reasons.flatMap((r) => String(r.params.codes ?? '').split(', ')).filter((c) => term.subjects.includes(c))
  const done = [...plan.completed, ...passedCodes(profile?.results ?? [])]
  // What a stand-in's prerequisites can rest on: everything finished before this semester.
  const before = doneBefore(plan.completed, plan.terms, termIndex, data)
  const student: Profile = profile ?? { results: [], skills: {}, interests: [], goal: 'balanced' }
  // The student's interests a subject serves. An exact topic: "related" is too loose here
  // (languages and ethics share a group).
  const liked = (c: string): string[] => {
    const x = data.subjects[c]
    return x ? topicsOf(x).topics.filter((t) => student.interests.includes(t)) : []
  }
  for (const code of onlyNamed ? [...new Set(named)] : [...new Set([...named, ...term.subjects])]) {
    const s = data.subjects[code]
    // Without a category we can't tell what it counts towards, so nothing could stand in for it.
    if (!s || fixed.has(code) || !s.categories[plan.course] || leanedOn(plan, data, code)) continue
    // Ranked once per kind of slot (category, level, teaching period) and student; whether
    // the prerequisites are met where it would go is checked on the whole plan below.
    const recs = alternatives(data, student, plan.course, s.categories[plan.course] as string, s.level, term, goalMajors(plan), before)
      .filter((x) => !inPlan.includes(x) && !done.includes(x) && data.subjects[x]?.points === s.points)
      .slice(0, REPLACE_TRIES)
    // Swapping a subject the student picked for their interests for one they don't care about
    // makes a lighter semester nobody wants; then the heavy one stays and is flagged instead.
    // It has to serve one of the same interests: machine learning swapped for biotech isn't
    // a like-for-like just because the student also ticked business.
    const keepsInterest = (c: string) => {
      const was = liked(code)
      return was.length === 0 || liked(c).some((t) => was.includes(t))
    }
    for (const rec of recs) {
      if (!keepsInterest(rec)) continue
      const terms = withTerm(plan.terms, termIndex, term.subjects.map((c) => (c === code ? rec : c)))
      if (!lighter(terms)) continue
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
  judge: Judge,
  lighter: Test,
): Relief | null {
  const from = plan.terms[termIndex] as PlanTerm
  const reasons = judge.at(plan.terms, termIndex).reasons
  // Only the subjects that make it heavy are worth moving.
  const movable = [...new Set(reasons.flatMap((x) => String(x.params.codes ?? '').split(', ')))].filter((c) => from.subjects.includes(c))
  for (const a of movable) {
    for (const [to, other] of plan.terms.entries()) {
      if (to === termIndex) continue
      const otherBefore = RANK[judge.at(plan.terms, to).level]
      for (const b of other.subjects) {
        const sa = data.subjects[a]
        const sb = data.subjects[b]
        if (!sa || !sb || sa.points !== sb.points) continue
        if (offeredIn(sa, other.year, other.period).status !== 'ok' || offeredIn(sb, from.year, from.period).status !== 'ok') continue
        if (inverts(sa.level, sb.level, termIndex, to)) continue
        const terms = plan.terms.map((t) => ({ ...t, subjects: [...t.subjects] }))
        swap(terms[termIndex] as PlanTerm, terms[to] as PlanTerm, a, b)
        if (!lighter(terms)) continue
        const swapped: Plan = { ...plan, terms }
        const back: Test = (ts) => RANK[judge.at(ts, to).level] <= otherBefore
        if (back(terms)) continue // a plain swap; swapFor covers it
        const fix = replaceFor(swapped, data, to, profile, judge, back, true)
        if (fix?.kind !== 'replace' || !noWorse(plan, { ...plan, terms: fix.terms }, data)) continue
        // Judged where it sat before the swap: moved later, nothing would seem to lean on it.
        if (leanedOn(plan, data, fix.code)) continue
        if (!lighter(fix.terms)) continue
        return { kind: 'spread', terms: fix.terms, swaps: [{ a, b }], replaced: { code: fix.code, with: fix.with } }
      }
    }
  }
  return null
}

/**
 * Whether trading `a` (moving from term `from` to `to`) with `b` (the other way) would put the
 * lower-level subject later: a first-year subject pushed into second year to make room for a
 * second-year one in first year spreads the load but makes the order worse.
 */
function inverts(levelA: number, levelB: number, from: number, to: number): boolean {
  return to > from ? levelA < levelB : levelB < levelA
}

function swapFor(
  plan: Plan,
  data: Dataset,
  termIndex: number,
  judge: Judge,
  lighter: Test,
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
      const otherBefore = judge.at(plan.terms, to).level
      for (const b of other.subjects) {
        const sa = data.subjects[a]
        const sb = data.subjects[b]
        if (!sa || !sb || sa.points !== sb.points) continue
        if (offeredIn(sa, other.year, other.period).status !== 'ok' || offeredIn(sb, from.year, from.period).status !== 'ok') continue
        if (inverts(sa.level, sb.level, termIndex, to)) continue
        swap(here, there, a, b)
        const after = judge.all(copy.terms)
        const otherAfter = after[to] as TermStress
        if (lighter(copy.terms) && RANK[otherAfter.level] <= RANK[otherBefore]) {
          const cost = (after[termIndex] as TermStress).score ** 2 + otherAfter.score ** 2
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

export function noWorse(before: Plan, after: Plan, data: Dataset): boolean {
  return noneNew(problems(before, data), problems(after, data))
}

/**
 * Subjects of a term that can't go anywhere else in the plan on their own: every other term
 * breaks a prerequisite, a corequisite or when they run. When a heavy term has no fix, these say why.
 */
export function pinnedIn(plan: Plan, data: Dataset, termIndex: number, codes: string[]): string[] {
  // A prerequisite that only a manual route (an enrolment form) could satisfy counts as broken too.
  const errors = (p: Plan) => checkTerms(p, data).filter((i) => i.severity === 'error' || i.kind === 'prereq-unknown').length
  const base = errors(plan)
  return codes.filter((code) =>
    plan.terms.every((_, j) => {
      if (j === termIndex) return true
      const terms = plan.terms.map((t, k) => ({
        ...t,
        subjects: k === termIndex ? t.subjects.filter((c) => c !== code) : k === j ? [...t.subjects, code] : t.subjects,
      }))
      return errors({ ...plan, terms }) > base
    }),
  )
}

/** The heaviest semester a student's goal accepts without the plan builder stepping in. */
function tolerated(profile?: Profile): StressLevel {
  return profile?.goal === 'challenge' ? 'heavy' : 'ok'
}
