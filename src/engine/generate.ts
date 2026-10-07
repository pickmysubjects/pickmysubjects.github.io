import { offeredIn, periodsFor } from './availability'
import { categoryOf, componentNeeds, findComponent, findCourse } from './courseRules'
import { evaluateField, type Tri } from './expr'
import type { Plan, PlanTerm } from './plan'
import { standardTerms } from './plan'
import { passedCodes, recommend, type Profile } from './recommend'
import type { Course, CourseRule, Dataset, Period, ReqExpr, Subject } from './schema'

export interface GenerateInput {
  data: Dataset
  profile: Profile
  course: string
  courseYear: number
  major?: string
  specialisation?: string
  startYear: number
  startPeriod: Period
  /** Upper bound on terms to plan. Defaults to what the remaining points need, capped at 10. */
  maxTerms?: number
}

export interface GenerateResult {
  plan: Plan
  /** Required subjects that could not be placed, with a reason. */
  unplaced: { code: string; reason: string }[]
  /** Human-readable notes about choices the generator made. */
  notes: string[]
}

/**
 * Greedy, explainable plan builder:
 * 1. collect required subjects (compulsory + major/specialisation, choosing
 *    "pick N points from" sets by recommendation score) and their prerequisites;
 * 2. place them term by term — prerequisites must be in earlier terms, the
 *    subject must be offered, and the subject with the longest chain of
 *    dependents / fewest offerings goes first;
 * 3. fill the rest of each term with recommended electives that serve the
 *    largest unmet course-rule deficit without breaking any cap.
 */
export function generatePlan(input: GenerateInput): GenerateResult {
  const { data, profile } = input
  const course = findCourse(data, input.course, input.courseYear)
  const notes: string[] = []
  const completed = passedCodes(profile.results)
  const done = new Set(completed)
  const load = course?.standardLoad ?? 50

  const required = collectRequired(input, done, notes)
  const firstSemester = new Set(
    (course?.rules ?? []).flatMap((r) => (r.kind === 'compulsory' && r.firstSemester ? r.subjects : [])),
  )

  const remainingPoints = Math.max(
    0,
    (course?.totalPoints ?? 300) - completed.reduce((sum, c) => sum + (data.subjects[c]?.points ?? 0), 0),
  )
  const termCount = input.maxTerms ?? Math.min(10, Math.max(1, Math.ceil(remainingPoints / load)))
  const terms = standardTerms(input.startYear, input.startPeriod, termCount)

  const pending = [...required].filter((c) => !done.has(c))
  const depth = dependentDepth(pending, data)

  const electives = new Set<string>()
  const fill = (term: PlanTerm, termIndex: number): void => {
    if (!course) return
    const before = new Set([...completed, ...terms.slice(0, termIndex).flatMap((t) => t.subjects)])
    let used = term.subjects.reduce((sum, c) => sum + (data.subjects[c]?.points ?? 12.5), 0)
    while (used < load) {
      const pick = pickElective({ input, course, term, before, placed: allPlaced(), completed, room: load - used })
      if (!pick) break
      term.subjects.push(pick.code)
      electives.add(pick.code)
      used += data.subjects[pick.code]?.points ?? 12.5
      notes.push(`${pick.code} added in ${term.year} ${term.period} for: ${pick.why}.`)
    }
  }
  const allPlaced = (): string[] => terms.flatMap((t) => t.subjects)

  terms.forEach((term, termIndex) => {
    const before = new Set([...completed, ...allPlaced()])
    let used = 0

    // Required subjects first.
    const ready = pending
      .filter((c) => !before.has(c))
      .filter((c) => canTake(c, term, before, data, input.course) !== 'fail')
      .filter((c) => !firstSemester.has(c) || termIndex === 0)
      .sort((a, b) => priority(b, firstSemester, depth, data, term.year) - priority(a, firstSemester, depth, data, term.year))
    for (const code of ready) {
      const pts = data.subjects[code]?.points ?? 12.5
      if (used + pts > load) continue
      if (course && !progressionAllows(code, course, [...before], data)) continue
      term.subjects.push(code)
      used += pts
    }

    // Then electives aimed at the most pressing unmet requirement.
    fill(term, termIndex)
  })

  // Greedy filling can over-serve one requirement (e.g. science) and starve
  // another (e.g. breadth); swap electives where that's safe, then top up.
  if (course) {
    repair(terms, { input, course, completed, electives, notes })
    terms.forEach((t, i) => fill(t, i))
  }
  const placed = allPlaced()

  const unplaced = pending
    .filter((c) => !placed.includes(c))
    .map((code) => ({ code, reason: explainUnplaced(code, data, input.startYear) }))

  const plan: Plan = {
    course: input.course,
    courseYear: input.courseYear,
    major: input.major,
    specialisation: input.specialisation,
    completed,
    terms,
  }
  return { plan, unplaced, notes }
}

