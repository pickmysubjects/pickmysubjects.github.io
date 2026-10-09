import { offeredIn, periodsFor } from './availability'
import { categoryOf, checkCourse, componentNeeds, findComponent, findCourse } from './courseRules'
import { evaluateField, type Tri } from './expr'
import type { Note, Params, Plan, PlanTerm } from './plan'
import { standardTerms } from './plan'
import { passedCodes, recommend, type Profile } from './recommend'
import { checkTerms } from './planCheck'
import { balanceTerms, fixHeavyTerms } from './relieve'
import { skillsOf, termStress, weakSkills, type StressLevel } from './termStress'
import type { ComponentReq, Course, CourseRule, Dataset, Period, ReqExpr, Subject } from './schema'

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
  unplaced: { code: string; reason: string; reasonKey: string }[]
  /** Notes about choices the generator made (localisable). */
  notes: Note[]
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
/**
 * Builds the plan; if required subjects don't fit (often a chain of subjects
 * that each run in one semester only), tries again with up to two extra
 * semesters, as a student would take longer rather than drop the major.
 */
export function generatePlan(input: GenerateInput): GenerateResult {
  // Unplaced subjects weigh most; then course rules the plan fails (e.g. breadth
  // squeezed out by a heavy major + specialisation).
  const shortfall = (r: GenerateResult) =>
    r.unplaced.length * 100 + checkCourse(r.plan, input.data).statuses.filter((st) => st.status === 'fail').length
  let result = buildPlan(input)
  if (input.maxTerms !== undefined || shortfall(result) === 0) return result
  const base = result.plan.terms.length
  for (let extra = 1; extra <= 2 && shortfall(result) > 0; extra++) {
    const longer = buildPlan({ ...input, maxTerms: base + extra })
    if (shortfall(longer) >= shortfall(result)) continue
    longer.notes.push(note('extraTerms', { n: extra }, `Planned ${extra} extra semester(s) so every required subject fits.`))
    result = longer
  }
  return result
}