function collectRequired(input: GenerateInput, done: Set<string>, notes: string[]): Set<string> {
  const { data } = input
  const course = findCourse(data, input.course, input.courseYear)
  const required = new Set<string>()
  for (const rule of course?.rules ?? []) {
    if (rule.kind === 'compulsory') rule.subjects.forEach((c) => required.add(c))
  }

  for (const id of [input.major, input.specialisation]) {
    const component = findComponent(data, id)
    if (id && !component) notes.push(`${id} isn't in the dataset, so its subjects weren't added.`)
    if (component?.requirements === 'unknown') notes.push(`${component.title}'s structure isn't curated yet.`)
    for (const req of componentNeeds(component)) {
      if ('all' in req) req.all.forEach((c) => required.add(c))
      else {
        let have = req.choose.from.filter((c) => done.has(c) || required.has(c))
          .reduce((sum, c) => sum + (data.subjects[c]?.points ?? 0), 0)
        const ranked = recommend(data, input.profile, { course: input.course, eligibleWith: [] })
          .map((r) => r.code)
          .filter((c) => req.choose.from.includes(c))
        const order = [...ranked, ...req.choose.from.filter((c) => !ranked.includes(c))]
        for (const c of order) {
          if (have >= req.choose.points) break
          if (done.has(c) || required.has(c)) continue
          required.add(c)
          have += data.subjects[c]?.points ?? 12.5
          notes.push(`Chose ${c} for ${component?.title ?? id} (best match among its options).`)
        }
      }
    }
  }

  // Close over prerequisites so required subjects can actually be taken.
  const queue = [...required]
  while (queue.length > 0) {
    const code = queue.pop() as string
    const s = data.subjects[code]
    if (!s || s.prerequisites === 'none' || s.prerequisites === 'unknown') continue
    for (const need of resolvePrereqs(s.prerequisites, done, required, data, input.course)) {
      if (!required.has(need) && !done.has(need)) {
        required.add(need)
        queue.push(need)
        notes.push(`Added ${need} because ${code} needs it.`)
      }
    }
  }
  return required
}

/** Subjects to add so the expression can be satisfied, preferring the branch needing the fewest. */
function resolvePrereqs(expr: ReqExpr, done: Set<string>, required: Set<string>, data: Dataset, course: string): string[] {
  const have = (c: string) => done.has(c) || required.has(c)
  if ('subject' in expr) return have(expr.subject) ? [] : [expr.subject]
  if ('all' in expr) return [...new Set(expr.all.flatMap((e) => resolvePrereqs(e, done, required, data, course)))]
  if ('any' in expr) {
    const options = expr.any
      .filter((e) => !('admission' in e) || e.admission === course)
      .filter((e) => !('manual' in e))
      .map((e) => resolvePrereqs(e, done, required, data, course))
    if (options.length === 0) return []
    return options.reduce((best, o) => (o.length < best.length ? o : best))
  }
  return [] // points / admission / manual can't be resolved to specific subjects
}

function canTake(code: string, term: PlanTerm, before: Set<string>, data: Dataset, course: string): Tri {
  const s = data.subjects[code]
  if (!s) return 'unknown'
  if (offeredIn(s, term.year, term.period).status === 'fail') return 'fail'
  const pre = evaluateField(s.prerequisites, { completed: before, subjects: data.subjects, admittedCourse: course })
  return pre.status
}

function priority(code: string, first: Set<string>, depth: Map<string, number>, data: Dataset, year: number): number {
  const s = data.subjects[code]
  const scarcity = s ? 4 - Math.min(4, periodsFor(s, year).length) : 0
  return (first.has(code) ? 1000 : 0) + (depth.get(code) ?? 0) * 10 + scarcity * 3 - (s?.level ?? 3)
}

/** Longest chain of required subjects that depend on each subject. */
function dependentDepth(codes: string[], data: Dataset): Map<string, number> {
  const set = new Set(codes)
  const deps = new Map<string, string[]>()
  for (const c of codes) {
    const s = data.subjects[c]
    if (!s || s.prerequisites === 'none' || s.prerequisites === 'unknown') continue
    for (const p of referenced(s.prerequisites)) if (set.has(p)) deps.set(p, [...(deps.get(p) ?? []), c])
  }
  const memo = new Map<string, number>()
  const visit = (c: string, stack: Set<string>): number => {
    if (memo.has(c)) return memo.get(c) as number
    if (stack.has(c)) return 0 // guard against cyclic data
    stack.add(c)
    const d = Math.max(0, ...(deps.get(c) ?? []).map((x) => 1 + visit(x, stack)))
    stack.delete(c)
    memo.set(c, d)
    return d
  }
  codes.forEach((c) => visit(c, new Set()))
  return memo
}