function buildPlan(input: GenerateInput): GenerateResult {
  const { data, profile } = input
  const course = findCourse(data, input.course, input.courseYear)
  const notes: Note[] = []
  const completed = passedCodes(profile.results)
  const done = new Set(completed)
  const load = course?.standardLoad ?? 50

  // needs: subjects the generator added as prerequisites for each required subject.
  const needs = new Map<string, string[]>()
  const required = collectRequired(input, done, notes, needs)
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
  // Areas of the major/specialisation, used to break ties between equally scored electives.
  const focus = new Set([...required].filter((c) => !firstSemester.has(c)).map((c) => data.subjects[c]?.area))
  const opens = pathwayCounter(data, input.course, input.startYear)
  const depth = dependentDepth(pending, data, needs)

  const electives = new Set<string>()
  const fill = (term: PlanTerm, termIndex: number, relaxed = false): void => {
    if (!course) return
    const before = new Set([...completed, ...terms.slice(0, termIndex).flatMap((t) => t.subjects)])
    let used = term.subjects.reduce((sum, c) => sum + (data.subjects[c]?.points ?? 12.5), 0)
    while (used < load) {
      const pick = pickElective({ input, course, term, before, placed: allPlaced(), completed, room: load - used, focus, reserved: pending, opens, progress: (termIndex + 1) / terms.length, relaxed })
      if (!pick) break
      term.subjects.push(pick.code)
      electives.add(pick.code)
      used += data.subjects[pick.code]?.points ?? 12.5
      notes.push(note('added', { code: pick.code, year: term.year, period: term.period, rule: pick.ruleId }, `${pick.code} added in ${term.year} ${term.period} for: ${pick.why}.`))
    }
  }
  const allPlaced = (): string[] => terms.flatMap((t) => t.subjects)

  terms.forEach((term, termIndex) => {
    const before = new Set([...completed, ...allPlaced()])
    let used = 0

    // Required subjects first.
    const ready = pending
      .filter((c) => !before.has(c))
      .filter((c) => (needs.get(c) ?? []).every((n) => before.has(n)))
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
    repair(terms, { input, course, completed, electives, notes, focus, reserved: pending, opens })
    terms.forEach((t, i) => fill(t, i))
    // Anything still short: better a full term than an empty slot kept for a minimum that can't be met.
    terms.forEach((t, i) => fill(t, i, true))
  }
  // Spread the load, so the hard subjects don't all land in one semester.
  const draft: Plan = { course: input.course, courseYear: input.courseYear, major: input.major, specialisation: input.specialisation, completed, terms }
  for (const { a, b } of [...balanceTerms(draft, data, input.profile), ...fixHeavyTerms(draft, data, input.profile)]) {
    notes.push(note('balanced', { a, b }, `Swapped ${a} and ${b} between semesters to spread the load.`))
  }
  // Keep "added in …" notes true to where each subject now sits.
  for (const n of notes) {
    const where = typeof n.params.code === 'string' && 'year' in n.params ? terms.find((t) => t.subjects.includes(n.params.code as string)) : undefined
    if (where) Object.assign(n.params, { year: where.year, period: where.period })
  }
  const placed = allPlaced()

  const unplaced = pending
    .filter((c) => !placed.includes(c))
    .map((code) => ({ code, ...explainUnplaced(code, data, input.startYear) }))

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

function note(key: string, params: Params, text: string): Note {
  return { key, params, text }
}

function collectRequired(input: GenerateInput, done: Set<string>, notes: Note[], needs: Map<string, string[]>): Set<string> {
  const { data } = input
  const course = findCourse(data, input.course, input.courseYear)
  const required = new Set<string>()
  for (const rule of course?.rules ?? []) {
    if (rule.kind === 'compulsory') rule.subjects.forEach((c) => required.add(c))
  }

  const groups: { title: string; req: Extract<ComponentReq, { choose: unknown }>; used: Set<string> }[] = []
  for (const id of [input.major, input.specialisation]) {
    const component = findComponent(data, id)
    if (id && !component) notes.push(note('componentMissing', { id }, `${id} isn't in the dataset, so its subjects weren't added.`))
    if (component?.requirements === 'unknown') notes.push(note('componentUnknown', { title: component.title }, `${component.title}'s structure isn't curated yet.`))
    // Same allocation as the course check: a subject fills one requirement only.
    const used = new Set<string>()
    for (const req of componentNeeds(component)) {
      if ('all' in req) req.all.forEach((c) => (required.add(c), used.add(c)))
      else groups.push({ title: component?.title ?? id ?? '', req, used })
    }
  }

  // "Choose N points from" groups, once every fixed subject is known. Ties in
  // score go to subjects that run in the least crowded teaching period.
  const score = new Map(recommend(data, input.profile, { course: input.course, eligibleWith: [], year: input.startYear }).map((r) => [r.code, r.score]))
  for (const { title, req, used } of groups) {
    let have = 0
    for (const c of req.choose.from) {
      if (have >= req.choose.points) break
      if ((done.has(c) || required.has(c)) && !used.has(c)) {
        used.add(c)
        have += data.subjects[c]?.points ?? 0
      }
    }
    const crowd = periodCrowding(required, data, input.startYear)
    const busy = (c: string) => {
      const s = data.subjects[c]
      const ps = s ? periodsFor(s, input.startYear) : []
      return ps.length ? Math.min(...ps.map((p) => crowd.get(p) ?? 0)) : Infinity
    }
    const order = [...req.choose.from].sort(
      (a, b) => (score.get(b) ?? -1) - (score.get(a) ?? -1) || busy(a) - busy(b),
    )
    for (const c of order) {
      if (have >= req.choose.points) break
      if (done.has(c) || required.has(c)) continue
      if (!runsDuringPlan(data.subjects[c], input.startYear)) continue
      required.add(c)
      used.add(c)
      have += data.subjects[c]?.points ?? 12.5
      notes.push(note('chose', { code: c, title }, `Chose ${c} for ${title} (best match among its options).`))
    }
  }

  // Close over prerequisites so required subjects can actually be taken. Corequisites
  // ("in the same semester or before") are planned the safe way: in an earlier term.
  const queue = [...required]
  while (queue.length > 0) {
    const code = queue.pop() as string
    const s = data.subjects[code]
    if (!s) continue
    const fields = [s.prerequisites, s.corequisites].filter((f): f is ReqExpr => f !== 'none' && f !== 'unknown')
    for (const need of fields.flatMap((f) => resolvePrereqs(f, done, required, data, input.course))) {
      needs.set(code, [...(needs.get(code) ?? []), need])
      if (!required.has(need) && !done.has(need)) {
        required.add(need)
        queue.push(need)
        notes.push(note('prereqAdded', { code: need, for: code }, `Added ${need} because ${code} needs it.`))
      }
    }
  }
  return required
}

/**
 * Subjects the expression relies on that aren't completed yet — already-required
 * ones included, so they can be ordered first — preferring the branch that adds
 * the fewest new subjects.
 */
/** A requirement met by school results rather than a university subject. */
// "Study score of 25 in …", "VCE Units 3 and 4 Physics or equivalent", "Excellent results in VCE Units 3/4 …".
// Not "VCE Algorithmics students may …", which is a different kind of note.
const SCHOOL_RESULT = /study score|^(?:excellent results? in )?VCE Units? 3/i

function resolvePrereqs(expr: ReqExpr, done: Set<string>, required: Set<string>, data: Dataset, course: string): string[] {
  if ('subject' in expr) return done.has(expr.subject) ? [] : [expr.subject]
  if ('all' in expr) return [...new Set(expr.all.flatMap((e) => resolvePrereqs(e, done, required, data, course)))]
  if ('any' in expr) {
    // Fewest additions wins. A subject we have no data for (often a graduate
    // alternative) costs the most; assuming a manual condition (a VCE score, a
    // competency test) is cheaper than that but dearer than a subject we can place,
    // so the plan stays on the safe side and the plan check flags the assumption.
    // The exception is a school result (a VCE study score or equivalent): that's how
    // most students meet a first-year requirement, so it is assumed before adding a
    // bridging subject like MAST10012. The plan check still asks the student to confirm.
    const MANUAL = 50
    const SCHOOL = 0.5
    const cost = (o: string[]) =>
      o.reduce(
        (sum, c) =>
          sum + (required.has(c) ? 0 : clashes(c, done, required, data) || closedTo(c, course, data) ? 10_000 : data.subjects[c] ? 1 : 100),
        0,
      )
    let best: string[] | null = null
    let bestCost = Infinity
    // What an option assumes rather than plans: manual conditions anywhere inside it.
    const assumed = (e: ReqExpr): number =>
      'manual' in e ? (SCHOOL_RESULT.test(e.manual) ? SCHOOL : MANUAL) : 'all' in e ? e.all.reduce((sum, x) => sum + assumed(x), 0) : 0
    for (const e of expr.any) {
      // An option that needs admission to another course isn't open to this student at all.
      if (needsOtherAdmission(e, course)) continue
      const o = 'manual' in e ? [] : resolvePrereqs(e, done, required, data, course)
      const c = cost(o) + assumed(e)
      if (c < bestCost) [best, bestCost] = [o, c]
    }
    return best ?? []
  }
  if ('points' in expr) return pickForPoints(expr.points, done, required, data, course)
  return [] // admission / manual can't be resolved to specific subjects
}

/** Would adding this subject break a non-allowed pair with one already completed or required? */
function needsOtherAdmission(e: ReqExpr, course: string): boolean {
  if ('admission' in e) return e.admission !== course
  if ('all' in e) return e.all.some((x) => needsOtherAdmission(x, course))
  if ('any' in e) return e.any.every((x) => needsOtherAdmission(x, course))
  return false
}

/**
 * A subject students of this course can't ever take: its prerequisites fail even with every
 * other subject done (e.g. "admission into the Bachelor of Biomedicine" only).
 */
const closedCache = new WeakMap<Dataset, Map<string, boolean>>()
function closedTo(code: string, course: string, data: Dataset): boolean {
  const s = data.subjects[code]
  if (!s || s.prerequisites === 'none' || s.prerequisites === 'unknown') return false
  const cache = closedCache.get(data) ?? new Map<string, boolean>()
  closedCache.set(data, cache)
  const key = `${course}:${code}`
  if (!cache.has(key)) {
    const everything = new Set(Object.keys(data.subjects).filter((c) => c !== code))
    cache.set(key, evaluateField(s.prerequisites, { completed: everything, subjects: data.subjects, admittedCourse: course }).status === 'fail')
  }
  return cache.get(key) as boolean
}

function clashes(code: string, done: Set<string>, required: Set<string>, data: Dataset): boolean {
  const mine = data.subjects[code]?.nonAllowed
  for (const other of [...done, ...required]) {
    if (mine && mine !== 'unknown' && mine.includes(other)) return true
    const theirs = data.subjects[other]?.nonAllowed
    if (theirs && theirs !== 'unknown' && theirs.includes(code)) return true
  }
  return false
}

/**
 * Subjects to add for an "N points of X" prerequisite: the lowest-level matching
 * subjects that run most often, until the threshold is met.
 */
function pickForPoints(
  req: { min: number; level?: number; area?: string; from?: string[] },
  done: Set<string>,
  required: Set<string>,
  data: Dataset,
  course: string,
): string[] {
  const fits = (s: Subject) =>
    (req.from === undefined || req.from.includes(s.code)) &&
    (req.level === undefined || s.level === req.level) &&
    (req.area === undefined || s.area === req.area)
  let have = [...done].reduce((sum, c) => {
    const s = data.subjects[c]
    return s && fits(s) ? sum + s.points : sum
  }, 0)
  const runs = (s: Subject) => (s.offerings === 'unknown' ? 0 : Math.max(0, ...Object.values(s.offerings).map((p) => p.length)))
  const isNew = (s: Subject) => (required.has(s.code) ? 0 : 1)
  // Lowest level first, so the requirement can be met early; within a level,
  // reuse subjects that are already required before adding new ones.
  const candidates = Object.values(data.subjects)
    .filter(
      (s) =>
        fits(s) &&
        !done.has(s.code) &&
        (required.has(s.code) || (runs(s) > 0 && !clashes(s.code, done, required, data) && !closedTo(s.code, course, data))),
    )
    .sort((a, b) => a.level - b.level || isNew(a) - isNew(b) || runs(b) - runs(a) || a.code.localeCompare(b.code))
  const picks: string[] = []
  for (const s of candidates) {
    if (have >= req.min) break
    picks.push(s.code)
    have += s.points
  }
  return picks
}

/** False only when we know the subject doesn't run in any of the next few years. */
function runsDuringPlan(s: Subject | undefined, startYear: number): boolean {
  if (!s || s.offerings === 'unknown') return true
  return [0, 1, 2, 3].some((d) => periodsFor(s, startYear + d).length > 0)
}

/** How many required subjects can only be taken in each teaching period. */
function periodCrowding(required: Set<string>, data: Dataset, year: number): Map<Period, number> {
  const crowd = new Map<Period, number>()
  for (const c of required) {
    const s = data.subjects[c]
    const ps = s ? periodsFor(s, year) : []
    if (ps.length === 1) crowd.set(ps[0] as Period, (crowd.get(ps[0] as Period) ?? 0) + 1)
  }
  return crowd
}

function canTake(code: string, term: PlanTerm, before: Set<string>, data: Dataset, course: string): Tri {
  const s = data.subjects[code]
  if (!s) return 'unknown'
  if (offeredIn(s, term.year, term.period).status === 'fail') return 'fail'
  const pre = evaluateField(s.prerequisites, { completed: before, subjects: data.subjects, admittedCourse: course })
  const co = evaluateField(s.corequisites, { completed: before, subjects: data.subjects, admittedCourse: course })
  if (pre.status === 'fail' || co.status === 'fail') return 'fail'
  return pre.status === 'unknown' || co.status === 'unknown' ? 'unknown' : 'ok'
}

function priority(code: string, first: Set<string>, depth: Map<string, number>, data: Dataset, year: number): number {
  const s = data.subjects[code]
  const scarcity = s ? 4 - Math.min(4, periodsFor(s, year).length) : 0
  return (first.has(code) ? 1000 : 0) + (depth.get(code) ?? 0) * 10 + scarcity * 3 - (s?.level ?? 3)
}

/** Longest chain of required subjects that depend on each subject. */
function dependentDepth(codes: string[], data: Dataset, needs: Map<string, string[]>): Map<string, number> {
  const set = new Set(codes)
  const deps = new Map<string, string[]>()
  for (const c of codes) {
    const s = data.subjects[c]
    const refs = s ? [s.prerequisites, s.corequisites].flatMap((f) => (f !== 'none' && f !== 'unknown' ? referenced(f) : [])) : []
    for (const p of new Set([...refs, ...(needs.get(c) ?? [])])) if (set.has(p)) deps.set(p, [...(deps.get(p) ?? []), c])
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
  focus: Set<string | undefined>
  /** Required subjects still to place: never picked as electives, and their non-allowed partners are off limits. */
  reserved: string[]
  opens: PathwayCounter
  /** Share of the plan done by the end of this term (0–1]. */
  progress: number
  /** Final top-up: fill a term even if some other minimum can no longer be met. */
  relaxed?: boolean
}

function pickElective(ctx: PickCtx): { code: string; why: string; ruleId: string } | null {
  const { input, course, term } = ctx
  const data = input.data
  // Required subjects not placed yet still count: they will use their share of
  // each requirement and cap, so electives shouldn't take it first.
  // (Not for the overall total, though: that only fills as terms actually fill.)
  const all = [...new Set([...ctx.completed, ...ctx.placed, ...ctx.reserved])]
  const placedOnly = [...ctx.completed, ...ctx.placed]
  const deficits = pointRules(course)
    .filter((r) => r.min !== undefined)
    .map((r) => ({ rule: r, gap: (r.min as number) - sumPoints(specificity(r) > 0 ? all : placedOnly, data, course.code, r) }))
    .filter((d) => d.gap > 0)
    // A requirement that has fallen behind an even pace goes first, so ones that
    // need a chain (level-1 breadth is capped, so level 2 needs a start) begin early.
    .map((d) => ({ ...d, behind: specificity(d.rule) > 0 && (d.rule.min as number) - d.gap < (d.rule.min as number) * ctx.progress }))
    .sort((a, b) => Number(b.behind) - Number(a.behind) || specificity(b.rule) - specificity(a.rule) || b.gap - a.gap)
  if (deficits.length === 0) return null

  // Year level follows the points already completed, so mid-degree students are placed correctly.
  const yearLevel = Math.min(3, Math.floor(sumPoints([...ctx.before], data, course.code, {}) / 100) + 1)
  for (const { rule, gap } of deficits) {
    const levels = rule.level !== undefined ? [rule.level] : [yearLevel, ...[1, 2, 3].filter((l) => l !== yearLevel)]
    for (const level of levels) {
      if (level > yearLevel) continue
      // When level 1 can't cover the rest of this requirement (e.g. breadth: at most
      // 25 of its 50 points at level 1), a level-1 pick must lead on to a higher level.
      const cap = pointRules(course).find((r) => r.max !== undefined && r.level === 1 && r.category === rule.category)
      const levelOneRoom = cap ? (cap.max as number) - sumPoints(all, data, course.code, { level: 1, category: rule.category }) : Infinity
      const needsPath = level === 1 && gap > levelOneRoom
      const recs = recommend(data, input.profile, {
        course: course.code,
        category: rule.category,
        level,
        term: { year: term.year, period: term.period },
        planned: [...ctx.placed, ...ctx.reserved],
        eligibleWith: [...ctx.before],
      })
      const loadsUp = (c: string) => heavierWith(term.subjects, c, data, input.profile)
      for (const rec of rankElectives(recs, ctx.focus, data, (c) => ctx.opens(c, rule.category), input.profile, needsPath, loadsUp)) {
        const s = data.subjects[rec.code]
        if (!s || s.points > ctx.room) continue
        if (offeredIn(s, term.year, term.period).status !== 'ok') continue
        if (!withinCaps(s, all, course, data)) continue
        if (!ctx.relaxed && !leavesRoomForOthers(s, all, course, data)) continue
        if (!progressionAllows(s.code, course, [...ctx.before], data)) continue
        // A corequisite must already be in the plan (this term or earlier).
        const co = evaluateField(s.corequisites, { completed: new Set([...ctx.before, ...term.subjects]), subjects: data.subjects, admittedCourse: course.code })
        if (co.status === 'fail') continue
        return { code: s.code, why: rule.description.toLowerCase(), ruleId: rule.id }
      }
    }
  }
  return null
}

/**
 * Order elective candidates: prerequisites confirmed met before ones we can't
 * confirm (not curated yet — the plan check flags those, and a sparse dataset
 * still yields a plan); then by score; on a tie, subjects in the major's own
 * areas first, so an empty profile doesn't fall back to alphabetical order;
 * then subjects that lead on to higher-level ones serving the same requirement
 * (a level-1 breadth subject with a level-2 follow-on beats a dead end, since
 * level-1 breadth is capped). Known-unmet candidates were already dropped by recommend().
 */
/** Recommendation points an elective gives up for making its semester heavier. */
const HEAVY_PICK_COST = 6
const STRESS_RANK: Record<StressLevel, number> = { ok: 0, heavy: 1, veryHeavy: 2 }

/** Whether adding this subject to these makes the semester heavier than it is. */
function heavierWith(subjects: string[], code: string, data: Dataset, profile: Profile): boolean {
  const before = termStress(subjects, data, profile).level
  const after = termStress([...subjects, code], data, profile).level
  return STRESS_RANK[after] > STRESS_RANK[before]
}

function rankElectives<T extends { code: string; score: number; eligibility: Tri }>(
  recs: T[],
  focus: Set<string | undefined>,
  data: Dataset,
  opens: (code: string) => number,
  profile: Profile,
  needsPath = false,
  loadsUp: (code: string) => boolean = () => false,
): T[] {
  const tier = (r: T) => (r.eligibility === 'ok' ? 0 : r.eligibility === 'unknown' ? 1 : 2)
  // A choice that would make its semester heavy gives up a few points, so a close
  // alternative wins but a clearly better fit (the student's own interest) still doesn't lose.
  const heavy = new Map<string, boolean>()
  const fit = (r: T) => {
    if (!heavy.has(r.code)) heavy.set(r.code, loadsUp(r.code))
    return r.score - (heavy.get(r.code) ? HEAVY_PICK_COST : 0)
  }
  // A free choice leaning on the student's weak spot only when nothing else fits: stacked
  // with the compulsory subjects on the same skill, it's what makes a semester too much.
  const weak = weakSkills(data, profile)
  const onWeak = (r: T) => {
    const s = data.subjects[r.code]
    return s && skillsOf(s, data).some((k) => weak.has(k)) ? 1 : 0
  }
  const near = (r: T) => (focus.has(data.subjects[r.code]?.area) ? 0 : 1)
  // needsPath: a dead end would make the requirement impossible, so it's left out
  // (a later term may offer a subject that leads on).
  const path = (r: T) => (needsPath && opens(r.code) === 0 ? 1 : 0)
  return recs
    .filter((r) => tier(r) < 2 && path(r) === 0)
    .sort(
      (a, b) =>
        tier(a) - tier(b) ||
        path(a) - path(b) ||
        onWeak(a) - onWeak(b) ||
        fit(b) - fit(a) ||
        near(a) - near(b) ||
        opens(b.code) - opens(a.code),
    )
}

type PathwayCounter = (code: string, category: string | undefined) => number

/** How many higher-level subjects (optionally of one category) list this one in their prerequisites. */
function pathwayCounter(data: Dataset, course: string, startYear: number): PathwayCounter {
  const dependents = new Map<string, Subject[]>()
  for (const s of Object.values(data.subjects)) {
    if (s.prerequisites === 'none' || s.prerequisites === 'unknown') continue
    // A follow-on subject that isn't running isn't a path anywhere.
    if (!runsDuringPlan(s, startYear)) continue
    for (const c of new Set(referenced(s.prerequisites))) dependents.set(c, [...(dependents.get(c) ?? []), s])
  }
  return (code, category) => {
    const level = data.subjects[code]?.level ?? 0
    return (dependents.get(code) ?? []).filter(
      (d) => d.level > level && (category === undefined || categoryOf(d, course) === category),
    ).length
  }
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
  notes: Note[]
  focus: Set<string | undefined>
  reserved: string[]
  opens: PathwayCounter
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
  notes.push(note('repairStopped', {}, 'Stopped rebalancing electives after many swaps; review the plan manually.'))
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
      const laterNeedsIt =
        terms
          .slice(ti)
          .flatMap((t) => t.subjects)
          .some((c) => c !== e && dependsOn(data.subjects[c], e)) || pointsNeedIt(e, ti, terms, completed, input)
      if (laterNeedsIt) continue

      const before = [...completed, ...terms.slice(0, ti).flatMap((t) => t.subjects)]
      const candidates = recommend(data, input.profile, {
        course: course.code,
        category: r.category,
        level: r.level,
        term: { year: term.year, period: term.period },
        planned: [...all, ...ctx.reserved],
        eligibleWith: before,
      })
      const rest = term.subjects.filter((c) => c !== e)
      const loadsUp = (c: string) => heavierWith(rest, c, data, input.profile)
      for (const rec of rankElectives(candidates, ctx.focus, data, (c) => ctx.opens(c, r.category), input.profile, false, loadsUp)) {
        const s = data.subjects[rec.code]
        if (!s || s.points > es.points) continue
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
        notes.push(note('swapped', { from: e, to: s.code, year: term.year, period: term.period, rule: r.id }, `Swapped ${e} for ${s.code} in ${term.year} ${term.period} to meet: ${r.description.toLowerCase()}.`))
        return true
      }
    }
  }
  return false
}

/**
 * Would removing `code` from term `from` break a later subject's prerequisites
 * (e.g. "25 points of level-2 MAST") that hold with it? dependsOn only sees named subjects.
 */
function pointsNeedIt(code: string, from: number, terms: PlanTerm[], completed: string[], input: GenerateInput): boolean {
  const data = input.data
  for (let j = from + 1; j < terms.length; j++) {
    const before = [...completed, ...terms.slice(0, j).flatMap((t) => t.subjects)]
    const without = new Set(before.filter((c) => c !== code))
    for (const c of terms[j]?.subjects ?? []) {
      const pre = data.subjects[c]?.prerequisites
      if (!pre || pre === 'none' || pre === 'unknown') continue
      const ctx = { subjects: data.subjects, admittedCourse: input.course }
      const withIt = evaluateField(pre, { ...ctx, completed: new Set(before) }).status
      if (withIt !== 'fail' && evaluateField(pre, { ...ctx, completed: without }).status === 'fail') return true
    }
  }
  return false
}

function dependsOn(s: Subject | undefined, code: string): boolean {
  if (!s) return false
  const refs = (f: Subject['prerequisites']) => (f === 'none' || f === 'unknown' ? [] : referenced(f))
  return refs(s.prerequisites).includes(code) || refs(s.corequisites).includes(code)
}

function explainUnplaced(code: string, data: Dataset, year: number): { reason: string; reasonKey: string } {
  const s = data.subjects[code]
  if (!s) return { reasonKey: 'notInDataset', reason: 'not in the dataset yet' }
  if (s.offerings === 'unknown') return { reasonKey: 'offeringsUnknown', reason: 'its teaching periods are not curated yet' }
  if (periodsFor(s, year).length === 0) return { reasonKey: 'notOffered', reason: 'not offered in the planned years' }
  return { reasonKey: 'noRoom', reason: 'its prerequisites or the study load left no room before the plan ended' }
}