function referenced(expr: ReqExpr): string[] {
  if ('subject' in expr) return [expr.subject]
  if ('all' in expr) return expr.all.flatMap(referenced)
  if ('any' in expr) return expr.any.flatMap(referenced)
  return []
}

function progressionAllows(code: string, course: Course, taken: string[], data: Dataset): boolean {
  const s = data.subjects[code]
  if (!s) return true
  for (const rule of course.rules) {
    if (rule.kind !== 'progression' || s.level !== rule.beforeLevel) continue
    const pts = taken.reduce((sum, c) => {
      const t = data.subjects[c]
      return t && t.level === rule.level ? sum + t.points : sum
    }, 0)
    if (pts < rule.minPoints) return false
  }
  return true
}

interface PickCtx {
  input: GenerateInput
  course: Course
  term: PlanTerm
  before: Set<string>
  placed: string[]
  completed: string[]
  room: number
}

function pickElective(ctx: PickCtx): { code: string; why: string } | null {
  const { input, course, term } = ctx
  const data = input.data
  const all = [...ctx.completed, ...ctx.placed]
  const deficits = pointRules(course)
    .filter((r) => r.min !== undefined)
    .map((r) => ({ rule: r, gap: (r.min as number) - sumPoints(all, data, course.code, r) }))
    .filter((d) => d.gap > 0)
    .sort((a, b) => specificity(b.rule) - specificity(a.rule) || b.gap - a.gap)
  if (deficits.length === 0) return null

  // Year level follows the points already completed, so mid-degree students are placed correctly.
  const yearLevel = Math.min(3, Math.floor(sumPoints([...ctx.before], data, course.code, {}) / 100) + 1)
  for (const { rule } of deficits) {
    const levels = rule.level !== undefined ? [rule.level] : [yearLevel, ...[1, 2, 3].filter((l) => l !== yearLevel)]
    for (const level of levels) {
      if (level > yearLevel) continue
      const recs = recommend(data, input.profile, {
        course: course.code,
        category: rule.category,
        level,
        term: { year: term.year, period: term.period },
        planned: ctx.placed,
        eligibleWith: [...ctx.before],
      })
      for (const rec of recs) {
        const s = data.subjects[rec.code]
        if (!s || s.points > ctx.room) continue
        if (offeredIn(s, term.year, term.period).status !== 'ok') continue
        if (rec.eligibility !== 'ok') continue
        if (!withinCaps(s, all, course, data)) continue
        if (!leavesRoomForOthers(s, all, course, data)) continue
        if (!progressionAllows(s.code, course, [...ctx.before], data)) continue
        return { code: s.code, why: rule.description.toLowerCase() }
      }
    }
  }
  return null
}

type PointsRule = Extract<CourseRule, { kind: 'points' }>

function pointRules(course: Course): PointsRule[] {
  return course.rules.filter((r): r is PointsRule => r.kind === 'points')
}

function specificity(r: PointsRule): number {
  return (r.level !== undefined ? 1 : 0) + (r.category !== undefined ? 1 : 0)
}

function matches(s: Subject, course: string, r: { level?: number; category?: string }): boolean {
  if (r.level !== undefined && s.level !== r.level) return false
  if (r.category !== undefined && categoryOf(s, course) !== r.category) return false
  return true
}

function sumPoints(codes: string[], data: Dataset, course: string, r: { level?: number; category?: string }): number {
  return codes.reduce((sum, c) => {
    const s = data.subjects[c]
    return s && matches(s, course, r) ? sum + s.points : sum
  }, 0)
}

function withinCaps(s: Subject, taken: string[], course: Course, data: Dataset): boolean {
  for (const r of pointRules(course)) {
    if (r.max === undefined || !matches(s, course.code, r)) continue
    if (sumPoints(taken, data, course.code, r) + s.points > r.max) return false
  }
  for (const r of course.rules) {
    if (r.kind !== 'level1-areas' || s.level !== 1) continue
    if (r.category !== undefined && categoryOf(s, course.code) !== r.category) continue
    const inArea = taken.reduce((sum, c) => {
      const t = data.subjects[c]
      return t && t.level === 1 && t.area === s.area ? sum + t.points : sum
    }, 0)
    if (inArea + s.points > r.maxPointsPerArea) return false
  }
  return true
}

/**
 * Taking a subject uses up points that another minimum might need. Only allow it
 * if every minimum it does *not* count towards can still be met in the points left.
 */
function leavesRoomForOthers(s: Subject, taken: string[], course: Course, data: Dataset): boolean {
  const left = course.totalPoints - sumPoints(taken, data, course.code, {}) - s.points
  for (const r of pointRules(course)) {
    if (r.min === undefined || matches(s, course.code, r)) continue
    const gap = r.min - sumPoints(taken, data, course.code, r)
    if (gap > left) return false
  }
  return true
}

interface RepairCtx {
  input: GenerateInput
  course: Course
  completed: string[]
  electives: Set<string>
  notes: string[]
}

/**
 * For each unmet minimum, look (latest term first) for an elective that only
 * serves requirements with slack and that no later subject depends on, and
 * swap it for a recommended subject that serves the unmet minimum.
 */
function repair(terms: PlanTerm[], ctx: RepairCtx): void {
  const { input, course, completed, electives, notes } = ctx
  const data = input.data
  for (let guard = 0; guard < 50; guard++) {
    const all = [...completed, ...terms.flatMap((t) => t.subjects)]
    const unmet = pointRules(course)
      .filter((r) => r.min !== undefined && (r.min as number) - sumPoints(all, data, course.code, r) > 0)
      .filter((r) => r.level !== undefined || r.category !== undefined) // a total shortfall is fixed by filling, not swapping
      .sort((a, b) => specificity(b) - specificity(a))
    if (unmet.length === 0 || !unmet.some((r) => trySwap(r, terms, all, ctx))) return
  }
  notes.push('Stopped rebalancing electives after many swaps; review the plan manually.')
}

function trySwap(r: PointsRule, terms: PlanTerm[], all: string[], ctx: RepairCtx): boolean {
  const { input, course, completed, electives, notes } = ctx
  const data = input.data
  for (let ti = terms.length - 1; ti >= 0; ti--) {
    const term = terms[ti] as PlanTerm
    for (const e of term.subjects) {
      const es = data.subjects[e]
      if (!electives.has(e) || !es || matches(es, course.code, r)) continue
      const others = all.filter((c) => c !== e)
      const laterNeedsIt = terms
        .slice(ti)
        .flatMap((t) => t.subjects)
        .some((c) => c !== e && dependsOn(data.subjects[c], e))
      if (laterNeedsIt) continue

      const before = [...completed, ...terms.slice(0, ti).flatMap((t) => t.subjects)]
      const candidates = recommend(data, input.profile, {
        course: course.code,
        category: r.category,
        level: r.level,
        term: { year: term.year, period: term.period },
        planned: all,
        eligibleWith: before,
      })
      for (const rec of candidates) {
        const s = data.subjects[rec.code]
        if (!s || rec.eligibility !== 'ok' || s.points > es.points) continue
        if (offeredIn(s, term.year, term.period).status !== 'ok') continue
        if (!withinCaps(s, others, course, data)) continue
        if (!progressionAllows(s.code, course, before, data)) continue
        // The swap must not break any minimum that is currently met.
        const after = [...others, s.code]
        const keepsMinimums = pointRules(course).every(
          (q) =>
            q.min === undefined ||
            sumPoints(all, data, course.code, q) < q.min ||
            sumPoints(after, data, course.code, q) >= q.min,
        )
        if (!keepsMinimums) continue
        term.subjects[term.subjects.indexOf(e)] = s.code
        electives.delete(e)
        electives.add(s.code)
        notes.push(`Swapped ${e} for ${s.code} in ${term.year} ${term.period} to meet: ${r.description.toLowerCase()}.`)
        return true
      }
    }
  }
  return false
}

function dependsOn(s: Subject | undefined, code: string): boolean {
  if (!s) return false
  const refs = (f: Subject['prerequisites']) => (f === 'none' || f === 'unknown' ? [] : referenced(f))
  return refs(s.prerequisites).includes(code) || refs(s.corequisites).includes(code)
}

function explainUnplaced(code: string, data: Dataset, year: number): string {
  const s = data.subjects[code]
  if (!s) return 'not in the dataset yet'
  if (s.offerings === 'unknown') return 'its teaching periods are not curated yet'
  if (periodsFor(s, year).length === 0) return 'not offered in the planned years'
  return 'its prerequisites or the study load left no room before the plan ended'
}
